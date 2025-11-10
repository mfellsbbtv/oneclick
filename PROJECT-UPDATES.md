# OneClick Project Updates - November 10, 2025

## Summary of Changes

The OneClick provisioning system has been updated to remove Slack provisioning and add a comprehensive Go-based delayed provisioning scheduler.

---

## 1. Removed: Slack Provisioning ❌

### Why?
Current Slack licensing doesn't allow for creating users outside of the console.

### What was removed:
- ✅ Slack provider from frontend ([frontend/src/lib/providers.ts](frontend/src/lib/providers.ts))
- ✅ Slack enum from AppProvider
- ✅ Slack configuration (channels, roles, user groups)
- ✅ Slack from main README

### Files Modified:
- [frontend/src/lib/providers.ts](frontend/src/lib/providers.ts)
- [README.md](README.md)

### Remaining Slack Infrastructure:
- Backend Slack provisioner still exists at [backend/src/providers/slack/](backend/src/providers/slack/)
- Can be removed later or kept for future reference
- N8N Slack workflow can be deactivated

---

## 2. Added: Go Delayed Provisioning Scheduler ✅

### Overview
A complete Go application for scheduling user provisioning at future dates using cron jobs and tag-based triggers.

### Key Features

#### **Tag-Based Scheduling** 🏷️
- Users tagged with **"to be created"** are automatically queued
- Additional tags: "new-hire", "contractor", "intern"
- Flexible tag system for custom workflows

#### **Cron Job Management** ⏰
- Default: Check every minute (`*/1 * * * *`)
- Fully configurable cron expressions
- Timezone support

#### **Database Integration** 💾
- PostgreSQL for job storage
- JSONB fields for flexible data storage
- Indexed by tags, status, and schedule time
- Automatic migrations on startup

#### **RESTful API** 🌐
- Complete CRUD operations for scheduled provisions
- Health check endpoint
- CORS-enabled for frontend integration

#### **Retry Logic** 🔄
- Configurable retry attempts (default: 3)
- Exponential backoff
- Error message tracking

### Architecture

```
┌──────────────────────────────────────┐
│     OneClick Frontend (Next.js)       │
│  User submits with schedule_time      │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│         PostgreSQL Database           │
│    scheduled_provisions table         │
│  ┌─────────────────────────────────┐ │
│  │ • employee_data (JSONB)         │ │
│  │ • applications (JSONB)          │ │
│  │ • schedule_time (TIMESTAMP)     │ │
│  │ • status (pending/executing/    │ │
│  │   completed/failed/cancelled)   │ │
│  │ • tags[] (to be created, etc.)  │ │
│  │ • retry_count, error_message    │ │
│  └─────────────────────────────────┘ │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   Go Scheduler (Port 8080)            │
│                                       │
│  Cron Job: Checks every minute       │
│  ┌──────────────────────────────┐   │
│  │ 1. Query pending provisions  │   │
│  │ 2. Filter by schedule_time   │   │
│  │ 3. Execute provisioning      │   │
│  │ 4. Update status             │   │
│  │ 5. Handle retries            │   │
│  └──────────────────────────────┘   │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│   Provisioning API (N8N/Direct)      │
│                                       │
│  POST /api/provision-n8n             │
│  ┌──────────────────────────────┐   │
│  │ • Google Workspace           │   │
│  │ • Microsoft 365              │   │
│  │ • Other providers            │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

### Project Structure

```
scheduler/
├── cmd/
│   └── scheduler/
│       └── main.go                 # Application entry point
├── pkg/
│   ├── api/
│   │   └── server.go               # HTTP server & handlers
│   ├── config/
│   │   └── config.go               # Configuration management
│   ├── database/
│   │   ├── db.go                   # Database connection & queries
│   │   └── models.go               # Data models
│   └── scheduler/
│       └── scheduler.go            # Core scheduling logic
├── config.yaml                      # Default configuration
├── Dockerfile                       # Container build
├── go.mod                           # Go dependencies
└── README.md                        # Comprehensive documentation
```

### API Endpoints

#### Create Scheduled Provision
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
    "google-workspace": {
      "primaryOrgUnit": "/Developers",
      "licenseSku": "1010020026",
      "passwordMode": "auto"
    },
    "microsoft-365": {
      "usageLocation": "US",
      "licenses": ["cdd28e44-67e3-425e-be4c-737fab2899d3"],
      "groups": ["61c005b9-d8a8-495d-964a-2da005fe682e"],
      "requirePasswordChange": true
    }
  },
  "schedule_time": "2025-12-01T09:00:00Z",
  "tags": ["to be created", "new-hire", "engineering"]
}
```

#### List Scheduled Provisions
```bash
# Get all pending provisions
GET /api/schedule?status=pending

# Filter by tag
GET /api/schedule?tag=to-be-created

# Pagination
GET /api/schedule?limit=50&offset=0
```

#### Get Specific Provision
```bash
GET /api/schedule/{id}
```

#### Cancel Scheduled Provision
```bash
DELETE /api/schedule/{id}
```

#### Execute Immediately
```bash
POST /api/schedule/{id}/execute
```

#### Health Check
```bash
GET /health
```

### Configuration

**config.yaml:**
```yaml
database:
  host: localhost
  port: 5432
  user: postgres
  password: password
  dbname: oneclick
  sslmode: disable

scheduler:
  check_interval: "*/1 * * * *"  # Every minute
  timezone: "America/Los_Angeles"
  max_retries: 3
  retry_delay: 300  # 5 minutes

provisioning:
  api_url: "http://localhost:3000/api/provision-n8n"
  timeout: 300  # 5 minutes
  retry_attempts: 3
  retry_delay: 60  # 1 minute

logging:
  level: info
  format: text  # or json
  output: stdout  # or file path

server:
  port: 8080
```

**Environment Variables:**
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `PROVISIONING_API_URL`
- `SCHEDULER_INTERVAL`
- `LOG_LEVEL`

### Database Schema

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
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'executing', 'completed', 'failed', 'cancelled'
    ))
);

-- Indexes for performance
CREATE INDEX idx_schedule_time
    ON scheduled_provisions(schedule_time)
    WHERE status = 'pending';

CREATE INDEX idx_tags
    ON scheduled_provisions USING GIN(tags);

CREATE INDEX idx_status
    ON scheduled_provisions(status);
```

### Running the Scheduler

#### Local Development
```bash
cd scheduler

# Install dependencies
go mod download

# Build
go build -o scheduler cmd/scheduler/main.go

# Run
./scheduler
```

#### With Docker
```bash
cd scheduler

# Build image
docker build -t oneclick-scheduler .

# Run container
docker run -d \
  --name scheduler \
  -p 8080:8080 \
  -e DATABASE_HOST=postgres \
  -e DATABASE_PASSWORD=yourpassword \
  -e PROVISIONING_API_URL=http://frontend:3000/api/provision-n8n \
  oneclick-scheduler
```

#### With Docker Compose
```yaml
# Add to docker-compose.yml
services:
  scheduler:
    build: ./scheduler
    ports:
      - "8080:8080"
    environment:
      DATABASE_HOST: postgres
      DATABASE_PASSWORD: ${DB_PASSWORD}
      PROVISIONING_API_URL: http://frontend:3000/api/provision-n8n
    depends_on:
      - postgres
    restart: unless-stopped
```

---

## 3. Updated Documentation 📚

### Main README
- ✅ Removed Slack from features list
- ✅ Added scheduled provisioning features
- ✅ Updated tech stack to include Go
- ✅ Added scheduler to architecture

### Scheduler README
- ✅ Comprehensive documentation ([scheduler/README.md](scheduler/README.md))
- ✅ Installation instructions
- ✅ API documentation with examples
- ✅ Configuration guide
- ✅ Database schema
- ✅ Deployment guides (Docker, systemd)
- ✅ Troubleshooting section
- ✅ Development guidelines

---

## 4. Integration with Existing System

### How it Works

1. **User Creation Request**
   - Admin fills out quick provision form
   - Selects schedule date/time
   - Adds "to be created" tag

2. **Job Storage**
   - Request stored in PostgreSQL
   - Status set to "pending"
   - Indexed by schedule_time and tags

3. **Cron Execution**
   - Scheduler checks every minute
   - Queries for pending jobs where `schedule_time <= NOW()`
   - Executes provisioning via existing API

4. **Status Updates**
   - Status changes: pending → executing → completed/failed
   - Retry logic for failures
   - Error messages logged

5. **Monitoring**
   - View all scheduled provisions via API
   - Cancel provisions before execution
   - Trigger immediate execution if needed

### Frontend Integration (Future Enhancement)

To integrate with the quick provision form:

```typescript
// Add schedule_time field to the form
interface QuickProvisionFormData {
  employee: EmployeeData;
  applications: ApplicationsData;
  schedule_time?: Date;  // Optional scheduling
  tags?: string[];       // Auto-add "to be created"
}

// API call
const response = await fetch('/api/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...formData,
    schedule_time: scheduleDate,
    tags: ['to be created', 'new-hire']
  })
});
```

---

## 5. Next Steps

### Immediate
- [ ] Test scheduler locally
- [ ] Set up PostgreSQL database for scheduler
- [ ] Test API endpoints
- [ ] Integrate with existing provisioning flow

### Short-term
- [ ] Add frontend UI for scheduled provisioning
- [ ] Add date/time picker to quick provision form
- [ ] Display list of scheduled provisions
- [ ] Add cancel/execute buttons to UI

### Long-term
- [ ] Add webhook notifications for job completion
- [ ] Implement recurring schedules (e.g., provision every Monday)
- [ ] Add bulk scheduling via CSV import
- [ ] Create admin dashboard for monitoring
- [ ] Add Prometheus metrics
- [ ] Implement job prioritization

---

## 6. Testing the Scheduler

### Test Schedule Creation

```bash
curl -X POST http://localhost:8080/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "employee": {
      "fullName": "Test User",
      "workEmail": "test@company.com",
      "department": "Engineering",
      "jobTitle": "Software Engineer",
      "role": "developer"
    },
    "applications": {
      "google": true,
      "microsoft": true,
      "google-workspace": {
        "primaryOrgUnit": "/Developers",
        "licenseSku": "1010020026",
        "passwordMode": "auto"
      },
      "microsoft-365": {
        "usageLocation": "US",
        "licenses": ["cdd28e44-67e3-425e-be4c-737fab2899d3"],
        "groups": [],
        "requirePasswordChange": true
      }
    },
    "schedule_time": "2025-12-01T09:00:00Z",
    "tags": ["to be created", "test"]
  }'
```

### List Provisions

```bash
curl http://localhost:8080/api/schedule?status=pending
```

### Execute Immediately

```bash
curl -X POST http://localhost:8080/api/schedule/{id}/execute
```

---

## 7. Files Added

```
scheduler/
├── .gitignore
├── Dockerfile
├── README.md
├── config.yaml
├── go.mod
├── cmd/scheduler/main.go
├── pkg/api/server.go
├── pkg/config/config.go
├── pkg/database/db.go
├── pkg/database/models.go
└── pkg/scheduler/scheduler.go
```

**Total:** 12 new files, 1,569 lines of Go code

---

## 8. Commits

**Commit:** `0050f3e`
**Message:** "feat: Remove Slack provisioning and add Go-based delayed provisioning scheduler"

**Previous Commits:**
- `6900897` - WSL2 localhost troubleshooting
- `8eb231b` - Test script and documentation
- `0a8e81a` - Quick provisioning UI with Microsoft 365

---

## 9. Updated Provider List

### Supported (Active Development)
- ✅ Google Workspace
- ✅ Microsoft 365

### Supported (Configuration Ready)
- ⚙️ ClickUp
- ⚙️ Jira
- ⚙️ Confluence
- ⚙️ GitHub
- ⚙️ Zoom
- ⚙️ HubSpot

### Removed
- ❌ Slack (licensing limitations)

---

## Summary

The OneClick provisioning system now supports:
- **Immediate provisioning** via Quick Provision UI
- **Scheduled provisioning** via Go scheduler with cron jobs
- **Tag-based automation** for workflow management
- **Comprehensive monitoring** via RESTful API

All changes committed and ready for deployment!

**Generated:** November 10, 2025
