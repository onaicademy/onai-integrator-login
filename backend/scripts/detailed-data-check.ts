/**
 * Detailed Data Check - Find WHERE the sales data actually is
 */

import { createClient } from '@supabase/supabase-js';

const trafficUrl = 'https://oetodaexnjcunklkdlkv.supabase.co';
const trafficKey = 'sb_secret_h7VM2nxmyNWtw9158fCDLA_t6by7McK';

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

async function detailedCheck() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 DETAILED DATA INVESTIGATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Check ALL Challenge3D sales (not just Jan 1-4)
  console.log('1️⃣ ALL Challenge3D Sales:\n');
  const { data: allSales, error: allError } = await client
    .from('challenge3d_sales')
    .select('*')
    .order('sale_date', { ascending: false })
    .limit(20);

  if (allError) {
    console.error('Error:', allError.message);
  } else {
    console.log(`Total sales in DB: ${allSales?.length || 0}\n`);
    allSales?.forEach((sale, i) => {
      console.log(`${i + 1}. ${sale.lead_name || sale.lead_email}`);
      console.log(`   Amount: ${sale.sale_amount} ₸`);
      console.log(`   Type: ${sale.sale_type}`);
      console.log(`   Date: ${sale.sale_date}`);
      console.log(`   UTM: ${sale.utm_source}/${sale.utm_campaign}`);
      console.log();
    });
  }

  // 2. Check traffic_targetologist_settings to see what campaigns are tracked
  console.log('2️⃣ Tracked Campaigns:\n');
  const { data: settings, error: settingsError } = await client
    .from('traffic_targetologist_settings')
    .select('*');

  if (settingsError) {
    console.error('Error:', settingsError.message);
  } else {
    console.log(`Total users: ${settings?.length || 0}\n`);
    settings?.forEach((s, i) => {
      console.log(`${i + 1}. User: ${s.user_id}`);
      console.log(`   Team: ${s.team_name || 'N/A'}`);
      console.log(`   Campaigns: ${s.tracked_campaigns?.length || 0}`);
      if (s.tracked_campaigns?.length > 0) {
        console.log(`   IDs: ${s.tracked_campaigns.slice(0, 3).join(', ')}${s.tracked_campaigns.length > 3 ? '...' : ''}`);
      }
      console.log();
    });
  }

  // 3. Check traffic_facebook_ads_cache for spend data
  console.log('3️⃣ Facebook Ads Spend (Jan 1-4, 2026):\n');
  const { data: adSpend, error: adError } = await client
    .from('traffic_facebook_ads_cache')
    .select('*')
    .gte('date', '2026-01-01')
    .lte('date', '2026-01-04')
    .order('date', { ascending: true });

  if (adError) {
    console.error('Error:', adError.message);
  } else {
    console.log(`Total ad records: ${adSpend?.length || 0}\n`);

    // Group by date
    const byDate: Record<string, any[]> = {};
    adSpend?.forEach(ad => {
      if (!byDate[ad.date]) byDate[ad.date] = [];
      byDate[ad.date].push(ad);
    });

    Object.entries(byDate).forEach(([date, ads]) => {
      const totalSpend = ads.reduce((sum, ad) => sum + (parseFloat(ad.spend) || 0), 0);
      const totalImpressions = ads.reduce((sum, ad) => sum + (parseInt(ad.impressions) || 0), 0);
      const totalClicks = ads.reduce((sum, ad) => sum + (parseInt(ad.clicks) || 0), 0);
      console.log(`${date}: $${totalSpend.toFixed(2)} (${ads.length} campaigns, ${totalImpressions} impressions, ${totalClicks} clicks)`);
    });
    console.log();
  }

  // 4. Check traffic_leads for actual leads
  console.log('4️⃣ Traffic Leads (Jan 1-4, 2026):\n');
  const { data: leads, error: leadsError } = await client
    .from('traffic_leads')
    .select('*')
    .gte('created_at', '2026-01-01')
    .lte('created_at', '2026-01-04T23:59:59')
    .order('created_at', { ascending: false });

  if (leadsError) {
    console.error('Error:', leadsError.message);
  } else {
    console.log(`Total leads: ${leads?.length || 0}\n`);

    // Group by funnel type
    const byFunnel: Record<string, any[]> = {};
    leads?.forEach(lead => {
      const funnel = lead.funnel_type || 'unknown';
      if (!byFunnel[funnel]) byFunnel[funnel] = [];
      byFunnel[funnel].push(lead);
    });

    Object.entries(byFunnel).forEach(([funnel, funnelLeads]) => {
      console.log(`  ${funnel}: ${funnelLeads.length} leads`);
    });
    console.log();

    // Show first 5 leads
    leads?.slice(0, 5).forEach((lead, i) => {
      console.log(`${i + 1}. ${lead.email || lead.phone || 'No contact'}`);
      console.log(`   Funnel: ${lead.funnel_type || 'N/A'}`);
      console.log(`   UTM: ${lead.utm_source}/${lead.utm_campaign}`);
      console.log(`   Date: ${lead.created_at}`);
      console.log();
    });
  }

  console.log('═══════════════════════════════════════════════════════════');
}

detailedCheck().catch(console.error);
