# N8N Workflow Integration Testing Guide

## Current Status

✅ **N8N Cloud:** Accessible at https://rhei.app.n8n.cloud
✅ **Webhooks:** Responding (but not activated)
✅ **API Key:** Configured
⚠️ **Workflows:** Need to be activated

---

## Test Results

### 1. Orchestrator Webhook Test
```bash
curl -X POST https://rhei.app.n8n.cloud/webhook-test/provision-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'

Response:
{
  "code": 404,
  "message": "The requested webhook 'provision-orchestrator' is not registered.",
  "hint": "Click the 'Execute workflow' button on the canvas, then try again."
}

HTTP Status: 404
```

**Interpretation:** Webhook URL is correct, but workflow needs to be activated.

### 2. Microsoft 365 Webhook Test
```bash
curl -X POST https://rhei.app.n8n.cloud/webhook-test/197d7144-01b3-465e-a89f-bafec8a87e63 \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'

Response:
{
  "code": 404,
  "message": "The requested webhook '197d7144-01b3-465e-a89f-bafec8a87e63' is not registered.",
  "hint": "Click the 'Execute workflow' button on the canvas, then try again."
}

HTTP Status: 404
```

**Interpretation:** Webhook URL is correct, but workflow needs to be activated.

---

## How to Activate N8N Workflows

### Step 1: Log into N8N
1. Navigate to: https://rhei.app.n8n.cloud
2. Log in with your credentials

### Step 2: Find Your Workflows
You should have these workflows imported:
- **Master Orchestrator** (provision-orchestrator)
- **Google Workspace Provisioning**
- **Microsoft 365 User Provisioning**
- **Slack Provisioning** (can be deactivated/deleted)

### Step 3: Activate Each Workflow

#### For Master Orchestrator:
1. Open the "Master Orchestrator" workflow
2. Find the **Webhook node** at the start
3. Verify the webhook path is: `provision-orchestrator`
4. Click the **"Active"** toggle in the top-right corner
5. The workflow should now be live

#### For Microsoft 365 Workflow:
1. Open the "Microsoft 365 User Provisioning" workflow
2. Find the **Webhook node** at the start
3. Verify the webhook path is: `197d7144-01b3-465e-a89f-bafec8a87e63`
4. Click the **"Active"** toggle in the top-right corner
5. The workflow should now be live

#### For Google Workspace Workflow:
1. Open the "Google Workspace Provisioning" workflow
2. Find the **Webhook node** at the start
3. Note the webhook path (we'll need to add it to .env)
4. Click the **"Active"** toggle in the top-right corner
5. The workflow should now be live

### Step 4: Get Production Webhook URLs

Once workflows are active:
1. Click on each **Webhook node**
2. Look for the "Production URL" (not test URL)
3. Copy the full production webhook URL
4. Update the `.env` file with production URLs

**Production URLs should look like:**
```
https://rhei.app.n8n.cloud/webhook/provision-orchestrator
https://rhei.app.n8n.cloud/webhook/197d7144-01b3-465e-a89f-bafec8a87e63
https://rhei.app.n8n.cloud/webhook/google-workspace-provision
```

Note: Production URLs don't have `-test` in the path.

---

## Testing Active Workflows

### Test 1: Simple Ping Test

Once workflows are active, test with a simple ping:

```bash
# Test Orchestrator
curl -X POST https://rhei.app.n8n.cloud/webhook/provision-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'

# Should return: Success response or workflow output
```

### Test 2: Full Provisioning Test

Use the test script with Martin Short's data:

```bash
cd /home/mfells/Projects/oneclick
node test-provision.js
```

**Expected Output:**
```
🧪 Testing OneClick Provisioning Flow

📋 Test Data: [Martin Short data]

🚀 Sending provisioning request to http://localhost:3000/api/provision-n8n...

📊 Response Status: 200 OK

✅ Provisioning request successful!

📊 Summary:
   Total: 2
   Successful: 2  ← Should be 2 if N8N is working
   Failed: 0

📝 Details:
   1. google-workspace: success
   2. microsoft-365: success
```

### Test 3: Verify in Admin Consoles

After successful provisioning:

1. **Google Workspace Admin Console**
   - URL: https://admin.google.com
   - Go to: Users → View all users
   - Look for: Martin Short (mshort@rhei.com)
   - Verify: In /Engineering OU
   - Verify: Enterprise Standard license assigned

2. **Microsoft 365 Admin Center**
   - URL: https://admin.microsoft.com
   - Go to: Users → Active users
   - Look for: Martin Short (mshort@rhei.com)
   - Verify: Business Basic license assigned
   - Verify: CRM Production group membership

---

## Troubleshooting

### Issue: Webhook Returns 404

**Cause:** Workflow not activated in N8N

**Solution:**
1. Log into N8N console
2. Find the workflow
3. Click the "Active" toggle
4. Verify webhook node is configured

### Issue: Webhook Returns 500

**Cause:** Error in workflow execution

**Solution:**
1. Check N8N workflow execution logs
2. Look for failed nodes
3. Verify credentials are configured:
   - Google Workspace: Service Account JSON
   - Microsoft 365: Azure AD App credentials
   - API keys and secrets

### Issue: "Unauthorized" or "Forbidden"

**Cause:** Invalid or missing credentials

**Solution:**
1. In N8N, check each credential:
   - Google Workspace Admin OAuth2
   - Microsoft Graph API
2. Re-authenticate if needed
3. Verify permissions/scopes

### Issue: User Created but No License

**Cause:** Licensing API failure

**Solution:**
1. Check N8N logs for licensing errors
2. Verify license SKU IDs are correct
3. Ensure licenses are available in admin console
4. Check API permissions include licensing scope

---

## N8N Workflow Configuration Checklist

### Master Orchestrator Workflow
- [ ] Workflow imported
- [ ] Webhook node configured (path: `provision-orchestrator`)
- [ ] Workflow activated
- [ ] Test execution successful

### Google Workspace Workflow
- [ ] Workflow imported
- [ ] Webhook node configured
- [ ] Google Workspace credentials configured
- [ ] Service account JSON uploaded
- [ ] Admin SDK API enabled
- [ ] Licensing API enabled
- [ ] Domain-wide delegation configured
- [ ] Workflow activated
- [ ] Test execution successful

### Microsoft 365 Workflow
- [ ] Workflow imported
- [ ] Webhook node configured (path: `197d7144-01b3-465e-a89f-bafec8a87e63`)
- [ ] Microsoft Graph credentials configured
- [ ] Azure AD App registered
- [ ] App permissions granted:
  - [ ] User.ReadWrite.All
  - [ ] Directory.ReadWrite.All
  - [ ] Group.ReadWrite.All
- [ ] Workflow activated
- [ ] Test execution successful

---

## Update .env with Production URLs

Once you have the production webhook URLs from N8N:

```bash
# Edit .env file
nano /home/mfells/Projects/oneclick/.env

# Update these lines with production URLs:
N8N_ORCHESTRATOR_WEBHOOK=https://rhei.app.n8n.cloud/webhook/provision-orchestrator
N8N_MICROSOFT_WEBHOOK=https://rhei.app.n8n.cloud/webhook/197d7144-01b3-465e-a89f-bafec8a87e63
N8N_GOOGLE_WEBHOOK=https://rhei.app.n8n.cloud/webhook/google-workspace-provision
```

Then restart the frontend:
```bash
# Kill the current server (Ctrl+C in the terminal)
cd /home/mfells/Projects/oneclick/frontend
npm run dev
```

---

## Quick Test Commands

### Test N8N Connectivity
```bash
# Test if N8N is reachable
curl -I https://rhei.app.n8n.cloud

# Test webhook (replace with production URL)
curl -X POST https://rhei.app.n8n.cloud/webhook/provision-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}'
```

### Test Full Provisioning Flow
```bash
# Run automated test
cd /home/mfells/Projects/oneclick
node test-provision.js

# Or test via UI
# Open: http://172.26.133.188:3000/quick-provision
# Fill form and submit
```

### Check N8N API
```bash
# List all workflows (requires N8N API key)
curl https://rhei.app.n8n.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get workflow execution history
curl https://rhei.app.n8n.cloud/api/v1/executions \
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Expected Workflow Behavior

### Master Orchestrator
1. Receives provision request from API
2. Validates employee data
3. Determines which providers to provision
4. Triggers appropriate sub-workflows
5. Collects results from all sub-workflows
6. Returns combined status

### Google Workspace Workflow
1. Receives employee data
2. Creates user in Google Workspace
3. Sets organizational unit
4. Assigns Enterprise Standard license
5. Sets initial password
6. Returns user creation result

### Microsoft 365 Workflow
1. Receives employee data
2. Creates user in Azure AD
3. Sets usage location
4. Assigns selected licenses
5. Adds to security groups
6. Returns user creation result

---

## N8N Workflow Files

Your N8N workflows are stored in:
- [n8n-workflows/master-orchestrator-fixed.json](n8n-workflows/master-orchestrator-fixed.json)
- [n8n-workflows/google-workspace-gsuite-admin.json](n8n-workflows/google-workspace-gsuite-admin.json)
- [n8n-workflows/microsoft-365-user-provisioning.json](n8n-workflows/microsoft-365-user-provisioning.json)

To re-import:
1. Go to N8N console
2. Click "Workflows" → "Import from File"
3. Select the JSON file
4. Configure credentials
5. Activate workflow

---

## Success Criteria

✅ **All tests passing when:**
- Webhook URLs return 200 OK (not 404)
- test-provision.js shows 2 successful provisions
- User appears in Google Workspace Admin Console
- User appears in Microsoft 365 Admin Center
- Licenses are assigned correctly
- Groups are assigned correctly
- No errors in N8N execution logs

---

## Next Steps After Activation

1. **Run Full Test:**
   ```bash
   node test-provision.js
   ```

2. **Verify Results:**
   - Check Google Admin Console
   - Check Microsoft Admin Center
   - Review N8N execution logs

3. **Update Documentation:**
   - Note any configuration changes
   - Document production webhook URLs
   - Update TEST-RESULTS.md

4. **Test Scheduler Integration:**
   - Schedule a test provision for 2 minutes in the future
   - Verify scheduler picks it up and executes

5. **Production Readiness:**
   - Set up monitoring/alerts
   - Configure error notifications
   - Document runbooks
   - Train team on UI

---

**Generated:** November 10, 2025
**Status:** Ready for N8N activation
