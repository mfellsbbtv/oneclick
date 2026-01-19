// lib/orchestrator-payload-builder.ts
/**
 * Builds payload for N8N Orchestration Workflow
 * Matches the exact structure expected by provision-orchestrator webhook
 */

export interface OrchestratorPayload {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  selectedApps: {
    googleWorkspace: boolean;
    microsoft365: boolean;
    jira: boolean;
    zoom: boolean;
  };
  googleWorkspace?: {
    organizationalUnit: string;
    selectedGroups: string[];
  };
  microsoft365?: {
    selectedLicenses: string[];
    selectedGroups: string[];
  };
  jira?: {
    products: string[];
    groups: string[];
  };
}

/**
 * Transform frontend form data to orchestrator payload structure
 */
export function buildOrchestratorPayload(formData: {
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    personalEmail?: string;
    department?: string;
    jobTitle?: string;
    role?: string;
  };
  applications: {
    google: boolean;
    microsoft: boolean;
    jira?: boolean;
    zoom?: boolean;
    googleConfig?: {
      primaryOrgUnit: string;
      licenseSku?: string;
      groups?: string[];
      passwordMode?: string;
    };
    microsoftConfig?: {
      usageLocation: string;
      licenses: string[];
      groups: string[];
      requirePasswordChange?: boolean;
    };
    jiraConfig?: {
      products: string[];
      groups: string[];
    };
  };
}): OrchestratorPayload {
  const payload: OrchestratorPayload = {
    userInfo: {
      firstName: formData.employee.firstName.trim(),
      lastName: formData.employee.lastName.trim(),
      email: formData.employee.email.trim().toLowerCase(),
    },
    selectedApps: {
      googleWorkspace: formData.applications.google,
      microsoft365: formData.applications.microsoft,
      jira: formData.applications.jira || false,
      zoom: formData.applications.zoom || false,
    },
  };

  // Add Google Workspace config if enabled
  if (formData.applications.google && formData.applications.googleConfig) {
    payload.googleWorkspace = {
      organizationalUnit: formData.applications.googleConfig.primaryOrgUnit || '/',
      selectedGroups: formData.applications.googleConfig.groups || [],
    };
  }

  // Add Microsoft 365 config if enabled
  if (formData.applications.microsoft && formData.applications.microsoftConfig) {
    payload.microsoft365 = {
      selectedLicenses: formData.applications.microsoftConfig.licenses || [],
      selectedGroups: formData.applications.microsoftConfig.groups || [],
    };
  }

  // Add JIRA config if enabled
  if (formData.applications.jira && formData.applications.jiraConfig) {
    payload.jira = {
      products: formData.applications.jiraConfig.products || [],
      groups: formData.applications.jiraConfig.groups || [],
    };
  }

  return payload;
}

/**
 * Validate orchestrator payload before sending
 */
export function validateOrchestratorPayload(payload: OrchestratorPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!payload.userInfo.firstName) errors.push('firstName is required');
  if (!payload.userInfo.lastName) errors.push('lastName is required');
  if (!payload.userInfo.email) errors.push('email is required');

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (payload.userInfo.email && !emailRegex.test(payload.userInfo.email)) {
    errors.push('email is not a valid email format');
  }

  // At least one app must be selected
  if (!payload.selectedApps.googleWorkspace && !payload.selectedApps.microsoft365 && !payload.selectedApps.jira && !payload.selectedApps.zoom) {
    errors.push('At least one application must be selected');
  }

  // If Google is selected, validate config
  if (payload.selectedApps.googleWorkspace && !payload.googleWorkspace) {
    errors.push('Google Workspace config is required when app is selected');
  }

  // If Microsoft is selected, validate config
  if (payload.selectedApps.microsoft365 && !payload.microsoft365) {
    errors.push('Microsoft 365 config is required when app is selected');
  }

  // If JIRA is selected, validate config
  if (payload.selectedApps.jira && !payload.jira) {
    errors.push('JIRA config is required when app is selected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
