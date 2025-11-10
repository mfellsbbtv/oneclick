package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mfellsbbtv/oneclick-scheduler/pkg/api"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/config"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/database"
	"github.com/mfellsbbtv/oneclick-scheduler/pkg/scheduler"
	log "github.com/sirupsen/logrus"
)

func main() {
	// Load configuration
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Configure logging
	setupLogging(cfg)
	log.Info("Starting OneClick Provisioning Scheduler")

	// Initialize database
	db, err := database.Connect(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Info("Database connection established")

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize scheduler
	sched := scheduler.New(db, cfg)
	if err := sched.Start(); err != nil {
		log.Fatalf("Failed to start scheduler: %v", err)
	}

	log.Infof("Scheduler started with interval: %s", cfg.Scheduler.CheckInterval)

	// Start HTTP server
	server := api.NewServer(db, sched, cfg)
	go func() {
		log.Infof("Starting API server on port %d", cfg.Server.Port)
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start API server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down gracefully...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	sched.Stop()
	if err := server.Shutdown(ctx); err != nil {
		log.Errorf("Server forced to shutdown: %v", err)
	}

	log.Info("Scheduler stopped successfully")
}

func setupLogging(cfg *config.Config) {
	// Set log level
	level, err := log.ParseLevel(cfg.Logging.Level)
	if err != nil {
		level = log.InfoLevel
	}
	log.SetLevel(level)

	// Set log format
	if cfg.Logging.Format == "json" {
		log.SetFormatter(&log.JSONFormatter{})
	} else {
		log.SetFormatter(&log.TextFormatter{
			FullTimestamp: true,
		})
	}

	// Set output
	if cfg.Logging.Output != "" && cfg.Logging.Output != "stdout" {
		file, err := os.OpenFile(cfg.Logging.Output, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err == nil {
			log.SetOutput(file)
		} else {
			log.Warnf("Failed to open log file %s: %v", cfg.Logging.Output, err)
		}
	}
}
