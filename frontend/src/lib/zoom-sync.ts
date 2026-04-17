import { pool } from '@/lib/db';

const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

// Zoom user type codes → human-readable plan names
const ZOOM_PLAN: Record<number, string> = {
  1: 'Basic',
  2: 'Pro',
  3: 'On-Prem',
  99: 'None',
};

interface ZoomUser {
  id: string;
  email: string;
  display_name: string;
  type: number;   // 1=Basic, 2=Pro/Licensed, 3=On-Prem, 99=None
  status: string; // 'active' | 'inactive' | 'pending'
}

export interface ZoomSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  errorMessages?: string[];
}

async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom credentials (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(
    `${ZOOM_TOKEN_URL}?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function fetchAllZoomUsers(token: string): Promise<ZoomUser[]> {
  const users: ZoomUser[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL(`${ZOOM_API_BASE}/users`);
    url.searchParams.set('status', 'active');
    url.searchParams.set('page_size', '300');
    if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken);

    const res: Response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Zoom users API error (${res.status}): ${err}`);
    }

    const data = await res.json() as {
      users: ZoomUser[];
      next_page_token?: string;
    };

    users.push(...(data.users ?? []));
    nextPageToken = data.next_page_token || undefined;
  } while (nextPageToken);

  return users;
}

export async function syncZoomUsers(): Promise<ZoomSyncResult> {
  if (!process.env.ZOOM_ACCOUNT_ID) {
    console.warn('[zoom-sync] ZOOM_ACCOUNT_ID not set, skipping');
    return { synced: 0, skipped: 0, errors: 0 };
  }

  let token: string;
  try {
    token = await getZoomAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[zoom-sync] Auth failed:', msg);
    return { synced: 0, skipped: 0, errors: 1, errorMessages: [`Auth failed: ${msg}`] };
  }

  let allUsers: ZoomUser[];
  try {
    allUsers = await fetchAllZoomUsers(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[zoom-sync] Failed to fetch users:', msg);
    return { synced: 0, skipped: 0, errors: 1, errorMessages: [`Zoom API: ${msg}`] };
  }

  // Only sync users with an actual plan (exclude type 99 = unassigned/none)
  const licensedUsers = allUsers.filter(u => u.type !== 99 && u.status === 'active');
  console.log(`[zoom-sync] ${allUsers.length} total users, ${licensedUsers.length} with active plans`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const user of licensedUsers) {
    const email = user.email.toLowerCase();
    if (!email) { skipped++; continue; }

    try {
      const check = await pool.query<{ id: string }>(
        'SELECT id FROM managed_users WHERE email = $1',
        [email]
      );
      if (check.rows.length === 0) { skipped++; continue; }

      const managedUserId = check.rows[0].id;
      const planName = ZOOM_PLAN[user.type] ?? `Type ${user.type}`;

      await pool.query(
        `INSERT INTO user_app_accounts
           (managed_user_id, app_provider, status, external_user_id, external_email, license_info, provisioned_at)
         VALUES ($1, 'zoom', 'active', $2, $3, $4::jsonb, NOW())
         ON CONFLICT (managed_user_id, app_provider) DO UPDATE SET
           status = 'active',
           external_user_id = EXCLUDED.external_user_id,
           external_email = EXCLUDED.external_email,
           license_info = EXCLUDED.license_info,
           last_modified_at = NOW()`,
        [managedUserId, user.id, email, JSON.stringify([{ name: planName }])]
      );

      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[zoom-sync] Failed to sync ${email}:`, msg);
      errorMessages.push(`${email}: ${msg}`);
      errors++;
    }
  }

  console.log(`[zoom-sync] Done — ${synced} synced, ${skipped} skipped, ${errors} errors`);
  return { synced, skipped, errors, errorMessages: errorMessages.length ? errorMessages : undefined };
}
