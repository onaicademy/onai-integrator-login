/**
 * Cleanup Script: Delete Malformed Challenge3D Sales
 *
 * Issue: 1 record exists with NULL values:
 * - lead_name: NULL
 * - sale_amount: NULL
 * - sale_type: NULL
 * - sale_date: 2026-01-03T18:35:34.992+00:00
 * - utm_source: kenjifb
 *
 * This script identifies and deletes these malformed records.
 */

import { createClient } from '@supabase/supabase-js';

const trafficUrl = 'https://oetodaexnjcunklkdlkv.supabase.co';
const trafficKey = process.env.TRAFFIC_SERVICE_ROLE_KEY || 'sb_secret_h7VM2nxmyNWtw9158fCDLA_t6by7McK';

const client = createClient(trafficUrl, trafficKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${trafficKey}`
    }
  }
});

async function cleanupMalformedSales() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧹 CLEANUP: Malformed Challenge3D Sales');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Find malformed records
  console.log('1️⃣ Searching for malformed records...\n');

  const { data: malformed, error: findError } = await client
    .from('challenge3d_sales')
    .select('*')
    .or('sale_amount.is.null,sale_type.is.null,lead_name.is.null');

  if (findError) {
    console.error('❌ Error finding malformed records:', findError.message);
    return;
  }

  if (!malformed || malformed.length === 0) {
    console.log('✅ No malformed records found - database is clean!\n');
    return;
  }

  console.log(`⚠️  Found ${malformed.length} malformed record(s):\n`);

  malformed.forEach((record, i) => {
    console.log(`${i + 1}. ID: ${record.id}`);
    console.log(`   Lead Name: ${record.lead_name || 'NULL'}`);
    console.log(`   Sale Amount: ${record.sale_amount || 'NULL'}`);
    console.log(`   Sale Type: ${record.sale_type || 'NULL'}`);
    console.log(`   Sale Date: ${record.sale_date}`);
    console.log(`   UTM Source: ${record.utm_source || 'N/A'}\n`);
  });

  // 2. Confirm deletion
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⚠️  DELETION CONFIRMATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`About to DELETE ${malformed.length} malformed record(s).`);
  console.log('These records have NULL values for critical fields.\n');

  // In production, you might want to add interactive confirmation here
  // For automation, we proceed with deletion

  // 3. Delete malformed records
  const idsToDelete = malformed.map(r => r.id);

  console.log('3️⃣ Deleting malformed records...\n');

  const { data: deleted, error: deleteError } = await client
    .from('challenge3d_sales')
    .delete()
    .in('id', idsToDelete)
    .select();

  if (deleteError) {
    console.error('❌ Error deleting records:', deleteError.message);
    return;
  }

  console.log(`✅ Successfully deleted ${deleted?.length || 0} record(s)\n`);

  // 4. Verify cleanup
  console.log('4️⃣ Verifying cleanup...\n');

  const { data: remaining, error: verifyError } = await client
    .from('challenge3d_sales')
    .select('count')
    .or('sale_amount.is.null,sale_type.is.null,lead_name.is.null');

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError.message);
    return;
  }

  if (!remaining || remaining.length === 0) {
    console.log('✅ Cleanup verified - no more malformed records!\n');
  } else {
    console.warn(`⚠️  Warning: Still found ${remaining.length} malformed records\n`);
  }

  // 5. Show final stats
  const { data: allSales, error: statsError } = await client
    .from('challenge3d_sales')
    .select('*')
    .gte('sale_date', '2026-01-01')
    .lte('sale_date', '2026-01-04');

  if (!statsError && allSales) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 FINAL STATS (Jan 1-4, 2026)');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total valid sales: ${allSales.length}`);

    const prepayments = allSales.filter(s => s.sale_type === 'Prepayment');
    const fullPayments = allSales.filter(s => s.sale_type === 'Full Payment');

    console.log(`Prepayments: ${prepayments.length}`);
    console.log(`Full Payments: ${fullPayments.length}`);

    const totalRevenue = allSales.reduce((sum, s) => sum + (s.sale_amount || 0), 0);
    console.log(`Total Revenue: ${totalRevenue.toLocaleString()} ₸\n`);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 Cleanup complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

cleanupMalformedSales().catch(console.error);
