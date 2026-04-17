import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// POST /api/change-requests/[id]/reject — admin rejects a change request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason: string = body?.reason || '';

    const crResult = await pool.query(
      `SELECT * FROM change_requests WHERE id = $1 FOR UPDATE`,
      [params.id]
    );

    if (crResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const changeRequest = crResult.rows[0];

    if (changeRequest.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot reject a request with status: ${changeRequest.status}` },
        { status: 409 }
      );
    }

    await pool.query(
      `INSERT INTO approval_actions (change_request_id, action, actor_email, reason)
       VALUES ($1, 'reject', $2, $3)`,
      [params.id, session.user.email, reason || null]
    );

    await pool.query(
      `UPDATE change_requests
       SET status = 'rejected', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [params.id, session.user.email]
    );

    const updated = await pool.query(`SELECT * FROM change_requests WHERE id = $1`, [params.id]);
    return NextResponse.json({ changeRequest: updated.rows[0] });
  } catch (error) {
    console.error('Failed to reject change request:', error);
    return NextResponse.json({ error: 'Failed to reject change request' }, { status: 500 });
  }
}
