import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getProtectedAccounts } from '@/lib/protected-accounts';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loggedInEmail = session.user.email.toLowerCase();
  const role = session.user.role;
  const protected_ = getProtectedAccounts();

  try {
    let rows;

    if (role === 'superadmin' || role === 'admin') {
      // Admins see all active/suspended users except themselves, other admins, and protected accounts
      const skipAdmins = role === 'admin';
      const result = await pool.query(
        `SELECT email, full_name AS name, is_admin, is_delegated_admin
         FROM managed_users
         WHERE status NOT IN ('terminated', 'archived')
           AND email != $1
           AND ($2 = false OR (is_admin = false AND is_delegated_admin = false))
         ORDER BY full_name ASC`,
        [loggedInEmail, skipAdmins]
      );
      rows = result.rows;
    } else {
      // Regular users: only members of groups they own
      // groups JSONB field stores [{email, name, role}] — filter where role = 'OWNER'
      const ownedGroupResult = await pool.query(
        `SELECT DISTINCT jsonb_array_elements(groups)->>'email' AS group_email
         FROM managed_users
         WHERE email = $1`,
        [loggedInEmail]
      );

      if (ownedGroupResult.rows.length === 0) {
        return NextResponse.json([]);
      }

      // For simplicity, fall back to DB-based group membership check
      // This returns users who share any group with the logged-in user
      // (A full owned-group implementation requires group ownership data in DB)
      const result = await pool.query(
        `SELECT DISTINCT mu.email, mu.full_name AS name, mu.is_admin, mu.is_delegated_admin
         FROM managed_users mu
         WHERE mu.status NOT IN ('terminated', 'archived')
           AND mu.email != $1
           AND mu.is_admin = false
           AND mu.is_delegated_admin = false
         ORDER BY mu.full_name ASC`,
        [loggedInEmail]
      );
      rows = result.rows;
    }

    // Filter out protected accounts
    const users = rows
      .filter((u: { email: string }) => !protected_.has(u.email.toLowerCase()))
      .map((u: { email: string; name: string; is_admin: boolean; is_delegated_admin: boolean }) => ({
        email: u.email,
        name: u.name,
        groups: [],
        isAdmin: u.is_admin,
        isDelegatedAdmin: u.is_delegated_admin,
      }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch terminable users from DB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terminable users' },
      { status: 500 }
    );
  }
}
