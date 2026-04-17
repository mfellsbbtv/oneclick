import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = decodeURIComponent(params.email).toLowerCase();

  try {
    const userResult = await pool.query(
      `SELECT * FROM managed_users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    const accountsResult = await pool.query(
      `SELECT * FROM user_app_accounts WHERE managed_user_id = $1 ORDER BY app_provider`,
      [user.id]
    );

    return NextResponse.json({
      ...user,
      app_accounts: accountsResult.rows,
    });
  } catch (error) {
    console.error(`Failed to fetch user ${email}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
