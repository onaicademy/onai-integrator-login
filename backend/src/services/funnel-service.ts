/**
 * ════════════════════════════════════════════════════════════════════════
 * 📊 FUNNEL SERVICE - ONAI ACADEMY SALES FUNNEL (4 STAGES)
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Воронка продаж (4 этапа):
 * 1. 💰 Затраты (Facebook Ads) - spent USD/KZT
 * 2. 🧪 ProfTest - лиды с профтеста
 * 3. 📚 Express Course - покупки экспресс-курса (5K KZT)
 * 4. 🏆 Integrator Flagman - покупки основного продукта (490K KZT)
 * 
 * Features:
 * - Фильтрация по командам (team filter)
 * - Реальные данные из БД (Landing DB, Traffic DB)
 * - Кэширование (5 мин TTL)
 * - ROI с учётом обеих продаж
 */

import { landingSupabase } from '../config/supabase-landing.js';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { tripwireAdminSupabase } from '../config/supabase-tripwire.js';
import { getCachedOrFresh } from './cache-service.js';

// ════════════════════════════════════════════════════════════════════════
// EXCLUDED USERS (admin + sales managers)
// ════════════════════════════════════════════════════════════════════════
const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO)
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
  'aselya@onaiacademy.kz',    // Sales Manager 3
  'ayaulym@onaiacademy.kz',   // Sales Manager 4
];

// ════════════════════════════════════════════════════════════════════════
// TEAM MAPPING (team name → UTM attribution rules)
// ════════════════════════════════════════════════════════════════════════
interface TeamUtmRule {
  sources: string[];          // utm_source values
  medium?: string;            // utm_medium (optional, for source+medium matching)
  matchMode: 'source_only' | 'source_and_medium';
}

const TEAM_UTM_MAPPING: Record<string, TeamUtmRule> = {
  'kenesary': { 
    sources: ['kenjifb'], 
    matchMode: 'source_only' 
  },
  'arystan': { 
    sources: ['fbarystan'], 
    matchMode: 'source_only' 
  },
  'tf4': { 
    sources: ['alex_FB', 'alex_inst', 'alexinst'], 
    matchMode: 'source_only' 
  },
  'muha': { 
    sources: ['facebook'], 
    medium: 'yourmarketolog',
    matchMode: 'source_and_medium' 
  }
};

// Team slug aliases
const TEAM_ALIASES: Record<string, string> = {
  'traf4': 'tf4',
  'alex': 'tf4',
  'kenesary': 'kenesary',
  'arystan': 'arystan',
  'muha': 'muha'
};

// Get UTM rule for team
function getTeamUtmRule(teamName?: string): TeamUtmRule | null {
  if (!teamName) return null;
  const normalized = TEAM_ALIASES[teamName.toLowerCase()] || teamName.toLowerCase();
  return TEAM_UTM_MAPPING[normalized] || null;
}

// Check if a lead matches team's UTM rules
function matchesTeamUtm(lead: { utm_source?: string; utm_medium?: string; metadata?: any }, rule: TeamUtmRule): boolean {
  const utmSource = lead.utm_source || lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source;
  const utmMedium = lead.utm_medium || lead.metadata?.utmParams?.utm_medium || lead.metadata?.utm_medium;
  
  if (!utmSource) return false;
  
  const sourceMatches = rule.sources.some(s => 
    utmSource.toLowerCase() === s.toLowerCase()
  );
  
  if (rule.matchMode === 'source_only') {
    return sourceMatches;
  }
  
  // source_and_medium mode
  if (!rule.medium) return sourceMatches;
  const mediumMatches = utmMedium?.toLowerCase() === rule.medium.toLowerCase();
  return sourceMatches && mediumMatches;
}

// Date filter: last 30 days
function getThirtyDaysAgo(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

// Exchange rate (simplified - можно подтянуть из exchange_rates таблицы)
const USD_TO_KZT = 475;

// ════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════

export interface FunnelMetrics {
  // Stage 1: Затраты
  spend_usd?: number;
  spend_kzt?: number;
  impressions?: number;
  clicks?: number;
  
  // Stage 2: ProfTest
  proftest_leads?: number;
  
  // Stage 3: Direct Leads (no UTM)
  direct_leads?: number;
  
  // Stage 4: Express Course (Real Students from Tripwire DB)
  express_students?: number;
  express_purchases?: number; // alias for backward compatibility
  express_revenue?: number;
  active_students?: number;
  completed_students?: number;
  
  // Stage 5: Main Product (Integrator Flagman)
  main_purchases?: number;
  main_revenue?: number;
}

export interface FunnelStage {
  id: string;
  title: string;
  emoji: string;
  description: string;
  metrics: FunnelMetrics;
  conversionRate: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
}

export interface FunnelResponse {
  success: boolean;
  stages: FunnelStage[];
  totalRevenue: number;
  totalConversions: number;
  overallConversionRate: number;
  roi: number; // ROI %
  timestamp: string;
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 1: FACEBOOK ADS (Затраты)
// ════════════════════════════════════════════════════════════════════════
async function getFacebookAdsMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:facebook:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Facebook Ads metrics from Traffic DB...');
      console.log('[Funnel] Team filter:', teamFilter || 'all teams');
      
      let query = trafficAdminSupabase
        .from('traffic_stats')
        .select('spend, impressions, clicks')
        .gte('created_at', getThirtyDaysAgo());
      
      // Применяем фильтр по команде если передан
      if (teamFilter) {
        query = query.eq('team_id', teamFilter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] Facebook Ads error:', error.message);
        throw error;
      }
      
      const spend_usd = data?.reduce((sum, row) => sum + (row.spend || 0), 0) || 0;
      const impressions = data?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0;
      const clicks = data?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0;
      const spend_kzt = spend_usd * USD_TO_KZT;
      
      console.log(`[Funnel] ✅ Facebook Ads: $${spend_usd} USD (${spend_kzt} KZT), ${impressions} impressions`);
      
      return {
        spend_usd,
        spend_kzt,
        impressions,
        clicks
      };
    } catch (error: any) {
      console.error('[Funnel] getFacebookAdsMetrics failed:', error.message);
      return { spend_usd: 0, spend_kzt: 0, impressions: 0, clicks: 0 };
    }
  }, 300); // 5 min cache
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 2: PROFTEST (Лиды) - All registrations with proftest% source
// ════════════════════════════════════════════════════════════════════════
async function getProfTestMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:proftest:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching ProfTest metrics from Landing DB (landing_leads table)...');
      
      // PRODUCTION: Get all leads with proftest% source (traffic-driven registrations)
      let query = landingSupabase
        .from('landing_leads')
        .select('id, source, metadata, utm_source')
        .or('source.like.proftest%,source.eq.TF4,source.eq.expresscourse'); // Traffic sources only
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] ProfTest error:', error.message);
        throw error;
      }
      
      // Filter by utm_source based on team mapping
      let filteredData = data || [];
      const teamUtmRule = teamFilter ? getTeamUtmRule(teamFilter) : null;
      
      if (teamFilter && teamUtmRule) {
        console.log(`[Funnel] Filtering by team: ${teamFilter} → UTM sources: [${teamUtmRule.sources.join(', ')}]${teamUtmRule.medium ? `, medium: ${teamUtmRule.medium}` : ''}`);
        
        filteredData = filteredData.filter(lead => matchesTeamUtm(lead, teamUtmRule));
      }
      
      const proftest_leads = filteredData.length;
      
      console.log(`[Funnel] ✅ ProfTest: ${proftest_leads} leads (total: ${data?.length}, filtered: ${teamFilter || 'all'})`);
      
      return { proftest_leads };
    } catch (error: any) {
      console.error('[Funnel] getProfTestMetrics failed:', error.message);
      return { proftest_leads: 0 };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 3: DIRECT LEADS (Напрямую с сайта - БЕЗ UTM)
// ════════════════════════════════════════════════════════════════════════
async function getDirectLeadsMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:direct:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Direct Leads (no UTM) from Landing DB...');
      console.log('[Funnel] PRODUCTION: Reading from landing_leads table (source=expresscourse)');
      
      // ⚠️ source='expresscourse' - это НЕ покупки, а лиды БЕЗ UTM (пришли напрямую на сайт)
      let query = landingSupabase
        .from('landing_leads')
        .select('id, email, phone, metadata, created_at, source')
        .eq('source', 'expresscourse');
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] Direct Leads error:', error.message);
        throw error;
      }
      
      // ⚠️ НЕ ФИЛЬТРУЕМ ПО UTM! Эти лиды БЕЗ UTM (пришли напрямую)
      const direct_leads = data?.length || 0;
      
      console.log(`[Funnel] ✅ Direct Leads (no UTM): ${direct_leads} leads`);
      
      return { direct_leads };
    } catch (error: any) {
      console.error('[Funnel] getDirectLeadsMetrics failed:', error.message);
      return { direct_leads: 0 };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 4: EXPRESS COURSE 5K (PURCHASES from Landing DB express_course_sales)
// ════════════════════════════════════════════════════════════════════════
async function getExpressCoursePurchases(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:express_purchases:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Express Course PURCHASES from Landing DB (express_course_sales)...');
      
      // Get purchases from express_course_sales table in Landing DB
      // ⚠️ ONLY real AmoCRM sales (deal_id < 1B), not migrated leads
      let query = landingSupabase
        .from('express_course_sales')
        .select('id, amount, utm_source, utm_medium, sale_date, deal_id')
        .lt('deal_id', 1000000000);
      
      // Note: We fetch all sales and filter in-memory for proper UTM matching
      // (Supabase OR doesn't support complex source+medium matching)
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] Express Purchases error:', error.message);
        throw error;
      }
      
      // Filter by team UTM rules in-memory
      let filteredData = data || [];
      if (teamFilter) {
        const teamUtmRule = getTeamUtmRule(teamFilter);
        if (teamUtmRule) {
          console.log(`[Funnel] Filtering Express by team: ${teamFilter} → [${teamUtmRule.sources.join(', ')}]`);
          filteredData = filteredData.filter(sale => matchesTeamUtm(sale, teamUtmRule));
        }
      }
      
      const express_purchases = filteredData.length;
      const express_revenue = filteredData.reduce((sum, row) => {
        const amount = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount;
        return sum + (amount || 5000);
      }, 0);
      
      // Also get student stats from Tripwire for additional metrics
      const { data: profiles } = await tripwireAdminSupabase
        .from('tripwire_user_profile')
        .select('user_id, modules_completed, total_modules');
      
      const express_students = profiles?.length || 0;
      const active_students = profiles?.filter(p => p.modules_completed < p.total_modules).length || 0;
      const completed_students = profiles?.filter(p => p.modules_completed >= p.total_modules).length || 0;
      
      console.log(`[Funnel] ✅ Express Course: ${express_purchases} purchases, ${express_revenue.toLocaleString()} KZT, ${express_students} students`);
      
      return { 
        express_purchases,
        express_students, 
        express_revenue,
        active_students,
        completed_students
      };
    } catch (error: any) {
      console.error('[Funnel] getExpressCoursePurchases failed:', error.message);
      return { 
        express_purchases: 0,
        express_students: 0, 
        express_revenue: 0,
        active_students: 0,
        completed_students: 0
      };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 5: MAIN PRODUCT (Integrator Flagman - 490K KZT from Landing DB)
// Webhook saves to Landing DB, so we read from there
// ════════════════════════════════════════════════════════════════════════
async function getMainProductMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:main:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Integrator Flagman metrics from Landing DB...');
      
      // Read from main_product_sales in Landing DB (where webhook saves)
      let query = landingSupabase
        .from('main_product_sales')
        .select('id, amount, utm_source, utm_medium, sale_date');
      
      const { data, error } = await query;
      
      if (error) {
        // If table doesn't exist - return zeros
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('[Funnel] ⚠️  main_product_sales table does not exist in Landing DB');
          return { main_purchases: 0, main_revenue: 0 };
        }
        console.error('[Funnel] Integrator Flagman error:', error.message);
        throw error;
      }
      
      // Filter by team UTM rules in-memory
      let filteredData = data || [];
      if (teamFilter) {
        const teamUtmRule = getTeamUtmRule(teamFilter);
        if (teamUtmRule) {
          console.log(`[Funnel] Filtering Flagman by team: ${teamFilter} → [${teamUtmRule.sources.join(', ')}]`);
          filteredData = filteredData.filter(sale => matchesTeamUtm(sale, teamUtmRule));
        }
      }
      
      const main_purchases = filteredData.length;
      const main_revenue = filteredData.reduce((sum, row) => {
        const amount = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount;
        return sum + (amount || 490000);
      }, 0);
      
      console.log(`[Funnel] ✅ Integrator Flagman: ${main_purchases} purchases, ${main_revenue.toLocaleString()} KZT`);
      
      return { main_purchases, main_revenue };
    } catch (error: any) {
      console.error('[Funnel] getMainProductMetrics failed:', error.message);
      return { main_purchases: 0, main_revenue: 0 };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION: GET FUNNEL METRICS
// ════════════════════════════════════════════════════════════════════════
export async function getFunnelMetrics(teamFilter?: string): Promise<FunnelResponse> {
  console.log('[Funnel Service] 🚀 Getting funnel metrics...');
  console.log('[Funnel Service] Team filter:', teamFilter || 'all teams');

  try {
    // 🚀 Параллельная загрузка всех 5 этапов
    const [facebook, proftest, direct, expressPurchases, main] = await Promise.all([
      getFacebookAdsMetrics(teamFilter),
      getProfTestMetrics(teamFilter),
      getDirectLeadsMetrics(teamFilter),
      getExpressCoursePurchases(teamFilter),
      getMainProductMetrics(teamFilter)
    ]);

    // ════════════════════════════════════════════════════════════════
    // CALCULATE CONVERSIONS
    // ════════════════════════════════════════════════════════════════
    const conv_impressions_to_proftest = facebook.impressions && facebook.impressions > 0
      ? ((proftest.proftest_leads! / facebook.impressions) * 100)
      : 0;

    const conv_proftest_to_direct = proftest.proftest_leads && proftest.proftest_leads > 0
      ? ((direct.direct_leads! / proftest.proftest_leads) * 100)
      : 0;

    const conv_direct_to_express = direct.direct_leads && direct.direct_leads > 0
      ? ((expressPurchases.express_purchases! / direct.direct_leads) * 100)
      : 0;

    const conv_express_to_main = expressPurchases.express_purchases && expressPurchases.express_purchases > 0
      ? ((main.main_purchases! / expressPurchases.express_purchases) * 100)
      : 0;

    const conv_overall = facebook.impressions && facebook.impressions > 0
      ? ((main.main_purchases! / facebook.impressions) * 100)
      : 0;

    // ════════════════════════════════════════════════════════════════
    // CALCULATE ROI
    // ════════════════════════════════════════════════════════════════
    const totalRevenue = (expressPurchases.express_revenue || 0) + (main.main_revenue || 0);
    const totalSpend = facebook.spend_kzt || 0;
    const roi = totalSpend > 0 
      ? ((totalRevenue - totalSpend) / totalSpend * 100) 
      : 0;

    // ════════════════════════════════════════════════════════════════
    // BUILD STAGES (5 этапов)
    // ════════════════════════════════════════════════════════════════
    const stages: FunnelStage[] = [
      {
        id: 'spend',
        title: 'Затраты',
        emoji: '💰',
        description: 'Расходы на Facebook Ads',
        metrics: facebook,
        conversionRate: 100, // Starting point
        status: 'neutral'
      },
      {
        id: 'proftest',
        title: 'ProfTest',
        emoji: '🧪',
        description: 'Лиды с теста профессии',
        metrics: proftest,
        conversionRate: parseFloat(conv_impressions_to_proftest.toFixed(2)),
        status: conv_impressions_to_proftest > 1 ? 'success' : 'warning'
      },
      {
        id: 'direct',
        title: 'Напрямую с сайта',
        emoji: '🌐',
        description: 'Лиды без UTM (прямой трафик)',
        metrics: direct,
        conversionRate: parseFloat(conv_proftest_to_direct.toFixed(2)),
        status: conv_proftest_to_direct > 10 ? 'success' : 'warning'
      },
      {
        id: 'express',
        title: 'Express Course (5,000₸)',
        emoji: '📚',
        description: 'Покупки экспресс-курса',
        metrics: {
          ...expressPurchases,
          express_students: expressPurchases.express_students // для обратной совместимости
        },
        conversionRate: parseFloat(conv_direct_to_express.toFixed(2)),
        status: conv_direct_to_express > 20 ? 'success' : 'warning'
      },
      {
        id: 'main',
        title: 'Integrator Flagman (490,000₸)',
        emoji: '🏆',
        description: 'Покупки основного продукта',
        metrics: main,
        conversionRate: parseFloat(conv_express_to_main.toFixed(2)),
        status: conv_express_to_main > 2 ? 'success' : 'warning'
      }
    ];

    const totalConversions = main.main_purchases || 0;

    console.log(`[Funnel Service] ✅ Success: 5 stages (UPDATED)`);
    console.log(`[Funnel Service] 💰 Revenue: ${totalRevenue.toLocaleString()} KZT`);
    console.log(`[Funnel Service] 🎯 Express Purchases: ${expressPurchases.express_purchases} (${expressPurchases.express_students} students)`);
    console.log(`[Funnel Service] 🎯 Main Purchases: ${totalConversions}`);
    console.log(`[Funnel Service] 📊 ROI: ${roi.toFixed(2)}%`);

    return {
      success: true,
      stages,
      totalRevenue,
      totalConversions,
      overallConversionRate: parseFloat(conv_overall.toFixed(4)),
      roi: parseFloat(roi.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('[Funnel Service] ❌ FATAL ERROR:', error.message);
    console.error('[Funnel Service] Stack:', error.stack);
    
    // Return empty funnel on fatal error
    return {
      success: false,
      stages: [],
      totalRevenue: 0,
      totalConversions: 0,
      overallConversionRate: 0,
      roi: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Получить детальную информацию по конкретному stage
 */
export async function getFunnelStageDetails(stageId: string, teamFilter?: string): Promise<FunnelStage | null> {
  console.log(`[Funnel Service] Getting details for stage: ${stageId}`);

  const allMetrics = await getFunnelMetrics(teamFilter);
  const stage = allMetrics.stages.find(s => s.id === stageId);

  if (!stage) {
    console.warn(`[Funnel Service] Stage not found: ${stageId}`);
    return null;
  }

  return stage;
}
