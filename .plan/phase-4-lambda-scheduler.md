# Phase 4 Plan: Lambda Job Executor (Replace Go Scheduler)

## Context
Phases 1, 2, 3, and 5 are fully implemented. The current Go scheduler runs in Docker, polls
`scheduled_provisions` every minute, and calls Next.js API routes to trigger N8N. Phase 4
replaces it with an AWS Lambda + EventBridge.

**Key architectural decision (from PLAN.md):** The Lambda does NOT need VPC access. Instead
of calling N8N or RDS directly, the Lambda calls a new Vercel API route (`/api/scheduler/run`)
over public HTTPS. That route does the DB query and N8N calls — identical to what the approve
route already does. This eliminates the ~$32/month NAT Gateway cost.

**Current approve route behaviour (for future-scheduled requests):**
1. Sets `change_requests.status = 'scheduled'`
2. Also POSTs to `SCHEDULER_API_URL/api/schedule` (the Go scheduler's HTTP API) to create a
   `scheduled_provisions` row for the Go scheduler to pick up.

Phase 4 removes step 2. The new Lambda + `/api/scheduler/run` route queries `change_requests`
directly, so the Go scheduler's HTTP API is no longer needed for new requests.

---

## How It Works End-to-End (After Phase 4)

```
User submits → change_requests (pending_approval)
Admin approves (immediate) → executeX() called inline → completed/failed
Admin approves (future date) → change_requests.status = 'scheduled'
                               ↓
EventBridge (rate 1 min) → Lambda → POST /api/scheduler/run (with x-scheduler-key)
                                          ↓
                           Vercel route: atomic UPDATE change_requests
                           SET status='executing' WHERE status='scheduled'
                           AND schedule_time <= NOW() RETURNING *
                                          ↓
                           For each row: call executeX() → update to completed/failed
```

---

## What Already Exists (Do Not Re-build)
- All execution functions in `frontend/src/lib/execution.ts`
  — `executeProvision`, `executeTermination`, `executeGroupChange`, `executeLicenseChange`,
    `executeAccountAction`, `executeRoleChange`
- `frontend/src/app/api/change-requests/[id]/approve/route.ts` — already handles all request types
- `scheduler/pkg/database/` — DB models, queries, migrations (no changes needed)
- `scheduler/pkg/scheduler/scheduler.go` — `checkAndExecute()`, `executeJob()`, `handleJobFailure()`
  (no changes — Go scheduler keeps working for local dev via Docker)

---

## Implementation Steps

### Step 1 — New Vercel API route: `/api/scheduler/run`
**New file:** `frontend/src/app/api/scheduler/run/route.ts`

POST handler:
1. Authenticate: check `x-scheduler-key` header === `SCHEDULER_API_KEY` env var; 401 if mismatch
2. Claim pending jobs atomically (avoids race with concurrent Lambda invocations):
   ```sql
   UPDATE change_requests
   SET status = 'executing', updated_at = NOW()
   WHERE status = 'scheduled' AND schedule_time <= NOW()
   RETURNING *
   ```
   This single atomic UPDATE prevents two concurrent executions from picking up the same job.
3. For each claimed row, call the appropriate execute function (same pattern as approve route):
   ```typescript
   if (type === 'provision')        → executeProvision(payload, 'scheduler')
   if (type === 'terminate')        → executeTermination(payload, 'scheduler')
   if (type === 'group_change')     → executeGroupChange(payload, 'scheduler')
   if (type === 'license_change')   → executeLicenseChange(payload, 'scheduler')
   if (['suspend','reactivate','password_reset'].includes(type)) → executeAccountAction(...)
   if (type === 'role_change')      → executeRoleChange(payload, 'scheduler')
   ```
4. On success: `UPDATE change_requests SET status='completed', executed_at=NOW() WHERE id=$1`
5. On failure: check `retry_count < 3`
   - If retries remain: `UPDATE SET status='scheduled', retry_count=retry_count+1, error_message=$2`
     (Lambda will retry on next invocation, ~1 min later)
   - If max retries reached: `UPDATE SET status='failed', error_message=$2, executed_at=NOW()`
6. Return `{ processed, succeeded, failed, errors[] }`

Imports: `pool` from `@/lib/db`; all execute functions from `@/lib/execution`; payload types
from `@/lib/change-request-types`.

---

### Step 2 — Remove SCHEDULER_API_URL fetch from approve route
**Modified file:** `frontend/src/app/api/change-requests/[id]/approve/route.ts`

Remove the block that calls `fetch(SCHEDULER_API_URL/api/schedule)` for future-scheduled jobs.
The `change_requests` row already has `status='scheduled'` — the Lambda/run route picks it up.
Also remove the `SCHEDULER_API_URL` constant (or leave it dead if referenced elsewhere).

The `isFuture` branch becomes:
```typescript
if (isFuture) {
  await pool.query(
    `UPDATE change_requests
     SET status = 'scheduled', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [params.id, session.user.email]
  );
  const updated = await pool.query(`SELECT * FROM change_requests WHERE id = $1`, [params.id]);
  return NextResponse.json({ changeRequest: updated.rows[0], scheduled: true });
}
```
(The Go scheduler fetch block is deleted entirely.)

---

### Step 3 — Lambda handler: `scheduler/cmd/lambda/main.go`
**New file:** `scheduler/cmd/lambda/main.go`

```go
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
        return fmt.Errorf("VERCEL_SCHEDULER_URL not set")
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
        return fmt.Errorf("scheduler returned status %d", resp.StatusCode)
    }

    log.Info("Scheduler run completed")
    return nil
}

func main() {
    lambda.Start(handler)
}
```

---

### Step 4 — Update `scheduler/go.mod` to add Lambda SDK
**Modified file:** `scheduler/go.mod`

Add dependency:
```
github.com/aws/aws-lambda-go v1.47.0
```

Run `go mod tidy` in the scheduler directory to update `go.sum`.

---

### Step 5 — SAM deployment template: `scheduler/template.yaml`
**New file:** `scheduler/template.yaml`

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: OneClick scheduled job executor Lambda

Parameters:
  VercelSchedulerURL:
    Type: String
    Description: "Full URL to https://<your-app>.vercel.app/api/scheduler/run"
  SchedulerAPIKey:
    Type: String
    NoEcho: true
    Description: "Shared secret matching SCHEDULER_API_KEY in Vercel env vars"

Globals:
  Function:
    Runtime: provided.al2023
    Architectures: [arm64]
    Timeout: 30
    MemorySize: 128

Resources:
  SchedulerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: oneclick-scheduler
      CodeUri: cmd/lambda/
      Handler: bootstrap
      Environment:
        Variables:
          VERCEL_SCHEDULER_URL: !Ref VercelSchedulerURL
          SCHEDULER_API_KEY: !Ref SchedulerAPIKey
      Events:
        EveryMinute:
          Type: ScheduleV2
          Properties:
            ScheduleExpression: "rate(1 minute)"
            Description: "Trigger OneClick scheduled job executor every minute"
    Metadata:
      BuildMethod: go1.x

Outputs:
  SchedulerFunctionArn:
    Description: Lambda ARN
    Value: !GetAtt SchedulerFunction.Arn
```

---

### Step 6 — Makefile for building the Lambda binary
**New file:** `scheduler/Makefile`

```makefile
.PHONY: build-lambda clean

build-lambda:
	GOARCH=arm64 GOOS=linux CGO_ENABLED=0 \
	  go build -tags lambda.norpc -o cmd/lambda/bootstrap ./cmd/lambda/

clean:
	rm -f cmd/lambda/bootstrap
```

The `lambda.norpc` build tag disables the deprecated Go plugin RPC handler (recommended for
`provided.al2023` runtime).

---

### Step 7 — Update `.env.example`
**Modified file:** `frontend/.env.example`

Add under the Scheduler section:
```
# Shared secret for Lambda → Vercel scheduler authentication
SCHEDULER_API_KEY=generate-a-long-random-secret-here
```

---

## Files Changed Summary

### New Files
```
frontend/src/app/api/scheduler/run/route.ts   — Vercel execution endpoint (called by Lambda)
scheduler/cmd/lambda/main.go                  — Lambda handler (calls Vercel run route)
scheduler/template.yaml                       — SAM deployment template
scheduler/Makefile                            — Build script for Lambda binary
```

### Modified Files
```
frontend/src/app/api/change-requests/[id]/approve/route.ts  — Remove SCHEDULER_API_URL fetch
frontend/.env.example                                        — Add SCHEDULER_API_KEY
scheduler/go.mod                                             — Add aws-lambda-go dependency
```

---

## Deferred (out of scope)
- AWS SES email notifications
- RDS migration (can use the same DB, just update connection string)
- Decommissioning Docker scheduler (keep for local dev; remove from docker-compose in a future PR)

---

## Verification
1. `cd frontend && npm run build` — zero TypeScript errors
2. Manual test: POST `/api/scheduler/run` with the correct `x-scheduler-key` header
   - Create a change_request with a past schedule_time and status='scheduled' in the DB
   - Call the route → verify status updates to 'completed' and N8N webhook fires
3. Reject with wrong key → 401 response
4. `cd scheduler && go build ./cmd/lambda/` — Go compiles cleanly
5. (AWS) `cd scheduler && sam build && sam deploy --guided` — deploys Lambda + EventBridge rule
6. (AWS) Trigger Lambda manually → CloudWatch logs show "Scheduler run completed"
