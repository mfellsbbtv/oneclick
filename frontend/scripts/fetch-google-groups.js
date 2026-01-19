/**
 * Fetch Google Workspace Groups and output in config format
 *
 * Prerequisites:
 * 1. You need a Google OAuth2 access token with admin.directory.group.readonly scope
 * 2. Or use a service account with domain-wide delegation
 *
 * Usage:
 *   ACCESS_TOKEN="your-token" node scripts/fetch-google-groups.js
 *
 * To get an access token, you can:
 * 1. Use the OAuth2 Playground: https://developers.google.com/oauthplayground/
 *    - Select "Admin SDK API v1" > "admin.directory.group.readonly"
 *    - Authorize and get an access token
 * 2. Or extract it from your N8N Google OAuth2 credential
 */

const accessToken = process.env.ACCESS_TOKEN;

if (!accessToken) {
  console.error('Error: ACCESS_TOKEN environment variable is required');
  console.log('\nUsage: ACCESS_TOKEN="your-token" node scripts/fetch-google-groups.js');
  console.log('\nTo get an access token:');
  console.log('1. Go to https://developers.google.com/oauthplayground/');
  console.log('2. Select "Admin SDK API v1" > "https://www.googleapis.com/auth/admin.directory.group.readonly"');
  console.log('3. Click "Authorize APIs" and sign in with your admin account');
  console.log('4. Click "Exchange authorization code for tokens"');
  console.log('5. Copy the access_token value');
  process.exit(1);
}

async function fetchGroups() {
  const baseUrl = 'https://admin.googleapis.com/admin/directory/v1/groups';
  const allGroups = [];
  let pageToken = null;

  console.log('Fetching Google Workspace groups...\n');

  do {
    const url = new URL(baseUrl);
    url.searchParams.set('customer', 'my_customer');
    url.searchParams.set('maxResults', '200');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`API Error (${response.status}):`, error);
      process.exit(1);
    }

    const data = await response.json();

    if (data.groups) {
      allGroups.push(...data.groups);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Found ${allGroups.length} groups\n`);

  // Format for google-config.ts
  const configOutput = allGroups.map(group => ({
    id: group.email,
    email: group.email,
    name: group.name,
    description: group.description || ''
  }));

  console.log('// Copy this into frontend/src/lib/google-config.ts');
  console.log('export const GOOGLE_GROUPS: GoogleGroup[] = ');
  console.log(JSON.stringify(configOutput, null, 2) + ';');

  // Also output a simple list
  console.log('\n\n// Simple list of group emails:');
  allGroups.forEach(g => {
    console.log(`// - ${g.email} (${g.name})`);
  });
}

fetchGroups().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
