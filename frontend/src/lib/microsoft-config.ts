// Microsoft 365 Configuration
// This file contains all Microsoft 365 related configurations including licenses and groups

export interface MicrosoftLicense {
  skuId: string;
  skuPartNumber: string;
  name: string;
  category: string;
  icon?: string;
}

export interface MicrosoftGroup {
  id: string;
  displayName: string;
  description?: string;
  type: 'security' | 'distribution' | 'office365';
}

// License configurations based on ms-license.json
export const MICROSOFT_LICENSES: MicrosoftLicense[] = [
  // Microsoft 365 Business
  {
    skuId: 'f245ecc8-75af-4f8e-b61f-27d8114de5f3',
    skuPartNumber: 'O365_BUSINESS_PREMIUM',
    name: 'Microsoft 365 Business Premium',
    category: 'Microsoft 365',
    icon: '🏢'
  },
  {
    skuId: 'cdd28e44-67e3-425e-be4c-737fab2899d3',
    skuPartNumber: 'O365_BUSINESS',
    name: 'Microsoft 365 Business Basic',
    category: 'Microsoft 365',
    icon: '💼'
  },

  // Power BI
  {
    skuId: 'f8a1db68-be16-40ed-86d5-cb42ce701560',
    skuPartNumber: 'POWER_BI_PRO',
    name: 'Power BI Pro',
    category: 'Power BI',
    icon: '📊'
  },
  {
    skuId: 'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235',
    skuPartNumber: 'POWER_BI_STANDARD',
    name: 'Power BI Standard',
    category: 'Power BI',
    icon: '📈'
  },

  // Dynamics 365
  {
    skuId: '1e1a282c-9c54-43a2-9310-98ef728faace',
    skuPartNumber: 'DYN365_ENTERPRISE_SALES',
    name: 'Dynamics 365 Sales Enterprise',
    category: 'Dynamics 365',
    icon: '💰'
  },
  {
    skuId: '8e7a3d30-d97d-43ab-837c-d7701cef83dc',
    skuPartNumber: 'DYN365_ENTERPRISE_TEAM_MEMBERS',
    name: 'Dynamics 365 Team Members',
    category: 'Dynamics 365',
    icon: '👥'
  },
  {
    skuId: '2880026b-2b0c-4251-8656-5d41ff11e3aa',
    skuPartNumber: 'DYN365_BUSCENTRAL_ESSENTIAL',
    name: 'Dynamics 365 Business Central Essential',
    category: 'Dynamics 365',
    icon: '📋'
  },
  {
    skuId: '2e3c4023-80f6-4711-aa5d-29e0ecb46835',
    skuPartNumber: 'DYN365_BUSCENTRAL_TEAM_MEMBER',
    name: 'Dynamics 365 Business Central Team Member',
    category: 'Dynamics 365',
    icon: '🤝'
  },
  {
    skuId: '9a1e33ed-9697-43f3-b84c-1b0959dbb1d4',
    skuPartNumber: 'DYN365_FINANCIALS_ACCOUNTANT_SKU',
    name: 'Dynamics 365 Financials Accountant',
    category: 'Dynamics 365',
    icon: '💵'
  },
  {
    skuId: '238e2f8d-e429-4035-94db-6926be4ffe7b',
    skuPartNumber: 'DYN365_BUSINESS_MARKETING',
    name: 'Dynamics 365 Marketing',
    category: 'Dynamics 365',
    icon: '📢'
  },

  // Power Platform
  {
    skuId: 'b30411f5-fea1-4a59-9ad9-3db7c7ead579',
    skuPartNumber: 'POWERAPPS_PER_USER',
    name: 'Power Apps Per User',
    category: 'Power Platform',
    icon: '⚡'
  },
  {
    skuId: 'b4d7b828-e8dc-4518-91f9-e123ae48440d',
    skuPartNumber: 'POWERAPPS_PER_APP_NEW',
    name: 'Power Apps Per App',
    category: 'Power Platform',
    icon: '📱'
  },
  {
    skuId: 'dcb1a3ae-b33f-4487-846a-a640262fadf4',
    skuPartNumber: 'POWERAPPS_VIRAL',
    name: 'Power Apps (Viral)',
    category: 'Power Platform',
    icon: '🔄'
  },
  {
    skuId: '5b631642-bd26-49fe-bd20-1daaa972ef80',
    skuPartNumber: 'POWERAPPS_DEV',
    name: 'Power Apps Developer',
    category: 'Power Platform',
    icon: '👨‍💻'
  },
  {
    skuId: 'f30db892-07e9-47e9-837c-80727f46fd3d',
    skuPartNumber: 'FLOW_FREE',
    name: 'Power Automate Free',
    category: 'Power Platform',
    icon: '🌊'
  },

  // Azure AD
  {
    skuId: '078d2b04-f1bd-4111-bbd4-b4b1b354cef4',
    skuPartNumber: 'AAD_PREMIUM',
    name: 'Azure AD Premium P1',
    category: 'Azure AD',
    icon: '🔐'
  },

  // Storage & Capacity
  {
    skuId: 'e612d426-6bc3-4181-9658-91aa906b0ac0',
    skuPartNumber: 'CDS_DB_CAPACITY',
    name: 'Dataverse Database Capacity',
    category: 'Storage',
    icon: '💾'
  },
  {
    skuId: '631d5fb1-a668-4c2a-9427-8830665a742e',
    skuPartNumber: 'CDS_FILE_CAPACITY',
    name: 'Dataverse File Capacity',
    category: 'Storage',
    icon: '📁'
  },
  {
    skuId: '448b063f-9cc6-42fc-a0e6-40e08724a395',
    skuPartNumber: 'CDS_LOG_CAPACITY',
    name: 'Dataverse Log Capacity',
    category: 'Storage',
    icon: '📝'
  },
  {
    skuId: '328dc228-00bc-48c6-8b09-1fbc8bc3435d',
    skuPartNumber: 'CRMSTORAGE',
    name: 'CRM Storage',
    category: 'Storage',
    icon: '🗄️'
  },
];

// Group configurations from your Azure AD tenant
export const MICROSOFT_GROUPS: MicrosoftGroup[] = [
  {
    id: '61c005b9-d8a8-495d-964a-2da005fe682e',
    displayName: 'CRM Production',
    description: 'CRM Production users group',
    type: 'security'
  },
];

// Helper functions
export function getLicenseBySkuId(skuId: string): MicrosoftLicense | undefined {
  return MICROSOFT_LICENSES.find(license => license.skuId === skuId);
}

export function getLicenseByPartNumber(partNumber: string): MicrosoftLicense | undefined {
  return MICROSOFT_LICENSES.find(license => license.skuPartNumber === partNumber);
}

export function getLicensesByCategory(category: string): MicrosoftLicense[] {
  return MICROSOFT_LICENSES.filter(license => license.category === category);
}

export function getGroupById(groupId: string): MicrosoftGroup | undefined {
  return MICROSOFT_GROUPS.find(group => group.id === groupId);
}

export function getGroupByDisplayName(displayName: string): MicrosoftGroup | undefined {
  return MICROSOFT_GROUPS.find(group => group.displayName === displayName);
}

// Default license recommendations based on role
export const LICENSE_RECOMMENDATIONS = {
  executive: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Premium
    'f8a1db68-be16-40ed-86d5-cb42ce701560', // Power BI Pro
  ],
  sales: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Premium
    '1e1a282c-9c54-43a2-9310-98ef728faace', // Dynamics 365 Sales
  ],
  developer: [
    'cdd28e44-67e3-425e-be4c-737fab2899d3', // Business Basic
    '5b631642-bd26-49fe-bd20-1daaa972ef80', // Power Apps Developer
  ],
  marketing: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Premium
    '238e2f8d-e429-4035-94db-6926be4ffe7b', // Dynamics 365 Marketing
  ],
  finance: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Premium
    '9a1e33ed-9697-43f3-b84c-1b0959dbb1d4', // Dynamics 365 Financials
  ],
  general: [
    'cdd28e44-67e3-425e-be4c-737fab2899d3', // Business Basic
  ],
};