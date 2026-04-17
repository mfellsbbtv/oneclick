import { pool } from '@/lib/db';
import type { ManagedUser, UserAppAccount, AppProvider, AppAccountStatus } from '@/lib/user-types';

export async function ensureManagedUser(data: {
  email: string;
  fullName: string;
  givenName?: string;
  familyName?: string;
  department?: string;
  jobTitle?: string;
}): Promise<ManagedUser> {
  const result = await pool.query(
    `INSERT INTO managed_users (email, full_name, given_name, family_name, department, job_title)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       full_name = COALESCE(EXCLUDED.full_name, managed_users.full_name),
       given_name = COALESCE(EXCLUDED.given_name, managed_users.given_name),
       family_name = COALESCE(EXCLUDED.family_name, managed_users.family_name),
       department = COALESCE(EXCLUDED.department, managed_users.department),
       job_title = COALESCE(EXCLUDED.job_title, managed_users.job_title),
       updated_at = NOW()
     RETURNING *`,
    [
      data.email.toLowerCase(),
      data.fullName,
      data.givenName || null,
      data.familyName || null,
      data.department || null,
      data.jobTitle || null,
    ]
  );
  return result.rows[0];
}

export async function upsertUserAppAccount(
  userEmail: string,
  provider: AppProvider,
  status: AppAccountStatus,
  extra?: {
    externalUserId?: string;
    externalEmail?: string;
    licenseInfo?: unknown[];
    groupsInfo?: unknown[];
    roleInfo?: Record<string, unknown>;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO user_app_accounts (
       managed_user_id, app_provider, status, external_user_id, external_email,
       license_info, groups_info, role_info, provisioned_at
     )
     SELECT mu.id, $2, $3, $4, $5, $6, $7, $8, NOW()
     FROM managed_users mu WHERE mu.email = $1
     ON CONFLICT (managed_user_id, app_provider) DO UPDATE SET
       status = EXCLUDED.status,
       external_user_id = COALESCE(EXCLUDED.external_user_id, user_app_accounts.external_user_id),
       external_email = COALESCE(EXCLUDED.external_email, user_app_accounts.external_email),
       license_info = CASE WHEN EXCLUDED.license_info != '[]'::jsonb THEN EXCLUDED.license_info ELSE user_app_accounts.license_info END,
       groups_info = CASE WHEN EXCLUDED.groups_info != '[]'::jsonb THEN EXCLUDED.groups_info ELSE user_app_accounts.groups_info END,
       role_info = CASE WHEN EXCLUDED.role_info != '{}'::jsonb THEN EXCLUDED.role_info ELSE user_app_accounts.role_info END,
       last_modified_at = NOW()`,
    [
      userEmail.toLowerCase(),
      provider,
      status,
      extra?.externalUserId || null,
      extra?.externalEmail || null,
      JSON.stringify(extra?.licenseInfo || []),
      JSON.stringify(extra?.groupsInfo || []),
      JSON.stringify(extra?.roleInfo || {}),
    ]
  );
}

export async function updateAppAccountStatus(
  userEmail: string,
  provider: AppProvider,
  newStatus: AppAccountStatus
): Promise<void> {
  await pool.query(
    `UPDATE user_app_accounts SET status = $3, last_modified_at = NOW()
     WHERE managed_user_id = (SELECT id FROM managed_users WHERE email = $1)
       AND app_provider = $2`,
    [userEmail.toLowerCase(), provider, newStatus]
  );
}

export async function updateAllAppAccountsStatus(
  userEmail: string,
  providers: AppProvider[],
  newStatus: AppAccountStatus
): Promise<void> {
  if (providers.length === 0) return;
  await pool.query(
    `UPDATE user_app_accounts SET status = $3, last_modified_at = NOW()
     WHERE managed_user_id = (SELECT id FROM managed_users WHERE email = $1)
       AND app_provider = ANY($2)`,
    [userEmail.toLowerCase(), providers, newStatus]
  );
}

export async function updateManagedUserStatus(
  email: string,
  status: 'active' | 'suspended' | 'terminated' | 'archived'
): Promise<void> {
  await pool.query(
    `UPDATE managed_users SET status = $2, updated_at = NOW() WHERE email = $1`,
    [email.toLowerCase(), status]
  );
}
