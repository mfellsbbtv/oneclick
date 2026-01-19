/**
 * Fetch Microsoft Licenses and Groups from Azure AD
 *
 * This script fetches license and group data from Microsoft Graph API
 * and outputs it in a format suitable for the frontend configuration.
 *
 * Prerequisites:
 * 1. Set ACCESS_TOKEN environment variable with a valid Microsoft Graph token
 *    - Token needs: Directory.Read.All, Organization.Read.All permissions
 *
 * Usage:
 *   ACCESS_TOKEN="your_token" node scripts/fetch-microsoft-data.js
 *
 * You can get a token from Azure Portal > Azure Active Directory > App Registrations
 * Or use az cli: az account get-access-token --resource https://graph.microsoft.com
 */

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('ERROR: ACCESS_TOKEN environment variable is required');
  console.error('');
  console.error('Get a token using one of these methods:');
  console.error('1. Azure Portal > Azure AD > App Registrations > Your App > Tokens');
  console.error('2. az cli: az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv');
  console.error('');
  console.error('Then run: ACCESS_TOKEN="your_token" node scripts/fetch-microsoft-data.js');
  process.exit(1);
}

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function fetchWithAuth(url) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

async function fetchAllPages(initialUrl) {
  let url = initialUrl;
  const allItems = [];

  while (url) {
    const data = await fetchWithAuth(url);
    allItems.push(...(data.value || []));
    url = data['@odata.nextLink'];
  }

  return allItems;
}

async function fetchLicenses() {
  console.log('Fetching subscribed SKUs (licenses)...');

  const skus = await fetchAllPages(`${GRAPH_BASE}/subscribedSkus`);

  // Map common SKU part numbers to friendly names
  const skuNameMap = {
    'O365_BUSINESS_PREMIUM': { name: 'Microsoft 365 Business Premium', icon: '🏢', category: 'Microsoft 365' },
    'O365_BUSINESS': { name: 'Microsoft 365 Business Basic', icon: '💼', category: 'Microsoft 365' },
    'O365_BUSINESS_ESSENTIALS': { name: 'Microsoft 365 Business Basic', icon: '💼', category: 'Microsoft 365' },
    'SPB': { name: 'Microsoft 365 Business Premium', icon: '🏢', category: 'Microsoft 365' },
    'POWER_BI_PRO': { name: 'Power BI Pro', icon: '📊', category: 'Power BI' },
    'POWER_BI_STANDARD': { name: 'Power BI (Free)', icon: '📈', category: 'Power BI' },
    'DYN365_ENTERPRISE_SALES': { name: 'Dynamics 365 Sales Enterprise', icon: '💰', category: 'Dynamics 365' },
    'DYN365_ENTERPRISE_TEAM_MEMBERS': { name: 'Dynamics 365 Team Members', icon: '👥', category: 'Dynamics 365' },
    'DYN365_BUSCENTRAL_ESSENTIAL': { name: 'Dynamics 365 Business Central Essential', icon: '📋', category: 'Dynamics 365' },
    'DYN365_BUSCENTRAL_TEAM_MEMBER': { name: 'Dynamics 365 Business Central Team Member', icon: '🤝', category: 'Dynamics 365' },
    'DYN365_FINANCIALS_ACCOUNTANT_SKU': { name: 'Dynamics 365 for Financials for Accountants', icon: '💵', category: 'Dynamics 365' },
    'DYN365_BUSINESS_MARKETING': { name: 'Dynamics 365 Marketing', icon: '📢', category: 'Dynamics 365' },
    'POWERAPPS_PER_USER': { name: 'Power Apps Per User', icon: '⚡', category: 'Power Platform' },
    'POWERAPPS_PER_APP_NEW': { name: 'Power Apps Per App', icon: '📱', category: 'Power Platform' },
    'POWERAPPS_VIRAL': { name: 'Power Apps (Viral)', icon: '🔄', category: 'Power Platform' },
    'POWERAPPS_DEV': { name: 'Power Apps Developer', icon: '👨‍💻', category: 'Power Platform' },
    'FLOW_FREE': { name: 'Power Automate Free', icon: '🌊', category: 'Power Platform' },
    'AAD_PREMIUM': { name: 'Azure AD Premium P1', icon: '🔐', category: 'Azure AD' },
    'AAD_PREMIUM_P2': { name: 'Azure AD Premium P2', icon: '🔐', category: 'Azure AD' },
    'CDS_DB_CAPACITY': { name: 'Dataverse Database Capacity', icon: '💾', category: 'Storage' },
    'CDS_FILE_CAPACITY': { name: 'Dataverse File Capacity', icon: '📁', category: 'Storage' },
    'CDS_LOG_CAPACITY': { name: 'Dataverse Log Capacity', icon: '📝', category: 'Storage' },
    'CRMSTORAGE': { name: 'CRM Storage', icon: '🗄️', category: 'Storage' },
    'EXCHANGESTANDARD': { name: 'Exchange Online (Plan 1)', icon: '📧', category: 'Exchange' },
    'EXCHANGEENTERPRISE': { name: 'Exchange Online (Plan 2)', icon: '📧', category: 'Exchange' },
    'STREAM': { name: 'Microsoft Stream', icon: '🎬', category: 'Microsoft 365' },
    'TEAMS_EXPLORATORY': { name: 'Microsoft Teams Exploratory', icon: '💬', category: 'Microsoft 365' },
    'RIGHTSMANAGEMENT': { name: 'Azure Information Protection Plan 1', icon: '🛡️', category: 'Security' },
    'MCOEV': { name: 'Microsoft 365 Phone System', icon: '📞', category: 'Communication' },
    'MCOPSTN1': { name: 'Microsoft 365 Domestic Calling Plan', icon: '📞', category: 'Communication' },
    'EMS': { name: 'Enterprise Mobility + Security E3', icon: '🔒', category: 'Security' },
    'EMSPREMIUM': { name: 'Enterprise Mobility + Security E5', icon: '🔒', category: 'Security' },
    'PROJECTPROFESSIONAL': { name: 'Project Plan 3', icon: '📅', category: 'Project' },
    'VISIOCLIENT': { name: 'Visio Plan 2', icon: '📐', category: 'Visio' },
  };

  const licenses = skus.map(sku => {
    const info = skuNameMap[sku.skuPartNumber] || {
      name: sku.skuPartNumber.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '📦',
      category: 'Other'
    };

    const prepaidUnits = sku.prepaidUnits || {};
    const totalLicenses = (prepaidUnits.enabled || 0) + (prepaidUnits.warning || 0);
    const consumedUnits = sku.consumedUnits || 0;
    const availableLicenses = Math.max(0, totalLicenses - consumedUnits);

    return {
      skuId: sku.skuId,
      skuPartNumber: sku.skuPartNumber,
      name: info.name,
      category: info.category,
      icon: info.icon,
      totalLicenses,
      availableLicenses,
      consumedUnits,
      inUse: consumedUnits > 0 || totalLicenses > 0,
      capabilityStatus: sku.capabilityStatus,
    };
  });

  // Sort by category, then by name
  licenses.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return licenses;
}

async function fetchGroups() {
  console.log('Fetching groups...');

  // Fetch all groups (security, distribution, and Office 365 groups)
  const groups = await fetchAllPages(`${GRAPH_BASE}/groups?$select=id,displayName,description,groupTypes,mailEnabled,securityEnabled&$orderby=displayName`);

  const formattedGroups = groups.map(group => {
    // Determine group type
    let type = 'security';
    if (group.groupTypes && group.groupTypes.includes('Unified')) {
      type = 'office365';
    } else if (group.mailEnabled && !group.securityEnabled) {
      type = 'distribution';
    }

    return {
      id: group.id,
      displayName: group.displayName,
      description: group.description || '',
      type,
      mailEnabled: group.mailEnabled,
      securityEnabled: group.securityEnabled,
    };
  });

  // Sort by displayName
  formattedGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return formattedGroups;
}

function generateLicenseConfig(licenses) {
  const activeLicenses = licenses.filter(l => l.inUse);

  let output = `// Microsoft 365 License Configuration
// Auto-generated from Microsoft Graph API on ${new Date().toISOString().split('T')[0]}
// Total licenses in tenant: ${licenses.length}
// Active licenses (in use or with capacity): ${activeLicenses.length}

export const MICROSOFT_LICENSES: MicrosoftLicense[] = [
`;

  for (const license of activeLicenses) {
    output += `  {
    skuId: '${license.skuId}',
    skuPartNumber: '${license.skuPartNumber}',
    name: '${license.name}',
    category: '${license.category}',
    icon: '${license.icon}',
    totalLicenses: ${license.totalLicenses},
    availableLicenses: ${license.availableLicenses},
    inUse: true,
  },
`;
  }

  output += `];
`;

  return output;
}

function generateGroupsData(groups) {
  let output = `// Microsoft Groups Data
// Auto-generated from Microsoft Graph API on ${new Date().toISOString().split('T')[0]}
// Total groups: ${groups.length}

import { MicrosoftGroup } from './microsoft-config';

export const MICROSOFT_GROUPS_DATA: MicrosoftGroup[] = [
`;

  for (const group of groups) {
    const escapedName = group.displayName.replace(/'/g, "\\'");
    const escapedDesc = (group.description || '').replace(/'/g, "\\'").replace(/\n/g, ' ');

    output += `  {
    id: '${group.id}',
    displayName: '${escapedName}',
    description: '${escapedDesc}',
    type: '${group.type}',
  },
`;
  }

  output += `];
`;

  return output;
}

async function main() {
  try {
    console.log('Fetching Microsoft tenant data...\n');

    const [licenses, groups] = await Promise.all([
      fetchLicenses(),
      fetchGroups()
    ]);

    console.log('\n========================================');
    console.log('LICENSES SUMMARY');
    console.log('========================================');
    console.log(`Total SKUs: ${licenses.length}`);
    console.log(`Active SKUs (in use): ${licenses.filter(l => l.inUse).length}`);
    console.log('');

    // Print license table
    console.log('License Name                                | Total | Available | In Use');
    console.log('-'.repeat(80));
    for (const license of licenses.filter(l => l.inUse)) {
      const name = license.name.padEnd(43).substring(0, 43);
      const total = String(license.totalLicenses).padStart(5);
      const avail = String(license.availableLicenses).padStart(9);
      const used = String(license.consumedUnits).padStart(6);
      console.log(`${name} | ${total} | ${avail} | ${used}`);
    }

    console.log('\n========================================');
    console.log('GROUPS SUMMARY');
    console.log('========================================');
    console.log(`Total groups: ${groups.length}`);
    console.log(`Security groups: ${groups.filter(g => g.type === 'security').length}`);
    console.log(`Distribution groups: ${groups.filter(g => g.type === 'distribution').length}`);
    console.log(`Office 365 groups: ${groups.filter(g => g.type === 'office365').length}`);

    console.log('\n========================================');
    console.log('GENERATED CONFIG');
    console.log('========================================');

    console.log('\n--- LICENSES CONFIG (paste into microsoft-config.ts) ---\n');
    console.log(generateLicenseConfig(licenses));

    console.log('\n--- GROUPS DATA (save as microsoft-groups-data.ts) ---\n');
    console.log(generateGroupsData(groups));

    // Also output JSON files for easier processing
    const fs = require('fs');
    const path = require('path');

    const dataDir = path.join(__dirname, '..', 'src', 'lib');

    fs.writeFileSync(
      path.join(dataDir, 'microsoft-licenses-raw.json'),
      JSON.stringify(licenses, null, 2)
    );
    console.log(`\nRaw license data saved to: src/lib/microsoft-licenses-raw.json`);

    fs.writeFileSync(
      path.join(dataDir, 'microsoft-groups-raw.json'),
      JSON.stringify(groups, null, 2)
    );
    console.log(`Raw groups data saved to: src/lib/microsoft-groups-raw.json`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
