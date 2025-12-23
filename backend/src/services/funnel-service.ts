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
        .select('id, source, metadata, utm_source')
        .like('source', 'proftest%');
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] ProfTest error:', error.message);
        throw error;
      }
      
      // Фильтр по utm_source с учетом mapping команд
      let filteredData = data || [];
      const allowedUtmSources = teamFilter ? getUtmSourcesForTeam(teamFilter) : null;
      
      if (teamFilter && allowedUtmSources) {
        console.log(`[Funnel] Filtering by team: ${teamFilter} → UTM sources: [${allowedUtmSources.join(', ')}]`);
        
        filteredData = filteredData.filter(lead => {
          const utmFromMetadata = lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source;
          const utmFromColumn = lead.utm_source;
          const utmSource = utmFromColumn || utmFromMetadata;
          
          const matches = utmSource && allowedUtmSources.some(allowed => 
            utmSource.toLowerCase().includes(allowed.toLowerCase())
          );
          
          // Debug первого лида
          if (data?.indexOf(lead) === 0) {
            console.log(`[Funnel] Example lead UTM: column="${utmFromColumn}", metadata="${utmFromMetadata}", matches=${matches}`);
          }
          
          return matches;
        });
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
// STAGE 4: EXPRESS COURSE 5K (Реальные покупки из Tripwire DB)
// ════════════════════════════════════════════════════════════════════════
async function getExpressCourseRealStudents(teamFilter?: string): Promise<FunnelMetrics> {
  const cacheKey = `funnel:express_real:${teamFilter || 'all'}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Express Course REAL STUDENTS from Tripwire DB...');
      
      // ШАГ 1: Получить исключенных пользователей (admin/sales)
      const { data: excludedUsers } = await tripwireAdminSupabase
        .from('tripwire_users')
        .select('user_id')
        .in('email', EXCLUDED_EMAILS)
        .not('user_id', 'is', null);
      
      const excludedUserIds = excludedUsers?.map(u => u.user_id) || [];
      console.log(`[Funnel] Excluding ${excludedUserIds.length} admin/sales users`);
      
      // ШАГ 2: Получить реальных студентов из tripwire_user_profile
      let query = tripwireAdminSupabase
        .from('tripwire_user_profile')
        .select('user_id, modules_completed, total_modules');
      
      // Исключаем admin и sales менеджеров
      if (excludedUserIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
      }
      
      const { data: profiles, error } = await query;
      
      if (error) {
        console.error('[Funnel] Express Real Students error:', error.message);
        throw error;
      }
      
      let filteredProfiles = profiles || [];
      
      // ШАГ 3: Фильтр по команде (если указан)
      if (teamFilter) {
        console.log(`[Funnel] Filtering Express students by team: ${teamFilter}`);
        
        // Получить emails студентов из tripwire_users
        const userIds = filteredProfiles.map(p => p.user_id);
        const { data: tripwireUsers } = await tripwireAdminSupabase
          .from('tripwire_users')
          .select('user_id, email')
          .in('user_id', userIds);
        
        const emails = tripwireUsers?.map(u => u.email) || [];
        
        // Найти соответствующие ProfTest лиды по email
        const allowedUtmSources = getUtmSourcesForTeam(teamFilter);
        if (allowedUtmSources) {
          const { data: teamLeads } = await landingSupabase
            .from('landing_leads')
            .select('email, utm_source, metadata')
            .in('email', emails)
            .like('source', 'proftest%');
          
          // Фильтровать по utm_source
          const teamEmails = teamLeads?.filter(lead => {
            const utmFromMetadata = lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source;
            const utmFromColumn = lead.utm_source;
            const utmSource = utmFromColumn || utmFromMetadata;
            return utmSource && allowedUtmSources.some(allowed => 
              utmSource.toLowerCase().includes(allowed.toLowerCase())
            );
          }).map(l => l.email) || [];
          
          // Оставить только студентов из этой команды
          const teamUserIds = tripwireUsers?.filter(u => teamEmails.includes(u.email)).map(u => u.user_id) || [];
          filteredProfiles = filteredProfiles.filter(p => teamUserIds.includes(p.user_id));
        }
      }
      
      const express_students = filteredProfiles.length;
      const express_revenue = express_students * 5000; // 5,000 KZT per student
      const active_students = filteredProfiles.filter(p => 
        p.modules_completed < p.total_modules
      ).length;
      const completed_students = filteredProfiles.filter(p => 
        p.modules_completed >= p.total_modules
      ).length;
      
      console.log(`[Funnel] ✅ Express Course REAL: ${express_students} students (${completed_students} completed, ${active_students} active), ${express_revenue} KZT`);
      
      return { 
        express_students, 
        express_revenue,
        active_students,
        completed_students
      };
    } catch (error: any) {
      console.error('[Funnel] getExpressCourseRealStudents failed:', error.message);
      return { 
        express_students: 0, 
        express_revenue: 0,
        active_students: 0,
        completed_students: 0
      };
    }
  }, 300);
}

// ════════════════════════════════════════════════════════════════════════
// STAGE 5: MAIN PRODUCT (Integrator Flagman - 490K KZT)
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
    // 🚀 Параллельная загрузка всех 5 этапов
    const [facebook, proftest, direct, expressReal, main] = await Promise.all([
      getFacebookAdsMetrics(teamFilter),
      getProfTestMetrics(teamFilter),
      getDirectLeadsMetrics(teamFilter),
      getExpressCourseRealStudents(teamFilter),
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
      ? ((expressReal.express_students! / direct.direct_leads) * 100)
      : 0;

    const conv_express_to_main = expressReal.express_students && expressReal.express_students > 0
      ? ((main.main_purchases! / expressReal.express_students) * 100)
      : 0;

    const conv_overall = facebook.impressions && facebook.impressions > 0
      ? ((main.main_purchases! / facebook.impressions) * 100)
      : 0;

    // ════════════════════════════════════════════════════════════════
    // CALCULATE ROI
    // ════════════════════════════════════════════════════════════════
    const totalRevenue = (expressReal.express_revenue || 0) + (main.main_revenue || 0);
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
        description: 'Реальные студенты Tripwire',
        metrics: {
          ...expressReal,
          express_purchases: expressReal.express_students // для обратной совместимости
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
    console.log(`[Funnel Service] 🎯 Express Students: ${expressReal.express_students} (${expressReal.completed_students} completed)`);
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
