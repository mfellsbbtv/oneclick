export interface ScheduledJob {
  id: string;
  job_type: 'provision' | 'terminate';
  payload: Record<string, any>;
  schedule_time: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  tags: string[];
  created_at: string;
  updated_at: string;
  executed_at: string | null;
  error_message: string | null;
  retry_count: number;
}

export interface ScheduleCreateRequest {
  job_type: 'provision' | 'terminate';
  payload: Record<string, any>;
  schedule_time: string;
  tags: string[];
}

export interface ScheduleConfig {
  isScheduled: boolean;
  scheduleTime: string | null; // ISO 8601 datetime string
}
