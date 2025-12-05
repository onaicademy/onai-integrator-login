/**
 * DIRECT SQL EXECUTION - Create Sales Managers in Tripwire DB
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const tripwireKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!tripwireUrl || !tripwireKey) {
  console.error('❌ Missing Tripwire credentials');
  process.exit(1);
}

const client = createClient(tripwireUrl, tripwireKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🚀 Direct SQL: Creating sales managers in Tripwire DB\n');

  // Execute raw SQL
  const sql = `
    -- Insert sales managers
    INSERT INTO public.users (id, email, full_name, role, platform, created_at, updated_at)
    VALUES 
      ('fdf3cdc5-a6a5-4105-8922-003eb7ee5bb9', 'amina@onaiacademy.kz', 'Amina Sales Manager', 'sales', 'tripwire', NOW(), NOW()),
      ('82ae50d4-46bc-4ca4-842d-fd909aa85620', 'rakhat@onaiacademy.kz', 'Rakhat Sales Manager', 'sales', 'tripwire', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      updated_at = NOW()
    RETURNING id, email, role;
  `;

  try {
    const response = await fetch(`${tripwireUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': tripwireKey,
        'Authorization': `Bearer ${tripwireKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Fallback: Direct table insert
      console.log('⚠️  RPC failed, trying direct insert...\n');
      
      const users = [
        {
          id: 'fdf3cdc5-a6a5-4105-8922-003eb7ee5bb9',
          email: 'amina@onaiacademy.kz',
          full_name: 'Amina Sales Manager',
          role: 'sales',
          platform: 'tripwire',
        },
        {
          id: '82ae50d4-46bc-4ca4-842d-fd909aa85620',
          email: 'rakhat@onaiacademy.kz',
          full_name: 'Rakhat Sales Manager',
          role: 'sales',
          platform: 'tripwire',
        }
      ];

      for (const user of users) {
        const { error } = await client
          .from('users')
          .upsert(user, { onConflict: 'id' });

        if (error) {
          console.error(`  ❌ ${user.email}:`, error.message);
        } else {
          console.log(`  ✅ ${user.email} created/updated`);
        }
      }
    }

    // Verify
    const { data, error } = await client
      .from('users')
      .select('id, email, role, platform')
      .in('email', ['amina@onaiacademy.kz', 'rakhat@onaiacademy.kz']);

    if (error) {
      console.error('\n❌ Verification failed:', error.message);
    } else {
      console.log('\n✅ VERIFICATION:');
      console.table(data);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

