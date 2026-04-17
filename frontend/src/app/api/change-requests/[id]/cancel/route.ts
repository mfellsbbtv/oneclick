import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// POST /api/change-requests/[id]/cancel — requester or admin cancels a pending request
export async function POST(
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
      `SELECT * FROM change_requests WHERE id = $1 FOR UPDATE`,
      [params.id]
    );

    if (crResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const changeRequest = crResult.rows[0];

    // Only requester or admin can cancel
    if (!isAdmin && changeRequest.requested_by !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (changeRequest.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot cancel a request with status: ${changeRequest.status}` },
        { status: 409 }
      );
    }

    await pool.query(
      `UPDATE change_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [params.id]
    );

    const updated = await pool.query(`SELECT * FROM change_requests WHERE id = $1`, [params.id]);
    return NextResponse.json({ changeRequest: updated.rows[0] });
  } catch (error) {
    console.error('Failed to cancel change request:', error);
    return NextResponse.json({ error: 'Failed to cancel change request' }, { status: 500 });
  }
}
