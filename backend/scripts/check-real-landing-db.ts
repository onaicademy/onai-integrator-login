/**
 * Check REAL Landing DB (xikaiavwqinamgolmtcy) for traffic data
 */

import { createClient } from '@supabase/supabase-js';

// LANDING DB (the REAL one)
const landingUrl = process.env.LANDING_SUPABASE_URL || 'https://xikaiavwqinamgolmtcy.supabase.co';
const landingKey = process.env.LANDING_SUPABASE_SERVICE_KEY!;

const landingClient = createClient(landingUrl, landingKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${landingKey}`
    }
  }
});

async function checkRealLandingDB() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 CHECKING **REAL** LANDING DB');
  console.log(`URL: ${landingUrl}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Check facebook_ad_insights
  console.log('1️⃣ Facebook Ad Insights (Jan 1-4, 2026):\n');
  const { data: fbAds, error: fbError } = await landingClient
    .from('facebook_ad_insights')
    .select('*')
    .gte('date', '2026-01-01')
    .lte('date', '2026-01-04')
    .order('date', { ascending: true });

  if (fbError) {
    console.error('❌ Error:', fbError.message);
  } else {
    console.log(`✅ Total records: ${fbAds?.length || 0}\n`);

    // Group by date and targetologist
    const byDate: Record<string, any[]> = {};
    fbAds?.forEach(ad => {
      if (!byDate[ad.date]) byDate[ad.date] = [];
      byDate[ad.date].push(ad);
    });

    let grandTotalSpend = 0;
    let grandTotalImpressions = 0;
    let grandTotalClicks = 0;

    Object.entries(byDate).forEach(([date, ads]) => {
      const totalSpend = ads.reduce((sum, ad) => sum + (parseFloat(ad.spend) || 0), 0);
      const totalImpressions = ads.reduce((sum, ad) => sum + (parseInt(ad.impressions) || 0), 0);
      const totalClicks = ads.reduce((sum, ad) => sum + (parseInt(ad.clicks) || 0), 0);

      grandTotalSpend += totalSpend;
      grandTotalImpressions += totalImpressions;
      grandTotalClicks += totalClicks;

      console.log(`${date}: $${totalSpend.toFixed(2)} (${totalImpressions.toLocaleString()} impressions, ${totalClicks} clicks)`);
    });

    console.log(`\n📊 ИТОГО: $${grandTotalSpend.toFixed(2)} / ${grandTotalImpressions.toLocaleString()} impressions / ${grandTotalClicks} clicks\n`);
  }

  // 2. Check landing_stats
  console.log('2️⃣ Landing Stats (Jan 1-4, 2026):\n');
  const { data: landing, error: landingError } = await landingClient
    .from('landing_stats')
    .select('*')
    .gte('date', '2026-01-01')
    .lte('date', '2026-01-04')
    .order('date', { ascending: true });

  if (landingError) {
    console.error('❌ Error:', landingError.message);
  } else {
    console.log(`✅ Total records: ${landing?.length || 0}\n`);

    const totalSpendUSD = landing?.reduce((sum, s) => sum + (parseFloat(s.spend_usd) || 0), 0) || 0;
    const totalSpendKZT = landing?.reduce((sum, s) => sum + (parseFloat(s.spend_kzt) || 0), 0) || 0;
    const totalImpressions = landing?.reduce((sum, s) => sum + (parseInt(s.impressions) || 0), 0) || 0;
    const totalClicks = landing?.reduce((sum, s) => sum + (parseInt(s.clicks) || 0), 0) || 0;

    console.log(`Total Spend: $${totalSpendUSD.toFixed(2)} (${totalSpendKZT.toLocaleString()} ₸)`);
    console.log(`Total Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`Total Clicks: ${totalClicks.toLocaleString()}\n`);
  }

  // 3. Check telegram_groups for leads
  console.log('3️⃣ Telegram Groups (Leads Jan 1-4, 2026):\n');
  const { data: leads, error: leadsError } = await landingClient
    .from('telegram_groups')
    .select('*')
    .eq('group_type', 'leads')
    .gte('created_at', '2026-01-01')
    .lte('created_at', '2026-01-04T23:59:59')
    .order('created_at', { ascending: false })
    .limit(500);

  if (leadsError) {
    console.error('❌ Error:', leadsError.message);
  } else {
    console.log(`✅ Total leads: ${leads?.length || 0}\n`);

    // Group by funnel
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
  }

  // 4. Check express_course_sales
  console.log('4️⃣ Express Course Sales (Jan 1-4, 2026):\n');
  const { data: express, error: expressError } = await landingClient
    .from('express_course_sales')
    .select('*')
    .gte('sale_date', '2026-01-01')
    .lte('sale_date', '2026-01-04')
    .order('sale_date', { ascending: true });

  if (expressError) {
    console.error('❌ Error:', expressError.message);
  } else {
    console.log(`✅ Total sales: ${express?.length || 0}\n`);

    let totalRevenue = 0;
    express?.forEach((sale, i) => {
      console.log(`${i + 1}. ${sale.lead_name || sale.lead_email} - ${sale.sale_amount} ₸ (${sale.sale_date})`);
      totalRevenue += sale.sale_amount || 0;
    });

    if (express?.length > 0) {
      console.log(`\n💰 Total Revenue: ${totalRevenue.toLocaleString()} ₸\n`);
    }
  }

  // 5. Check challenge3d_sales
  console.log('5️⃣ Challenge3D Sales (Jan 1-4, 2026):\n');
  const { data: challenge, error: challengeError } = await landingClient
    .from('challenge3d_sales')
    .select('*')
    .gte('sale_date', '2026-01-01')
    .lte('sale_date', '2026-01-04')
    .order('sale_date', { ascending: true });

  if (challengeError) {
    console.error('❌ Error:', challengeError.message);
  } else {
    console.log(`✅ Total sales: ${challenge?.length || 0}\n`);

    let totalRevenue = 0;
    challenge?.forEach((sale, i) => {
      console.log(`${i + 1}. ${sale.lead_name || sale.lead_email}`);
      console.log(`   Amount: ${sale.sale_amount} ₸`);
      console.log(`   Type: ${sale.sale_type}`);
      console.log(`   Date: ${sale.sale_date}\n`);
      totalRevenue += sale.sale_amount || 0;
    });

    if (challenge?.length > 0) {
      console.log(`💰 Total Revenue: ${totalRevenue.toLocaleString()} ₸\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
}

checkRealLandingDB().catch(console.error);
