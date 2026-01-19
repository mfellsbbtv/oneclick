// Microsoft Groups Data
// This file contains Microsoft Azure AD groups for the provisioning UI
//
// To update this data, run: ACCESS_TOKEN="your_token" node scripts/fetch-microsoft-data.js
// Last updated: 2025-12-04

import { MicrosoftGroup } from './microsoft-config';

// Placeholder groups - update with actual groups from your tenant using fetch-microsoft-data.js
export const MICROSOFT_GROUPS_DATA: MicrosoftGroup[] = [
  {
    id: '61c005b9-d8a8-495d-964a-2da005fe682e',
    displayName: 'CRM Production',
    description: 'CRM Production users group',
    type: 'security',
  },
  // Add more groups here after running the fetch script
  // Example structure:
  // {
  //   id: 'azure-ad-group-id',
  //   displayName: 'Group Name',
  //   description: 'Group description',
  //   type: 'security' | 'distribution' | 'office365',
  // },
];
