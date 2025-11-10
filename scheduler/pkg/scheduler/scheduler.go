package scheduler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

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
	// Add cron job to check for pending provisions
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

// checkAndExecute checks for pending provisions and executes them
func (s *Scheduler) checkAndExecute() {
	provisions, err := s.db.GetPendingProvisions()
	if err != nil {
		log.Errorf("Failed to get pending provisions: %v", err)
		return
	}

	if len(provisions) == 0 {
		log.Debug("No pending provisions to execute")
		return
	}

	log.Infof("Found %d pending provisions to execute", len(provisions))

	for _, provision := range provisions {
		go s.executeProvision(provision)
	}
}

// executeProvision executes a single provisioning job
func (s *Scheduler) executeProvision(provision database.ScheduledProvision) {
	logger := log.WithFields(log.Fields{
		"id":       provision.ID,
		"employee": provision.EmployeeData.FullName,
		"email":    provision.EmployeeData.WorkEmail,
	})

	logger.Info("Starting provision execution")

	// Update status to executing
	if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusExecuting, nil); err != nil {
		logger.Errorf("Failed to update status to executing: %v", err)
		return
	}

	// Prepare request payload
	payload := map[string]interface{}{
		"employee":     provision.EmployeeData,
		"applications": provision.Applications,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		logger.Errorf("Failed to marshal payload: %v", err)
		errMsg := fmt.Sprintf("Failed to marshal payload: %v", err)
		s.db.UpdateProvisionStatus(provision.ID, database.StatusFailed, &errMsg)
		return
	}

	// Make API request
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

	// Check response
	if resp.StatusCode != http.StatusOK {
		var responseBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&responseBody)

		errMsg := fmt.Sprintf("API returned status %d: %v", resp.StatusCode, responseBody)
		logger.Error(errMsg)
		s.handleProvisionFailure(provision, errMsg)
		return
	}

	// Success
	logger.Info("Provision completed successfully")
	if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusCompleted, nil); err != nil {
		logger.Errorf("Failed to update status to completed: %v", err)
	}
}

// handleProvisionFailure handles a failed provision with retry logic
func (s *Scheduler) handleProvisionFailure(provision database.ScheduledProvision, errorMsg string) {
	logger := log.WithField("id", provision.ID)

	// Increment retry count
	if err := s.db.IncrementRetryCount(provision.ID); err != nil {
		logger.Errorf("Failed to increment retry count: %v", err)
	}

	// Check if we should retry
	if provision.RetryCount < s.cfg.Scheduler.MaxRetries {
		logger.Infof("Scheduling retry %d/%d in %d seconds",
			provision.RetryCount+1, s.cfg.Scheduler.MaxRetries, s.cfg.Scheduler.RetryDelay)

		// Reset to pending for retry
		if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusPending, &errorMsg); err != nil {
			logger.Errorf("Failed to reset status for retry: %v", err)
		}
	} else {
		// Max retries reached
		logger.Error("Max retries reached, marking as failed")
		if err := s.db.UpdateProvisionStatus(provision.ID, database.StatusFailed, &errorMsg); err != nil {
			logger.Errorf("Failed to update status to failed: %v", err)
		}
	}
}

// ExecuteImmediately executes a provision immediately, bypassing schedule
func (s *Scheduler) ExecuteImmediately(provisionID string) error {
	provision, err := s.db.GetProvisionByID(mustParseUUID(provisionID))
	if err != nil {
		return fmt.Errorf("failed to get provision: %w", err)
	}

	if provision == nil {
		return fmt.Errorf("provision not found")
	}

	if provision.Status != database.StatusPending {
		return fmt.Errorf("provision is not in pending status")
	}

	go s.executeProvision(*provision)
	return nil
}

func mustParseUUID(s string) [16]byte {
	var uuid [16]byte
	fmt.Sscanf(s, "%x-%x-%x-%x-%x",
		&uuid[0:4], &uuid[4:6], &uuid[6:8], &uuid[8:10], &uuid[10:16])
	return uuid
}
