import { NextRequest, NextResponse } from 'next/server';
import { logTerminate } from '@/lib/logger';

// N8N terminate orchestrator webhook URL
const N8N_TERMINATE_WEBHOOK = process.env.N8N_TERMINATE_WEBHOOK || 'https://rhei.app.n8n.cloud/webhook/terminate-orchestrator';

interface TerminationPayload {
  userEmail: string;
  managerEmail: string;
  terminationDate: string;
  selectedApps?: {
    googleWorkspace?: boolean;
    microsoft365?: boolean;
    jira?: boolean;
    zoom?: boolean;
  };
}

function validateTerminationPayload(payload: TerminationPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payload.userEmail) errors.push('userEmail is required');
  if (!payload.managerEmail) errors.push('managerEmail is required');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (payload.userEmail && !emailRegex.test(payload.userEmail)) {
    errors.push('userEmail is not a valid email format');
  }
  if (payload.managerEmail && !emailRegex.test(payload.managerEmail)) {
    errors.push('managerEmail is not a valid email format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🔴 Processing termination request:', {
      userEmail: body.userEmail,
      managerEmail: body.managerEmail,
      terminationDate: body.terminationDate,
    });

    // Build termination payload
    const terminationPayload: TerminationPayload = {
      userEmail: body.userEmail?.trim().toLowerCase(),
      managerEmail: body.managerEmail?.trim().toLowerCase(),
      terminationDate: body.terminationDate || new Date().toISOString().split('T')[0],
      selectedApps: body.selectedApps || {
        googleWorkspace: true,
        microsoft365: false,
        jira: false,
        zoom: false,
      },
    };

    // Validate payload
    const validation = validateTerminationPayload(terminationPayload);
    if (!validation.valid) {
      console.error('❌ Payload validation failed:', validation.errors);
      return NextResponse.json(
        {
          id: `term-error-${Date.now()}`,
          status: 'error',
          message: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log('📤 Sending to terminate orchestrator:', terminationPayload);

    // Send to n8n terminate orchestrator webhook
    const orchestratorResponse = await fetch(N8N_TERMINATE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(terminationPayload),
    });

    if (!orchestratorResponse.ok) {
      const errorText = await orchestratorResponse.text();
      console.error('❌ Terminate orchestrator error:', errorText);
      throw new Error(`Orchestrator responded with ${orchestratorResponse.status}: ${errorText}`);
    }

    const result = await orchestratorResponse.json();

    console.log('✅ Terminate orchestrator response:', result);

    // Transform orchestrator response to frontend format
    const response = {
      id: `term-${Date.now()}`,
      status: result.success ? 'success' : 'error',
      timestamp: result.timestamp || new Date().toISOString(),
      user: result.user || {
        email: body.userEmail,
        name: body.userName || body.userEmail.split('@')[0],
        manager: body.managerEmail,
      },
      termination: result.termination || {
        date: body.terminationDate,
        totalApps: result.appResults?.length || 0,
        successful: result.appResults?.filter((r: any) => r.success).length || 0,
        failed: result.appResults?.filter((r: any) => !r.success).length || 0,
      },
      appResults: result.appResults || [],
      message: result.message || (result.success ? 'User terminated successfully' : 'Termination failed'),
    };

    console.log('✅ Termination completed:', response.termination);

    // Log the termination operation
    try {
      logTerminate({
        request: {
          userEmail: terminationPayload.userEmail,
          managerEmail: terminationPayload.managerEmail,
          terminationDate: terminationPayload.terminationDate,
          selectedApps: terminationPayload.selectedApps || { googleWorkspace: true, microsoft365: false, jira: false, zoom: false },
        },
        response: response,
      });
    } catch (logError) {
      console.error('Failed to write terminate log:', logError);
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Termination error:', error);

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
    return NextResponse.json(
      { error: 'Termination ID required' },
      { status: 400 }
    );
  }

  // In a real implementation, you would fetch this from a database
  const response = {
    id,
    status: 'completed',
    timestamp: new Date().toISOString(),
    message: 'Termination status retrieved',
  };

  return NextResponse.json(response, { status: 200 });
}
