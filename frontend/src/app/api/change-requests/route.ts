import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import type { CreateChangeRequestBody } from '@/lib/change-request-types';

// POST /api/change-requests — submit a new change request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateChangeRequestBody;

    if (!body.request_type || !body.target_user_email || !body.payload) {
      return NextResponse.json(
        { error: 'request_type, target_user_email, and payload are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO change_requests
         (request_type, target_user_email, target_user_name, payload, schedule_time, requested_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        body.request_type,
        body.target_user_email.toLowerCase(),
        body.target_user_name || null,
        JSON.stringify(body.payload),
        body.schedule_time || null,
        session.user.email,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create change request:', error);
    return NextResponse.json({ error: 'Failed to create change request' }, { status: 500 });
  }
}

// GET /api/change-requests — list change requests
// Query params: status, type, my (boolean), page, limit
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const status = params.get('status');
    const type = params.get('type');
    const myOnly = params.get('my') !== 'false'; // default: show own requests
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Non-admins always see only their own requests
    if (!isAdmin || myOnly) {
      conditions.push(`cr.requested_by = $${idx++}`);
      values.push(session.user.email);
    }

    if (status) {
      conditions.push(`cr.status = $${idx++}`);
      values.push(status);
    }

    if (type) {
      conditions.push(`cr.request_type = $${idx++}`);
      values.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM change_requests cr ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT cr.*
       FROM change_requests cr
       ${where}
       ORDER BY cr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Failed to list change requests:', error);
    return NextResponse.json({ error: 'Failed to list change requests' }, { status: 500 });
  }
}
