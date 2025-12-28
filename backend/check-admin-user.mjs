import { createClient } from '@supabase/supabase-js';

const TRAFFIC_URL = 'https://oetodaexnjcunklkdlkv.supabase.co';
const TRAFFIC_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQxMDExMywiZXhwIjoyMDQ4OTg2MTEzfQ.h7VM2nxmyNWtw9158fCDLA_t6by7McK-Oa9iTtNAm3s';

const supabase = createClient(TRAFFIC_URL, TRAFFIC_SERVICE_KEY);

console.log('🔍 Checking for admin user in traffic_users table...\n');

const { data, error } = await supabase
  .from('traffic_users')
  .select('*')
  .eq('email', 'admin@onai.academy')
  .maybeSingle();

if (error) {
  console.log('❌ Error:', error.message);
} else if (!data) {
  console.log('❌ Admin user NOT FOUND in database');
  console.log('\n✅ Need to create admin user');
} else {
  console.log('✅ Admin user found:');
  console.log(JSON.stringify(data, null, 2));
}
