import fs from 'fs';
import path from 'path';

// Log directories - using WSL mount path for Windows folders
const LOG_BASE_PATH = '/mnt/c/temp/oc';
const PROVISION_LOG_PATH = path.join(LOG_BASE_PATH, 'provision');
const TERMINATE_LOG_PATH = path.join(LOG_BASE_PATH, 'terminate');

/**
 * Ensures the log directories exist, creating them if necessary
 */
function ensureLogDirectories(): void {
  try {
    if (!fs.existsSync(LOG_BASE_PATH)) {
      fs.mkdirSync(LOG_BASE_PATH, { recursive: true });
    }
    if (!fs.existsSync(PROVISION_LOG_PATH)) {
      fs.mkdirSync(PROVISION_LOG_PATH, { recursive: true });
    }
    if (!fs.existsSync(TERMINATE_LOG_PATH)) {
      fs.mkdirSync(TERMINATE_LOG_PATH, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create log directories:', error);
  }
}

/**
 * Gets the current date in YYYY-MM-DD format
 */
function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Extracts username from email address
 */
function getUsernameFromEmail(email: string): string {
  return email.split('@')[0] || 'unknown';
}

/**
 * Formats a log entry with timestamp and structured data
 */
function formatLogEntry(data: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const separator = '='.repeat(80);

  let logContent = `${separator}\n`;
  logContent += `Timestamp: ${timestamp}\n`;
  logContent += `${separator}\n\n`;

  logContent += formatObject(data, 0);

  logContent += `\n${separator}\n`;

  return logContent;
}

/**
 * Recursively formats an object for logging
 */
function formatObject(obj: unknown, indent: number): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  if (obj === null || obj === undefined) {
    return `${spaces}(none)\n`;
  }

  if (typeof obj !== 'object') {
    return `${spaces}${obj}\n`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `${spaces}(empty array)\n`;
    }
    obj.forEach((item, index) => {
      result += `${spaces}[${index}]:\n`;
      result += formatObject(item, indent + 1);
    });
    return result;
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) {
    return `${spaces}(empty object)\n`;
  }

  entries.forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      result += `${spaces}${key}:\n`;
      result += formatObject(value, indent + 1);
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  });

  return result;
}

/**
 * Writes a log entry for a provisioning operation
 */
export function logProvision(data: {
  request: {
    employee: {
      firstName: string;
      lastName: string;
      email: string;
      department?: string;
      jobTitle?: string;
    };
    applications: {
      google: boolean;
      microsoft: boolean;
      googleConfig?: {
        primaryOrgUnit?: string;
        groups?: string[];
      };
      microsoftConfig?: {
        licenses?: string[];
        groups?: string[];
      };
    };
  };
  response: {
    id?: string;
    status: string;
    timestamp?: string;
    provisioning?: {
      totalApps: number;
      successful: number;
      failed: number;
    };
    results?: Array<{
      app?: string;
      provider?: string;
      status: string;
      success?: boolean;
      message?: string;
      details?: Record<string, unknown>;
    }>;
  };
}): void {
  ensureLogDirectories();

  const username = getUsernameFromEmail(data.request.employee.email);
  const dateStr = getDateString();
  const filename = `${username}.${dateStr}.log`;
  const filepath = path.join(PROVISION_LOG_PATH, filename);

  const logData = {
    'PROVISIONING LOG': '',
    'Employee Information': {
      'Full Name': `${data.request.employee.firstName} ${data.request.employee.lastName}`,
      'Email': data.request.employee.email,
      'Department': data.request.employee.department || '(not specified)',
      'Job Title': data.request.employee.jobTitle || '(not specified)',
    },
    'Applications Selected': {
      'Google Workspace': data.request.applications.google ? 'Yes' : 'No',
      'Microsoft 365': data.request.applications.microsoft ? 'Yes' : 'No',
    },
    'Google Workspace Configuration': data.request.applications.google ? {
      'Organizational Unit': data.request.applications.googleConfig?.primaryOrgUnit || '/',
      'Groups': data.request.applications.googleConfig?.groups?.length
        ? data.request.applications.googleConfig.groups
        : '(none selected)',
    } : '(not provisioned)',
    'Microsoft 365 Configuration': data.request.applications.microsoft ? {
      'Licenses': data.request.applications.microsoftConfig?.licenses?.length
        ? data.request.applications.microsoftConfig.licenses
        : '(none selected)',
      'Groups': data.request.applications.microsoftConfig?.groups?.length
        ? data.request.applications.microsoftConfig.groups
        : '(none selected)',
    } : '(not provisioned)',
    'Provisioning Results': {
      'Status': data.response.status,
      'Timestamp': data.response.timestamp || new Date().toISOString(),
      'Summary': data.response.provisioning || { totalApps: 0, successful: 0, failed: 0 },
    },
    'Detailed Results': data.response.results || [],
  };

  try {
    const logEntry = formatLogEntry(logData);

    // Append to existing log file or create new one
    fs.appendFileSync(filepath, logEntry);
    console.log(`Provision log written to: ${filepath}`);
  } catch (error) {
    console.error('Failed to write provision log:', error);
  }
}

/**
 * Writes a log entry for a termination operation
 */
export function logTerminate(data: {
  request: {
    userEmail: string;
    managerEmail: string;
    terminationDate: string;
    selectedApps: {
      googleWorkspace: boolean;
      microsoft365: boolean;
    };
  };
  response: {
    id?: string;
    status: string;
    timestamp?: string;
    user?: {
      email: string;
      name: string;
      manager: string;
    };
    termination?: {
      date: string;
      totalApps: number;
      successful: number;
      failed: number;
    };
    appResults?: Array<{
      app: string;
      status: string;
      success: boolean;
      message: string;
      results?: Record<string, { success: boolean; message: string }>;
    }>;
    message?: string;
  };
}): void {
  ensureLogDirectories();

  const username = getUsernameFromEmail(data.request.userEmail);
  const dateStr = getDateString();
  const filename = `${username}.${dateStr}.log`;
  const filepath = path.join(TERMINATE_LOG_PATH, filename);

  const logData = {
    'TERMINATION LOG': '',
    'User Information': {
      'User Email': data.request.userEmail,
      'User Name': data.response.user?.name || username,
      'Manager Email': data.request.managerEmail,
      'Termination Date': data.request.terminationDate,
    },
    'Applications Selected for Termination': {
      'Google Workspace': data.request.selectedApps.googleWorkspace ? 'Yes' : 'No',
      'Microsoft 365': data.request.selectedApps.microsoft365 ? 'Yes' : 'No',
    },
    'Termination Results': {
      'Overall Status': data.response.status,
      'Message': data.response.message || '',
      'Timestamp': data.response.timestamp || new Date().toISOString(),
      'Summary': data.response.termination || {
        date: data.request.terminationDate,
        totalApps: 0,
        successful: 0,
        failed: 0
      },
    },
    'Detailed App Results': data.response.appResults?.map(result => ({
      'Application': result.app,
      'Status': result.status,
      'Success': result.success ? 'Yes' : 'No',
      'Message': result.message,
      'Step Details': result.results || {},
    })) || [],
  };

  try {
    const logEntry = formatLogEntry(logData);

    // Append to existing log file or create new one
    fs.appendFileSync(filepath, logEntry);
    console.log(`Terminate log written to: ${filepath}`);
  } catch (error) {
    console.error('Failed to write terminate log:', error);
  }
}
