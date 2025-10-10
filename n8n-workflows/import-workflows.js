#!/usr/bin/env node

/**
 * n8n Workflow Import Helper
 * This script helps import workflows to n8n via API
 * 
 * Usage:
 * 1. Set your N8N_API_KEY and N8N_API_URL environment variables
 * 2. Run: node import-workflows.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const N8N_API_URL = process.env.N8N_API_URL || 'https://rhei.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('❌ Please set N8N_API_KEY environment variable');
  console.log('Get your API key from: Settings → API in n8n');
  process.exit(1);
}

// Workflow files to import
const workflows = [
  {
    file: 'master-orchestrator.json',
    name: 'OneClick Master Orchestrator',
    description: 'Main orchestrator for employee provisioning'
  },
  {
    file: 'google-workspace-provision.json',
    name: 'Google Workspace Provision',
    description: 'Provisions Google Workspace accounts'
  },
  {
    file: 'slack-provision.json',
    name: 'Slack Provision',
    description: 'Provisions Slack accounts via SCIM'
  }
];

// Helper function to make API requests
function apiRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_API_URL}/api/v1${endpoint}`);
    
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`API error: ${json.message || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Import a single workflow
async function importWorkflow(workflowFile) {
  const filePath = path.join(__dirname, workflowFile.file);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow file not found: ${filePath}`);
  }
  
  const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Check if workflow already exists
  try {
    const existing = await apiRequest('GET', '/workflows');
    const existingWorkflow = existing.data.find(w => w.name === workflowFile.name);
    
    if (existingWorkflow) {
      console.log(`⚠️  Workflow "${workflowFile.name}" already exists (ID: ${existingWorkflow.id})`);
      console.log('   Skipping import. Delete the existing workflow if you want to reimport.');
      return existingWorkflow;
    }
  } catch (e) {
    console.log('Could not check existing workflows:', e.message);
  }
  
  // Import the workflow
  try {
    const result = await apiRequest('POST', '/workflows', workflowData);
    console.log(`✅ Imported: ${workflowFile.name} (ID: ${result.data.id})`);
    return result.data;
  } catch (error) {
    console.error(`❌ Failed to import ${workflowFile.name}:`, error.message);
    throw error;
  }
}

// Main import process
async function importAll() {
  console.log('🚀 Starting n8n Workflow Import');
  console.log(`📍 Target: ${N8N_API_URL}`);
  console.log('');
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  for (const workflow of workflows) {
    try {
      const result = await importWorkflow(workflow);
      if (result) {
        results.success.push(workflow.name);
      } else {
        results.skipped.push(workflow.name);
      }
    } catch (error) {
      results.failed.push(workflow.name);
    }
  }
  
  // Summary
  console.log('\n📊 Import Summary:');
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`⚠️  Skipped: ${results.skipped.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to n8n and configure credentials for each workflow');
    console.log('2. Test workflows with the provided test data');
    console.log('3. Activate workflows when ready for production');
  }
}

// Manual import instructions if API import fails
function printManualInstructions() {
  console.log('\n📝 Manual Import Instructions:');
  console.log('1. Log in to n8n at:', N8N_API_URL);
  console.log('2. Go to Workflows → Add Workflow → Import from File');
  console.log('3. Import each JSON file in this order:');
  workflows.forEach(w => {
    console.log(`   - ${w.file}`);
  });
  console.log('4. Configure credentials for each workflow');
  console.log('5. Test and activate workflows');
}

// Run the import
console.log('═══════════════════════════════════════');
console.log('   n8n Workflow Import for OneClick   ');
console.log('═══════════════════════════════════════\n');

importAll()
  .then(() => {
    console.log('\n✨ Import process completed!');
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error.message);
    printManualInstructions();
  });