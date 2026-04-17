export type JobType =
  | 'provision'
  | 'terminate'
  | 'suspend'
  | 'reactivate'
  | 'modify_groups'
  | 'modify_license'
  | 'modify_role'
  | 'password_reset'
  | 'transfer_ownership';

export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected' | 'auto_approved';

export interface ScheduledJob {
  id: string;
  job_type: JobType;
  payload: Record<string, any>;
  schedule_time: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  tags: string[];
  target_user_email: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
  executed_at: string | null;
  error_message: string | null;
  retry_count: number;
}

export interface ScheduleCreateRequest {
  job_type: JobType;
  payload: Record<string, any>;
  schedule_time: string;
  tags: string[];
  target_user_email?: string;
  requested_by?: string;
  approval_status?: ApprovalStatus;
}

export interface ScheduleConfig {
  isScheduled: boolean;
  scheduleTime: string | null; // ISO 8601 datetime string
}
