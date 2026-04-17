-- OneClick Account Provisioning Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE provisioning_status AS ENUM ('pending', 'in_progress', 'success', 'partial', 'error');
CREATE TYPE app_provider AS ENUM (
  'google-workspace', 
  'slack', 
  'microsoft-365', 
  'clickup', 
  'jira', 
  'confluence', 
  'github', 
  'zoom', 
  'hubspot'
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  work_email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for email lookups
CREATE INDEX idx_users_work_email ON users(work_email);

-- Provisioning requests table
CREATE TABLE provisioning_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_apps app_provider[] NOT NULL,
  status provisioning_status DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for status filtering
CREATE INDEX idx_provisioning_requests_status ON provisioning_requests(status);
CREATE INDEX idx_provisioning_requests_user_id ON provisioning_requests(user_id);

-- App configurations table (stores per-app collected fields)
CREATE TABLE app_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES provisioning_requests(id) ON DELETE CASCADE,
  app app_provider NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(request_id, app)
);

-- Index for request lookups
CREATE INDEX idx_app_configs_request_id ON app_configs(request_id);

-- App results table (stores provisioning results per app)
CREATE TABLE app_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES provisioning_requests(id) ON DELETE CASCADE,
  app app_provider NOT NULL,
  status provisioning_status DEFAULT 'pending',
  external_user_id VARCHAR(255),
  external_links JSONB DEFAULT '{}'::jsonb,
  raw_response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for result queries
CREATE INDEX idx_app_results_request_id ON app_results(request_id);
CREATE INDEX idx_app_results_status ON app_results(status);
CREATE INDEX idx_app_results_app ON app_results(app);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor UUID,
  actor_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target VARCHAR(255),
  target_type VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit queries
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Admin users table (for authentication)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  oidc_subject VARCHAR(255) UNIQUE,
  roles TEXT[] DEFAULT ARRAY['admin'],
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for email and subject lookups
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_oidc_subject ON admin_users(oidc_subject);

-- App templates table (for role-based presets)
CREATE TABLE app_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  apps app_provider[] NOT NULL,
  default_configs JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job queue status table (for tracking BullMQ jobs)
CREATE TABLE job_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id VARCHAR(255) NOT NULL UNIQUE,
  queue_name VARCHAR(100) NOT NULL,
  request_id UUID REFERENCES provisioning_requests(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  progress INTEGER DEFAULT 0,
  data JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for job lookups
CREATE INDEX idx_job_status_job_id ON job_status(job_id);
CREATE INDEX idx_job_status_request_id ON job_status(request_id);
CREATE INDEX idx_job_status_status ON job_status(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisioning_requests_updated_at BEFORE UPDATE ON provisioning_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_results_updated_at BEFORE UPDATE ON app_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_templates_updated_at BEFORE UPDATE ON app_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_status_updated_at BEFORE UPDATE ON job_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for provisioning dashboard
CREATE VIEW provisioning_dashboard AS
SELECT 
  pr.id,
  pr.status as request_status,
  pr.created_at,
  pr.completed_at,
  u.full_name,
  u.work_email,
  au.email as created_by_email,
  COALESCE(
    (SELECT COUNT(*) FROM app_results ar WHERE ar.request_id = pr.id AND ar.status = 'success'),
    0
  ) as successful_apps,
  COALESCE(
    (SELECT COUNT(*) FROM app_results ar WHERE ar.request_id = pr.id AND ar.status = 'error'),
    0
  ) as failed_apps,
  COALESCE(
    (SELECT COUNT(*) FROM app_results ar WHERE ar.request_id = pr.id AND ar.status = 'pending'),
    0
  ) as pending_apps,
  array_length(pr.requested_apps, 1) as total_apps
FROM provisioning_requests pr
JOIN users u ON pr.user_id = u.id
LEFT JOIN admin_users au ON pr.created_by = au.id;

-- ============================================================
-- Managed users (local mirror of Google Workspace directory)
-- ============================================================

CREATE TABLE managed_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  given_name VARCHAR(128),
  family_name VARCHAR(128),
  department VARCHAR(255),
  job_title VARCHAR(255),
  manager_email VARCHAR(255),
  org_unit_path VARCHAR(512),
  is_admin BOOLEAN DEFAULT false,
  is_delegated_admin BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  google_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT managed_users_valid_status CHECK (status IN ('active', 'suspended', 'terminated', 'archived'))
);

CREATE INDEX idx_managed_users_email ON managed_users(email);
CREATE INDEX idx_managed_users_status ON managed_users(status);
CREATE INDEX idx_managed_users_department ON managed_users(department);
CREATE INDEX idx_managed_users_manager ON managed_users(manager_email);
CREATE INDEX idx_managed_users_google_id ON managed_users(google_id);

CREATE TRIGGER update_managed_users_updated_at BEFORE UPDATE ON managed_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Per-user, per-app account state
CREATE TABLE user_app_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  managed_user_id UUID NOT NULL REFERENCES managed_users(id) ON DELETE CASCADE,
  app_provider VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not_provisioned',
  external_user_id VARCHAR(255),
  external_email VARCHAR(255),
  license_info JSONB DEFAULT '[]'::jsonb,
  groups_info JSONB DEFAULT '[]'::jsonb,
  role_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  provisioned_at TIMESTAMP WITH TIME ZONE,
  last_modified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(managed_user_id, app_provider),
  CONSTRAINT user_app_accounts_valid_status CHECK (status IN ('active', 'suspended', 'deactivated', 'not_provisioned', 'pending', 'error')),
  CONSTRAINT user_app_accounts_valid_provider CHECK (app_provider IN ('google-workspace', 'microsoft-365', 'jira', 'zoom', 'github', 'hubspot', 'confluence', 'slack'))
);

CREATE INDEX idx_user_app_accounts_user ON user_app_accounts(managed_user_id);
CREATE INDEX idx_user_app_accounts_provider ON user_app_accounts(app_provider);
CREATE INDEX idx_user_app_accounts_status ON user_app_accounts(status);

CREATE TRIGGER update_user_app_accounts_updated_at BEFORE UPDATE ON user_app_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tracks each directory sync run
CREATE TABLE directory_sync_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  users_synced INTEGER DEFAULT 0,
  users_added INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_removed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sync_runs_started ON directory_sync_runs(started_at DESC);

-- ============================================================
-- Change request and approval tables
-- ============================================================

-- All lifecycle change requests (provision, terminate, group changes, etc.)
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type VARCHAR(30) NOT NULL,
    -- 'provision', 'terminate', 'group_change', 'license_change',
    -- 'password_reset', 'role_change', 'suspend', 'reactivate'
  target_user_email VARCHAR(255) NOT NULL,
  target_user_name VARCHAR(255),
  payload JSONB NOT NULL,
  schedule_time TIMESTAMP WITH TIME ZONE,  -- NULL = execute immediately after approval
  status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
    -- 'pending_approval', 'approved', 'rejected', 'scheduled',
    -- 'executing', 'completed', 'failed', 'cancelled'
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_request_type CHECK (request_type IN (
    'provision', 'terminate', 'group_change', 'license_change',
    'password_reset', 'role_change', 'suspend', 'reactivate'
  )),
  CONSTRAINT valid_cr_status CHECK (status IN (
    'pending_approval', 'approved', 'rejected', 'scheduled',
    'executing', 'completed', 'failed', 'cancelled'
  ))
);

CREATE INDEX idx_cr_status ON change_requests(status);
CREATE INDEX idx_cr_type ON change_requests(request_type);
CREATE INDEX idx_cr_target ON change_requests(target_user_email);
CREATE INDEX idx_cr_requested_by ON change_requests(requested_by);
CREATE INDEX idx_cr_pending_approval ON change_requests(created_at DESC)
  WHERE status = 'pending_approval';
CREATE INDEX idx_cr_schedule ON change_requests(schedule_time)
  WHERE status = 'approved';

CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trail for approve/reject actions
CREATE TABLE approval_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  action VARCHAR(10) NOT NULL,  -- 'approve', 'reject'
  actor_email VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_action CHECK (action IN ('approve', 'reject'))
);

CREATE INDEX idx_approval_actions_request ON approval_actions(change_request_id);
CREATE INDEX idx_approval_actions_actor ON approval_actions(actor_email);

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO oneclick;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO oneclick;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO oneclick;