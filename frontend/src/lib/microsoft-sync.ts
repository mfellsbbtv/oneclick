import { pool } from '@/lib/db';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface MSGraphUser {
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName: string;
  assignedLicenses: Array<{ skuId: string; disabledPlans: string[] }>;
}

export interface MicrosoftSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  errorMessages?: string[];
}

async function getMSAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)');
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get MS access token: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function fetchAllMSUsers(token: string): Promise<MSGraphUser[]> {
  const users: MSGraphUser[] = [];
  let url: string | null =
    `${GRAPH_API_BASE}/users?$filter=accountEnabled eq true` +
    `&$select=id,mail,userPrincipalName,displayName,assignedLicenses&$top=999`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Graph API error ${res.status}: ${err}`);
    }
    const data = await res.json() as { value: MSGraphUser[]; '@odata.nextLink'?: string };
    users.push(...data.value);
    url = data['@odata.nextLink'] ?? null;
  }

  return users;
}

export async function syncMicrosoftUsers(): Promise<MicrosoftSyncResult> {
  if (!process.env.AZURE_TENANT_ID) {
    console.warn('[microsoft-sync] AZURE_TENANT_ID not set, skipping');
    return { synced: 0, skipped: 0, errors: 0 };
  }

  let token: string;
  try {
    token = await getMSAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[microsoft-sync] Auth failed:', msg);
    return { synced: 0, skipped: 0, errors: 1, errorMessages: [`Auth failed: ${msg}`] };
  }

  let allUsers: MSGraphUser[];
  try {
    allUsers = await fetchAllMSUsers(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[microsoft-sync] Failed to fetch users:', msg);
    return { synced: 0, skipped: 0, errors: 1, errorMessages: [`Graph API: ${msg}`] };
  }

  // Only sync users who have at least one license assigned
  const licensedUsers = allUsers.filter(u => u.assignedLicenses.length > 0);
  console.log(`[microsoft-sync] ${allUsers.length} total users, ${licensedUsers.length} licensed`);

  // Optional domain translation: Microsoft accounts may use a different domain
  // (e.g. user@bbtv.com) while managed_users are stored under a different domain
  // (e.g. user@rhei.com). Set MICROSOFT_UPN_DOMAIN=bbtv.com and the username
  // prefix will be matched against SYNC_DOMAINS (defaults to rhei.com).
  const msDomain = process.env.MICROSOFT_UPN_DOMAIN?.toLowerCase().trim();
  const managedDomain = (process.env.SYNC_DOMAINS ?? 'rhei.com').split(',')[0].trim().toLowerCase();

  function resolveManagedEmail(msEmail: string): string {
    if (msDomain && msEmail.endsWith(`@${msDomain}`)) {
      const username = msEmail.split('@')[0];
      return `${username}@${managedDomain}`;
    }
    return msEmail;
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const user of licensedUsers) {
    // Prefer mail (primary email) over UPN (may be @tenant.onmicrosoft.com)
    const msEmail = (user.mail ?? user.userPrincipalName).toLowerCase();
    if (!msEmail) { skipped++; continue; }

    // Translate domain if needed (e.g. user@bbtv.com → user@rhei.com)
    const lookupEmail = resolveManagedEmail(msEmail);

    try {
      const check = await pool.query<{ id: string }>(
        'SELECT id FROM managed_users WHERE email = $1',
        [lookupEmail]
      );
      if (check.rows.length === 0) { skipped++; continue; }

      const managedUserId = check.rows[0].id;
      const licenseInfo = user.assignedLicenses.map(l => ({ skuId: l.skuId }));

      await pool.query(
        `INSERT INTO user_app_accounts
           (managed_user_id, app_provider, status, external_user_id, external_email, license_info, provisioned_at)
         VALUES ($1, 'microsoft-365', 'active', $2, $3, $4::jsonb, NOW())
         ON CONFLICT (managed_user_id, app_provider) DO UPDATE SET
           status = 'active',
           external_user_id = EXCLUDED.external_user_id,
           external_email = EXCLUDED.external_email,
           license_info = EXCLUDED.license_info,
           last_modified_at = NOW()`,
        [managedUserId, user.id, msEmail, JSON.stringify(licenseInfo)]
      );

      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[microsoft-sync] Failed to sync ${msEmail}:`, msg);
      errorMessages.push(`${msEmail}: ${msg}`);
      errors++;
    }
  }

  console.log(`[microsoft-sync] Done — ${synced} synced, ${skipped} skipped, ${errors} errors`);
  return { synced, skipped, errors, errorMessages: errorMessages.length ? errorMessages : undefined };
}
