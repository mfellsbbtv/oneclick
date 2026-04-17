import { google } from 'googleapis';
import { pool } from '@/lib/db';
import type { DirectorySyncResult } from '@/lib/user-types';
import { syncMicrosoftUsers } from '@/lib/microsoft-sync';
import { syncJiraUsers } from '@/lib/jira-sync';
import { syncZoomUsers } from '@/lib/zoom-sync';
import { syncGitHubUsers } from '@/lib/github-sync';

function getDirectoryClient() {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyEnv) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
  }
  const credentials = JSON.parse(keyEnv);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
    ],
    subject: process.env.GOOGLE_ADMIN_DELEGATED_USER || 'mfells@broadbandtvcorp.com',
  });
  return google.admin({ version: 'directory_v1', auth });
}

// Domains to sync from Google Directory
const SYNC_DOMAINS = (process.env.SYNC_DOMAINS || 'rhei.com').split(',').map(d => d.trim());

interface GoogleDirectoryUser {
  id: string;
  primaryEmail: string;
  name: { fullName?: string; givenName?: string; familyName?: string };
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
  suspended: boolean;
  orgUnitPath: string;
  organizations?: Array<{ department?: string; title?: string }>;
  relations?: Array<{ type?: string; value?: string }>;
}

function extractDepartment(user: GoogleDirectoryUser): string | null {
  return user.organizations?.[0]?.department || null;
}

function extractJobTitle(user: GoogleDirectoryUser): string | null {
  return user.organizations?.[0]?.title || null;
}

function extractManagerEmail(user: GoogleDirectoryUser): string | null {
  const manager = user.relations?.find(r => r.type === 'manager');
  return manager?.value || null;
}

export async function syncDirectory(): Promise<DirectorySyncResult> {
  const startTime = Date.now();

  let created = 0;
  let updated = 0;
  let errors = 0;
  let totalProcessed = 0;
  let archived = 0;

  // Google Workspace sync — wrapped so DNS/auth failures don't kill other providers
  try {
    const directory = getDirectoryClient();
    const seenGoogleIds = new Set<string>();

    for (const domain of SYNC_DOMAINS) {
      let pageToken: string | undefined;

      do {
        const res = await directory.users.list({
          domain,
          maxResults: 500,
          pageToken,
          projection: 'full',
          orderBy: 'familyName',
        });

        if (!res.data.users) break;

        for (const user of res.data.users) {
          if (!user.primaryEmail || !user.id) continue;
          totalProcessed++;

          const dirUser = user as unknown as GoogleDirectoryUser;
          seenGoogleIds.add(dirUser.id);

          try {
            const result = await pool.query(
              `INSERT INTO managed_users (
                email, full_name, given_name, family_name, department, job_title,
                manager_email, org_unit_path, is_admin, is_delegated_admin,
                is_suspended, google_id, status, last_synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
              ON CONFLICT (google_id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                given_name = EXCLUDED.given_name,
                family_name = EXCLUDED.family_name,
                department = EXCLUDED.department,
                job_title = EXCLUDED.job_title,
                manager_email = EXCLUDED.manager_email,
                org_unit_path = EXCLUDED.org_unit_path,
                is_admin = EXCLUDED.is_admin,
                is_delegated_admin = EXCLUDED.is_delegated_admin,
                is_suspended = EXCLUDED.is_suspended,
                status = CASE
                  WHEN managed_users.status = 'terminated' THEN managed_users.status
                  WHEN EXCLUDED.is_suspended THEN 'suspended'
                  ELSE 'active'
                END,
                last_synced_at = NOW()
              RETURNING (xmax = 0) AS is_insert`,
              [
                dirUser.primaryEmail.toLowerCase(),
                dirUser.name?.fullName || dirUser.primaryEmail,
                dirUser.name?.givenName || null,
                dirUser.name?.familyName || null,
                extractDepartment(dirUser),
                extractJobTitle(dirUser),
                extractManagerEmail(dirUser),
                dirUser.orgUnitPath || '/',
                dirUser.isAdmin || false,
                dirUser.isDelegatedAdmin || false,
                dirUser.suspended || false,
                dirUser.id,
                dirUser.suspended ? 'suspended' : 'active',
              ]
            );

            if (result.rows[0]?.is_insert) {
              created++;
            } else {
              updated++;
            }

            // Always upsert the google-workspace app account (covers new users and backfills existing ones)
            await pool.query(
              `INSERT INTO user_app_accounts (managed_user_id, app_provider, status, external_user_id, external_email, provisioned_at)
               SELECT id, 'google-workspace', CASE WHEN is_suspended THEN 'suspended' ELSE 'active' END, $1, email, NOW()
               FROM managed_users WHERE google_id = $1
               ON CONFLICT (managed_user_id, app_provider) DO UPDATE SET
                 status = EXCLUDED.status,
                 external_email = EXCLUDED.external_email,
                 last_modified_at = NOW()`,
              [dirUser.id]
            );
          } catch (err) {
            console.error(`Failed to upsert user ${dirUser.primaryEmail}:`, err);
            errors++;
          }
        }

        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);
    }

    // Mark users no longer in directory as archived (but not terminated users)
    if (seenGoogleIds.size > 0) {
      try {
        const idsArray = Array.from(seenGoogleIds);
        const result = await pool.query(
          `UPDATE managed_users SET status = 'archived', updated_at = NOW()
           WHERE google_id IS NOT NULL
             AND google_id != ALL($1::text[])
             AND status NOT IN ('terminated', 'archived')`,
          [idsArray]
        );
        archived = result.rowCount || 0;
      } catch (err) {
        console.error('Failed to archive missing users:', err);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[directory-sync] Google Workspace sync failed:', msg);
    errors++;
  }

  // Run Microsoft, Jira, and Zoom syncs concurrently — failures don't affect Google results
  const [msSettled, jiraSettled, zoomSettled, githubSettled] = await Promise.allSettled([
    syncMicrosoftUsers(),
    syncJiraUsers(),
    syncZoomUsers(),
    syncGitHubUsers(),
  ]);

  if (msSettled.status === 'rejected') console.error('[directory-sync] Microsoft sync failed:', msSettled.reason);
  if (jiraSettled.status === 'rejected') console.error('[directory-sync] Jira sync failed:', jiraSettled.reason);
  if (zoomSettled.status === 'rejected') console.error('[directory-sync] Zoom sync failed:', zoomSettled.reason);
  if (githubSettled.status === 'rejected') console.error('[directory-sync] GitHub sync failed:', githubSettled.reason);

  return {
    created,
    updated,
    archived,
    errors,
    total_processed: totalProcessed,
    duration_ms: Date.now() - startTime,
    synced_at: new Date().toISOString(),
    microsoft: msSettled.status === 'fulfilled' ? msSettled.value : undefined,
    jira: jiraSettled.status === 'fulfilled' ? jiraSettled.value : undefined,
    zoom: zoomSettled.status === 'fulfilled' ? zoomSettled.value : undefined,
    github: githubSettled.status === 'fulfilled' ? githubSettled.value : undefined,
  };
}

export async function getLastSyncTime(): Promise<string | null> {
  const result = await pool.query(
    `SELECT MAX(last_synced_at) as last_sync FROM managed_users`
  );
  return result.rows[0]?.last_sync || null;
}
