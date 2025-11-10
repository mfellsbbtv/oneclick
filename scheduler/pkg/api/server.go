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

// createSchedule creates a new scheduled provision
func (s *Server) createSchedule(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Employee     database.EmployeeData     `json:"employee"`
		Applications database.ApplicationsData `json:"applications"`
		ScheduleTime time.Time                 `json:"schedule_time"`
		Tags         []string                  `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate
	if req.Employee.FullName == "" || req.Employee.WorkEmail == "" {
		respondError(w, http.StatusBadRequest, "Employee full name and email are required")
		return
	}

	if req.ScheduleTime.IsZero() {
		respondError(w, http.StatusBadRequest, "Schedule time is required")
		return
	}

	if req.ScheduleTime.Before(time.Now()) {
		respondError(w, http.StatusBadRequest, "Schedule time must be in the future")
		return
	}

	// Create scheduled provision
	sp := &database.ScheduledProvision{
		EmployeeData: req.Employee,
		Applications: req.Applications,
		ScheduleTime: req.ScheduleTime,
		Tags:         req.Tags,
	}

	if err := s.db.CreateScheduledProvision(sp); err != nil {
		log.Errorf("Failed to create scheduled provision: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create schedule")
		return
	}

	respondJSON(w, http.StatusCreated, sp)
}

// listSchedules lists scheduled provisions with filters
func (s *Server) listSchedules(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	var status, tag *string
	if s := query.Get("status"); s != "" {
		status = &s
	}
	if t := query.Get("tag"); t != "" {
		tag = &t
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

	provisions, err := s.db.ListProvisions(status, tag, limit, offset)
	if err != nil {
		log.Errorf("Failed to list provisions: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to list schedules")
		return
	}

	respondJSON(w, http.StatusOK, provisions)
}

// getSchedule retrieves a specific scheduled provision
func (s *Server) getSchedule(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	provision, err := s.db.GetProvisionByID(id)
	if err != nil {
		log.Errorf("Failed to get provision: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to get schedule")
		return
	}

	if provision == nil {
		respondError(w, http.StatusNotFound, "Schedule not found")
		return
	}

	respondJSON(w, http.StatusOK, provision)
}

// cancelSchedule cancels a scheduled provision
func (s *Server) cancelSchedule(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	if err := s.db.CancelProvision(id); err != nil {
		log.Errorf("Failed to cancel provision: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to cancel schedule")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Schedule cancelled successfully"})
}

// executeSchedule triggers immediate execution of a scheduled provision
func (s *Server) executeSchedule(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]

	if err := s.scheduler.ExecuteImmediately(idStr); err != nil {
		log.Errorf("Failed to execute provision: %v", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Provision execution started"})
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
	w.WriteStatus(status)
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
