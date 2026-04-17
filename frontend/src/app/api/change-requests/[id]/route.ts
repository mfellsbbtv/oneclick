import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// GET /api/change-requests/[id] — single change request with approval history
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';

    const crResult = await pool.query(
      `SELECT * FROM change_requests WHERE id = $1`,
      [params.id]
    );

    if (crResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const changeRequest = crResult.rows[0];

    // Non-admins can only view their own requests
    if (!isAdmin && changeRequest.requested_by !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actionsResult = await pool.query(
      `SELECT * FROM approval_actions WHERE change_request_id = $1 ORDER BY created_at ASC`,
      [params.id]
    );

    return NextResponse.json({
      ...changeRequest,
      approval_actions: actionsResult.rows,
    });
  } catch (error) {
    console.error('Failed to get change request:', error);
    return NextResponse.json({ error: 'Failed to get change request' }, { status: 500 });
  }
}
