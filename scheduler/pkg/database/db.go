package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/config"
	log "github.com/sirupsen/logrus"
)

// DB wraps the database connection
type DB struct {
	*sql.DB
}

// Connect establishes a connection to the database
func Connect(cfg config.DatabaseConfig) (*DB, error) {
	sslMode := cfg.SSLMode
	if sslMode == "" {
		sslMode = "disable"
	}

	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, sslMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	return &DB{db}, nil
}

// RunMigrations runs database migrations
func RunMigrations(db *DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS scheduled_provisions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		employee_data JSONB NOT NULL,
		applications JSONB NOT NULL,
		schedule_time TIMESTAMP WITH TIME ZONE NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'pending',
		tags TEXT[] NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		executed_at TIMESTAMP WITH TIME ZONE,
		error_message TEXT,
		retry_count INTEGER DEFAULT 0,
		CONSTRAINT valid_status CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled'))
	);

	CREATE INDEX IF NOT EXISTS idx_schedule_time ON scheduled_provisions(schedule_time) WHERE status = 'pending';
	CREATE INDEX IF NOT EXISTS idx_tags ON scheduled_provisions USING GIN(tags);
	CREATE INDEX IF NOT EXISTS idx_status ON scheduled_provisions(status);
	`

	_, err := db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Second migration: extend table to support generic job types
	migrationV2 := `
	ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) NOT NULL DEFAULT 'provision';
	ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS payload JSONB;
	ALTER TABLE scheduled_provisions DROP CONSTRAINT IF EXISTS valid_job_type;
	ALTER TABLE scheduled_provisions ADD CONSTRAINT valid_job_type CHECK (job_type IN ('provision', 'terminate'));
	CREATE INDEX IF NOT EXISTS idx_job_type ON scheduled_provisions(job_type);
	`

	_, err = db.Exec(migrationV2)
	if err != nil {
		return fmt.Errorf("failed to run v2 migrations: %w", err)
	}

	log.Info("Database migrations completed successfully")
	return nil
}

// CreateScheduledProvision inserts a new scheduled provision
func (db *DB) CreateScheduledProvision(sp *ScheduledProvision) error {
	sp.ID = uuid.New()
	sp.CreatedAt = time.Now()
	sp.UpdatedAt = time.Now()
	sp.Status = StatusPending
	sp.RetryCount = 0

	query := `
		INSERT INTO scheduled_provisions (
			id, employee_data, applications, schedule_time, status, tags, created_at, updated_at, retry_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := db.Exec(query,
		sp.ID,
		sp.EmployeeData,
		sp.Applications,
		sp.ScheduleTime,
		sp.Status,
		sp.Tags,
		sp.CreatedAt,
		sp.UpdatedAt,
		sp.RetryCount,
	)

	if err != nil {
		return fmt.Errorf("failed to create scheduled provision: %w", err)
	}

	log.WithFields(log.Fields{
		"id":            sp.ID,
		"employee":      sp.EmployeeData.FullName,
		"schedule_time": sp.ScheduleTime,
	}).Info("Created scheduled provision")

	return nil
}

// GetPendingProvisions returns all pending provisions that should be executed
func (db *DB) GetPendingProvisions() ([]ScheduledProvision, error) {
	query := `
		SELECT id, employee_data, applications, schedule_time, status, tags,
		       created_at, updated_at, executed_at, error_message, retry_count
		FROM scheduled_provisions
		WHERE status = $1 AND schedule_time <= NOW()
		ORDER BY schedule_time ASC
	`

	rows, err := db.Query(query, StatusPending)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending provisions: %w", err)
	}
	defer rows.Close()

	var provisions []ScheduledProvision
	for rows.Next() {
		var sp ScheduledProvision
		err := rows.Scan(
			&sp.ID,
			&sp.EmployeeData,
			&sp.Applications,
			&sp.ScheduleTime,
			&sp.Status,
			&sp.Tags,
			&sp.CreatedAt,
			&sp.UpdatedAt,
			&sp.ExecutedAt,
			&sp.ErrorMessage,
			&sp.RetryCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan provision: %w", err)
		}
		provisions = append(provisions, sp)
	}

	return provisions, nil
}

// UpdateProvisionStatus updates the status of a provision
func (db *DB) UpdateProvisionStatus(id uuid.UUID, status string, errorMsg *string) error {
	now := time.Now()
	query := `
		UPDATE scheduled_provisions
		SET status = $1, updated_at = $2, executed_at = $3, error_message = $4
		WHERE id = $5
	`

	var executedAt *time.Time
	if status == StatusCompleted || status == StatusFailed {
		executedAt = &now
	}

	_, err := db.Exec(query, status, now, executedAt, errorMsg, id)
	if err != nil {
		return fmt.Errorf("failed to update provision status: %w", err)
	}

	log.WithFields(log.Fields{
		"id":     id,
		"status": status,
	}).Info("Updated provision status")

	return nil
}

// IncrementRetryCount increments the retry count for a provision
func (db *DB) IncrementRetryCount(id uuid.UUID) error {
	query := `
		UPDATE scheduled_provisions
		SET retry_count = retry_count + 1, updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to increment retry count: %w", err)
	}

	return nil
}

// GetProvisionByID retrieves a provision by ID
func (db *DB) GetProvisionByID(id uuid.UUID) (*ScheduledProvision, error) {
	query := `
		SELECT id, employee_data, applications, schedule_time, status, tags,
		       created_at, updated_at, executed_at, error_message, retry_count
		FROM scheduled_provisions
		WHERE id = $1
	`

	var sp ScheduledProvision
	err := db.QueryRow(query, id).Scan(
		&sp.ID,
		&sp.EmployeeData,
		&sp.Applications,
		&sp.ScheduleTime,
		&sp.Status,
		&sp.Tags,
		&sp.CreatedAt,
		&sp.UpdatedAt,
		&sp.ExecutedAt,
		&sp.ErrorMessage,
		&sp.RetryCount,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get provision: %w", err)
	}

	return &sp, nil
}

// ListProvisions lists provisions with optional filters
func (db *DB) ListProvisions(status *string, tag *string, limit int, offset int) ([]ScheduledProvision, error) {
	query := `
		SELECT id, employee_data, applications, schedule_time, status, tags,
		       created_at, updated_at, executed_at, error_message, retry_count
		FROM scheduled_provisions
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 0

	if status != nil {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *status)
	}

	if tag != nil {
		argCount++
		query += fmt.Sprintf(" AND $%d = ANY(tags)", argCount)
		args = append(args, *tag)
	}

	query += " ORDER BY schedule_time DESC"

	if limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, limit)
	}

	if offset > 0 {
		argCount++
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, offset)
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list provisions: %w", err)
	}
	defer rows.Close()

	var provisions []ScheduledProvision
	for rows.Next() {
		var sp ScheduledProvision
		err := rows.Scan(
			&sp.ID,
			&sp.EmployeeData,
			&sp.Applications,
			&sp.ScheduleTime,
			&sp.Status,
			&sp.Tags,
			&sp.CreatedAt,
			&sp.UpdatedAt,
			&sp.ExecutedAt,
			&sp.ErrorMessage,
			&sp.RetryCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan provision: %w", err)
		}
		provisions = append(provisions, sp)
	}

	return provisions, nil
}

// CancelProvision cancels a scheduled provision
func (db *DB) CancelProvision(id uuid.UUID) error {
	query := `
		UPDATE scheduled_provisions
		SET status = $1, updated_at = NOW()
		WHERE id = $2 AND status = $3
	`

	result, err := db.Exec(query, StatusCancelled, id, StatusPending)
	if err != nil {
		return fmt.Errorf("failed to cancel provision: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("provision not found or not in pending status")
	}

	log.WithField("id", id).Info("Cancelled provision")
	return nil
}

// ---- Generic ScheduledJob methods ----

// CreateScheduledJob inserts a new generic scheduled job.
func (db *DB) CreateScheduledJob(job *ScheduledJob) error {
	job.ID = uuid.New()
	job.CreatedAt = time.Now()
	job.UpdatedAt = time.Now()
	job.Status = StatusPending
	job.RetryCount = 0

	query := `
		INSERT INTO scheduled_provisions (
			id, job_type, payload, schedule_time, status, tags, created_at, updated_at, retry_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := db.Exec(query,
		job.ID,
		job.JobType,
		job.Payload,
		job.ScheduleTime,
		job.Status,
		job.Tags,
		job.CreatedAt,
		job.UpdatedAt,
		job.RetryCount,
	)
	if err != nil {
		return fmt.Errorf("failed to create scheduled job: %w", err)
	}

	log.WithFields(log.Fields{
		"id":            job.ID,
		"job_type":      job.JobType,
		"schedule_time": job.ScheduleTime,
	}).Info("Created scheduled job")

	return nil
}

// GetPendingJobs returns all pending jobs whose schedule_time has arrived.
func (db *DB) GetPendingJobs() ([]ScheduledJob, error) {
	query := `
		SELECT id, job_type, payload, schedule_time, status, tags,
		       created_at, updated_at, executed_at, error_message, retry_count
		FROM scheduled_provisions
		WHERE status = $1 AND schedule_time <= NOW()
		ORDER BY schedule_time ASC
	`

	rows, err := db.Query(query, StatusPending)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending jobs: %w", err)
	}
	defer rows.Close()

	var jobs []ScheduledJob
	for rows.Next() {
		var j ScheduledJob
		err := rows.Scan(
			&j.ID,
			&j.JobType,
			&j.Payload,
			&j.ScheduleTime,
			&j.Status,
			&j.Tags,
			&j.CreatedAt,
			&j.UpdatedAt,
			&j.ExecutedAt,
			&j.ErrorMessage,
			&j.RetryCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan job: %w", err)
		}
		jobs = append(jobs, j)
	}

	return jobs, nil
}

// GetJobByID retrieves a generic job by its UUID.
func (db *DB) GetJobByID(id uuid.UUID) (*ScheduledJob, error) {
	query := `
		SELECT id, job_type, payload, schedule_time, status, tags,
		       created_at, updated_at, executed_at, error_message, retry_count
		FROM scheduled_provisions
		WHERE id = $1
	`

	var j ScheduledJob
	err := db.QueryRow(query, id).Scan(
		&j.ID,
		&j.JobType,
		&j.Payload,
		&j.ScheduleTime,
		&j.Status,
		&j.Tags,
		&j.CreatedAt,
		&j.UpdatedAt,
		&j.ExecutedAt,
		&j.ErrorMessage,
		&j.RetryCount,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}

	return &j, nil
}

// ListJobs lists jobs with optional filters.
func (db *DB) ListJobs(status *string, tag *string, jobType *string, limit int, offset int) ([]ScheduledJob, error) {
	query := `
		SELECT id, job_type, payload, schedule_time, status, tags,
		       created_at, updated_at, executed_at, error_message, retry_count
		FROM scheduled_provisions
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 0

	if status != nil {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *status)
	}

	if tag != nil {
		argCount++
		query += fmt.Sprintf(" AND $%d = ANY(tags)", argCount)
		args = append(args, *tag)
	}

	if jobType != nil {
		argCount++
		query += fmt.Sprintf(" AND job_type = $%d", argCount)
		args = append(args, *jobType)
	}

	query += " ORDER BY schedule_time DESC"

	if limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, limit)
	}

	if offset > 0 {
		argCount++
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, offset)
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list jobs: %w", err)
	}
	defer rows.Close()

	var jobs []ScheduledJob
	for rows.Next() {
		var j ScheduledJob
		err := rows.Scan(
			&j.ID,
			&j.JobType,
			&j.Payload,
			&j.ScheduleTime,
			&j.Status,
			&j.Tags,
			&j.CreatedAt,
			&j.UpdatedAt,
			&j.ExecutedAt,
			&j.ErrorMessage,
			&j.RetryCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan job: %w", err)
		}
		jobs = append(jobs, j)
	}

	return jobs, nil
}

// UpdateJobStatus updates the status of a generic job.
func (db *DB) UpdateJobStatus(id uuid.UUID, status string, errorMsg *string) error {
	now := time.Now()
	query := `
		UPDATE scheduled_provisions
		SET status = $1, updated_at = $2, executed_at = $3, error_message = $4
		WHERE id = $5
	`

	var executedAt *time.Time
	if status == StatusCompleted || status == StatusFailed {
		executedAt = &now
	}

	_, err := db.Exec(query, status, now, executedAt, errorMsg, id)
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	log.WithFields(log.Fields{
		"id":     id,
		"status": status,
	}).Info("Updated job status")

	return nil
}

// CancelJob cancels a scheduled job (only if currently pending).
func (db *DB) CancelJob(id uuid.UUID) error {
	query := `
		UPDATE scheduled_provisions
		SET status = $1, updated_at = NOW()
		WHERE id = $2 AND status = $3
	`

	result, err := db.Exec(query, StatusCancelled, id, StatusPending)
	if err != nil {
		return fmt.Errorf("failed to cancel job: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("job not found or not in pending status")
	}

	log.WithField("id", id).Info("Cancelled job")
	return nil
}

// IncrementJobRetryCount increments the retry_count for a job.
func (db *DB) IncrementJobRetryCount(id uuid.UUID) error {
	query := `
		UPDATE scheduled_provisions
		SET retry_count = retry_count + 1, updated_at = NOW()
		WHERE id = $1
	`

	_, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to increment job retry count: %w", err)
	}

	return nil
}
