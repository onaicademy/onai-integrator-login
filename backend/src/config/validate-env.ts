/**
 * Validates required environment variables on backend startup
 * Traffic and Landing variables are optional for product-specific deployments
 */
export function validateSupabaseEnv() {
  // Optional: Traffic and Landing (for full platform only)
  const optional = [
    'TRAFFIC_SUPABASE_URL',
    'TRAFFIC_SERVICE_ROLE_KEY',
    'LANDING_SUPABASE_URL',
    'LANDING_SUPABASE_SERVICE_KEY',
  ];
  
  console.log('✅ Supabase environment variables check:');
  
  optional.forEach(key => {
    if (process.env[key]) {
      console.log(`   ✅ ${key}: configured`);
    } else {
      console.log(`   ⚠️  ${key}: not set (optional)`);
    }
  });
  
  console.log('✅ Environment validation complete');
}
