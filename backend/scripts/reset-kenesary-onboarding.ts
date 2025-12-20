import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../env.env') });

const supabase = createClient(
  process.env.TRAFFIC_SUPABASE_URL!,
  process.env.TRAFFIC_SERVICE_ROLE_KEY!
);

async function resetOnboarding() {
  console.log('🔄 Resetting onboarding for kenesary...');
  
  const { error } = await supabase
    .from('traffic_onboarding_progress')
    .delete()
    .eq('user_id', '97524c98-c193-4d0d-b9ce-8a8011366a63');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Onboarding progress deleted for kenesary@onai.academy');
    console.log('👉 Now login again to see the onboarding tour fresh!');
  }
  
  process.exit(0);
}

resetOnboarding();
