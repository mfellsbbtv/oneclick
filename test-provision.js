#!/usr/bin/env node

/**
 * Test script for OneClick provisioning flow
 * Tests the quick provision API endpoint
 */

const testData = {
  employee: {
    fullName: "Martin Short",
    workEmail: "mshort@rhei.com",
    personalEmail: "martin.short@gmail.com",
    department: "Engineering",
    jobTitle: "Software Engineer",
    role: "developer"
  },
  applications: {
    google: true,
    microsoft: true,
    "google-workspace": {
      primaryOrgUnit: "/Developers",
      licenseSku: "1010020026",
      passwordMode: "auto"
    },
    "microsoft-365": {
      usageLocation: "US",
      licenses: ["cdd28e44-67e3-425e-be4c-737fab2899d3"], // Business Basic
      groups: ["61c005b9-d8a8-495d-964a-2da005fe682e"], // CRM Production
      requirePasswordChange: true
    }
  }
};

async function testProvision() {
  console.log('🧪 Testing OneClick Provisioning Flow\n');
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  try {
    console.log('🚀 Sending provisioning request to http://localhost:3000/api/provision-n8n...\n');

    const response = await fetch('http://localhost:3000/api/provision-n8n', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Provisioning request successful!\n');
      console.log('📄 Response:');
      console.log(JSON.stringify(result, null, 2));

      if (result.results) {
        console.log('\n📊 Summary:');
        console.log(`   Total: ${result.summary?.total || 0}`);
        console.log(`   Successful: ${result.summary?.successful || 0}`);
        console.log(`   Failed: ${result.summary?.failed || 0}`);

        console.log('\n📝 Details:');
        result.results.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.provider}: ${r.status}`);
          if (r.error) {
            console.log(`      Error: ${r.error}`);
          }
        });
      }
    } else {
      console.log('❌ Provisioning request failed!\n');
      console.log('📄 Error Response:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Run the test
testProvision();
