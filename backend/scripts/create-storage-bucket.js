/**
 * Create Supabase Storage bucket for certificates
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL,
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY
);

async function createBucket() {
  console.log('📦 Creating "certificates" bucket...');
  
  try {
    // Create bucket
    const { data, error } = await supabase.storage.createBucket('certificates', {
      public: true, // Public so users can download
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['application/pdf'],
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket already exists!');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Bucket created:', data);
    }

    // Set up RLS policies
    console.log('🔒 Setting up storage policies...');
    
    // Note: Storage policies are managed via SQL, see STORAGE_POLICIES.sql
    console.log('📝 Run STORAGE_POLICIES.sql to set up access policies');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createBucket();

