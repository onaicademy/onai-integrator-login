/**
 * Test Traffic API Endpoints
 * Run: npx tsx scripts/test-traffic-api.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testEndpoint(path: string, name: string) {
  try {
    const response = await axios.get(`${API_URL}${path}`);
    console.log(`✅ ${name} (${response.status})`);
    
    if (Array.isArray(response.data)) {
      console.log(`   Length: ${response.data.length}`);
      if (response.data.length > 0 && response.data.length <= 5) {
        console.log(`   Data:`, JSON.stringify(response.data, null, 2).substring(0, 300));
      }
    } else {
      console.log(`   Data:`, JSON.stringify(response.data, null, 2).substring(0, 200));
    }
    
    return true;
  } catch (error: any) {
    console.log(`❌ ${name} - ${error.response?.status || 'NO_RESPONSE'}: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Error:`, JSON.stringify(error.response.data).substring(0, 200));
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Traffic Dashboard API...\n');
  console.log(`API URL: ${API_URL}\n`);
  
  await testEndpoint('/health', 'Health Check');
  console.log('');
  
  await testEndpoint('/api/traffic-constructor/teams', 'Teams API');
  console.log('');
  
  await testEndpoint('/api/traffic-constructor/users', 'Users API');
  console.log('');
  
  await testEndpoint('/api/traffic-onboarding/status/test-id', 'Onboarding API');
  console.log('');
  
  console.log('✅ Testing complete!\n');
}

main().catch(console.error);
