// Microsoft 365 Configuration
// This file contains all Microsoft 365 related configurations including licenses and groups
//
// License data from Microsoft Admin Center - Last updated: 2025-12-04

import { MICROSOFT_GROUPS_DATA } from './microsoft-groups-data';

export interface MicrosoftLicense {
  skuId: string;
  skuPartNumber: string;
  name: string;
  category: string;
  icon?: string;
  totalLicenses: number;
  availableLicenses: number;
  inUse: boolean;
}

export interface MicrosoftGroup {
  id: string;
  displayName: string;
  description?: string;
  type: 'security' | 'distribution' | 'office365';
}

// License configurations from your Microsoft Admin Center
export const MICROSOFT_LICENSES: MicrosoftLicense[] = [
  // Microsoft 365
  {
    skuId: 'f245ecc8-75af-4f8e-b61f-27d8114de5f3',
    skuPartNumber: 'O365_BUSINESS_PREMIUM',
    name: 'Microsoft 365 Business Standard',
    category: 'Microsoft 365',
    icon: '🏢',
    totalLicenses: 15,
    availableLicenses: 1,
    inUse: true,
  },
  {
    skuId: 'cdd28e44-67e3-425e-be4c-737fab2899d3',
    skuPartNumber: 'O365_BUSINESS',
    name: 'Microsoft 365 Apps for business',
    category: 'Microsoft 365',
    icon: '💼',
    totalLicenses: 35,
    availableLicenses: 0,
    inUse: true,
  },

  // Dynamics 365
  {
    skuId: '2880026b-2b0c-4251-8656-5d41ff11e3aa',
    skuPartNumber: 'DYN365_BUSCENTRAL_ESSENTIAL',
    name: 'Dynamics 365 Business Central Essential',
    category: 'Dynamics 365',
    icon: '📋',
    totalLicenses: 13,
    availableLicenses: 0,
    inUse: true,
  },
  {
    skuId: '9a1e33ed-9697-43f3-b84c-1b0959dbb1d4',
    skuPartNumber: 'DYN365_FINANCIALS_ACCOUNTANT_SKU',
    name: 'Dynamics 365 Business Central External Accountant',
    category: 'Dynamics 365',
    icon: '💵',
    totalLicenses: 2,
    availableLicenses: 0,
    inUse: true,
  },
  {
    skuId: '2e3c4023-80f6-4711-aa5d-29e0ecb46835',
    skuPartNumber: 'DYN365_BUSCENTRAL_TEAM_MEMBER',
    name: 'Dynamics 365 Business Central Team Member',
    category: 'Dynamics 365',
    icon: '🤝',
    totalLicenses: 12,
    availableLicenses: 0,
    inUse: true,
  },
  {
    skuId: '1e1a282c-9c54-43a2-9310-98ef728faace',
    skuPartNumber: 'DYN365_ENTERPRISE_SALES',
    name: 'Dynamics 365 Sales Enterprise Edition',
    category: 'Dynamics 365',
    icon: '💰',
    totalLicenses: 2,
    availableLicenses: 0,
    inUse: true,
  },
  {
    skuId: '8e7a3d30-d97d-43ab-837c-d7701cef83dc',
    skuPartNumber: 'DYN365_ENTERPRISE_TEAM_MEMBERS',
    name: 'Dynamics 365 Team Members',
    category: 'Dynamics 365',
    icon: '👥',
    totalLicenses: 86,
    availableLicenses: 2,
    inUse: true,
  },

  // Power Platform
  {
    skuId: 'b30411f5-fea1-4a59-9ad9-3db7c7ead579',
    skuPartNumber: 'POWERAPPS_PER_USER',
    name: 'Power Apps Premium',
    category: 'Power Platform',
    icon: '⚡',
    totalLicenses: 2,
    availableLicenses: 0,
    inUse: true,
  },
  {
    skuId: '5b631642-bd26-49fe-bd20-1daaa972ef80',
    skuPartNumber: 'POWERAPPS_DEV',
    name: 'Microsoft Power Apps for Developer',
    category: 'Power Platform',
    icon: '👨‍💻',
    totalLicenses: 10000,
    availableLicenses: 9996,
    inUse: true,
  },
  {
    skuId: 'f30db892-07e9-47e9-837c-80727f46fd3d',
    skuPartNumber: 'FLOW_FREE',
    name: 'Microsoft Power Automate Free',
    category: 'Power Platform',
    icon: '🌊',
    totalLicenses: 10000,
    availableLicenses: 9919,
    inUse: true,
  },

  // Power BI
  {
    skuId: 'f8a1db68-be16-40ed-86d5-cb42ce701560',
    skuPartNumber: 'POWER_BI_PRO',
    name: 'Power BI Pro',
    category: 'Power BI',
    icon: '📊',
    totalLicenses: 33,
    availableLicenses: 0,
    inUse: true,
  },

  // Azure AD / Entra
  {
    skuId: '078d2b04-f1bd-4111-bbd4-b4b1b354cef4',
    skuPartNumber: 'AAD_PREMIUM',
    name: 'Microsoft Entra ID P1',
    category: 'Azure AD',
    icon: '🔐',
    totalLicenses: 1,
    availableLicenses: 0,
    inUse: true,
  },
];

// Group configurations from your Azure AD tenant (imported from microsoft-groups-data.ts)
export const MICROSOFT_GROUPS: MicrosoftGroup[] = MICROSOFT_GROUPS_DATA;

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

export function getActiveLicenses(): MicrosoftLicense[] {
  return MICROSOFT_LICENSES.filter(license => license.inUse);
}

export function getAvailableLicenses(): MicrosoftLicense[] {
  return MICROSOFT_LICENSES.filter(license => license.inUse && license.availableLicenses > 0);
}

export function getLicensesGroupedByCategory(): Record<string, MicrosoftLicense[]> {
  return MICROSOFT_LICENSES.reduce((acc, license) => {
    if (!acc[license.category]) {
      acc[license.category] = [];
    }
    acc[license.category].push(license);
    return acc;
  }, {} as Record<string, MicrosoftLicense[]>);
}

export function getGroupById(groupId: string): MicrosoftGroup | undefined {
  return MICROSOFT_GROUPS.find(group => group.id === groupId);
}

export function getGroupByDisplayName(displayName: string): MicrosoftGroup | undefined {
  return MICROSOFT_GROUPS.find(group => group.displayName === displayName);
}

// Default license recommendations based on role
export const LICENSE_RECOMMENDATIONS: Record<string, string[]> = {
  executive: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Standard
  ],
  sales: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Standard
  ],
  developer: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Standard
  ],
  marketing: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Standard
  ],
  finance: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Standard
  ],
  general: [
    'f245ecc8-75af-4f8e-b61f-27d8114de5f3', // Business Standard
  ],
};
