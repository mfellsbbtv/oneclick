// lib/n8n-payload-builder.ts
/**
 * Standardizes the frontend form data into the exact structure
 * that n8n workflows expect
 */

export interface N8nProvisioningPayload {
  requestId: string;
  employee: {
    fullName: string;
    workEmail: string;
    personalEmail?: string;
    department?: string;
    jobTitle?: string;
  };
  config: {
    primaryOrgUnit?: string;
    licenseSku?: string;
    groups?: string[];
    [key: string]: any; // Allow app-specific config fields
  };
}

/**
 * Build the standardized payload for n8n from form data
 */
export function buildN8nPayload(
  formData: {
    fullName: string;
    workEmail: string;
    selectedApps: string[];
    appConfigs: Record<string, any>;
  }
): N8nProvisioningPayload {
  // Generate a unique request ID for tracking
  const requestId = `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    requestId,
    employee: {
      fullName: formData.fullName.trim(),
      workEmail: formData.workEmail.trim().toLowerCase(),
      personalEmail: formData.appConfigs.personalEmail || undefined,
      department: formData.appConfigs.department || undefined,
      jobTitle: formData.appConfigs.jobTitle || undefined,
    },
    config: {
      primaryOrgUnit: formData.appConfigs.googleWorkspace?.primaryOrgUnit || '/',
      licenseSku: formData.appConfigs.googleWorkspace?.licenseSku,
      groups: formData.appConfigs.googleWorkspace?.groups || [],
      // Add other app configs here as needed
      ...formData.appConfigs,
    },
  };
}

/**
 * Validate payload structure before sending to n8n
 */
export function validateN8nPayload(payload: N8nProvisioningPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!payload.requestId) errors.push('requestId is required');
  if (!payload.employee.fullName) errors.push('employee.fullName is required');
  if (!payload.employee.workEmail) errors.push('employee.workEmail is required');

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (payload.employee.workEmail && !emailRegex.test(payload.employee.workEmail)) {
    errors.push('employee.workEmail is not a valid email format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}