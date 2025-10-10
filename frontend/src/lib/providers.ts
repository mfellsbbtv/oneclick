export enum AppProvider {
  GOOGLE_WORKSPACE = 'google-workspace',
  SLACK = 'slack',
  MICROSOFT_365 = 'microsoft-365',
  CLICKUP = 'clickup',
  JIRA = 'jira',
  CONFLUENCE = 'confluence',
  GITHUB = 'github',
  ZOOM = 'zoom',
  HUBSPOT = 'hubspot',
}

export interface ProviderConfig {
  id: AppProvider;
  name: string;
  description: string;
  icon: string;
  color: string;
  requiredFields: FieldConfig[];
  optionalFields?: FieldConfig[];
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'multiselect' | 'boolean' | 'number';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  default?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export const providers: Record<AppProvider, ProviderConfig> = {
  [AppProvider.GOOGLE_WORKSPACE]: {
    id: AppProvider.GOOGLE_WORKSPACE,
    name: 'Google Workspace',
    description: 'Email, calendar, and collaboration tools',
    icon: '🔍',
    color: 'bg-blue-500',
    requiredFields: [
      {
        name: 'primaryOrgUnit',
        label: 'Organization Unit',
        type: 'text',
        required: true,
        default: '/',
        placeholder: '/',
        description: 'The organizational unit path for the user',
      },
      {
        name: 'licenseSku',
        label: 'License SKU',
        type: 'select',
        required: true,
        options: [
          { value: '1010020027', label: 'Business Starter' },
          { value: '1010020028', label: 'Business Standard' },
          { value: '1010020025', label: 'Business Plus' },
          { value: '1010020026', label: 'Enterprise Standard' },
          { value: '1010020030', label: 'Enterprise Plus' },
        ],
        default: '1010020027',
      },
    ],
    optionalFields: [
      {
        name: 'passwordMode',
        label: 'Password Setup',
        type: 'select',
        required: false,
        options: [
          { value: 'auto', label: '🎲 Auto-generate secure password (recommended)' },
          { value: 'custom', label: '🔐 I will set a custom password' },
        ],
        default: 'auto',
        description: '📋 Choose how to set the user\'s initial password. Auto-generated passwords are secure and unique.',
      },
      {
        name: 'customPassword',
        label: 'Custom Password',
        type: 'password',
        required: false,
        placeholder: 'Enter password (minimum 8 characters)',
        description: '🔐 This password will be used for Google Workspace login. Make it secure!',
        validation: {
          minLength: 8,
        },
      },
      {
        name: 'changePasswordAtNextLogin',
        label: 'Force password change on first login',
        type: 'boolean',
        required: false,
        default: false,
        description: '⚠️ WARNING: If enabled, user CANNOT log in with the password above until they reset it. Leave OFF for immediate access.',
      },
    ],
  },
  [AppProvider.SLACK]: {
    id: AppProvider.SLACK,
    name: 'Slack',
    description: 'Team communication and collaboration',
    icon: '💬',
    color: 'bg-purple-500',
    requiredFields: [
      {
        name: 'userRole',
        label: 'User Role',
        type: 'select',
        required: true,
        options: [
          { value: 'member', label: 'Member - Full workspace access' },
          { value: 'single_channel_guest', label: 'Single-Channel Guest - Access to one channel only' },
          { value: 'multi_channel_guest', label: 'Multi-Channel Guest - Access to selected channels' },
        ],
        default: 'member',
        description: '👥 Choose the level of access for this user in the rheicorp.slack.com workspace',
      },
    ],
    optionalFields: [
      {
        name: 'defaultChannels',
        label: 'Default Channels',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'general', label: 'General' },
          { value: 'random', label: 'Random' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'product', label: 'Product' },
        ],
        default: ['general'],
        description: 'Channels to automatically add the user to',
      },
      {
        name: 'userGroups',
        label: 'User Groups',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'developers', label: 'Developers' },
          { value: 'designers', label: 'Designers' },
          { value: 'managers', label: 'Managers' },
          { value: 'contractors', label: 'Contractors' },
        ],
        default: [],
      },
    ],
  },
  [AppProvider.MICROSOFT_365]: {
    id: AppProvider.MICROSOFT_365,
    name: 'Microsoft 365',
    description: 'Office apps, email, and cloud storage',
    icon: '📊',
    color: 'bg-orange-500',
    requiredFields: [
      {
        name: 'usageLocation',
        label: 'Usage Location',
        type: 'select',
        required: true,
        options: [
          { value: 'US', label: 'United States' },
          { value: 'GB', label: 'United Kingdom' },
          { value: 'CA', label: 'Canada' },
          { value: 'AU', label: 'Australia' },
          { value: 'DE', label: 'Germany' },
          { value: 'FR', label: 'France' },
          { value: 'JP', label: 'Japan' },
          { value: 'IN', label: 'India' },
        ],
        default: 'US',
      },
      {
        name: 'licenseSKUs',
        label: 'License SKUs',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'O365_BUSINESS_ESSENTIALS', label: 'Business Basic' },
          { value: 'O365_BUSINESS_PREMIUM', label: 'Business Standard' },
          { value: 'O365_BUSINESS', label: 'Business Premium' },
          { value: 'ENTERPRISEPACK', label: 'E3' },
          { value: 'ENTERPRISEPREMIUM', label: 'E5' },
        ],
        default: ['O365_BUSINESS_ESSENTIALS'],
      },
    ],
    optionalFields: [
      {
        name: 'requirePasswordChange',
        label: 'Require Password Change',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Force user to change password on first login',
      },
      {
        name: 'department',
        label: 'Department',
        type: 'text',
        required: false,
        placeholder: 'Engineering',
      },
      {
        name: 'jobTitle',
        label: 'Job Title',
        type: 'text',
        required: false,
        placeholder: 'Software Engineer',
      },
    ],
  },
  [AppProvider.CLICKUP]: {
    id: AppProvider.CLICKUP,
    name: 'ClickUp',
    description: 'Project management and productivity',
    icon: '✅',
    color: 'bg-pink-500',
    requiredFields: [
      {
        name: 'workspace',
        label: 'Workspace',
        type: 'text',
        required: true,
        placeholder: 'Main Workspace',
      },
      {
        name: 'permissionLevel',
        label: 'Permission Level',
        type: 'select',
        required: true,
        options: [
          { value: 'guest', label: 'Guest' },
          { value: 'member', label: 'Member' },
          { value: 'admin', label: 'Admin' },
        ],
        default: 'member',
      },
    ],
    optionalFields: [
      {
        name: 'teams',
        label: 'Teams',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'product', label: 'Product Team' },
          { value: 'engineering', label: 'Engineering Team' },
          { value: 'design', label: 'Design Team' },
          { value: 'marketing', label: 'Marketing Team' },
        ],
        default: [],
      },
    ],
  },
  [AppProvider.JIRA]: {
    id: AppProvider.JIRA,
    name: 'Jira',
    description: 'Issue tracking and project management',
    icon: '🎯',
    color: 'bg-blue-600',
    requiredFields: [
      {
        name: 'site',
        label: 'Jira Site',
        type: 'text',
        required: true,
        placeholder: 'your-domain.atlassian.net',
      },
      {
        name: 'projectAccess',
        label: 'Project Access',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'all', label: 'All Projects' },
          { value: 'development', label: 'Development' },
          { value: 'operations', label: 'Operations' },
          { value: 'support', label: 'Support' },
        ],
        default: ['development'],
      },
    ],
    optionalFields: [
      {
        name: 'defaultRole',
        label: 'Default Role',
        type: 'select',
        required: false,
        options: [
          { value: 'developer', label: 'Developer' },
          { value: 'viewer', label: 'Viewer' },
          { value: 'admin', label: 'Administrator' },
        ],
        default: 'developer',
      },
    ],
  },
  [AppProvider.CONFLUENCE]: {
    id: AppProvider.CONFLUENCE,
    name: 'Confluence',
    description: 'Documentation and knowledge base',
    icon: '📚',
    color: 'bg-blue-600',
    requiredFields: [
      {
        name: 'site',
        label: 'Confluence Site',
        type: 'text',
        required: true,
        placeholder: 'your-domain.atlassian.net',
      },
      {
        name: 'spaceAccess',
        label: 'Space Access',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'all', label: 'All Spaces' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'product', label: 'Product' },
          { value: 'hr', label: 'HR' },
        ],
        default: ['engineering'],
      },
    ],
  },
  [AppProvider.GITHUB]: {
    id: AppProvider.GITHUB,
    name: 'GitHub',
    description: 'Code repository and version control',
    icon: '🐙',
    color: 'bg-gray-800',
    requiredFields: [
      {
        name: 'organization',
        label: 'Organization',
        type: 'text',
        required: true,
        placeholder: 'your-org',
      },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: [
          { value: 'member', label: 'Member' },
          { value: 'owner', label: 'Owner' },
        ],
        default: 'member',
      },
    ],
    optionalFields: [
      {
        name: 'teams',
        label: 'Teams',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'developers', label: 'Developers' },
          { value: 'reviewers', label: 'Reviewers' },
          { value: 'maintainers', label: 'Maintainers' },
        ],
        default: ['developers'],
      },
      {
        name: 'ssoRequired',
        label: 'Require SSO',
        type: 'boolean',
        required: false,
        default: false,
      },
    ],
  },
  [AppProvider.ZOOM]: {
    id: AppProvider.ZOOM,
    name: 'Zoom',
    description: 'Video conferencing and meetings',
    icon: '📹',
    color: 'bg-blue-500',
    requiredFields: [
      {
        name: 'licenseType',
        label: 'License Type',
        type: 'select',
        required: true,
        options: [
          { value: 'basic', label: 'Basic (Free)' },
          { value: 'pro', label: 'Pro' },
          { value: 'business', label: 'Business' },
        ],
        default: 'pro',
      },
    ],
    optionalFields: [
      {
        name: 'addOns',
        label: 'Add-ons',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'webinar', label: 'Webinar' },
          { value: 'cloud_recording', label: 'Cloud Recording' },
          { value: 'large_meeting', label: 'Large Meeting' },
        ],
        default: [],
      },
    ],
  },
  [AppProvider.HUBSPOT]: {
    id: AppProvider.HUBSPOT,
    name: 'HubSpot',
    description: 'CRM and marketing automation',
    icon: '🚀',
    color: 'bg-orange-600',
    requiredFields: [
      {
        name: 'seatType',
        label: 'Seat Type',
        type: 'select',
        required: true,
        options: [
          { value: 'core', label: 'Core Seat' },
          { value: 'sales', label: 'Sales Seat' },
          { value: 'service', label: 'Service Seat' },
          { value: 'marketing', label: 'Marketing Seat' },
        ],
        default: 'core',
      },
    ],
    optionalFields: [
      {
        name: 'permissions',
        label: 'Permissions',
        type: 'multiselect',
        required: false,
        options: [
          { value: 'contacts', label: 'Contacts' },
          { value: 'deals', label: 'Deals' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'reports', label: 'Reports' },
          { value: 'settings', label: 'Settings' },
        ],
        default: ['contacts', 'deals'],
      },
    ],
  },
};

export function getProvider(id: AppProvider): ProviderConfig | undefined {
  return providers[id];
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(providers);
}