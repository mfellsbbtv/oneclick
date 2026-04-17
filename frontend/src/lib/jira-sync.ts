import { pool } from '@/lib/db';

interface JiraUser {
  accountId: string;
  // 'atlassian' = real user with product access
  // 'customer'  = JSM portal-only customer (no real license) — excluded
  // 'app'       = Connect/Forge app acting as a user — excluded
  accountType: 'atlassian' | 'customer' | 'app' | 'unknown';
  emailAddress?: string;
  displayName: string;
  active: boolean;
}

export interface JiraSyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

async function fetchAllJiraUsers(): Promise<JiraUser[]> {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
  const email = process.env.JIRA_API_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !token) {
    throw new Error('Missing Jira credentials (JIRA_BASE_URL, JIRA_API_EMAIL, JIRA_API_TOKEN)');
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const users: JiraUser[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const res = await fetch(
      `${baseUrl}/rest/api/3/users/search?maxResults=${maxResults}&startAt=${startAt}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira API error ${res.status}: ${err}`);
    }

    const page = await res.json() as JiraUser[];
    if (!page.length) break;

    users.push(...page);
    startAt += page.length;
    if (page.length < maxResults) break;
  }

  return users;
}

export async function syncJiraUsers(): Promise<JiraSyncResult> {
  if (!process.env.JIRA_BASE_URL) {
    console.warn('[jira-sync] JIRA_BASE_URL not set, skipping');
    return { synced: 0, skipped: 0, errors: 0 };
  }

  let allUsers: JiraUser[];
  try {
    allUsers = await fetchAllJiraUsers();
  } catch (err) {
    console.error('[jira-sync] Failed to fetch users:', err);
    return { synced: 0, skipped: 0, errors: 1 };
  }

  // Only include active users with a real Atlassian account.
  // accountType 'customer' = JSM portal-only customer (no Jira/Confluence license).
  // accountType 'app'      = service/bot account.
  // This covers the requirement: "ignore if the only assignment is customer for JSM".
  const realUsers = allUsers.filter(u => u.active && u.accountType === 'atlassian');
  console.log(`[jira-sync] ${allUsers.length} total users, ${realUsers.length} with Atlassian accounts`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of realUsers) {
    const email = user.emailAddress?.toLowerCase();
    if (!email) {
      // Atlassian can hide email addresses based on user privacy settings.
      // Users with hidden emails can't be matched to managed_users — skip them.
      skipped++;
      continue;
    }

    try {
      const check = await pool.query<{ id: string }>(
        'SELECT id FROM managed_users WHERE email = $1',
        [email]
      );
      if (check.rows.length === 0) { skipped++; continue; }

      const managedUserId = check.rows[0].id;

      await pool.query(
        `INSERT INTO user_app_accounts
           (managed_user_id, app_provider, status, external_user_id, external_email, provisioned_at)
         VALUES ($1, 'jira', 'active', $2, $3, NOW())
         ON CONFLICT (managed_user_id, app_provider) DO UPDATE SET
           status = 'active',
           external_user_id = EXCLUDED.external_user_id,
           external_email = EXCLUDED.external_email,
           last_modified_at = NOW()`,
        [managedUserId, user.accountId, email]
      );

      synced++;
    } catch (err) {
      console.error(`[jira-sync] Failed to sync ${email}:`, err);
      errors++;
    }
  }

  console.log(`[jira-sync] Done — ${synced} synced, ${skipped} skipped, ${errors} errors`);
  return { synced, skipped, errors };
}
