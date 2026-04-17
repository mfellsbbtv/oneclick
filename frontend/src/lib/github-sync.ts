import { pool } from '@/lib/db';

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubMember {
  id: number;
  login: string;
  type: string; // 'User' | 'Bot'
}

interface GitHubUserProfile {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
}

interface GitHubMembership {
  role: 'member' | 'admin';
  state: string;
}

export interface GitHubSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  errorMessages?: string[];
}

function githubHeaders(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fetchAllOrgMembers(org: string, pat: string): Promise<GitHubMember[]> {
  const members: GitHubMember[] = [];
  let page = 1;

  while (true) {
    const res: Response = await fetch(
      `${GITHUB_API_BASE}/orgs/${org}/members?per_page=100&page=${page}`,
      { headers: githubHeaders(pat) }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub members API error (${res.status}): ${err}`);
    }

    const batch = await res.json() as GitHubMember[];
    if (!batch.length) break;

    // Exclude bots
    members.push(...batch.filter(m => m.type === 'User'));
    if (batch.length < 100) break;
    page++;
  }

  return members;
}

async function fetchUserProfile(login: string, pat: string): Promise<GitHubUserProfile | null> {
  const res: Response = await fetch(
    `${GITHUB_API_BASE}/users/${login}`,
    { headers: githubHeaders(pat) }
  );
  if (!res.ok) return null;
  return res.json() as Promise<GitHubUserProfile>;
}

async function fetchMembership(org: string, login: string, pat: string): Promise<GitHubMembership | null> {
  const res: Response = await fetch(
    `${GITHUB_API_BASE}/orgs/${org}/memberships/${login}`,
    { headers: githubHeaders(pat) }
  );
  if (!res.ok) return null;
  return res.json() as Promise<GitHubMembership>;
}

export async function syncGitHubUsers(): Promise<GitHubSyncResult> {
  const pat = process.env.GITHUB_PAT;
  const org = process.env.GITHUB_ORG_NAME;

  if (!pat || !org || org === 'your-org') {
    console.warn('[github-sync] GITHUB_PAT or GITHUB_ORG_NAME not set, skipping');
    return { synced: 0, skipped: 0, errors: 0 };
  }

  const managedDomain = (process.env.SYNC_DOMAINS ?? 'rhei.com').split(',')[0].trim().toLowerCase();

  let members: GitHubMember[];
  try {
    members = await fetchAllOrgMembers(org, pat);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[github-sync] Failed to fetch org members:', msg);
    return { synced: 0, skipped: 0, errors: 1, errorMessages: [`GitHub API: ${msg}`] };
  }

  console.log(`[github-sync] ${members.length} org members found in ${org}`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const member of members) {
    try {
      // Strategy 1: match login@managedDomain (fast, no extra API call)
      const loginEmail = `${member.login.toLowerCase()}@${managedDomain}`;
      let check = await pool.query<{ id: string }>(
        'SELECT id FROM managed_users WHERE email = $1',
        [loginEmail]
      );

      // Strategy 2: fetch public GitHub profile email and try that
      if (check.rows.length === 0) {
        const profile = await fetchUserProfile(member.login, pat);
        if (profile?.email) {
          check = await pool.query<{ id: string }>(
            'SELECT id FROM managed_users WHERE email = $1',
            [profile.email.toLowerCase()]
          );
        }
      }

      if (check.rows.length === 0) {
        skipped++;
        continue;
      }

      const managedUserId = check.rows[0].id;

      // Fetch membership role (member or admin) — best-effort
      const membership = await fetchMembership(org, member.login, pat);
      const role = membership?.role ?? 'member';

      await pool.query(
        `INSERT INTO user_app_accounts
           (managed_user_id, app_provider, status, external_user_id, external_email, role_info, provisioned_at)
         VALUES ($1, 'github', 'active', $2, $3, $4::jsonb, NOW())
         ON CONFLICT (managed_user_id, app_provider) DO UPDATE SET
           status = 'active',
           external_user_id = EXCLUDED.external_user_id,
           external_email = EXCLUDED.external_email,
           role_info = EXCLUDED.role_info,
           last_modified_at = NOW()`,
        [
          managedUserId,
          String(member.id),
          `${member.login}`,
          JSON.stringify({ role }),
        ]
      );

      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[github-sync] Failed to sync ${member.login}:`, msg);
      errorMessages.push(`${member.login}: ${msg}`);
      errors++;
    }
  }

  console.log(`[github-sync] Done — ${synced} synced, ${skipped} skipped, ${errors} errors`);
  return { synced, skipped, errors, errorMessages: errorMessages.length ? errorMessages : undefined };
}
