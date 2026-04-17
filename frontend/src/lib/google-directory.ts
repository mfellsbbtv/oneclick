import { google } from 'googleapis';
import { isProtected } from '@/lib/protected-accounts';

// Types
export interface TerminableUser {
  email: string;
  name: string;
  groups: string[];
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Simple in-memory cache with 5-minute TTL
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data;
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Initialize directory client (singleton)
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
      'https://www.googleapis.com/auth/admin.directory.group.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
    ],
    subject: process.env.GOOGLE_ADMIN_DELEGATED_USER || 'mfells@broadbandtvcorp.com',
  });
  return google.admin({ version: 'directory_v1', auth });
}

// Get admin status for a user
export async function getAdminStatus(email: string): Promise<{ isAdmin: boolean; isDelegatedAdmin: boolean }> {
  const cacheKey = `admin:${email}`;
  const cached = getCached<{ isAdmin: boolean; isDelegatedAdmin: boolean }>(cacheKey);
  if (cached) return cached;

  try {
    const directory = getDirectoryClient();
    const res = await directory.users.get({ userKey: email });
    const result = {
      isAdmin: res.data.isAdmin || false,
      isDelegatedAdmin: res.data.isDelegatedAdmin || false,
    };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Failed to get admin status for ${email}:`, error);
    return { isAdmin: false, isDelegatedAdmin: false };
  }
}

// Get groups where user is OWNER
export async function getOwnedGroups(email: string): Promise<Array<{ groupEmail: string; groupName: string }>> {
  const cacheKey = `owned-groups:${email}`;
  const cached = getCached<Array<{ groupEmail: string; groupName: string }>>(cacheKey);
  if (cached) return cached;

  try {
    const directory = getDirectoryClient();
    const groups: Array<{ groupEmail: string; groupName: string }> = [];
    let pageToken: string | undefined;

    do {
      const res = await directory.groups.list({
        userKey: email,
        pageToken,
      });

      if (res.data.groups) {
        // For each group, check if the user is an OWNER
        for (const group of res.data.groups) {
          try {
            const memberRes = await directory.members.get({
              groupKey: group.email!,
              memberKey: email,
            });
            if (memberRes.data.role === 'OWNER') {
              groups.push({
                groupEmail: group.email!,
                groupName: group.name || group.email!,
              });
            }
          } catch {
            // User may not be a direct member (nested group), skip
          }
        }
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    setCache(cacheKey, groups);
    return groups;
  } catch (error) {
    console.error(`Failed to get owned groups for ${email}:`, error);
    return [];
  }
}

// Get members of a specific group
export async function getGroupMembers(groupEmail: string): Promise<Array<{ email: string; name: string }>> {
  const cacheKey = `members:${groupEmail}`;
  const cached = getCached<Array<{ email: string; name: string }>>(cacheKey);
  if (cached) return cached;

  try {
    const directory = getDirectoryClient();
    const members: Array<{ email: string; name: string }> = [];
    let pageToken: string | undefined;

    do {
      const res = await directory.members.list({
        groupKey: groupEmail,
        pageToken,
      });

      if (res.data.members) {
        for (const member of res.data.members) {
          if (member.type === 'USER' && member.email) {
            // Get user's full name
            try {
              const userRes = await directory.users.get({ userKey: member.email });
              members.push({
                email: member.email,
                name: userRes.data.name?.fullName || member.email,
              });
            } catch {
              members.push({ email: member.email, name: member.email });
            }
          }
        }
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    setCache(cacheKey, members);
    return members;
  } catch (error) {
    console.error(`Failed to get members for ${groupEmail}:`, error);
    return [];
  }
}

// Get terminable users based on role and group ownership
export async function getTerminableUsers(loggedInEmail: string, loggedInRole: string): Promise<TerminableUser[]> {
  const cacheKey = `terminable:${loggedInEmail}:${loggedInRole}`;
  const cached = getCached<TerminableUser[]>(cacheKey);
  if (cached) return cached;

  const protectedAccounts = (await import('@/lib/protected-accounts')).getProtectedAccounts();
  let users: TerminableUser[] = [];

  if (loggedInRole === 'superadmin' || loggedInRole === 'admin') {
    // Admins/superadmins can see all domain users
    const directory = getDirectoryClient();
    const allUsers: TerminableUser[] = [];
    let pageToken: string | undefined;

    do {
      const res = await directory.users.list({
        domain: 'rhei.com',
        maxResults: 500,
        pageToken,
        orderBy: 'familyName',
      });

      if (res.data.users) {
        for (const user of res.data.users) {
          if (!user.primaryEmail) continue;
          const email = user.primaryEmail.toLowerCase();

          // Skip self
          if (email === loggedInEmail.toLowerCase()) continue;
          // Skip protected accounts
          if (protectedAccounts.has(email)) continue;

          const userIsAdmin = user.isAdmin || false;
          const userIsDelegated = user.isDelegatedAdmin || false;

          // Super admin: skip other super admins
          if (loggedInRole === 'superadmin' && userIsAdmin) continue;
          // Admin: skip admins and super admins
          if (loggedInRole === 'admin' && (userIsAdmin || userIsDelegated)) continue;

          allUsers.push({
            email,
            name: user.name?.fullName || email,
            groups: [],
            isAdmin: userIsAdmin,
            isDelegatedAdmin: userIsDelegated,
          });
        }
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    users = allUsers;
  } else {
    // Regular user: only members of owned groups
    const ownedGroups = await getOwnedGroups(loggedInEmail);
    const seenEmails = new Set<string>();
    const terminableUsers: TerminableUser[] = [];

    for (const group of ownedGroups) {
      const members = await getGroupMembers(group.groupEmail);

      for (const member of members) {
        const email = member.email.toLowerCase();
        if (email === loggedInEmail.toLowerCase()) continue;
        if (protectedAccounts.has(email)) continue;

        // Check admin status
        const adminStatus = await getAdminStatus(email);
        if (adminStatus.isAdmin || adminStatus.isDelegatedAdmin) continue;

        if (seenEmails.has(email)) {
          // Add group to existing entry
          const existing = terminableUsers.find(u => u.email === email);
          if (existing && !existing.groups.includes(group.groupName)) {
            existing.groups.push(group.groupName);
          }
        } else {
          seenEmails.add(email);
          terminableUsers.push({
            email,
            name: member.name,
            groups: [group.groupName],
            isAdmin: false,
            isDelegatedAdmin: false,
          });
        }
      }
    }

    users = terminableUsers;
  }

  // Sort by name
  users.sort((a, b) => a.name.localeCompare(b.name));
  setCache(cacheKey, users);
  return users;
}
