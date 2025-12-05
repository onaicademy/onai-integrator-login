/**
 * Test script to verify PostgREST RPC health
 * Run: npx ts-node backend/scripts/test-rpc-health.ts
 */

import { checkPostgRESTHealth, waitForSchemaCache } from '../src/utils/postgrest-health';

async function main() {
  console.log('🔍 Testing PostgREST RPC Functions Health...\n');
  
  // Quick check
  const quickHealth = await checkPostgRESTHealth();
  console.log('📊 Quick Health Check:', quickHealth);
  
  if (quickHealth.status === 'healthy') {
    console.log('\n✅ ALL RPC FUNCTIONS WORKING!');
    process.exit(0);
  }
  
  console.log('\n⏳ RPC functions not yet accessible. Waiting for schema cache propagation...');
  console.log('   This can take 5-10 minutes in hosted Supabase cluster.\n');
  
  // Wait with retry
  const success = await waitForSchemaCache(15); // Try for up to ~15 minutes
  
  if (success) {
    console.log('\n✅ SUCCESS: All RPC functions are now accessible!');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED: RPC functions still not accessible after waiting.');
    console.log('   Please try:');
    console.log('   1. Restart Tripwire Supabase project in Dashboard');
    console.log('   2. Wait another 5-10 minutes');
    process.exit(1);
  }
}

main().catch(console.error);

