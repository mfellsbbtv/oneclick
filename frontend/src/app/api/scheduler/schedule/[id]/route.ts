import { NextRequest, NextResponse } from 'next/server';

const SCHEDULER_API_URL = process.env.SCHEDULER_API_URL || 'http://localhost:8080';

// GET /api/scheduler/schedule/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${SCHEDULER_API_URL}/api/schedule/${id}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Scheduler proxy error:', error);
    return NextResponse.json({ error: 'Failed to get schedule' }, { status: 500 });
  }
}

// DELETE /api/scheduler/schedule/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${SCHEDULER_API_URL}/api/schedule/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Scheduler proxy error:', error);
    return NextResponse.json({ error: 'Failed to cancel schedule' }, { status: 500 });
  }
}
