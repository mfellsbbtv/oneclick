import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncDirectory, getLastSyncTime } from '@/lib/directory-sync';

export async function POST(request: NextRequest) {
  // Allow internal API key auth (used by Go scheduler cron) or admin session auth
  const internalKey = request.headers.get('x-internal-api-key');
  const expectedKey = process.env.DIRECTORY_SYNC_API_KEY;
  const isInternalCall = expectedKey && internalKey === expectedKey;

  if (!isInternalCall) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'superadmin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  }

  try {
    const triggeredBy = isInternalCall ? 'scheduler' : 'admin';
    console.log(`Directory sync triggered by ${triggeredBy}`);
    const result = await syncDirectory();
    console.log('Directory sync completed:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Directory sync failed:', error);
    return NextResponse.json(
      { error: 'Directory sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lastSync = await getLastSyncTime();
    return NextResponse.json({ last_synced_at: lastSync });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
