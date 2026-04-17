package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/config"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/database"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/scheduler"
	log "github.com/sirupsen/logrus"
)

// Server represents the HTTP server
type Server struct {
	router    *mux.Router
	server    *http.Server
	db        *database.DB
	scheduler *scheduler.Scheduler
	cfg       *config.Config
}

// NewServer creates a new HTTP server
func NewServer(db *database.DB, sched *scheduler.Scheduler, cfg *config.Config) *Server {
	s := &Server{
		router:    mux.NewRouter(),
		db:        db,
		scheduler: sched,
		cfg:       cfg,
	}

	s.setupRoutes()
	return s
}

// setupRoutes configures the API routes
func (s *Server) setupRoutes() {
	// API routes
	api := s.router.PathPrefix("/api").Subrouter()

	api.HandleFunc("/schedule", s.createSchedule).Methods("POST")
	api.HandleFunc("/schedule", s.listSchedules).Methods("GET")
	api.HandleFunc("/schedule/{id}", s.getSchedule).Methods("GET")
	api.HandleFunc("/schedule/{id}", s.cancelSchedule).Methods("DELETE")
	api.HandleFunc("/schedule/{id}/execute", s.executeSchedule).Methods("POST")

	// Health check
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")

	// Middleware
	s.router.Use(loggingMiddleware)
	s.router.Use(corsMiddleware)
}

// Start starts the HTTP server
func (s *Server) Start() error {
	s.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", s.cfg.Server.Port),
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

// createSchedule creates a new scheduled job
func (s *Server) createSchedule(w http.ResponseWriter, r *http.Request) {
	var req struct {
		JobType         string          `json:"job_type"`
		Payload         json.RawMessage `json:"payload"`
		ScheduleTime    time.Time       `json:"schedule_time"`
		Tags            []string        `json:"tags"`
		TargetUserEmail *string         `json:"target_user_email,omitempty"`
		RequestedBy     *string         `json:"requested_by,omitempty"`
		ApprovalStatus  string          `json:"approval_status,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate job type
	if !database.ValidJobTypes[req.JobType] {
		respondError(w, http.StatusBadRequest, "Invalid job_type")
		return
	}

	// Validate payload
	if len(req.Payload) == 0 {
		respondError(w, http.StatusBadRequest, "payload is required")
		return
	}

	// Validate schedule time
	if req.ScheduleTime.IsZero() {
		respondError(w, http.StatusBadRequest, "schedule_time is required")
		return
	}

	if req.ScheduleTime.Before(time.Now()) {
		respondError(w, http.StatusBadRequest, "schedule_time must be in the future")
		return
	}

	approvalStatus := req.ApprovalStatus
	if approvalStatus == "" {
		approvalStatus = database.ApprovalAutoApproved
	}

	job := &database.ScheduledJob{
		JobType:         req.JobType,
		Payload:         database.JSONB(req.Payload),
		ScheduleTime:    req.ScheduleTime,
		Tags:            req.Tags,
		TargetUserEmail: req.TargetUserEmail,
		RequestedBy:     req.RequestedBy,
		ApprovalStatus:  approvalStatus,
	}

	if err := s.db.CreateScheduledJob(job); err != nil {
		log.Errorf("Failed to create scheduled job: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create schedule")
		return
	}

	respondJSON(w, http.StatusCreated, job)
}

// listSchedules lists scheduled jobs with optional filters
func (s *Server) listSchedules(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	var status, tag, jobType *string

	if sv := query.Get("status"); sv != "" {
		status = &sv
	}
	if tv := query.Get("tag"); tv != "" {
		tag = &tv
	}
	if jv := query.Get("type"); jv != "" {
		jobType = &jv
	}

	limit := 100
	if l := query.Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	offset := 0
	if o := query.Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	jobs, err := s.db.ListJobs(status, tag, jobType, limit, offset)
	if err != nil {
		log.Errorf("Failed to list jobs: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to list schedules")
		return
	}

	respondJSON(w, http.StatusOK, jobs)
}

// getSchedule retrieves a specific scheduled job
func (s *Server) getSchedule(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	job, err := s.db.GetJobByID(id)
	if err != nil {
		log.Errorf("Failed to get job: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to get schedule")
		return
	}

	if job == nil {
		respondError(w, http.StatusNotFound, "Schedule not found")
		return
	}

	respondJSON(w, http.StatusOK, job)
}

// cancelSchedule cancels a scheduled job
func (s *Server) cancelSchedule(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	if err := s.db.CancelJob(id); err != nil {
		log.Errorf("Failed to cancel job: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to cancel schedule")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Schedule cancelled successfully"})
}

// executeSchedule triggers immediate execution of a scheduled job
func (s *Server) executeSchedule(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	if err := s.scheduler.ExecuteImmediately(idStr); err != nil {
		log.Errorf("Failed to execute job: %v", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Job execution started"})
}

// healthCheck returns the health status
func (s *Server) healthCheck(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "1.0.0",
	}

	respondJSON(w, http.StatusOK, health)
}

// Helper functions

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// Middleware

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		log.WithFields(log.Fields{
			"method": r.Method,
			"path":   r.URL.Path,
		}).Info("Incoming request")

		next.ServeHTTP(w, r)

		log.WithFields(log.Fields{
			"method":   r.Method,
			"path":     r.URL.Path,
			"duration": time.Since(start),
		}).Info("Request completed")
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
