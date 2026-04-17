-- Migration 002: Expand scheduled_provisions to support all lifecycle job types
-- Adds new job types, target user tracking, and approval workflow fields.

-- Expand valid job types
ALTER TABLE scheduled_provisions DROP CONSTRAINT IF EXISTS valid_job_type;
ALTER TABLE scheduled_provisions ADD CONSTRAINT valid_job_type CHECK (
  job_type IN (
    'provision', 'terminate', 'suspend', 'reactivate',
    'modify_groups', 'modify_license', 'modify_role',
    'password_reset', 'transfer_ownership'
  )
);

-- Add target user tracking
ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS target_user_email VARCHAR(255);

-- Add requester tracking
ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);

-- Add approval workflow fields
ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE scheduled_provisions ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'auto_approved';
ALTER TABLE scheduled_provisions DROP CONSTRAINT IF EXISTS valid_approval_status;
ALTER TABLE scheduled_provisions ADD CONSTRAINT valid_approval_status CHECK (
  approval_status IN ('pending_approval', 'approved', 'rejected', 'auto_approved')
);

-- Index for finding jobs needing approval
CREATE INDEX IF NOT EXISTS idx_approval_status ON scheduled_provisions(approval_status) WHERE approval_status = 'pending_approval';

-- Index for finding jobs by target user
CREATE INDEX IF NOT EXISTS idx_target_user ON scheduled_provisions(target_user_email);
