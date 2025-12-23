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
import { getCachedOrFresh } from './cache-service.js';

// ════════════════════════════════════════════════════════════════════════
// TEAM MAPPING (team name → utm_source в БД)
// ════════════════════════════════════════════════════════════════════════
const TEAM_UTM_MAPPING: Record<string, string[]> = {
  'kenesary': ['kenjifb', 'kenesary'],
  'arystan': ['fbarystan', 'arystan'],
  'muha': ['facebook', 'muha'],
  'traf4': ['alex_FB', 'TF4', 'traf4', 'alexinst', 'alex_inst']
};

// Получить utm_source из team name
function getUtmSourcesForTeam(teamName?: string): string[] | null {
  if (!teamName) return null;
  const normalized = teamName.toLowerCase();
  return TEAM_UTM_MAPPING[normalized] || [normalized];
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
  
  // Stage 3: Express Course
  express_purchases?: number;
  express_revenue?: number;
  
  // Stage 4: Main Product (Integrator Flagman)
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
// STAGE 2: PROFTEST (Лиды)
// ════════════════════════════════════════════════════════════════════════
async function getProfTestMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:proftest:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching ProfTest metrics from Landing DB (landing_leads table)...');
      
      // PRODUCTION: Используем СУЩЕСТВУЮЩУЮ таблицу landing_leads (692 записи!)
      let query = landingSupabase
        .from('landing_leads')
        .select('id, source, metadata')
        .like('source', 'proftest%');
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] ProfTest error:', error.message);
        throw error;
      }
      
      // Фильтр по utm_source с учетом mapping команд
      let filteredData = data || [];
      if (teamFilter) {
        const allowedUtmSources = getUtmSourcesForTeam(teamFilter);
        if (allowedUtmSources) {
          filteredData = filteredData.filter(lead => {
            const utmSource = lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source || lead.utm_source;
            return utmSource && allowedUtmSources.some(allowed => 
              utmSource.toLowerCase().includes(allowed.toLowerCase())
            );
          });
        }
      }
      
      const proftest_leads = filteredData.length;
      
      console.log(`[Funnel] ✅ ProfTest: ${proftest_leads} leads (total: ${data?.length}, filtered: ${teamFilter || 'all'}, utm: ${allowedUtmSources?.join(', ') || 'all'})`);
      
      return { proftest_leads };
    } catch (error: any) {
      console.error('[Funnel] getProfTestMetrics failed:', error.message);
      return { proftest_leads: 0 };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 3: EXPRESS COURSE (Покупки 5K KZT)
// ════════════════════════════════════════════════════════════════════════
async function getExpressCourseMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:express:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Express Course metrics from Landing DB...');
      console.log('[Funnel] PRODUCTION: Reading from landing_leads table (source=expresscourse)');
      
      // PRODUCTION: express_course_sales НЕ СУЩЕСТВУЕТ!
      // Читаем покупателей Express из landing_leads где source='expresscourse'
      let query = landingSupabase
        .from('landing_leads')
        .select('id, metadata, created_at, source')
        .eq('source', 'expresscourse');
      
      // Фильтр по utm_source
      if (teamFilter) {
        query = query.eq('utm_source', teamFilter.toLowerCase());
      }
      
      const { data, error } = await query;
      
      console.log('[Funnel] Express Course raw data:', JSON.stringify(data, null, 2));
      console.log('[Funnel] Express Course error:', error);
      
      if (error) {
        console.error('[Funnel] Express Course error:', error.message);
        throw error;
      }
      
      // Фильтр по utm_source из metadata
      let filteredData = data || [];
      if (teamFilter) {
        filteredData = filteredData.filter(lead => {
          const utmSource = lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source;
          return utmSource?.toLowerCase() === teamFilter.toLowerCase();
        });
      }
      
      const express_purchases = filteredData.length;
      // Express Course стоит 5000 KZT
      const express_revenue = express_purchases * 5000;
      
      console.log(`[Funnel] ✅ Express Course: ${express_purchases} purchases (total: ${data?.length}), ${express_revenue} KZT`);
      
      return { express_purchases, express_revenue };
    } catch (error: any) {
      console.error('[Funnel] getExpressCourseMetrics failed:', error.message);
      return { express_purchases: 0, express_revenue: 0 };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 4: MAIN PRODUCT (Integrator Flagman - 490K KZT)
// ════════════════════════════════════════════════════════════════════════
async function getMainProductMetrics(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:main:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Integrator Flagman metrics from Landing DB...');
      console.log('[Funnel] PRODUCTION: main_product_sales table should exist');
      
      // Попытка читать из main_product_sales (должна быть создана миграцией)
      let query = landingSupabase
        .from('main_product_sales')
        .select('id, amount, utm_source, sale_date');
      
      // Фильтр по utm_source
      if (teamFilter) {
        query = query.eq('utm_source', teamFilter.toLowerCase());
      }
      
      const { data, error } = await query;
      
      if (error) {
        // Если таблица не существует - вернуть нули (таблица будет создана миграцией)
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('[Funnel] ⚠️  main_product_sales table does not exist yet (will be created by migration)');
          return { main_purchases: 0, main_revenue: 0 };
        }
        console.error('[Funnel] Integrator Flagman error:', error.message);
        throw error;
      }
      
      const main_purchases = data?.length || 0;
      const main_revenue = data?.reduce((sum, row) => {
        const amount = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount;
        return sum + (amount || 490000);
      }, 0) || 0;
      
      console.log(`[Funnel] ✅ Integrator Flagman: ${main_purchases} purchases, ${main_revenue} KZT`);
      
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
    // 🚀 Параллельная загрузка всех 4 этапов
    const [facebook, proftest, express, main] = await Promise.all([
      getFacebookAdsMetrics(teamFilter),
      getProfTestMetrics(teamFilter),
      getExpressCourseMetrics(teamFilter),
      getMainProductMetrics(teamFilter)
    ]);

    // ════════════════════════════════════════════════════════════════
    // CALCULATE CONVERSIONS
    // ════════════════════════════════════════════════════════════════
    const conv_impressions_to_proftest = facebook.impressions && facebook.impressions > 0
      ? ((proftest.proftest_leads! / facebook.impressions) * 100)
      : 0;

    const conv_proftest_to_express = proftest.proftest_leads && proftest.proftest_leads > 0
      ? ((express.express_purchases! / proftest.proftest_leads) * 100)
      : 0;

    const conv_express_to_main = express.express_purchases && express.express_purchases > 0
      ? ((main.main_purchases! / express.express_purchases) * 100)
      : 0;

    const conv_overall = facebook.impressions && facebook.impressions > 0
      ? ((main.main_purchases! / facebook.impressions) * 100)
      : 0;

    // ════════════════════════════════════════════════════════════════
    // CALCULATE ROI
    // ════════════════════════════════════════════════════════════════
    const totalRevenue = (express.express_revenue || 0) + (main.main_revenue || 0);
    const totalSpend = facebook.spend_kzt || 0;
    const roi = totalSpend > 0 
      ? ((totalRevenue - totalSpend) / totalSpend * 100) 
      : 0;

    // ════════════════════════════════════════════════════════════════
    // BUILD STAGES
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
        id: 'express',
        title: 'Express Course',
        emoji: '📚',
        description: 'Покупки экспресс-курса (5K KZT)',
        metrics: express,
        conversionRate: parseFloat(conv_proftest_to_express.toFixed(2)),
        status: conv_proftest_to_express > 5 ? 'success' : 'warning'
      },
      {
        id: 'main',
        title: 'Integrator Flagman',
        emoji: '🏆',
        description: 'Покупки основного продукта (490K KZT)',
        metrics: main,
        conversionRate: parseFloat(conv_express_to_main.toFixed(2)),
        status: conv_express_to_main > 2 ? 'success' : 'warning'
      }
    ];

    const totalConversions = main.main_purchases || 0;

    console.log(`[Funnel Service] ✅ Success: 4 stages`);
    console.log(`[Funnel Service] 💰 Revenue: ${totalRevenue.toLocaleString()} KZT`);
    console.log(`[Funnel Service] 🎯 Conversions: ${totalConversions}`);
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
