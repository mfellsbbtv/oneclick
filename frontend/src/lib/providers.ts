export enum AppProvider {
  GOOGLE_WORKSPACE = 'google-workspace',
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
        type: 'select',
        required: true,
        options: [
          { value: '/', label: '/ (Root)' },
          { value: '/Administrators', label: 'Administrators' },
          { value: '/Archived', label: 'Archived' },
          { value: '/BBTV Website Share', label: 'BBTV Website Share' },
          { value: '/Consultants', label: 'Consultants' },
          { value: '/Developers', label: 'Developers' },
          { value: '/DO NOT DELETE', label: 'DO NOT DELETE' },
          { value: '/Google Chat', label: 'Google Chat' },
          { value: '/Google Drive Document Share', label: 'Google Drive Document Share' },
          { value: '/Google Drive Share', label: 'Google Drive Share' },
          { value: '/Google Drive Visitor Access', label: 'Google Drive Visitor Access' },
          { value: '/MFA Disabled Users', label: 'MFA Disabled Users' },
          { value: '/QA Test Accounts', label: 'QA Test Accounts' },
          { value: '/Service Accounts', label: 'Service Accounts' },
          { value: '/Service Accounts/App Passwords', label: 'Service Accounts → App Passwords' },
          { value: '/To Be Archived', label: 'To Be Archived' },
        ],
        default: '/',
        description: 'The organizational unit path for the user',
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
        name: 'licenses',
        label: 'Microsoft 365 Licenses',
        type: 'multiselect',
        required: true,
        options: [
          // Microsoft 365 Business
          { value: 'f245ecc8-75af-4f8e-b61f-27d8114de5f3', label: '🏢 Microsoft 365 Business Premium' },
          { value: 'cdd28e44-67e3-425e-be4c-737fab2899d3', label: '💼 Microsoft 365 Business Basic' },
          
          // Power BI
          { value: 'f8a1db68-be16-40ed-86d5-cb42ce701560', label: '📊 Power BI Pro' },
          { value: 'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235', label: '📈 Power BI Standard' },
          
          // Dynamics 365
          { value: '1e1a282c-9c54-43a2-9310-98ef728faace', label: '💰 Dynamics 365 Sales Enterprise' },
          { value: '8e7a3d30-d97d-43ab-837c-d7701cef83dc', label: '👥 Dynamics 365 Team Members' },
          { value: '2880026b-2b0c-4251-8656-5d41ff11e3aa', label: '📋 Dynamics 365 Business Central Essential' },
          { value: '2e3c4023-80f6-4711-aa5d-29e0ecb46835', label: '🤝 Dynamics 365 Business Central Team Member' },
          { value: '9a1e33ed-9697-43f3-b84c-1b0959dbb1d4', label: '💵 Dynamics 365 Financials Accountant' },
          { value: '238e2f8d-e429-4035-94db-6926be4ffe7b', label: '📢 Dynamics 365 Marketing' },
          
          // Power Platform
          { value: 'b30411f5-fea1-4a59-9ad9-3db7c7ead579', label: '⚡ Power Apps Per User' },
          { value: 'b4d7b828-e8dc-4518-91f9-e123ae48440d', label: '📱 Power Apps Per App' },
          { value: 'dcb1a3ae-b33f-4487-846a-a640262fadf4', label: '🔄 Power Apps (Viral)' },
          { value: '5b631642-bd26-49fe-bd20-1daaa972ef80', label: '👨‍💻 Power Apps Developer' },
          { value: 'f30db892-07e9-47e9-837c-80727f46fd3d', label: '🌊 Power Automate Free' },
          
          // Azure AD
          { value: '078d2b04-f1bd-4111-bbd4-b4b1b354cef4', label: '🔐 Azure AD Premium P1' },
          
          // Storage & Capacity (Company-level, usually not per-user)
          { value: 'e612d426-6bc3-4181-9658-91aa906b0ac0', label: '💾 Dataverse Database Capacity' },
          { value: '631d5fb1-a668-4c2a-9427-8830665a742e', label: '📁 Dataverse File Capacity' },
          { value: '448b063f-9cc6-42fc-a0e6-40e08724a395', label: '📝 Dataverse Log Capacity' },
          { value: '328dc228-00bc-48c6-8b09-1fbc8bc3435d', label: '🗄️ CRM Storage' },
        ],
        default: ['f245ecc8-75af-4f8e-b61f-27d8114de5f3'],
        description: '📦 Select one or more licenses to assign to the user',
      },
    ],
    optionalFields: [
      {
        name: 'groups',
        label: 'Security Groups',
        type: 'multiselect',
        required: false,
        options: [
          { value: '61c005b9-d8a8-495d-964a-2da005fe682e', label: '🏢 CRM Production' },
        ],
        default: [],
        description: '🔒 Select security groups to add the user to',
      },
      {
        name: 'requirePasswordChange',
        label: 'Require Password Change',
        type: 'boolean',
        required: false,
        default: true,
        description: '🔄 Force user to change password on first login',
      },
      {
        name: 'department',
        label: 'Department',
        type: 'text',
        required: false,
        placeholder: 'Engineering',
        description: '🏢 User\'s department (optional)',
      },
      {
        name: 'jobTitle',
        label: 'Job Title',
        type: 'text',
        required: false,
        placeholder: 'Software Engineer',
        description: '💼 User\'s job title (optional)',
      },
      {
        name: 'manager',
        label: 'Manager Email',
        type: 'email',
        required: false,
        placeholder: 'manager@company.com',
        description: '👨‍💼 Direct manager\'s email address (optional)',
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