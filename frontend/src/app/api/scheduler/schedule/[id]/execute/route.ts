import { NextRequest, NextResponse } from 'next/server';

const SCHEDULER_API_URL = process.env.SCHEDULER_API_URL || 'http://localhost:8080';

// POST /api/scheduler/schedule/[id]/execute
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(
      `${SCHEDULER_API_URL}/api/schedule/${id}/execute`,
      { method: 'POST' }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Scheduler proxy error:', error);
    return NextResponse.json({ error: 'Failed to execute schedule' }, { status: 500 });
  }
}
