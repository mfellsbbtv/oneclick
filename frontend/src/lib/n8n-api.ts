/**
 * n8n API Integration for OneClick Provisioning
 * Replaces the NestJS backend with n8n webhook endpoints
 */

// Configuration - Update with your n8n instance URL
const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_URL || 'https://rhei.app.n8n.cloud';
const N8N_WEBHOOK_PATH = '/webhook';

// Webhook endpoints
export const N8N_ENDPOINTS = {
  provision: `${N8N_BASE_URL}${N8N_WEBHOOK_PATH}/provision`,
  status: `${N8N_BASE_URL}${N8N_WEBHOOK_PATH}/provision/status`,
  retry: `${N8N_BASE_URL}${N8N_WEBHOOK_PATH}/provision/retry`,
} as const;

/**
 * Submit provisioning request to n8n
 */
export async function submitProvisionRequest(data: {
  employee: {
    fullName: string;
    workEmail: string;
    personalEmail?: string;
    department?: string;
    jobTitle?: string;
    manager?: string;
    startDate?: string;
    location?: string;
  };
  applications: Record<string, any>;
}) {
  try {
    // Generate request ID
    const requestId = `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add callback URL for status updates
    const callbackUrl = `${window.location.origin}/api/provision/callback`;
    
    const response = await fetch(N8N_ENDPOINTS.provision, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        employee: data.employee,
        applications: data.applications,
        webhookUrl: callbackUrl,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Provisioning failed: ${error}`);
    }

    const result = await response.json();
    return {
      success: true,
      requestId: result.requestId || requestId,
      status: result.status,
      results: result.results || {},
    };
  } catch (error) {
    console.error('Error submitting provision request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get provisioning status from n8n
 */
export async function getProvisionStatus(requestId: string) {
  try {
    const response = await fetch(`${N8N_ENDPOINTS.status}?requestId=${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get status');
    }

    const result = await response.json();
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error('Error getting provision status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Retry failed provisioning for specific applications
 */
export async function retryProvision(requestId: string, applications: string[]) {
  try {
    const response = await fetch(N8N_ENDPOINTS.retry, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        applications,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to retry provisioning');
    }

    const result = await response.json();
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error('Error retrying provision:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Transform wizard data to n8n format
 */
export function transformWizardData(wizardData: any) {
  const enabledApps = Object.entries(wizardData.selectedApps || {})
    .filter(([_, enabled]) => enabled)
    .map(([app]) => app);

  const applications: Record<string, any> = {};

  enabledApps.forEach(app => {
    const appConfig = wizardData[app] || {};
    applications[app] = {
      enabled: true,
      ...appConfig,
    };
  });

  return {
    employee: {
      fullName: wizardData.fullName,
      workEmail: wizardData.workEmail,
      personalEmail: wizardData.personalEmail,
      department: wizardData.department,
      jobTitle: wizardData.jobTitle,
      manager: wizardData.manager,
      startDate: wizardData.startDate,
      location: wizardData.location,
    },
    applications,
  };
}

/**
 * Mock function for local testing without n8n
 */
export async function mockProvisionRequest(data: any) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const requestId = `mock-${Date.now()}`;
  const results: Record<string, any> = {};
  
  Object.keys(data.applications).forEach(app => {
    if (data.applications[app].enabled) {
      results[app] = {
        status: Math.random() > 0.2 ? 'success' : 'failed',
        userId: data.employee.workEmail,
        details: {
          message: `${app} account created successfully`,
        },
      };
    }
  });
  
  return {
    success: true,
    requestId,
    status: 'completed',
    results,
  };
}

// Export for use in components
export default {
  submitProvisionRequest,
  getProvisionStatus,
  retryProvision,
  transformWizardData,
  mockProvisionRequest,
  endpoints: N8N_ENDPOINTS,
};