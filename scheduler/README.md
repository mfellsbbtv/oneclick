# OneClick Delayed Provisioning Scheduler

Go-based cron job scheduler for delayed user provisioning based on tags.

## Overview

This application monitors user provisioning requests with specific tags and automatically provisions them at scheduled times using cron jobs.

## Features

- **Tag-Based Scheduling:** Users tagged with "to be created" are scheduled for provisioning
- **Cron Job Management:** Flexible scheduling using cron expressions
- **Multiple Providers:** Supports Google Workspace, Microsoft 365, and other providers
- **Database Integration:** PostgreSQL for storing scheduled provisioning jobs
- **REST API:** Manage scheduled jobs via HTTP endpoints
- **Logging:** Comprehensive logging of all provisioning activities

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 OneClick Frontend                        │
│  Creates user with "to be created" tag + schedule date  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               PostgreSQL Database                        │
│      scheduled_provisions table                          │
│      - id, user_data, schedule_time, status, tags       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Go Scheduler Service (Cron)                     │
│   Checks every minute for jobs to execute                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Provisioning API (N8N or Direct)                  │
│   Provisions users in Google Workspace, Microsoft 365    │
└─────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 13+
- Access to provisioning APIs

### Setup

```bash
# Install dependencies
cd scheduler
go mod init oneclick-scheduler
go mod tidy

# Build the application
go build -o scheduler cmd/scheduler/main.go

# Run
./scheduler
```

## Configuration

Create a `config.yaml` file:

```yaml
database:
  host: localhost
  port: 5432
  user: postgres
  password: password
  dbname: oneclick

scheduler:
  check_interval: "*/1 * * * *"  # Check every minute
  timezone: "America/Los_Angeles"

provisioning:
  api_url: "http://localhost:3000/api/provision-n8n"
  timeout: 300  # 5 minutes
  retry_attempts: 3
  retry_delay: 60  # seconds

logging:
  level: info
  format: json
  output: /var/log/oneclick-scheduler.log
```

## Database Schema

```sql
CREATE TABLE scheduled_provisions (
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

CREATE INDEX idx_schedule_time ON scheduled_provisions(schedule_time) WHERE status = 'pending';
CREATE INDEX idx_tags ON scheduled_provisions USING GIN(tags);
CREATE INDEX idx_status ON scheduled_provisions(status);
```

## API Endpoints

### Create Scheduled Provision

```bash
POST /api/schedule
Content-Type: application/json

{
  "employee": {
    "fullName": "John Doe",
    "workEmail": "jdoe@company.com",
    "department": "Engineering",
    "jobTitle": "Software Engineer",
    "role": "developer"
  },
  "applications": {
    "google": true,
    "microsoft": true,
    "google-workspace": { ... },
    "microsoft-365": { ... }
  },
  "schedule_time": "2025-12-01T09:00:00Z",
  "tags": ["to be created", "new-hire"]
}
```

### List Scheduled Provisions

```bash
GET /api/schedule?status=pending&tag=to-be-created
```

### Cancel Scheduled Provision

```bash
DELETE /api/schedule/:id
```

### Trigger Immediate Execution

```bash
POST /api/schedule/:id/execute
```

## Usage Examples

### Schedule a user for future provisioning

```go
package main

import (
    "time"
    "oneclick-scheduler/pkg/scheduler"
)

func main() {
    // Create a scheduled provision for next Monday at 9 AM
    nextMonday := getNextMonday()

    job := &scheduler.ScheduledProvision{
        Employee: Employee{
            FullName:      "Jane Smith",
            WorkEmail:     "jsmith@company.com",
            Department:    "Sales",
            JobTitle:      "Account Executive",
        },
        Applications: Applications{
            Google: true,
            Microsoft: true,
        },
        ScheduleTime: nextMonday,
        Tags: []string{"to be created", "sales-team"},
    }

    err := scheduler.CreateJob(job)
    if err != nil {
        log.Fatal(err)
    }
}
```

## Cron Expression Examples

- `*/1 * * * *` - Every minute
- `0 9 * * 1-5` - Every weekday at 9 AM
- `0 0 1 * *` - First day of every month at midnight
- `0 9 * * MON` - Every Monday at 9 AM

## Environment Variables

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=oneclick

# Provisioning API
PROVISIONING_API_URL=http://localhost:3000/api/provision-n8n
PROVISIONING_TIMEOUT=300

# Scheduler
SCHEDULER_INTERVAL="*/1 * * * *"
SCHEDULER_TIMEZONE="America/Los_Angeles"

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Monitoring

The scheduler exposes metrics at `/metrics` for Prometheus:

- `scheduled_provisions_total` - Total scheduled provisions
- `provisions_executed_total` - Total executed provisions
- `provisions_failed_total` - Total failed provisions
- `provision_execution_duration_seconds` - Execution duration histogram

## Development

### Project Structure

```
scheduler/
├── cmd/
│   └── scheduler/
│       └── main.go              # Application entry point
├── pkg/
│   ├── config/
│   │   └── config.go            # Configuration management
│   ├── database/
│   │   ├── db.go                # Database connection
│   │   └── models.go            # Database models
│   ├── scheduler/
│   │   ├── scheduler.go         # Core scheduler logic
│   │   ├── cron.go              # Cron job management
│   │   └── executor.go          # Provision execution
│   ├── api/
│   │   ├── handlers.go          # HTTP handlers
│   │   └── routes.go            # Route definitions
│   └── provisioning/
│       ├── client.go            # Provisioning API client
│       └── types.go             # Type definitions
├── migrations/
│   └── 001_create_scheduled_provisions.sql
├── config.yaml                   # Default configuration
├── go.mod
├── go.sum
└── README.md
```

### Running Tests

```bash
go test ./...
```

### Building Docker Image

```bash
docker build -t oneclick-scheduler .
docker run -d --name scheduler \
  -e DATABASE_HOST=postgres \
  -e DATABASE_PASSWORD=password \
  oneclick-scheduler
```

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  scheduler:
    build: ./scheduler
    environment:
      DATABASE_HOST: postgres
      DATABASE_PASSWORD: ${DB_PASSWORD}
      PROVISIONING_API_URL: http://frontend:3000/api/provision-n8n
    depends_on:
      - postgres
    restart: unless-stopped
```

### Systemd Service

```ini
[Unit]
Description=OneClick Provisioning Scheduler
After=network.target postgresql.service

[Service]
Type=simple
User=oneclick
WorkingDirectory=/opt/oneclick-scheduler
ExecStart=/opt/oneclick-scheduler/scheduler
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Jobs not executing

1. Check scheduler is running: `systemctl status oneclick-scheduler`
2. Verify database connection
3. Check logs: `journalctl -u oneclick-scheduler -f`
4. Verify schedule_time is in the future

### Failed provisions

1. Check provisioning API is accessible
2. Verify credentials are correct
3. Review error_message in database
4. Check retry_count hasn't exceeded limit

## License

Proprietary - All rights reserved
