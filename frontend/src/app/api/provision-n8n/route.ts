import { NextRequest, NextResponse } from 'next/server';
import { buildOrchestratorPayload, validateOrchestratorPayload } from '@/lib/orchestrator-payload-builder';
import { logProvision } from '@/lib/logger';

// n8n orchestrator webhook URL
const N8N_ORCHESTRATOR_WEBHOOK = process.env.N8N_ORCHESTRATOR_WEBHOOK || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🚀 Processing provisioning request:', {
      employee: `${body.employee.firstName} ${body.employee.lastName}`,
      email: body.employee.email,
      applications: {
        google: body.applications.google,
        microsoft: body.applications.microsoft,
        jira: body.applications.jira,
      },
    });

    // Build orchestrator payload
    const orchestratorPayload = buildOrchestratorPayload(body);

    // Validate payload
    const validation = validateOrchestratorPayload(orchestratorPayload);
    if (!validation.valid) {
      console.error('❌ Payload validation failed:', validation.errors);
      return NextResponse.json(
        {
          id: `prov-error-${Date.now()}`,
          status: 'error',
          message: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log('📤 Sending to orchestrator:', orchestratorPayload);

    // Send to n8n orchestrator webhook
    const orchestratorResponse = await fetch(N8N_ORCHESTRATOR_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orchestratorPayload),
    });

    if (!orchestratorResponse.ok) {
      const errorText = await orchestratorResponse.text();
      console.error('❌ Orchestrator error:', errorText);
      throw new Error(`Orchestrator responded with ${orchestratorResponse.status}: ${errorText}`);
    }

    const result = await orchestratorResponse.json();

    console.log('✅ Orchestrator response:', result);

    // Transform orchestrator response to frontend format
    const response = {
      id: `prov-${Date.now()}`,
      status: result.success ? 'success' : 'error',
      timestamp: result.timestamp || new Date().toISOString(),
      employee: {
        name: `${body.employee.firstName} ${body.employee.lastName}`,
        email: body.employee.email,
        department: body.employee.department,
        jobTitle: body.employee.jobTitle,
      },
      provisioning: result.provisioning || {
        totalApps: result.appResults?.length || 0,
        successful: result.appResults?.filter((r: any) => r.success).length || 0,
        failed: result.appResults?.filter((r: any) => !r.success).length || 0,
      },
      results: result.appResults || [],
    };

    console.log('✅ Provisioning completed:', response.provisioning);

    // Log the provisioning operation
    try {
      logProvision({
        request: body,
        response: response,
      });
    } catch (logError) {
      console.error('Failed to write provision log:', logError);
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Provisioning error:', error);

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

// Get provisioning status (if you implement status tracking)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Provisioning ID required' },
      { status: 400 }
    );
  }

  // In a real implementation, you would fetch this from a database
  // For now, return a mock status
  const response = {
    id,
    status: 'completed',
    timestamp: new Date().toISOString(),
    results: [
      {
        provider: 'google-workspace',
        status: 'success',
        message: 'User created successfully',
        details: {
          email: 'user@domain.com',
          adminUrl: 'https://admin.google.com',
        },
      },
      {
        provider: 'microsoft-365',
        status: 'success',
        message: 'User created and licenses assigned',
        details: {
          userPrincipalName: 'user@domain.onmicrosoft.com',
          licensesAssigned: ['Microsoft 365 Business Premium'],
          adminUrl: 'https://admin.microsoft.com',
        },
      },
    ],
  };

  return NextResponse.json(response, { status: 200 });
}
