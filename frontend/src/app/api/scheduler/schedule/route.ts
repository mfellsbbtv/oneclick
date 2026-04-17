import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTerminableUsers } from '@/lib/google-directory';
import { isProtected } from '@/lib/protected-accounts';

const SCHEDULER_API_URL = process.env.SCHEDULER_API_URL || 'http://localhost:8080';

// POST /api/scheduler/schedule - Create a scheduled job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // For termination jobs, verify authorization
    if (body.job_type === 'terminate' && body.payload?.userEmail) {
      if (isProtected(body.payload.userEmail)) {
        return NextResponse.json(
          { error: 'This account is protected and cannot be terminated' },
          { status: 403 }
        );
      }

      const terminableUsers = await getTerminableUsers(session.user.email, session.user.role);
      const isAuthorized = terminableUsers.some(
        u => u.email.toLowerCase() === body.payload.userEmail.toLowerCase()
      );
      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'You are not authorized to terminate this user' },
          { status: 403 }
        );
      }
    }

    const response = await fetch(`${SCHEDULER_API_URL}/api/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Scheduler proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}

// GET /api/scheduler/schedule - List scheduled jobs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const response = await fetch(
      `${SCHEDULER_API_URL}/api/schedule${queryString ? '?' + queryString : ''}`,
      { method: 'GET' }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Scheduler proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to list schedules' },
      { status: 500 }
    );
  }
}
