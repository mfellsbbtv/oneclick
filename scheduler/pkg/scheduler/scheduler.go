package scheduler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/config"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/database"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

// Scheduler manages scheduled provisioning jobs
type Scheduler struct {
	db     *database.DB
	cfg    *config.Config
	cron   *cron.Cron
	client *http.Client
}

// New creates a new Scheduler instance
func New(db *database.DB, cfg *config.Config) *Scheduler {
	return &Scheduler{
		db:   db,
		cfg:  cfg,
		cron: cron.New(cron.WithSeconds()),
		client: &http.Client{
			Timeout: time.Duration(cfg.Provisioning.Timeout) * time.Second,
		},
	}
}

// Start begins the scheduler
func (s *Scheduler) Start() error {
	_, err := s.cron.AddFunc(s.cfg.Scheduler.CheckInterval, s.checkAndExecute)
	if err != nil {
		return fmt.Errorf("failed to add cron job: %w", err)
	}

	s.cron.Start()
	log.Info("Scheduler started successfully")
	return nil
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	log.Info("Stopping scheduler...")
	s.cron.Stop()
	log.Info("Scheduler stopped")
}

// checkAndExecute checks for pending jobs and executes them
func (s *Scheduler) checkAndExecute() {
	jobs, err := s.db.GetPendingJobs()
	if err != nil {
		log.Errorf("Failed to get pending jobs: %v", err)
		return
	}

	if len(jobs) == 0 {
		log.Debug("No pending jobs to execute")
		return
	}

	log.Infof("Found %d pending jobs to execute", len(jobs))

	for _, job := range jobs {
		go s.executeJob(job)
	}
}

// executeJob executes a generic scheduled job, routing by job type.
func (s *Scheduler) executeJob(job database.ScheduledJob) {
	logger := log.WithFields(log.Fields{
		"id":       job.ID,
		"job_type": job.JobType,
	})

	logger.Info("Starting job execution")

	// Determine target URL based on job type
	var targetURL string
	switch job.JobType {
	case database.JobTypeProvision:
		targetURL = s.cfg.Provisioning.APIURL
	case database.JobTypeTerminate:
		targetURL = s.cfg.Termination.APIURL
	default:
		errMsg := fmt.Sprintf("unknown job type: %s", job.JobType)
		logger.Error(errMsg)
		if err := s.db.UpdateJobStatus(job.ID, database.StatusFailed, &errMsg); err != nil {
			logger.Errorf("Failed to update job status to failed: %v", err)
		}
		return
	}

	// Update status to executing
	if err := s.db.UpdateJobStatus(job.ID, database.StatusExecuting, nil); err != nil {
		logger.Errorf("Failed to update status to executing: %v", err)
		return
	}

	// POST the raw JSON payload to the target URL
	resp, err := s.client.Post(
		targetURL,
		"application/json",
		bytes.NewReader([]byte(job.Payload)),
	)
	if err != nil {
		logger.Errorf("Failed to call %s API: %v", job.JobType, err)
		s.handleJobFailure(job, fmt.Sprintf("API call failed: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errMsg := fmt.Sprintf("API returned status %d", resp.StatusCode)
		logger.Error(errMsg)
		s.handleJobFailure(job, errMsg)
		return
	}

	// Success
	logger.Info("Job completed successfully")
	if err := s.db.UpdateJobStatus(job.ID, database.StatusCompleted, nil); err != nil {
		logger.Errorf("Failed to update status to completed: %v", err)
	}
}

// handleJobFailure handles a failed job with retry logic.
func (s *Scheduler) handleJobFailure(job database.ScheduledJob, errorMsg string) {
	logger := log.WithField("id", job.ID)

	if err := s.db.IncrementJobRetryCount(job.ID); err != nil {
		logger.Errorf("Failed to increment retry count: %v", err)
	}

	if job.RetryCount < s.cfg.Scheduler.MaxRetries {
		logger.Infof("Scheduling retry %d/%d in %d seconds",
			job.RetryCount+1, s.cfg.Scheduler.MaxRetries, s.cfg.Scheduler.RetryDelay)

		if err := s.db.UpdateJobStatus(job.ID, database.StatusPending, &errorMsg); err != nil {
			logger.Errorf("Failed to reset status for retry: %v", err)
		}
	} else {
		logger.Error("Max retries reached, marking as failed")
		if err := s.db.UpdateJobStatus(job.ID, database.StatusFailed, &errorMsg); err != nil {
			logger.Errorf("Failed to update status to failed: %v", err)
		}
	}
}

// ExecuteImmediately executes a job immediately, bypassing the schedule.
func (s *Scheduler) ExecuteImmediately(jobID string) error {
	id, err := uuid.Parse(jobID)
	if err != nil {
		return fmt.Errorf("invalid job ID: %w", err)
	}

	job, err := s.db.GetJobByID(id)
	if err != nil {
		return fmt.Errorf("failed to get job: %w", err)
	}

	if job == nil {
		return fmt.Errorf("job not found")
	}

	if job.Status != database.StatusPending {
		return fmt.Errorf("job is not in pending status")
	}

	go s.executeJob(*job)
	return nil
}

// executeProvision is kept for backward compatibility.
func (s *Scheduler) executeProvision(provision database.ScheduledProvision) {
	logger := log.WithFields(log.Fields{
		"id":       provision.ID,
		"employee": provision.EmployeeData.FullName,
		"email":    provision.EmployeeData.WorkEmail,
	})

	logger.Info("Starting provision execution (legacy path)")

	if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusExecuting, nil); err != nil {
		logger.Errorf("Failed to update status to executing: %v", err)
		return
	}

	payload := map[string]interface{}{
		"employee":     provision.EmployeeData,
		"applications": provision.Applications,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		errMsg := fmt.Sprintf("Failed to marshal payload: %v", err)
		logger.Error(errMsg)
		s.db.UpdateProvisionStatus(provision.ID, database.StatusFailed, &errMsg) //nolint:errcheck
		return
	}

	resp, err := s.client.Post(
		s.cfg.Provisioning.APIURL,
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		logger.Errorf("Failed to call provisioning API: %v", err)
		s.handleProvisionFailure(provision, fmt.Sprintf("API call failed: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errMsg := fmt.Sprintf("API returned status %d", resp.StatusCode)
		logger.Error(errMsg)
		s.handleProvisionFailure(provision, errMsg)
		return
	}

	logger.Info("Provision completed successfully")
	if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusCompleted, nil); err != nil {
		logger.Errorf("Failed to update status to completed: %v", err)
	}
}

// handleProvisionFailure is kept for backward compatibility.
func (s *Scheduler) handleProvisionFailure(provision database.ScheduledProvision, errorMsg string) {
	logger := log.WithField("id", provision.ID)

	if err := s.db.IncrementRetryCount(provision.ID); err != nil {
		logger.Errorf("Failed to increment retry count: %v", err)
	}

	if provision.RetryCount < s.cfg.Scheduler.MaxRetries {
		logger.Infof("Scheduling retry %d/%d in %d seconds",
			provision.RetryCount+1, s.cfg.Scheduler.MaxRetries, s.cfg.Scheduler.RetryDelay)

		if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusPending, &errorMsg); err != nil {
			logger.Errorf("Failed to reset status for retry: %v", err)
		}
	} else {
		logger.Error("Max retries reached, marking as failed")
		if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusFailed, &errorMsg); err != nil {
			logger.Errorf("Failed to update status to failed: %v", err)
		}
	}
}
