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

	// Third migration: expand job types, add approval and target user tracking
	migrationV3 := `
	ALTER TABLE scheduled_provisions DROP CONSTRAINT IF EXISTS valid_job_type;
	ALTER TABLE scheduled_provisions ADD CONSTRAINT valid_job_type CHECK (
		job_type IN (
			'provision', 'terminate', 'suspend', 'reactivate',
			'modify_groups', 'modify_license', 'modify_role',
			'password_reset', 'transfer_ownership'
		)
	);
	ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS target_user_email VARCHAR(255);
	ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
	ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
	ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'auto_approved';
	ALTER TABLE scheduled_provisions DROP CONSTRAINT IF EXISTS valid_approval_status;
	ALTER TABLE scheduled_provisions ADD CONSTRAINT valid_approval_status CHECK (
		approval_status IN ('pending_approval', 'approved', 'rejected', 'auto_approved')
	);
	CREATE INDEX IF NOT EXISTS idx_approval_status ON scheduled_provisions(approval_status) WHERE approval_status = 'pending_approval';
	CREATE INDEX IF NOT EXISTS idx_target_user ON scheduled_provisions(target_user_email);
	`

	_, err = db.Exec(migrationV3)
	if err != nil {
		return fmt.Errorf("failed to run v3 migrations: %w", err)
	}

	// Fourth migration: managed_users, directory sync, and change requests tables
	migrationV4 := `
	CREATE TABLE IF NOT EXISTS managed_users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		email VARCHAR(255) NOT NULL UNIQUE,
		full_name VARCHAR(255) NOT NULL,
		given_name VARCHAR(128),
		family_name VARCHAR(128),
		department VARCHAR(255),
		job_title VARCHAR(255),
		manager_email VARCHAR(255),
		org_unit_path VARCHAR(512),
		is_admin BOOLEAN DEFAULT false,
		is_delegated_admin BOOLEAN DEFAULT false,
		is_suspended BOOLEAN DEFAULT false,
		google_id VARCHAR(255) UNIQUE,
		status VARCHAR(50) NOT NULL DEFAULT 'active',
		metadata JSONB DEFAULT '{}'::jsonb,
		last_synced_at TIMESTAMP WITH TIME ZONE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_managed_users_email ON managed_users(email);
	CREATE INDEX IF NOT EXISTS idx_managed_users_status ON managed_users(status);
	CREATE INDEX IF NOT EXISTS idx_managed_users_department ON managed_users(department);
	CREATE INDEX IF NOT EXISTS idx_managed_users_google_id ON managed_users(google_id);

	CREATE TABLE IF NOT EXISTS user_app_accounts (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		managed_user_id UUID NOT NULL REFERENCES managed_users(id) ON DELETE CASCADE,
		app_provider VARCHAR(50) NOT NULL,
		status VARCHAR(50) NOT NULL DEFAULT 'not_provisioned',
		external_user_id VARCHAR(255),
		external_email VARCHAR(255),
		license_info JSONB DEFAULT '[]'::jsonb,
		groups_info JSONB DEFAULT '[]'::jsonb,
		role_info JSONB DEFAULT '{}'::jsonb,
		metadata JSONB DEFAULT '{}'::jsonb,
		provisioned_at TIMESTAMP WITH TIME ZONE,
		last_modified_at TIMESTAMP WITH TIME ZONE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(managed_user_id, app_provider)
	);
	CREATE INDEX IF NOT EXISTS idx_user_app_accounts_user ON user_app_accounts(managed_user_id);
	CREATE INDEX IF NOT EXISTS idx_user_app_accounts_provider ON user_app_accounts(app_provider);

	CREATE TABLE IF NOT EXISTS directory_sync_runs (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		status VARCHAR(20) NOT NULL DEFAULT 'running',
		users_synced INTEGER DEFAULT 0,
		users_added INTEGER DEFAULT 0,
		users_updated INTEGER DEFAULT 0,
		users_removed INTEGER DEFAULT 0,
		errors JSONB DEFAULT '[]'::jsonb,
		started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		completed_at TIMESTAMP WITH TIME ZONE
	);
	CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON directory_sync_runs(started_at DESC);

	CREATE TABLE IF NOT EXISTS change_requests (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		request_type VARCHAR(30) NOT NULL,
		target_user_email VARCHAR(255) NOT NULL,
		target_user_name VARCHAR(255),
		payload JSONB NOT NULL,
		schedule_time TIMESTAMP WITH TIME ZONE,
		status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
		requested_by VARCHAR(255) NOT NULL,
		requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		approved_by VARCHAR(255),
		approved_at TIMESTAMP WITH TIME ZONE,
		executed_at TIMESTAMP WITH TIME ZONE,
		error_message TEXT,
		retry_count INTEGER DEFAULT 0,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_cr_status ON change_requests(status);
	CREATE INDEX IF NOT EXISTS idx_cr_type ON change_requests(request_type);
	CREATE INDEX IF NOT EXISTS idx_cr_target ON change_requests(target_user_email);
	CREATE INDEX IF NOT EXISTS idx_cr_requested_by ON change_requests(requested_by);

	CREATE TABLE IF NOT EXISTS approval_actions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
		action VARCHAR(10) NOT NULL,
		actor_email VARCHAR(255) NOT NULL,
		reason TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(change_request_id);
	`

	_, err = db.Exec(migrationV4)
	if err != nil {
		return fmt.Errorf("failed to run v4 migrations: %w", err)
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
	if job.ApprovalStatus == "" {
		job.ApprovalStatus = ApprovalAutoApproved
	}

	query := `
		INSERT INTO scheduled_provisions (
			id, job_type, payload, schedule_time, status, tags,
			target_user_email, requested_by, approved_by, approval_status,
			created_at, updated_at, retry_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err := db.Exec(query,
		job.ID,
		job.JobType,
		job.Payload,
		job.ScheduleTime,
		job.Status,
		job.Tags,
		job.TargetUserEmail,
		job.RequestedBy,
		job.ApprovedBy,
		job.ApprovalStatus,
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

// jobColumns is the standard column list for ScheduledJob queries.
const jobColumns = `id, job_type, payload, schedule_time, status, tags,
	target_user_email, requested_by, approved_by, approval_status,
	created_at, updated_at, executed_at, error_message, retry_count`

// scanJob scans a ScheduledJob from a row.
func scanJob(scan func(dest ...interface{}) error) (ScheduledJob, error) {
	var j ScheduledJob
	err := scan(
		&j.ID, &j.JobType, &j.Payload, &j.ScheduleTime, &j.Status, &j.Tags,
		&j.TargetUserEmail, &j.RequestedBy, &j.ApprovedBy, &j.ApprovalStatus,
		&j.CreatedAt, &j.UpdatedAt, &j.ExecutedAt, &j.ErrorMessage, &j.RetryCount,
	)
	return j, err
}

// GetPendingJobs returns all pending jobs whose schedule_time has arrived
// and whose approval_status allows execution.
func (db *DB) GetPendingJobs() ([]ScheduledJob, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM scheduled_provisions
		WHERE status = $1 AND schedule_time <= NOW()
		  AND approval_status IN ('approved', 'auto_approved')
		ORDER BY schedule_time ASC
	`, jobColumns)

	rows, err := db.Query(query, StatusPending)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending jobs: %w", err)
	}
	defer rows.Close()

	var jobs []ScheduledJob
	for rows.Next() {
		j, err := scanJob(rows.Scan)
		if err != nil {
			return nil, fmt.Errorf("failed to scan job: %w", err)
		}
		jobs = append(jobs, j)
	}

	return jobs, nil
}

// GetJobByID retrieves a generic job by its UUID.
func (db *DB) GetJobByID(id uuid.UUID) (*ScheduledJob, error) {
	query := fmt.Sprintf(`SELECT %s FROM scheduled_provisions WHERE id = $1`, jobColumns)

	j, err := scanJob(db.QueryRow(query, id).Scan)
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
	query := fmt.Sprintf(`SELECT %s FROM scheduled_provisions WHERE 1=1`, jobColumns)

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
		j, err := scanJob(rows.Scan)
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

// ---- ManagedUser methods ----

// ListManagedUsers returns a paginated, optionally filtered list of users.
func (db *DB) ListManagedUsers(search *string, department *string, status *string, limit, offset int) ([]ManagedUser, error) {
	query := `
		SELECT id, email, full_name, given_name, family_name, department, job_title,
		       manager_email, org_unit_path, is_admin, is_delegated_admin,
		       is_suspended, google_id, status, metadata, last_synced_at,
		       created_at, updated_at
		FROM managed_users
		WHERE 1=1
	`
	args := []interface{}{}
	n := 0

	if search != nil && *search != "" {
		n++
		query += fmt.Sprintf(" AND (email ILIKE $%d OR full_name ILIKE $%d)", n, n)
		args = append(args, "%"+*search+"%")
	}
	if department != nil {
		n++
		query += fmt.Sprintf(" AND department = $%d", n)
		args = append(args, *department)
	}
	if status != nil {
		n++
		query += fmt.Sprintf(" AND status = $%d", n)
		args = append(args, *status)
	}

	query += " ORDER BY full_name ASC"
	n++
	query += fmt.Sprintf(" LIMIT $%d", n)
	args = append(args, limit)
	n++
	query += fmt.Sprintf(" OFFSET $%d", n)
	args = append(args, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list managed users: %w", err)
	}
	defer rows.Close()

	var users []ManagedUser
	for rows.Next() {
		var u ManagedUser
		err := rows.Scan(
			&u.ID, &u.Email, &u.FullName, &u.GivenName, &u.FamilyName,
			&u.Department, &u.JobTitle, &u.ManagerEmail, &u.OrgUnitPath,
			&u.IsAdmin, &u.IsDelegatedAdmin, &u.IsSuspended,
			&u.GoogleID, &u.Status, &u.Metadata, &u.LastSyncedAt,
			&u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan managed user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

// GetManagedUserByEmail retrieves a single user by email.
func (db *DB) GetManagedUserByEmail(email string) (*ManagedUser, error) {
	query := `
		SELECT id, email, full_name, given_name, family_name, department, job_title,
		       manager_email, org_unit_path, is_admin, is_delegated_admin,
		       is_suspended, google_id, status, metadata, last_synced_at,
		       created_at, updated_at
		FROM managed_users WHERE email = $1
	`
	var u ManagedUser
	err := db.QueryRow(query, email).Scan(
		&u.ID, &u.Email, &u.FullName, &u.GivenName, &u.FamilyName,
		&u.Department, &u.JobTitle, &u.ManagerEmail, &u.OrgUnitPath,
		&u.IsAdmin, &u.IsDelegatedAdmin, &u.IsSuspended,
		&u.GoogleID, &u.Status, &u.Metadata, &u.LastSyncedAt,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get managed user: %w", err)
	}
	return &u, nil
}

// ---- DirectorySyncRun methods ----

// CreateSyncRun starts a new sync run record.
func (db *DB) CreateSyncRun() (*DirectorySyncRun, error) {
	run := &DirectorySyncRun{
		ID:        uuid.New(),
		Status:    "running",
		StartedAt: time.Now(),
	}
	_, err := db.Exec(`
		INSERT INTO directory_sync_runs (id, status, started_at)
		VALUES ($1, $2, $3)
	`, run.ID, run.Status, run.StartedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create sync run: %w", err)
	}
	return run, nil
}

// CompleteSyncRun finalises a sync run with counts and status.
func (db *DB) CompleteSyncRun(id uuid.UUID, status string, synced, added, updated, removed int, errors JSONB) error {
	_, err := db.Exec(`
		UPDATE directory_sync_runs
		SET status=$1, users_synced=$2, users_added=$3, users_updated=$4,
		    users_removed=$5, errors=$6, completed_at=NOW()
		WHERE id=$7
	`, status, synced, added, updated, removed, errors, id)
	if err != nil {
		return fmt.Errorf("failed to complete sync run: %w", err)
	}
	return nil
}

// ---- ChangeRequest methods ----

// CreateChangeRequest inserts a new change request.
func (db *DB) CreateChangeRequest(cr *ChangeRequest) error {
	cr.ID = uuid.New()
	cr.CreatedAt = time.Now()
	cr.UpdatedAt = time.Now()
	cr.RequestedAt = time.Now()
	cr.Status = CRStatusPendingApproval
	cr.RetryCount = 0

	_, err := db.Exec(`
		INSERT INTO change_requests (
			id, request_type, target_user_email, target_user_name, payload,
			schedule_time, status, requested_by, requested_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`, cr.ID, cr.RequestType, cr.TargetUserEmail, cr.TargetUserName, cr.Payload,
		cr.ScheduleTime, cr.Status, cr.RequestedBy, cr.RequestedAt,
		cr.CreatedAt, cr.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create change request: %w", err)
	}
	log.WithFields(log.Fields{
		"id":           cr.ID,
		"request_type": cr.RequestType,
		"target":       cr.TargetUserEmail,
		"requested_by": cr.RequestedBy,
	}).Info("Created change request")
	return nil
}

const crColumns = `id, request_type, target_user_email, target_user_name, payload,
	schedule_time, status, requested_by, requested_at, approved_by, approved_at,
	executed_at, error_message, retry_count, created_at, updated_at`

func scanChangeRequest(scan func(dest ...interface{}) error) (ChangeRequest, error) {
	var cr ChangeRequest
	err := scan(
		&cr.ID, &cr.RequestType, &cr.TargetUserEmail, &cr.TargetUserName, &cr.Payload,
		&cr.ScheduleTime, &cr.Status, &cr.RequestedBy, &cr.RequestedAt,
		&cr.ApprovedBy, &cr.ApprovedAt, &cr.ExecutedAt, &cr.ErrorMessage,
		&cr.RetryCount, &cr.CreatedAt, &cr.UpdatedAt,
	)
	return cr, err
}

// GetChangeRequestByID retrieves a change request by ID.
func (db *DB) GetChangeRequestByID(id uuid.UUID) (*ChangeRequest, error) {
	query := fmt.Sprintf(`SELECT %s FROM change_requests WHERE id = $1`, crColumns)
	cr, err := scanChangeRequest(db.QueryRow(query, id).Scan)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get change request: %w", err)
	}
	return &cr, nil
}

// ListChangeRequests returns change requests with optional filters.
func (db *DB) ListChangeRequests(status, requestType, requestedBy, targetEmail *string, limit, offset int) ([]ChangeRequest, error) {
	query := fmt.Sprintf(`SELECT %s FROM change_requests WHERE 1=1`, crColumns)
	args := []interface{}{}
	n := 0

	if status != nil {
		n++
		query += fmt.Sprintf(" AND status = $%d", n)
		args = append(args, *status)
	}
	if requestType != nil {
		n++
		query += fmt.Sprintf(" AND request_type = $%d", n)
		args = append(args, *requestType)
	}
	if requestedBy != nil {
		n++
		query += fmt.Sprintf(" AND requested_by = $%d", n)
		args = append(args, *requestedBy)
	}
	if targetEmail != nil {
		n++
		query += fmt.Sprintf(" AND target_user_email = $%d", n)
		args = append(args, *targetEmail)
	}

	query += " ORDER BY created_at DESC"
	n++
	query += fmt.Sprintf(" LIMIT $%d", n)
	args = append(args, limit)
	n++
	query += fmt.Sprintf(" OFFSET $%d", n)
	args = append(args, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list change requests: %w", err)
	}
	defer rows.Close()

	var results []ChangeRequest
	for rows.Next() {
		cr, err := scanChangeRequest(rows.Scan)
		if err != nil {
			return nil, fmt.Errorf("failed to scan change request: %w", err)
		}
		results = append(results, cr)
	}
	return results, nil
}

// ApproveChangeRequest marks a change request as approved.
func (db *DB) ApproveChangeRequest(id uuid.UUID, approverEmail string) error {
	now := time.Now()
	res, err := db.Exec(`
		UPDATE change_requests
		SET status=$1, approved_by=$2, approved_at=$3, updated_at=$4
		WHERE id=$5 AND status=$6
	`, CRStatusApproved, approverEmail, now, now, id, CRStatusPendingApproval)
	if err != nil {
		return fmt.Errorf("failed to approve change request: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("change request not found or not pending approval")
	}
	_, err = db.Exec(`
		INSERT INTO approval_actions (change_request_id, action, actor_email)
		VALUES ($1, 'approve', $2)
	`, id, approverEmail)
	return err
}

// RejectChangeRequest marks a change request as rejected.
func (db *DB) RejectChangeRequest(id uuid.UUID, approverEmail, reason string) error {
	now := time.Now()
	res, err := db.Exec(`
		UPDATE change_requests
		SET status=$1, approved_by=$2, approved_at=$3, updated_at=$4
		WHERE id=$5 AND status=$6
	`, CRStatusRejected, approverEmail, now, now, id, CRStatusPendingApproval)
	if err != nil {
		return fmt.Errorf("failed to reject change request: %w", err)
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return fmt.Errorf("change request not found or not pending approval")
	}
	_, err = db.Exec(`
		INSERT INTO approval_actions (change_request_id, action, actor_email, reason)
		VALUES ($1, 'reject', $2, $3)
	`, id, approverEmail, reason)
	return err
}

// UpdateChangeRequestStatus updates the execution status of a change request.
func (db *DB) UpdateChangeRequestStatus(id uuid.UUID, status string, errorMsg *string) error {
	now := time.Now()
	var executedAt *time.Time
	if status == CRStatusCompleted || status == CRStatusFailed {
		executedAt = &now
	}
	_, err := db.Exec(`
		UPDATE change_requests
		SET status=$1, executed_at=$2, error_message=$3, updated_at=$4
		WHERE id=$5
	`, status, executedAt, errorMsg, now, id)
	if err != nil {
		return fmt.Errorf("failed to update change request status: %w", err)
	}
	return nil
}

// GetPendingChangeRequests returns approved requests ready to execute.
func (db *DB) GetPendingChangeRequests() ([]ChangeRequest, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM change_requests
		WHERE status = $1
		  AND (schedule_time IS NULL OR schedule_time <= NOW())
		ORDER BY requested_at ASC
	`, crColumns)

	rows, err := db.Query(query, CRStatusApproved)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending change requests: %w", err)
	}
	defer rows.Close()

	var results []ChangeRequest
	for rows.Next() {
		cr, err := scanChangeRequest(rows.Scan)
		if err != nil {
			return nil, fmt.Errorf("failed to scan change request: %w", err)
		}
		results = append(results, cr)
	}
	return results, nil
}
