import { NextResponse } from 'next/server';

// Microsoft Graph API endpoint for subscribed SKUs
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface GraphLicense {
  skuId: string;
  skuPartNumber: string;
  prepaidUnits: {
    enabled: number;
    suspended: number;
    warning: number;
  };
  consumedUnits: number;
  servicePlans: Array<{
    servicePlanId: string;
    servicePlanName: string;
  }>;
}

interface MicrosoftLicense {
  skuId: string;
  skuPartNumber: string;
  name: string;
  category: string;
  icon: string;
  totalLicenses: number;
  availableLicenses: number;
  inUse: boolean;
}

// Map SKU part numbers to friendly names and categories
const SKU_METADATA: Record<string, { name: string; category: string; icon: string }> = {
  'O365_BUSINESS_PREMIUM': { name: 'Microsoft 365 Business Standard', category: 'Microsoft 365', icon: '🏢' },
  'O365_BUSINESS': { name: 'Microsoft 365 Apps for business', category: 'Microsoft 365', icon: '💼' },
  'SPB': { name: 'Microsoft 365 Business Premium', category: 'Microsoft 365', icon: '🏢' },
  'SMB_BUSINESS_ESSENTIALS': { name: 'Microsoft 365 Business Basic', category: 'Microsoft 365', icon: '📧' },
  'DYN365_BUSCENTRAL_ESSENTIAL': { name: 'Dynamics 365 Business Central Essential', category: 'Dynamics 365', icon: '📋' },
  'DYN365_FINANCIALS_ACCOUNTANT_SKU': { name: 'Dynamics 365 Business Central External Accountant', category: 'Dynamics 365', icon: '💵' },
  'DYN365_BUSCENTRAL_TEAM_MEMBER': { name: 'Dynamics 365 Business Central Team Member', category: 'Dynamics 365', icon: '🤝' },
  'DYN365_ENTERPRISE_SALES': { name: 'Dynamics 365 Sales Enterprise Edition', category: 'Dynamics 365', icon: '💰' },
  'DYN365_ENTERPRISE_TEAM_MEMBERS': { name: 'Dynamics 365 Team Members', category: 'Dynamics 365', icon: '👥' },
  'POWERAPPS_PER_USER': { name: 'Power Apps Premium', category: 'Power Platform', icon: '⚡' },
  'POWERAPPS_DEV': { name: 'Microsoft Power Apps for Developer', category: 'Power Platform', icon: '👨‍💻' },
  'FLOW_FREE': { name: 'Microsoft Power Automate Free', category: 'Power Platform', icon: '🌊' },
  'POWER_BI_PRO': { name: 'Power BI Pro', category: 'Power BI', icon: '📊' },
  'AAD_PREMIUM': { name: 'Microsoft Entra ID P1', category: 'Azure AD', icon: '🔐' },
  'AAD_PREMIUM_P2': { name: 'Microsoft Entra ID P2', category: 'Azure AD', icon: '🔐' },
  'ENTERPRISEPACK': { name: 'Office 365 E3', category: 'Office 365', icon: '📦' },
  'ENTERPRISEPREMIUM': { name: 'Office 365 E5', category: 'Office 365', icon: '📦' },
};

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchLicenses(accessToken: string): Promise<GraphLicense[]> {
  const response = await fetch(`${GRAPH_API_BASE}/subscribedSkus`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch licenses: ${error}`);
  }

  const data = await response.json();
  return data.value || [];
}

function transformLicense(graphLicense: GraphLicense): MicrosoftLicense {
  const metadata = SKU_METADATA[graphLicense.skuPartNumber] || {
    name: graphLicense.skuPartNumber,
    category: 'Other',
    icon: '📄',
  };

  const totalLicenses = graphLicense.prepaidUnits.enabled;
  const consumedUnits = graphLicense.consumedUnits;
  const availableLicenses = Math.max(0, totalLicenses - consumedUnits);

  return {
    skuId: graphLicense.skuId,
    skuPartNumber: graphLicense.skuPartNumber,
    name: metadata.name,
    category: metadata.category,
    icon: metadata.icon,
    totalLicenses,
    availableLicenses,
    inUse: totalLicenses > 0,
  };
}

export async function GET() {
  try {
    console.log('🔄 Fetching Microsoft licenses...');

    const accessToken = await getAccessToken();
    const graphLicenses = await fetchLicenses(accessToken);

    const licenses = graphLicenses
      .map(transformLicense)
      .filter(license => license.totalLicenses > 0) // Only include licenses with allocated units
      .sort((a, b) => {
        // Sort by category, then by name
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });

    console.log(`✅ Fetched ${licenses.length} licenses`);

    return NextResponse.json({
      success: true,
      licenses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching licenses:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        licenses: [],
      },
      { status: 500 }
    );
  }
}
