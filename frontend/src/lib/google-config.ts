// Google Workspace Configuration
// This file contains Google Workspace related configurations including groups
//
// Groups are loaded from google-groups-data.ts (530 groups from your domain)
// Last updated: 2025-12-03

import { GOOGLE_GROUPS_DATA } from './google-groups-data';

export interface GoogleGroup {
  id: string;      // Group email address (used as identifier)
  email: string;   // Group email address
  name: string;    // Display name
  description?: string;
}

// Google Workspace groups from your domain (530 groups)
export const GOOGLE_GROUPS: GoogleGroup[] = GOOGLE_GROUPS_DATA;

// Helper functions
export function getGoogleGroupById(groupId: string): GoogleGroup | undefined {
  return GOOGLE_GROUPS.find(group => group.id === groupId);
}

export function getGoogleGroupByEmail(email: string): GoogleGroup | undefined {
  return GOOGLE_GROUPS.find(group => group.email === email);
}

// Default group recommendations based on role
export const GOOGLE_GROUP_RECOMMENDATIONS: Record<string, string[]> = {
  executive: ['all-company@rhei.com'],
  sales: ['all-company@rhei.com', 'sales@rhei.com'],
  developer: ['all-company@rhei.com', 'engineering@rhei.com'],
  marketing: ['all-company@rhei.com', 'marketing@rhei.com'],
  finance: ['all-company@rhei.com', 'finance@rhei.com'],
  general: ['all-company@rhei.com'],
};
