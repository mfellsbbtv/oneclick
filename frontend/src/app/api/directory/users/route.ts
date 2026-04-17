import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const department = searchParams.get('department');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let paramIndex = 0;

    if (status && status !== 'all') {
      paramIndex++;
      whereClause += ` AND mu.status = $${paramIndex}`;
      params.push(status);
    }

    if (department) {
      paramIndex++;
      whereClause += ` AND mu.department = $${paramIndex}`;
      params.push(department);
    }

    if (search) {
      paramIndex++;
      whereClause += ` AND (mu.full_name ILIKE $${paramIndex} OR mu.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM managed_users mu ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get users with their app accounts aggregated
    paramIndex++;
    const limitParam = paramIndex;
    paramIndex++;
    const offsetParam = paramIndex;

    const usersResult = await pool.query(
      `SELECT
        mu.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ua.id,
              'app_provider', ua.app_provider,
              'status', ua.status,
              'external_user_id', ua.external_user_id,
              'external_email', ua.external_email,
              'license_info', ua.license_info,
              'provisioned_at', ua.provisioned_at
            )
          ) FILTER (WHERE ua.id IS NOT NULL),
          '[]'::json
        ) AS app_accounts
      FROM managed_users mu
      LEFT JOIN user_app_accounts ua ON ua.managed_user_id = mu.id
      ${whereClause}
      GROUP BY mu.id
      ORDER BY mu.full_name ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset]
    );

    // Get unique departments for filter dropdown
    const deptResult = await pool.query(
      `SELECT DISTINCT department FROM managed_users WHERE department IS NOT NULL ORDER BY department`
    );

    return NextResponse.json({
      users: usersResult.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      departments: deptResult.rows.map(r => r.department),
    });
  } catch (error) {
    console.error('Failed to fetch managed users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
