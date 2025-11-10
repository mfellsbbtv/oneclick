import { NextRequest, NextResponse } from 'next/server';

// n8n webhook endpoints configuration
const N8N_WEBHOOKS = {
  orchestrator: process.env.N8N_ORCHESTRATOR_WEBHOOK || 'https://your-n8n-instance.com/webhook/master-orchestrator',
  google: process.env.N8N_GOOGLE_WEBHOOK || 'https://your-n8n-instance.com/webhook/google-provision',
  microsoft: process.env.N8N_MICROSOFT_WEBHOOK || 'https://your-n8n-instance.com/webhook/microsoft-provision-enhanced',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🚀 Processing provisioning request:', {
      employee: body.employee.fullName,
      applications: Object.keys(body.applications).filter(key => 
        key !== 'google' && key !== 'microsoft' && body.applications[key]
      ),
    });

    const provisioningRequests = [];
    const results = [];

    // Prepare Google Workspace provisioning
    if (body.applications.google && body.applications['google-workspace']) {
      const googlePayload = {
        employee: body.employee,
        applications: {
          'google-workspace': {
            ...body.applications['google-workspace'],
            primaryEmail: body.employee.workEmail,
            recoveryEmail: body.employee.personalEmail,
          },
        },
      };

      provisioningRequests.push(
        fetch(N8N_WEBHOOKS.google, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(googlePayload),
        }).then(async (res) => {
          const result = await res.json();
          return {
            provider: 'google-workspace',
            status: res.ok ? 'success' : 'error',
            data: result,
          };
        }).catch(error => ({
          provider: 'google-workspace',
          status: 'error',
          error: error.message,
        }))
      );
    }

    // Prepare Microsoft 365 provisioning
    if (body.applications.microsoft && body.applications['microsoft-365']) {
      const microsoftPayload = {
        employee: {
          ...body.employee,
          usageLocation: body.applications['microsoft-365'].usageLocation,
        },
        applications: {
          microsoft365: {
            ...body.applications['microsoft-365'],
            userPrincipalName: body.employee.workEmail,
          },
        },
      };

      provisioningRequests.push(
        fetch(N8N_WEBHOOKS.microsoft, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(microsoftPayload),
        }).then(async (res) => {
          const result = await res.json();
          return {
            provider: 'microsoft-365',
            status: res.ok ? 'success' : 'error',
            data: result,
          };
        }).catch(error => ({
          provider: 'microsoft-365',
          status: 'error',
          error: error.message,
        }))
      );
    }

    // Alternative: Use master orchestrator for all provisioning
    // Uncomment this section if you want to use a single orchestrator workflow
    /*
    const orchestratorPayload = {
      employee: body.employee,
      applications: {
        ...(body.applications.google && {
          'google-workspace': body.applications['google-workspace'],
        }),
        ...(body.applications.microsoft && {
          'microsoft-365': body.applications['microsoft-365'],
        }),
      },
    };

    const orchestratorResponse = await fetch(N8N_WEBHOOKS.orchestrator, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orchestratorPayload),
    });

    if (!orchestratorResponse.ok) {
      throw new Error(`Orchestrator responded with ${orchestratorResponse.status}`);
    }

    const result = await orchestratorResponse.json();
    */

    // Execute all provisioning requests in parallel
    if (provisioningRequests.length > 0) {
      const provisioningResults = await Promise.all(provisioningRequests);
      results.push(...provisioningResults);
    }

    // Compile response
    const response = {
      id: `prov-${Date.now()}`,
      status: results.every(r => r.status === 'success') ? 'success' : 'partial',
      timestamp: new Date().toISOString(),
      employee: {
        name: body.employee.fullName,
        email: body.employee.workEmail,
        department: body.employee.department,
        jobTitle: body.employee.jobTitle,
      },
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
      },
    };

    console.log('✅ Provisioning completed:', response.summary);

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