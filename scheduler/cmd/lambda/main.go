package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	log "github.com/sirupsen/logrus"
)

func handler(ctx context.Context, _ events.CloudWatchEvent) error {
	schedulerURL := os.Getenv("VERCEL_SCHEDULER_URL")
	apiKey := os.Getenv("SCHEDULER_API_KEY")

	if schedulerURL == "" {
		return fmt.Errorf("VERCEL_SCHEDULER_URL is not set")
	}

	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, schedulerURL, nil)
	if err != nil {
		return fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("x-scheduler-key", apiKey)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("scheduler call failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("scheduler endpoint returned status %d", resp.StatusCode)
	}

	log.Info("Scheduler run completed successfully")
	return nil
}

func main() {
	lambda.Start(handler)
}
