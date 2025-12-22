/**
 * Validates required environment variables on backend startup
 * Throws error if any critical variables are missing
 */
export function validateSupabaseEnv() {
  const required = [
    'TRAFFIC_SUPABASE_URL',
    'TRAFFIC_SERVICE_ROLE_KEY',
    'LANDING_SUPABASE_URL',
    'LANDING_SUPABASE_SERVICE_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ All Supabase environment variables validated');
  console.log(`   - Traffic DB: ${process.env.TRAFFIC_SUPABASE_URL?.substring(0, 30)}...`);
  console.log(`   - Landing DB: ${process.env.LANDING_SUPABASE_URL?.substring(0, 30)}...`);
}
