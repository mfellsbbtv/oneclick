export type ManagedUserStatus = 'active' | 'suspended' | 'terminated' | 'archived';

export type AppAccountStatus = 'active' | 'suspended' | 'deactivated' | 'not_provisioned' | 'pending' | 'error';

export type AppProvider = 'google-workspace' | 'microsoft-365' | 'jira' | 'zoom' | 'github' | 'hubspot' | 'confluence' | 'slack';

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  given_name: string | null;
  family_name: string | null;
  department: string | null;
  job_title: string | null;
  manager_email: string | null;
  org_unit_path: string | null;
  is_admin: boolean;
  is_delegated_admin: boolean;
  is_suspended: boolean;
  google_id: string | null;
  status: ManagedUserStatus;
  metadata: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAppAccount {
  id: string;
  managed_user_id: string;
  app_provider: AppProvider;
  status: AppAccountStatus;
  external_user_id: string | null;
  external_email: string | null;
  license_info: unknown[];
  groups_info: unknown[];
  role_info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  provisioned_at: string | null;
  last_modified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithAccounts extends ManagedUser {
  app_accounts: UserAppAccount[];
}

export interface AppSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  errorMessages?: string[];
}

export interface DirectorySyncResult {
  created: number;
  updated: number;
  archived: number;
  errors: number;
  total_processed: number;
  duration_ms: number;
  synced_at: string;
  microsoft?: AppSyncResult;
  jira?: AppSyncResult;
  zoom?: AppSyncResult;
  github?: AppSyncResult;
}
