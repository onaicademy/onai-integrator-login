/**
 * Find Muha Team UTM Pattern
 * Investigates production data to find utm_source alternative to utm_medium
 */

import { landingSupabase } from '../src/config/supabase-landing.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

async function findMuhaPattern() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 MUHA TEAM UTM PATTERN INVESTIGATION');
  console.log('════════════════════════════════════════════════════════════════\n');

  // 1. Find leads with utm_medium='yourmarketolog'
  console.log('1️⃣ Searching for utm_medium=yourmarketolog...\n');

  const { data: muhaByMedium } = await landingSupabase
    .from('landing_leads')
    .select('utm_source, utm_medium, utm_campaign')
    .ilike('utm_medium', '%yourmarketolog%')
    .limit(100);

  if (muhaByMedium && muhaByMedium.length > 0) {
    console.log(`   ✅ Found ${muhaByMedium.length} leads with utm_medium=yourmarketolog`);

    // Group by utm_source
    const sourceCount: Record<string, number> = {};
    muhaByMedium.forEach(l => {
      const src = l.utm_source || 'NULL';
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });

    console.log('\n   📊 UTM Source distribution:');
    Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([src, count]) => {
        const percentage = ((count / muhaByMedium.length) * 100).toFixed(1);
        console.log(`      ${src}: ${count} (${percentage}%)`);
      });

    console.log('\n   📋 Sample records:');
    muhaByMedium.slice(0, 5).forEach((l, i) => {
      console.log(`      ${i + 1}. source: "${l.utm_source || 'NULL'}" | medium: "${l.utm_medium}" | campaign: "${l.utm_campaign || 'NULL'}"`);
    });
  } else {
    console.log('   ❌ No leads found with utm_medium=yourmarketolog');
  }

  // 2. Search for "muha" pattern in utm_source
  console.log('\n2️⃣ Searching for "muha" in utm_source...\n');

  const { data: muhaBySource } = await landingSupabase
    .from('landing_leads')
    .select('utm_source, utm_medium, utm_campaign')
    .or('utm_source.ilike.%muha%,utm_campaign.ilike.%muha%')
    .limit(50);

  if (muhaBySource && muhaBySource.length > 0) {
    console.log(`   ✅ Found ${muhaBySource.length} leads with "muha" pattern`);

    console.log('\n   📋 Sample records:');
    muhaBySource.slice(0, 10).forEach((l, i) => {
      console.log(`      ${i + 1}. source: "${l.utm_source || 'NULL'}" | medium: "${l.utm_medium || 'NULL'}" | campaign: "${l.utm_campaign || 'NULL'}"`);
    });
  } else {
    console.log('   ❌ No leads found with "muha" pattern');
  }

  // 3. Check ALL teams patterns
  console.log('\n3️⃣ Checking all existing team patterns...\n');

  const patterns = [
    { team: 'Kenesary', pattern: '%kenji%' },
    { team: 'Arystan', pattern: '%arystan%' },
    { team: 'Traf4', pattern: '%pb_agency%' },
    { team: 'Muha', pattern: '%muha%' },
  ];

  for (const { team, pattern } of patterns) {
    const { count } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true })
      .or(`utm_source.ilike.${pattern},utm_campaign.ilike.${pattern}`);

    console.log(`   ${team}: ${count} leads`);
  }

  // 4. Analyze campaigns for Muha
  console.log('\n4️⃣ Analyzing campaign patterns for Muha...\n');

  if (muhaByMedium && muhaByMedium.length > 0) {
    const campaignCount: Record<string, number> = {};
    muhaByMedium.forEach(l => {
      const camp = l.utm_campaign || 'NULL';
      campaignCount[camp] = (campaignCount[camp] || 0) + 1;
    });

    console.log('   📊 Campaign distribution:');
    Object.entries(campaignCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([camp, count]) => {
        console.log(`      ${count}x ${camp}`);
      });
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📋 RECOMMENDATION');
  console.log('════════════════════════════════════════════════════════════════\n');

  if (muhaByMedium && muhaByMedium.length > 0) {
    const topSource = Object.entries(
      muhaByMedium.reduce((acc, l) => {
        const src = l.utm_source || 'NULL';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1])[0];

    console.log('⚠️ WARNING: utm_source="facebook" is TOO GENERIC');
    console.log('   Other teams may also use utm_source=facebook\n');

    console.log('💡 SOLUTION OPTIONS:\n');
    console.log('   Option 1: Keep utm_medium check for Muha (safest)');
    console.log('      - utm_medium="yourmarketolog" is unique and specific');
    console.log('      - No risk of conflicts with other teams');
    console.log('      - Violates requirement to ignore utm_medium\n');

    console.log('   Option 2: Ask client for Muha-specific utm_source');
    console.log('      - Request team to use unique utm_source (e.g., "fb_muha")');
    console.log('      - Update future campaigns to use new pattern');
    console.log('      - Historical data will be unattributed\n');

    console.log('   Option 3: Use utm_source="facebook" + utm_campaign pattern');
    console.log('      - Match utm_source="facebook" AND campaign contains specific keywords');
    console.log('      - More complex but avoids utm_medium');
    console.log('      - May still have conflicts\n');

    console.log('✅ RECOMMENDED: **Option 1** - Keep utm_medium for Muha ONLY');
    console.log('   Rationale: utm_medium="yourmarketolog" is a unique identifier');
    console.log('   Alternative: Request team to start using fb_muha as utm_source');
  } else {
    console.log('⚠️ No data available for Muha team (utm_medium=yourmarketolog)');
    console.log('   Team may not be active or pattern needs updating');
  }

  console.log('\n');
}

findMuhaPattern().catch(console.error);
