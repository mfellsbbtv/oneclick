import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTerminableUsers } from '@/lib/google-directory';
import { isProtected } from '@/lib/protected-accounts';
import { executeTermination } from '@/lib/execution';
import type { TerminatePayload } from '@/lib/change-request-types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (isProtected(body.userEmail)) {
      return NextResponse.json(
        { id: `term-error-${Date.now()}`, status: 'error', message: 'This account is protected and cannot be terminated' },
        { status: 403 }
      );
    }

    const terminableUsers = await getTerminableUsers(session.user.email, session.user.role);
    const isAuthorized = terminableUsers.some(
      (u) => u.email.toLowerCase() === body.userEmail?.toLowerCase()
    );
    if (!isAuthorized) {
      return NextResponse.json(
        { id: `term-error-${Date.now()}`, status: 'error', message: 'You are not authorized to terminate this user' },
        { status: 403 }
      );
    }

    const payload: TerminatePayload = {
      userEmail: body.userEmail?.trim().toLowerCase(),
      managerEmail: body.managerEmail?.trim().toLowerCase(),
      terminationDate: body.terminationDate || new Date().toISOString().split('T')[0],
      selectedApps: body.selectedApps || { googleWorkspace: true, microsoft365: false, jira: false, zoom: false },
      githubUsername: body.githubUsername,
      hubspotReassignEmail: body.hubspotReassignEmail,
    };

    const result = await executeTermination(payload, session.user.email);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Termination error:', error);
    return NextResponse.json(
      {
        id: `term-error-${Date.now()}`,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Termination ID required' }, { status: 400 });
  }

  return NextResponse.json({ id, status: 'completed', timestamp: new Date().toISOString() });
}
