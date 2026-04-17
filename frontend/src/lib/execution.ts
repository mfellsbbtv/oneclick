/**
 * Shared execution helpers for N8N webhook calls.
 * Used by both the direct API routes and the change request approval flow.
 */

import { buildOrchestratorPayload, validateOrchestratorPayload } from '@/lib/orchestrator-payload-builder';
import { logProvision, logTerminate } from '@/lib/logger';
import {
  ensureManagedUser,
  upsertUserAppAccount,
  updateAllAppAccountsStatus,
  updateManagedUserStatus,
} from '@/lib/app-account-service';
import type { AppProvider } from '@/lib/user-types';
import type {
  ProvisionPayload,
  TerminatePayload,
  GroupChangePayload,
  LicenseChangePayload,
  AccountActionPayload,
  RoleChangePayload,
} from '@/lib/change-request-types';

const N8N_ORCHESTRATOR_WEBHOOK = process.env.N8N_ORCHESTRATOR_WEBHOOK || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
const N8N_TERMINATE_WEBHOOK = process.env.N8N_TERMINATE_WEBHOOK || 'https://rhei.app.n8n.cloud/webhook/terminate-orchestrator';
const N8N_GROUP_CHANGE_WEBHOOK = process.env.N8N_GROUP_CHANGE_WEBHOOK || '';
const N8N_LICENSE_CHANGE_WEBHOOK = process.env.N8N_LICENSE_CHANGE_WEBHOOK || '';
const N8N_ACCOUNT_ACTION_WEBHOOK = process.env.N8N_ACCOUNT_ACTION_WEBHOOK || '';
const N8N_ROLE_CHANGE_WEBHOOK = process.env.N8N_ROLE_CHANGE_WEBHOOK || '';
const N8N_WEBHOOK_API_KEY = process.env.N8N_WEBHOOK_API_KEY || '';

export interface ProvisionResult {
  success: boolean;
  id: string;
  status: string;
  timestamp: string;
  employee: {
    name: string;
    email: string;
    department?: string;
    jobTitle?: string;
  };
  provisioning: {
    totalApps: number;
    successful: number;
    failed: number;
  };
  results: unknown[];
  error?: string;
}

export interface TerminationResult {
  success: boolean;
  id: string;
  status: string;
  timestamp: string;
  user: {
    email: string;
    name: string;
    manager: string;
  };
  termination: {
    date: string;
    totalApps: number;
    successful: number;
    failed: number;
  };
  appResults: unknown[];
  message: string;
  error?: string;
}

/**
 * Execute a provisioning request against N8N and update the database.
 * The payload is the same structure as the QuickProvisionForm body.
 */
export async function executeProvision(
  payload: ProvisionPayload,
  _requesterEmail: string
): Promise<ProvisionResult> {
  const orchestratorPayload = buildOrchestratorPayload(payload as Parameters<typeof buildOrchestratorPayload>[0]);

  const validation = validateOrchestratorPayload(orchestratorPayload);
  if (!validation.valid) {
    return {
      success: false,
      id: `prov-error-${Date.now()}`,
      status: 'error',
      timestamp: new Date().toISOString(),
      employee: {
        name: `${payload.employee.firstName} ${payload.employee.lastName}`,
        email: payload.employee.email,
      },
      provisioning: { totalApps: 0, successful: 0, failed: 0 },
      results: [],
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  const orchestratorResponse = await fetch(N8N_ORCHESTRATOR_WEBHOOK!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_WEBHOOK_API_KEY && { 'x-api-key': N8N_WEBHOOK_API_KEY }),
    },
    body: JSON.stringify(orchestratorPayload),
  });

  if (!orchestratorResponse.ok) {
    const errorText = await orchestratorResponse.text();
    throw new Error(`Orchestrator responded with ${orchestratorResponse.status}: ${errorText}`);
  }

  const n8nResult = await orchestratorResponse.json();

  const result: ProvisionResult = {
    success: !!n8nResult.success,
    id: `prov-${Date.now()}`,
    status: n8nResult.success ? 'success' : 'error',
    timestamp: n8nResult.timestamp || new Date().toISOString(),
    employee: {
      name: `${payload.employee.firstName} ${payload.employee.lastName}`,
      email: payload.employee.email,
      department: payload.employee.department,
      jobTitle: payload.employee.jobTitle,
    },
    provisioning: n8nResult.provisioning || {
      totalApps: n8nResult.appResults?.length || 0,
      successful: n8nResult.appResults?.filter((r: { success: boolean }) => r.success).length || 0,
      failed: n8nResult.appResults?.filter((r: { success: boolean }) => !r.success).length || 0,
    },
    results: n8nResult.appResults || [],
  };

  // Log and update DB (best-effort; never throw)
  try {
    logProvision({ request: payload as any, response: result as any });
  } catch (e) {
    console.error('Failed to write provision log:', e);
  }

  try {
    await ensureManagedUser({
      email: payload.employee.email,
      fullName: `${payload.employee.firstName} ${payload.employee.lastName}`,
      givenName: payload.employee.firstName,
      familyName: payload.employee.lastName,
      department: payload.employee.department,
      jobTitle: payload.employee.jobTitle,
    });

    const appMapping: Record<string, AppProvider> = {
      google: 'google-workspace',
      microsoft: 'microsoft-365',
      jira: 'jira',
      zoom: 'zoom',
      github: 'github',
      hubspot: 'hubspot',
    };

    for (const [appKey, provider] of Object.entries(appMapping)) {
      if (payload.applications?.[appKey as keyof typeof payload.applications]) {
        const appResult = (n8nResult.appResults as Array<{ app?: string; provider?: string; success: boolean }> | undefined)?.find(
          (r) => r.app === appKey || r.provider === appKey || r.app === provider
        );
        const succeeded = appResult ? appResult.success : true;
        await upsertUserAppAccount(payload.employee.email, provider, succeeded ? 'active' : 'error');
      }
    }
  } catch (e) {
    console.error('Failed to update app accounts after provision:', e);
  }

  return result;
}

/**
 * Execute a termination request against N8N and update the database.
 */
export async function executeTermination(
  payload: TerminatePayload,
  _requesterEmail: string
): Promise<TerminationResult> {
  const orchestratorResponse = await fetch(N8N_TERMINATE_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_WEBHOOK_API_KEY && { 'x-api-key': N8N_WEBHOOK_API_KEY }),
    },
    body: JSON.stringify(payload),
  });

  if (!orchestratorResponse.ok) {
    const errorText = await orchestratorResponse.text();
    throw new Error(`Terminate orchestrator responded with ${orchestratorResponse.status}: ${errorText}`);
  }

  const n8nResult = await orchestratorResponse.json();

  const result: TerminationResult = {
    success: !!n8nResult.success,
    id: `term-${Date.now()}`,
    status: n8nResult.success ? 'success' : 'error',
    timestamp: n8nResult.timestamp || new Date().toISOString(),
    user: n8nResult.user || {
      email: payload.userEmail,
      name: payload.userEmail.split('@')[0],
      manager: payload.managerEmail,
    },
    termination: n8nResult.termination || {
      date: payload.terminationDate,
      totalApps: n8nResult.appResults?.length || 0,
      successful: n8nResult.appResults?.filter((r: { success: boolean }) => r.success).length || 0,
      failed: n8nResult.appResults?.filter((r: { success: boolean }) => !r.success).length || 0,
    },
    appResults: n8nResult.appResults || [],
    message: n8nResult.message || (n8nResult.success ? 'User terminated successfully' : 'Termination failed'),
  };

  // Log and update DB (best-effort; never throw)
  try {
    logTerminate({
      request: {
        userEmail: payload.userEmail,
        managerEmail: payload.managerEmail,
        terminationDate: payload.terminationDate,
        selectedApps: payload.selectedApps as { googleWorkspace: boolean; microsoft365: boolean; jira: boolean; zoom: boolean },
      },
      response: result as any,
    });
  } catch (e) {
    console.error('Failed to write terminate log:', e);
  }

  try {
    const appMapping: Record<string, AppProvider> = {
      googleWorkspace: 'google-workspace',
      microsoft365: 'microsoft-365',
      jira: 'jira',
      zoom: 'zoom',
      github: 'github',
      hubspot: 'hubspot',
    };

    const terminatedProviders: AppProvider[] = [];
    for (const [appKey, provider] of Object.entries(appMapping)) {
      if (payload.selectedApps?.[appKey as keyof typeof payload.selectedApps]) {
        terminatedProviders.push(provider);
      }
    }

    if (terminatedProviders.length > 0) {
      await updateAllAppAccountsStatus(payload.userEmail, terminatedProviders, 'deactivated');
    }

    const allAppsTerminated = Object.values(payload.selectedApps || {}).every((v) => v === true);
    if (allAppsTerminated) {
      await updateManagedUserStatus(payload.userEmail, 'terminated');
    }
  } catch (e) {
    console.error('Failed to update app accounts after termination:', e);
  }

  return result;
}

/**
 * Execute a group membership change via N8N.
 */
export async function executeGroupChange(
  payload: GroupChangePayload,
  _requesterEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!N8N_GROUP_CHANGE_WEBHOOK) {
    console.warn('N8N_GROUP_CHANGE_WEBHOOK not configured — skipping webhook call');
    return { success: true };
  }

  const response = await fetch(N8N_GROUP_CHANGE_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_WEBHOOK_API_KEY && { 'x-api-key': N8N_WEBHOOK_API_KEY }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Group change webhook responded with ${response.status}: ${errorText}` };
  }

  const result = await response.json().catch(() => ({}));
  return { success: result.success !== false };
}

/**
 * Execute a license change via N8N.
 */
export async function executeLicenseChange(
  payload: LicenseChangePayload,
  _requesterEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!N8N_LICENSE_CHANGE_WEBHOOK) {
    console.warn('N8N_LICENSE_CHANGE_WEBHOOK not configured — skipping webhook call');
    return { success: true };
  }

  const response = await fetch(N8N_LICENSE_CHANGE_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_WEBHOOK_API_KEY && { 'x-api-key': N8N_WEBHOOK_API_KEY }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `License change webhook responded with ${response.status}: ${errorText}` };
  }

  const result = await response.json().catch(() => ({}));
  return { success: result.success !== false };
}

/**
 * Execute an account action (suspend, reactivate, password_reset) via N8N.
 */
export async function executeAccountAction(
  payload: AccountActionPayload,
  _requestType: string,
  _requesterEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!N8N_ACCOUNT_ACTION_WEBHOOK) {
    console.warn('N8N_ACCOUNT_ACTION_WEBHOOK not configured — skipping webhook call');
    return { success: true };
  }

  const response = await fetch(N8N_ACCOUNT_ACTION_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_WEBHOOK_API_KEY && { 'x-api-key': N8N_WEBHOOK_API_KEY }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Account action webhook responded with ${response.status}: ${errorText}` };
  }

  const result = await response.json().catch(() => ({}));
  if (result.success === false) {
    return { success: false, error: result.error || 'Account action failed' };
  }

  // Update local DB status for suspend/reactivate
  try {
    if (payload.action === 'suspend') {
      await updateManagedUserStatus(payload.userEmail, 'suspended');
    } else if (payload.action === 'reactivate') {
      await updateManagedUserStatus(payload.userEmail, 'active');
    }
  } catch (e) {
    console.error('Failed to update user status after account action:', e);
  }

  return { success: true };
}

/**
 * Execute a role change via N8N.
 */
export async function executeRoleChange(
  payload: RoleChangePayload,
  _requesterEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!N8N_ROLE_CHANGE_WEBHOOK) {
    console.warn('N8N_ROLE_CHANGE_WEBHOOK not configured — skipping webhook call');
    return { success: true };
  }

  const response = await fetch(N8N_ROLE_CHANGE_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_WEBHOOK_API_KEY && { 'x-api-key': N8N_WEBHOOK_API_KEY }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Role change webhook responded with ${response.status}: ${errorText}` };
  }

  const result = await response.json().catch(() => ({}));
  return { success: result.success !== false };
}
