// Types for the change request & approval system

export type RequestType =
  | 'provision'
  | 'terminate'
  | 'group_change'
  | 'license_change'
  | 'password_reset'
  | 'role_change'
  | 'suspend'
  | 'reactivate';

export type ChangeRequestStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ChangeRequest {
  id: string;
  request_type: RequestType;
  target_user_email: string;
  target_user_name?: string;
  payload: Record<string, unknown>;
  schedule_time?: string | null;
  status: ChangeRequestStatus;
  requested_by: string;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  executed_at?: string | null;
  error_message?: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  id: string;
  change_request_id: string;
  action: 'approve' | 'reject';
  actor_email: string;
  reason?: string | null;
  created_at: string;
}

export interface ChangeRequestWithHistory extends ChangeRequest {
  approval_actions: ApprovalAction[];
}

// Payload types for each request type

export interface ProvisionPayload {
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    personalEmail?: string;
    department?: string;
    jobTitle?: string;
    role?: string;
  };
  applications: {
    google?: boolean;
    microsoft?: boolean;
    jira?: boolean;
    zoom?: boolean;
    github?: boolean;
    hubspot?: boolean;
    googleConfig?: {
      primaryOrgUnit: string;
      licenseSku: string;
      groups: string[];
      passwordMode: 'auto' | 'custom';
      customPassword?: string;
    };
    microsoftConfig?: {
      usageLocation: string;
      licenses: string[];
      groups: string[];
      requirePasswordChange: boolean;
    };
    jiraConfig?: {
      products: string[];
      groups: string[];
    };
    githubConfig?: {
      role: 'member' | 'admin';
      teams: string[];
    };
    hubspotConfig?: {
      seatType: 'core' | 'sales' | 'service' | 'marketing';
    };
  };
}

export interface TerminatePayload {
  userEmail: string;
  managerEmail: string;
  terminationDate: string;
  selectedApps: {
    googleWorkspace?: boolean;
    microsoft365?: boolean;
    jira?: boolean;
    zoom?: boolean;
    github?: boolean;
    hubspot?: boolean;
  };
  githubUsername?: string;
  hubspotReassignEmail?: string;
}

export interface GroupChangePayload {
  userEmail: string;
  action: 'add' | 'remove';
  app: 'google' | 'microsoft' | 'github' | 'jira';
  groups: string[];
  reason?: string;
}

export interface LicenseChangePayload {
  userEmail: string;
  action: 'add' | 'remove' | 'change';
  app: 'microsoft' | 'zoom' | 'hubspot';
  licenses: string[];
  reason?: string;
}

export interface AccountActionPayload {
  userEmail: string;
  app: 'google' | 'microsoft';
  action: 'reset_password' | 'suspend' | 'reactivate' | 'force_signout';
  options?: Record<string, unknown>;
  reason?: string;
}

export interface RoleChangePayload {
  userEmail: string;
  app: 'github' | 'jira' | 'hubspot';
  currentRole?: string;
  newRole: string;
  reason?: string;
}

// API response types

export interface ChangeRequestsListResponse {
  data: ChangeRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateChangeRequestBody {
  request_type: RequestType;
  target_user_email: string;
  target_user_name?: string;
  payload: Record<string, unknown>;
  schedule_time?: string | null;
}

// Display helpers

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  provision: 'Provision User',
  terminate: 'Terminate User',
  group_change: 'Group Change',
  license_change: 'License Change',
  password_reset: 'Password Reset',
  role_change: 'Role Change',
  suspend: 'Suspend User',
  reactivate: 'Reactivate User',
};

export const STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  scheduled: 'Scheduled',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  scheduled: 'bg-purple-100 text-purple-800',
  executing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};
