import { NextRequest, NextResponse } from 'next/server';

const SCHEDULER_API_URL = process.env.SCHEDULER_API_URL || 'http://localhost:8080';

// POST /api/scheduler/schedule - Create a scheduled job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
