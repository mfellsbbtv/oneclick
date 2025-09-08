import { NextRequest, NextResponse } from 'next/server';

// Mock API endpoint for testing without backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received provisioning request:', body);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful response
    const response = {
      id: `prov-${Date.now()}`,
      status: 'success',
      message: 'Provisioning request received successfully',
      user: body.user,
      apps: body.apps,
      timestamp: new Date().toISOString(),
      results: body.apps.map((app: string) => ({
        app,
        status: 'pending',
        message: `${app} provisioning queued`,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Provisioning error:', error);
    return NextResponse.json(
      { error: 'Failed to process provisioning request' },
      { status: 500 }
    );
  }
}

// Mock GET endpoint to check provisioning status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Provisioning ID required' },
      { status: 400 }
    );
  }

  // Mock status response
  const response = {
    id,
    status: 'in_progress',
    progress: 65,
    results: [
      { app: 'google-workspace', status: 'success', message: 'User created successfully' },
      { app: 'slack', status: 'in_progress', message: 'Inviting to channels...' },
      { app: 'microsoft-365', status: 'pending', message: 'Waiting to start' },
    ],
  };

  return NextResponse.json(response, { status: 200 });
}