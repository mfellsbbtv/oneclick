-- Migration 001: Create managed_users and user_app_accounts tables
-- These tables form the foundation for full user lifecycle management.

-- managed_users: local mirror of Google Directory
CREATE TABLE IF NOT EXISTS managed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT managed_users_valid_status CHECK (status IN ('active', 'suspended', 'terminated', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_managed_users_email ON managed_users(email);
CREATE INDEX IF NOT EXISTS idx_managed_users_status ON managed_users(status);
CREATE INDEX IF NOT EXISTS idx_managed_users_department ON managed_users(department);
CREATE INDEX IF NOT EXISTS idx_managed_users_manager ON managed_users(manager_email);
CREATE INDEX IF NOT EXISTS idx_managed_users_google_id ON managed_users(google_id);

-- user_app_accounts: per-user, per-app account state
CREATE TABLE IF NOT EXISTS user_app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(managed_user_id, app_provider),
  CONSTRAINT user_app_accounts_valid_status CHECK (status IN ('active', 'suspended', 'deactivated', 'not_provisioned', 'pending', 'error')),
  CONSTRAINT user_app_accounts_valid_provider CHECK (app_provider IN ('google-workspace', 'microsoft-365', 'jira', 'zoom', 'github', 'hubspot', 'confluence', 'slack'))
);

CREATE INDEX IF NOT EXISTS idx_user_app_accounts_user ON user_app_accounts(managed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_accounts_provider ON user_app_accounts(app_provider);
CREATE INDEX IF NOT EXISTS idx_user_app_accounts_status ON user_app_accounts(status);

-- Reuse existing update_updated_at_column() trigger function from init.sql
CREATE TRIGGER update_managed_users_updated_at BEFORE UPDATE ON managed_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_app_accounts_updated_at BEFORE UPDATE ON user_app_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
