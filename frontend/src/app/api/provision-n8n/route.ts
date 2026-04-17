import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeProvision } from '@/lib/execution';
import type { ProvisionPayload } from '@/lib/change-request-types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ProvisionPayload;

    const result = await executeProvision(body, session.user.email);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Provisioning error:', error);
    return NextResponse.json(
      {
        id: `prov-error-${Date.now()}`,
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
    return NextResponse.json({ error: 'Provisioning ID required' }, { status: 400 });
  }

  return NextResponse.json({ id, status: 'completed', timestamp: new Date().toISOString() });
}
