# OneClick User Lifecycle Management Platform - Implementation Plan

## Overview

Transform OneClick from a provisioning/termination tool into a full user lifecycle management platform with:
- All user operations (group changes, license management, password resets, role changes)
- Admin approval workflow for all actions
- Email notifications for pending approvals
- Periodic Google Workspace directory sync
- Vercel frontend hosting + AWS backend infrastructure

---

## Architecture

```
                        +------------------+
                        |   Vercel (Edge)  |
                        |  Next.js 14 App  |
                        |  - UI Pages      |
                        |  - API Routes    |
                        +--------+---------+
                                 |
                    HTTPS (public API routes)
                                 |
                 +---------------+---------------+
                 |                               |
        +--------v---------+          +----------v----------+
        | AWS RDS Postgres |          |   N8N Cloud         |
        | (db.t4g.micro)   |          |   - Provision WF    |
        | - users          |          |   - Terminate WF    |
        | - change_requests|          |   - Group Change WF |
        | - approvals      |          |   - License WF      |
        | - directory_sync |          |   - Password WF     |
        +------------------+          |   - Role Change WF  |
                 ^                    +-----------+----------+
                 |                                ^
        +--------+---------+                      |
        | AWS EventBridge  |           webhook calls
        | (cron rules)     |                      |
        +--------+---------+          +-----------+----------+
                 |                    |  Vercel API Routes   |
                 v                    |  /api/execute-action |
        +--------+---------+          +----------------------+
        | AWS Lambda (Go)  |
        | - Job executor   |
        | - Directory sync |
        +------------------+
```

### Why This Architecture

**Vercel for Frontend + API Routes**
- You're already deploying there. Next.js API routes handle auth, validation, and proxying to N8N.
- Serverless functions scale to zero. For <500 users, you'll stay in the free/hobby tier.

**AWS Lambda + EventBridge (replaces Go scheduler)**
- **Cost:** ~$0-2/month for <500 users. Lambda free tier = 1M requests + 400K GB-seconds/month. EventBridge free tier = all custom events free, 14M scheduled invocations free.
- **vs EC2:** t4g.micro = ~$6/month always-on. Lambda is cheaper AND zero maintenance.
- **vs ECS/Fargate:** Fargate minimum ~$10/month. Overkill for minute-by-minute polling.
- Your existing Go scheduler code ports directly to Lambda (Go is a first-class Lambda runtime). EventBridge replaces the cron polling loop.
- Two Lambda functions: (1) job executor on 1-min schedule, (2) directory sync on 1-hour schedule.

**AWS RDS PostgreSQL (replaces local Docker PostgreSQL)**
- **db.t4g.micro:** ~$13/month (cheapest RDS). 2 vCPU, 1GB RAM, 20GB storage. More than enough for <500 users.
- **vs Aurora Serverless v2:** Minimum ~$45/month (0.5 ACU baseline). Overkill for this scale.
- **vs DynamoDB:** Your existing schema is relational (foreign keys, joins for approvals). DynamoDB would require a full rewrite and awkward access patterns.
- **vs RDS Aurora Provisioned:** Starts at ~$30/month. Not worth it at this scale.
- RDS Postgres keeps your existing schema, migrations, and Go database code unchanged.

**N8N Cloud (unchanged)**
- Keeps all existing provisioning/termination workflows.
- New workflows added for each operation type (group changes, license management, etc.).

---

## AWS Cost Estimate (Monthly, <500 users)

| Service | Tier | Est. Cost |
|---------|------|-----------|
| RDS PostgreSQL (db.t4g.micro, 20GB) | On-demand | ~$13 |
| Lambda (2 functions, ~50K invocations) | Free tier | $0 |
| EventBridge (2 cron rules) | Free tier | $0 |
| SES (email notifications, ~500/month) | Free tier (first 62K) | $0 |
| Secrets Manager (DB creds, API keys) | ~5 secrets | ~$2 |
| **Total** | | **~$15/month** |

Compare: EC2 t4g.micro ($6) + self-managed Postgres ($0 but ops burden) = $6 but no managed backups, no auto-patching, manual ops.

---

## Database Schema Changes

### New Tables

```sql
-- Unified change request table (replaces scheduled_provisions for new ops)
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(30) NOT NULL,
    -- 'provision', 'terminate', 'group_change', 'license_change',
    -- 'password_reset', 'role_change', 'suspend', 'reactivate'
  target_user_email VARCHAR(255) NOT NULL,
  target_user_name VARCHAR(255),
  payload JSONB NOT NULL,
  schedule_time TIMESTAMP WITH TIME ZONE,  -- NULL = immediate after approval
  status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
    -- 'pending_approval', 'approved', 'rejected', 'scheduled',
    -- 'executing', 'completed', 'failed', 'cancelled'
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

CREATE INDEX idx_cr_status ON change_requests(status);
CREATE INDEX idx_cr_type ON change_requests(request_type);
CREATE INDEX idx_cr_target ON change_requests(target_user_email);
CREATE INDEX idx_cr_requested_by ON change_requests(requested_by);
CREATE INDEX idx_cr_schedule ON change_requests(schedule_time)
  WHERE status = 'approved';

-- Approval audit trail
CREATE TABLE approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES change_requests(id),
  action VARCHAR(10) NOT NULL,  -- 'approve', 'reject'
  actor_email VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cached directory data from Google Workspace sync
CREATE TABLE directory_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  job_title VARCHAR(255),
  manager_email VARCHAR(255),
  org_unit_path VARCHAR(500),
  is_admin BOOLEAN DEFAULT false,
  is_delegated_admin BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  google_id VARCHAR(255),
  thumbnail_url TEXT,
  groups JSONB DEFAULT '[]',  -- [{email, name, role}]
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_du_email ON directory_users(email);
CREATE INDEX idx_du_department ON directory_users(department);
CREATE INDEX idx_du_manager ON directory_users(manager_email);

-- Sync run tracking
CREATE TABLE directory_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  users_synced INTEGER DEFAULT 0,
  users_added INTEGER DEFAULT 0,
  users_removed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### Migration of existing data

The existing `scheduled_provisions` table stays as-is for backward compatibility. New operations use `change_requests`. A future migration can consolidate them.

---

## Implementation Phases

### Phase 1: Database & Directory Sync (Foundation)

**Goal:** RDS database with new schema + periodic Google directory sync populating `directory_users`.

**Tasks:**
1. Set up RDS PostgreSQL instance (or add to existing VPC)
2. Create new tables (`change_requests`, `directory_users`, `directory_sync_runs`, `approval_actions`)
3. Write Lambda function for directory sync (Go)
   - Calls Google Admin SDK to list all users + group memberships
   - Upserts into `directory_users`
   - Tracks run in `directory_sync_runs`
4. Set up EventBridge rule: run sync every hour
5. Update frontend to read users from `directory_users` table instead of live Google API calls
   - Replace `getTerminableUsers()` with DB query
   - Add `/api/directory/users` endpoint (paginated, searchable)
   - Remove in-memory cache (DB is the cache now)

**Why first:** Everything else depends on having a reliable user directory and the database in AWS.

---

### Phase 2: Change Request & Approval System

**Goal:** Any user can submit a change request. Admins approve/reject via dashboard. Email notifications via SES.

**Tasks:**
1. Create `ChangeRequestForm` component (generic, multi-type)
   - Request type selector
   - Target user picker (from `directory_users`)
   - Dynamic payload form based on request type
   - Optional schedule picker (reuse existing `SchedulePicker`)
2. Create API routes:
   - `POST /api/change-requests` — submit new request
   - `GET /api/change-requests` — list (with filters: status, type, my requests)
   - `GET /api/change-requests/[id]` — detail
   - `POST /api/change-requests/[id]/approve` — admin approve
   - `POST /api/change-requests/[id]/reject` — admin reject
   - `POST /api/change-requests/[id]/cancel` — requester cancel
3. Create admin approval dashboard page (`/admin/approvals`)
   - Pending requests queue with filters
   - Request detail view with approve/reject buttons
   - Reason field for rejections
4. Set up AWS SES for email notifications
   - Verify sender domain
   - Email on: new request (to admins), approved (to requester), rejected (to requester), executed (to requester)
5. Refactor existing provision/terminate flows to go through change_requests
   - QuickProvisionForm submits to `change_requests` instead of directly to N8N
   - TerminationForm same

**UI Flow:**
```
User submits request → status: pending_approval → email to admins
Admin approves       → status: approved (or scheduled if future time)
Lambda picks up      → status: executing → calls N8N webhook
N8N completes        → status: completed → email to requester
```

---

### Phase 3: New Operation Types

**Goal:** Add group changes, license management, password resets, and role changes.

Each operation type needs: (a) a payload schema, (b) a frontend form section, (c) an N8N workflow.

#### 3a. Group/Team Membership Changes
- **Payload:** `{ action: "add"|"remove", app: "google"|"microsoft"|"github"|"jira", groups: [...], user_email }`
- **Form:** Select app → select groups (reuse GoogleGroupsSelector, MicrosoftGroupsSelector) → add or remove
- **N8N workflow:** Route by app, call respective admin API

#### 3b. License/Seat Management
- **Payload:** `{ action: "add"|"remove"|"change", app: "microsoft"|"zoom"|"hubspot", licenses: [...], user_email }`
- **Form:** Select app → show current licenses (from directory or API) → select new licenses
- **N8N workflow:** Route by app, call license management API

#### 3c. Password Resets & Account Actions
- **Payload:** `{ action: "reset_password"|"suspend"|"reactivate"|"force_signout", app: "google"|"microsoft", user_email, options: {} }`
- **Form:** Select action → select app → optional: require password change on next login
- **N8N workflow:** Route by action+app

#### 3d. Role & Permission Changes
- **Payload:** `{ action: "change_role", app: "github"|"jira"|"hubspot", user_email, new_role: "...", current_role: "..." }`
- **Form:** Select app → show current role → select new role
- **N8N workflow:** Route by app, call role management API

---

### Phase 4: Lambda Job Executor (Replace Go Scheduler)

**Goal:** Replace the Docker-hosted Go scheduler with Lambda + EventBridge.

**Tasks:**
1. Adapt existing Go scheduler code into a Lambda handler
   - Replace HTTP server + cron loop with Lambda handler function
   - Query `change_requests` where `status = 'approved' AND (schedule_time IS NULL OR schedule_time <= NOW())`
   - Execute by calling N8N webhooks (same as current behavior)
   - Update status on completion/failure
2. Set up EventBridge rule: invoke Lambda every 1 minute
3. Add retry logic (same as current: max 3 retries)
4. Deploy with SAM or CDK (your preference)
5. Update Vercel environment variables to point to RDS instead of local Postgres
6. Decommission Docker-based scheduler

---

### Phase 5: User Management Dashboard

**Goal:** A comprehensive user directory page with per-user detail view showing all app accounts, group memberships, and action history.

**Tasks:**
1. Create `/users` page — searchable, filterable directory
   - Table view: name, email, department, status, last synced
   - Filters: department, status (active/suspended), search
   - Pagination
2. Create `/users/[email]` detail page
   - User info card (from `directory_users`)
   - App accounts section (which apps they have)
   - Group memberships section
   - Change request history (from `change_requests`)
   - Quick action buttons: "Change Groups", "Manage Licenses", "Reset Password", etc.
   - Each button opens a pre-filled `ChangeRequestForm`
3. Update navigation: Home, Users, Requests, Approvals (admin)

---

## File Changes Summary

### New Files
```
frontend/src/app/users/page.tsx                    — User directory page
frontend/src/app/users/[email]/page.tsx            — User detail page
frontend/src/app/admin/approvals/page.tsx          — Admin approval dashboard
frontend/src/app/api/change-requests/route.ts      — CRUD for change requests
frontend/src/app/api/change-requests/[id]/route.ts — Single request operations
frontend/src/app/api/change-requests/[id]/approve/route.ts
frontend/src/app/api/change-requests/[id]/reject/route.ts
frontend/src/app/api/directory/users/route.ts      — Paginated user directory API
frontend/src/components/ChangeRequestForm.tsx       — Generic change request form
frontend/src/components/ApprovalDashboard.tsx       — Admin approval queue
frontend/src/components/UserDirectory.tsx           — User list/search component
frontend/src/components/UserDetail.tsx              — User detail view
frontend/src/lib/change-request-types.ts           — TypeScript types for requests
frontend/src/lib/email-notifications.ts            — SES email sending helpers
database/migrations/002_change_requests.sql        — New tables
scheduler/cmd/lambda/main.go                       — Lambda handler (adapted from scheduler)
scheduler/cmd/directory-sync/main.go               — Directory sync Lambda
```

### Modified Files
```
frontend/src/app/layout.tsx          — Updated navigation
frontend/src/middleware.ts           — Protect new routes
frontend/src/app/page.tsx            — Updated dashboard cards
frontend/src/components/QuickProvisionForm.tsx  — Submit to change_requests
frontend/src/components/TerminationForm.tsx     — Submit to change_requests
scheduler/pkg/database/models.go     — Add change_request model
scheduler/pkg/database/db.go         — Add change_request queries
```

---

## AWS Services Setup Checklist

1. **RDS PostgreSQL** (db.t4g.micro, 20GB gp3, single-AZ)
   - Enable automated backups (7-day retention, free)
   - Place in existing VPC private subnet
   - Security group: allow inbound 5432 from Lambda SG only

2. **Lambda** (2 functions, Go runtime, arm64)
   - `oneclick-job-executor` — 128MB, 30s timeout, EventBridge 1-min trigger
   - `oneclick-directory-sync` — 256MB, 120s timeout, EventBridge hourly trigger
   - VPC-attached (same VPC as RDS)
   - IAM role: RDS access, SES send, CloudWatch logs

3. **EventBridge** (2 rules)
   - `oneclick-job-check` — `rate(1 minute)` → job executor Lambda
   - `oneclick-directory-sync` — `rate(1 hour)` → directory sync Lambda

4. **SES** (email notifications)
   - Verify sender domain (e.g., noreply@rhei.com)
   - Production access request (move out of sandbox)

5. **Secrets Manager** (or Parameter Store for cheaper)
   - DB credentials
   - N8N webhook API key
   - Google service account key
   - NextAuth secret

6. **NAT Gateway** (if Lambda needs internet access from VPC to reach N8N/Google)
   - ~$32/month — this is the biggest cost item
   - **Alternative:** Use VPC endpoints for AWS services + put N8N webhook calls through a Vercel API route instead of calling directly from Lambda. This avoids NAT Gateway entirely.

### Revised Cost with NAT Gateway Avoidance

| Service | Est. Cost |
|---------|-----------|
| RDS db.t4g.micro | ~$13 |
| Lambda | $0 (free tier) |
| EventBridge | $0 (free tier) |
| SES | $0 (free tier) |
| Secrets Manager | ~$2 |
| **Total** | **~$15/month** |

Lambda calls Vercel API routes (public internet via Lambda function URL, no VPC needed for N8N calls) → Vercel routes call N8N. Only the directory sync Lambda needs VPC access to RDS. The job executor can call Vercel's `/api/execute-action` endpoint instead of N8N directly, same as the current Go scheduler does.

---

## Implementation Order

| Phase | What | Depends On | Est. Scope |
|-------|------|------------|------------|
| 1 | DB schema + Directory sync | AWS account | DB tables, 1 Lambda, 1 API route |
| 2 | Change requests + Approvals + Email | Phase 1 | 6 API routes, 3 components, SES |
| 3 | New operation types (4 types) | Phase 2 | 4 form sections, 4+ N8N workflows |
| 4 | Lambda job executor | Phase 1-2 | 1 Lambda, EventBridge, decommission Go scheduler |
| 5 | User management dashboard | Phase 1 | 2 pages, 2 components |

Phases 1 and 5 can partially overlap. Phase 4 can happen anytime after Phase 2.

---

## Questions Deferred to Implementation

- Exact SES email templates (can iterate during Phase 2)
- N8N workflow details for new operation types (build during Phase 3)
- CDK vs SAM vs Terraform for Lambda deployment (choose during Phase 4)
- Whether to keep `scheduled_provisions` table or migrate data to `change_requests`
