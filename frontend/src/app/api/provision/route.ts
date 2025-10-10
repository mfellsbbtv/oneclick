import { NextRequest, NextResponse } from 'next/server';

// Real backend integration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🚀 Forwarding to real backend:', body);

    // Forward to real NestJS backend
    const backendResponse = await fetch('http://localhost:3001/api/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`);
    }

    const result = await backendResponse.json();
    console.log('✅ Backend response:', result);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('❌ Backend integration error:', error);
    
    // Fallback to mock if backend is not available
    console.log('⚠️  Falling back to mock response');
    
    const body = await request.json();
    const mockResponse = {
      id: `prov-${Date.now()}`,
      status: 'mock',
      message: 'Backend not available - using mock response',
      user: body.user,
      apps: body.apps,
      timestamp: new Date().toISOString(),
      results: body.apps.map((app: string) => ({
        app,
        status: 'mock',
        message: `${app} provisioning (mock mode)`,
      })),
    };

    return NextResponse.json(mockResponse, { status: 200 });
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