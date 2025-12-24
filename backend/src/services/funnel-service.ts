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

import axios from 'axios';
import { landingSupabase } from '../config/supabase-landing.js';
import { tripwireAdminSupabase } from '../config/supabase-tripwire.js';
import { database } from '../config/database-layer.js';
import { getAlmatyDate, getYesterdayAlmaty } from '../utils/timezone.js';
import { getCachedOrFresh } from './cache-service.js';
import { getAverageExchangeRate } from './exchangeRateService.js';

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

interface FunnelDateRange {
  since: string;
  until: string;
  preset?: string;
  singleDate?: string | null;
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

function matchesUtmSource(lead: { utm_source?: string; metadata?: any }, utmSource: string): boolean {
  const source = (lead.utm_source || lead.metadata?.utmParams?.utm_source || lead.metadata?.utm_source || '')
    .toString()
    .toLowerCase();
  return source === utmSource.toLowerCase();
}

export function resolveFunnelDateRange(preset?: string, date?: string, start?: string, end?: string): FunnelDateRange {
  const presetKey = (preset || '30d').toLowerCase();
  let singleDate: string | null = null;

  if (start && end) {
    const since = start;
    const until = end;
    singleDate = start === end ? start : null;
    return {
      since,
      until,
      preset: 'custom',
      singleDate,
    };
  }

  if (date) {
    singleDate = date;
  } else if (presetKey === 'today') {
    singleDate = getAlmatyDate();
  } else if (presetKey === 'yesterday' || presetKey === '24h' || presetKey === '1d') {
    singleDate = getYesterdayAlmaty();
  }

  if (singleDate) {
    return {
      since: singleDate,
      until: singleDate,
      preset: presetKey,
      singleDate,
    };
  }

  const daysBackMatch = presetKey.match(/^(\d+)d$/);
  const daysBack = daysBackMatch ? parseInt(daysBackMatch[1], 10) : 30;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    since: startDate.toISOString().split('T')[0],
    until: now.toISOString().split('T')[0],
    preset: presetKey,
    singleDate: null,
  };
}

function getRangeCacheKey(range?: FunnelDateRange): string {
  if (!range) return '30d';
  return `${range.since}:${range.until}`;
}

function getDateBounds(range: FunnelDateRange) {
  const start = new Date(`${range.since}T00:00:00+06:00`);
  const end = new Date(`${range.until}T23:59:59.999+06:00`);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// Exchange rate (simplified - можно подтянуть из exchange_rates таблицы)
const USD_TO_KZT = 475;

const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const FB_ACCESS_TOKEN = process.env.FACEBOOK_ADS_TOKEN || '';

const normalizeAccountId = (id?: string | null) => {
  if (!id) return '';
  return id.startsWith('act_') ? id : `act_${id}`;
};

const normalizeCampaigns = (campaigns: any[] = []) => {
  const map = new Map<string, any>();
  campaigns.forEach((campaign) => {
    if (!campaign?.id) return;
    const normalizedAccountId = normalizeAccountId(String(campaign.ad_account_id || ''));
    const normalized = { ...campaign, ad_account_id: normalizedAccountId };
    const existing = map.get(campaign.id);
    if (!existing) {
      map.set(campaign.id, normalized);
      return;
    }
    const existingAccountId = existing.ad_account_id || '';
    const preferCandidate = normalizedAccountId.startsWith('act_') && !existingAccountId.startsWith('act_');
    map.set(campaign.id, preferCandidate ? normalized : { ...normalized, ...existing });
  });
  return Array.from(map.values());
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function fetchCampaignInsightsForAccount(
  accountId: string,
  campaignIds: string[],
  since: string,
  until: string
) {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;

  if (!FB_ACCESS_TOKEN) {
    return { spend, impressions, clicks };
  }

  const uniqueCampaignIds = Array.from(new Set(campaignIds));
  for (const chunk of chunkArray(uniqueCampaignIds, 50)) {
    const response = await axios.get(`${FB_BASE_URL}/${accountId}/insights`, {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: 'campaign_id,spend,impressions,clicks',
        time_range: JSON.stringify({ since, until }),
        level: 'campaign',
        filtering: JSON.stringify([{
          field: 'campaign.id',
          operator: 'IN',
          value: chunk,
        }]),
        limit: 500,
      },
      timeout: 15000,
    });

    const rows = response.data?.data || [];
    rows.forEach((row: any) => {
      spend += parseFloat(row.spend || '0');
      impressions += parseInt(row.impressions || '0', 10);
      clicks += parseInt(row.clicks || '0', 10);
    });
  }

  return { spend, impressions, clicks };
}

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
async function getFacebookAdsMetrics(teamFilter?: string, userId?: string, dateRange?: FunnelDateRange): Promise<FunnelMetrics> {
  const resolvedRange = dateRange || resolveFunnelDateRange();
  const rangeKey = getRangeCacheKey(resolvedRange);
  const cacheKey = `funnel:facebook:${userId || teamFilter || 'all'}:${rangeKey}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      if (userId) {
        const settings = await database.getSettings(userId);
        const selectedCampaigns = normalizeCampaigns(settings?.tracked_campaigns || [])
          .filter((campaign: any) => campaign.enabled !== false);

        if (!selectedCampaigns.length) {
          return { spend_usd: 0, spend_kzt: 0, impressions: 0, clicks: 0 };
        }

        const campaignIds = selectedCampaigns.map((campaign: any) => campaign.id);
        const since = resolvedRange.since;
        const until = resolvedRange.until;

        const { data: cachedStats } = await landingSupabase
          .from('traffic_stats')
          .select('spend_usd, spend_kzt, impressions, clicks')
          .eq('user_id', userId)
          .gte('stat_date', since)
          .lte('stat_date', until)
          .in('campaign_id', campaignIds);

        if (cachedStats && cachedStats.length > 0) {
          const totals = cachedStats.reduce(
            (acc, row: any) => {
              acc.spend += parseFloat(row.spend_usd || '0');
              acc.spendKzt += parseFloat(row.spend_kzt || '0');
              acc.impressions += parseInt(row.impressions || '0', 10);
              acc.clicks += parseInt(row.clicks || '0', 10);
              return acc;
            },
            { spend: 0, spendKzt: 0, impressions: 0, clicks: 0 }
          );

          if (totals.spendKzt <= 0 && totals.spend > 0) {
            const avgRate = await getAverageExchangeRate(since, until);
            totals.spendKzt = totals.spend * avgRate;
          }

          return {
            spend_usd: totals.spend,
            spend_kzt: totals.spendKzt,
            impressions: totals.impressions,
            clicks: totals.clicks,
          };
        }

        const campaignsByAccount = new Map<string, string[]>();
        selectedCampaigns.forEach((campaign: any) => {
          const accountId = normalizeAccountId(campaign.ad_account_id);
          if (!accountId) return;
          const list = campaignsByAccount.get(accountId) || [];
          list.push(campaign.id);
          campaignsByAccount.set(accountId, list);
        });

        let spend = 0;
        let impressions = 0;
        let clicks = 0;

        for (const [accountId, campaignIds] of campaignsByAccount.entries()) {
          const metrics = await fetchCampaignInsightsForAccount(accountId, campaignIds, since, until);
          spend += metrics.spend;
          impressions += metrics.impressions;
          clicks += metrics.clicks;
        }

        const avgRate = await getAverageExchangeRate(since, until);

        return {
          spend_usd: spend,
          spend_kzt: spend * avgRate,
          impressions,
          clicks,
        };
      }

      console.log('[Funnel] Fetching Facebook Ads metrics from Traffic DB...');
      console.log('[Funnel] Team filter:', teamFilter || 'all teams');
      let query = landingSupabase
        .from('traffic_stats')
        .select('spend_usd, spend_kzt, impressions, clicks')
        .gte('stat_date', resolvedRange.since)
        .lte('stat_date', resolvedRange.until);
      
      // Применяем фильтр по команде если передан
      if (teamFilter) {
        query = query.eq('team_id', teamFilter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] Facebook Ads error:', error.message);
        throw error;
      }
      
      const spend_usd = data?.reduce((sum, row: any) => sum + (parseFloat(row.spend_usd || '0') || 0), 0) || 0;
      const impressions = data?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0;
      const clicks = data?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0;
      let spend_kzt = data?.reduce((sum, row: any) => sum + (parseFloat(row.spend_kzt || '0') || 0), 0) || 0;
      if (spend_kzt <= 0 && spend_usd > 0) {
        const avgRate = await getAverageExchangeRate(resolvedRange.since, resolvedRange.until);
        spend_kzt = spend_usd * avgRate;
      }
      
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
async function getProfTestMetrics(teamFilter?: string, utmSourceOverride?: string, dateRange?: FunnelDateRange): Promise<FunnelMetrics> {
  const resolvedRange = dateRange || resolveFunnelDateRange();
  const rangeKey = getRangeCacheKey(resolvedRange);
  const cacheKey = `funnel:proftest:${utmSourceOverride || teamFilter || 'all'}:${rangeKey}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching ProfTest metrics from Landing DB (landing_leads table)...');
      const { start, end } = getDateBounds(resolvedRange);
      
      // PRODUCTION: Get all leads with proftest% source (traffic-driven registrations)
      let query = landingSupabase
        .from('landing_leads')
        .select('id, source, metadata, utm_source')
        .or('source.like.proftest%,source.eq.TF4,source.eq.expresscourse') // Traffic sources only
        .gte('created_at', start)
        .lte('created_at', end);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] ProfTest error:', error.message);
        throw error;
      }
      
      // Filter by utm_source based on team mapping or override
      let filteredData = data || [];
      const teamUtmRule = teamFilter ? getTeamUtmRule(teamFilter) : null;
      
      if (utmSourceOverride) {
        filteredData = filteredData.filter(lead => matchesUtmSource(lead, utmSourceOverride));
      } else if (teamFilter && teamUtmRule) {
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
async function getDirectLeadsMetrics(teamFilter?: string, dateRange?: FunnelDateRange, userId?: string): Promise<FunnelMetrics> {
  const resolvedRange = dateRange || resolveFunnelDateRange();
  const rangeKey = getRangeCacheKey(resolvedRange);
  const cacheKey = `funnel:direct:${teamFilter || 'all'}:${rangeKey}`;
  if (userId) {
    // Direct leads are not attributable per user without UTM.
    return { direct_leads: 0 };
  }

  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Direct Leads (no UTM) from Landing DB...');
      console.log('[Funnel] PRODUCTION: Reading from landing_leads table (source=expresscourse)');
      const { start, end } = getDateBounds(resolvedRange);
      
      // ⚠️ source='expresscourse' - это НЕ покупки, а лиды БЕЗ UTM (пришли напрямую на сайт)
      let query = landingSupabase
        .from('landing_leads')
        .select('id, email, phone, metadata, created_at, source')
        .eq('source', 'expresscourse')
        .gte('created_at', start)
        .lte('created_at', end);
      
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
async function getExpressCoursePurchases(teamFilter?: string, utmSourceOverride?: string, dateRange?: FunnelDateRange): Promise<FunnelMetrics> {
  const resolvedRange = dateRange || resolveFunnelDateRange();
  const rangeKey = getRangeCacheKey(resolvedRange);
  const cacheKey = `funnel:express_purchases:${utmSourceOverride || teamFilter || 'all'}:${rangeKey}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Express Course PURCHASES from Landing DB (express_course_sales)...');
      const { start, end } = getDateBounds(resolvedRange);
      
      // Get purchases from express_course_sales table in Landing DB
      // ⚠️ ONLY real AmoCRM sales (deal_id < 1B), not migrated leads
      let query = landingSupabase
        .from('express_course_sales')
        .select('id, amount, utm_source, utm_medium, sale_date, deal_id')
        .lt('deal_id', 1000000000)
        .gte('sale_date', start)
        .lte('sale_date', end);
      
      // Note: We fetch all sales and filter in-memory for proper UTM matching
      // (Supabase OR doesn't support complex source+medium matching)
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Funnel] Express Purchases error:', error.message);
        throw error;
      }
      
      // Filter by UTM in-memory
      let filteredData = data || [];
      if (utmSourceOverride) {
        filteredData = filteredData.filter(sale => matchesUtmSource(sale, utmSourceOverride));
      } else if (teamFilter) {
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
async function getMainProductMetrics(teamFilter?: string, utmSourceOverride?: string, dateRange?: FunnelDateRange): Promise<FunnelMetrics> {
  const resolvedRange = dateRange || resolveFunnelDateRange();
  const rangeKey = getRangeCacheKey(resolvedRange);
  const cacheKey = `funnel:main:${utmSourceOverride || teamFilter || 'all'}:${rangeKey}`;
  
  return getCachedOrFresh(cacheKey, async () => {
    try {
      console.log('[Funnel] Fetching Integrator Flagman metrics from Landing DB...');
      const { start, end } = getDateBounds(resolvedRange);
      
      // Read from main_product_sales in Landing DB (where webhook saves)
      let query = landingSupabase
        .from('main_product_sales')
        .select('id, amount, utm_source, utm_medium, sale_date')
        .gte('sale_date', start)
        .lte('sale_date', end);
      
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
      
      // Filter by UTM rules in-memory
      let filteredData = data || [];
      if (utmSourceOverride) {
        filteredData = filteredData.filter(sale => matchesUtmSource(sale, utmSourceOverride));
      } else if (teamFilter) {
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
export async function getFunnelMetrics(teamFilter?: string, userId?: string, dateRange?: FunnelDateRange): Promise<FunnelResponse> {
  console.log('[Funnel Service] 🚀 Getting funnel metrics...');
  console.log('[Funnel Service] Team filter:', teamFilter || 'all teams');
  const resolvedRange = dateRange || resolveFunnelDateRange();

  try {
    let utmSourceOverride: string | undefined;
    if (userId) {
      const settings = await database.getSettings(userId);
      utmSourceOverride = settings?.utm_sources?.facebook
        || settings?.utm_source
        || settings?.personal_utm_source;
    }
    const effectiveUtmSource = userId ? (utmSourceOverride || '__no_match__') : utmSourceOverride;

    // 🚀 Параллельная загрузка всех 4 этапов (убрали direct - объединяем с proftest)
    const [facebook, proftest, direct, expressPurchases, main] = await Promise.all([
      getFacebookAdsMetrics(teamFilter, userId, resolvedRange),
      getProfTestMetrics(teamFilter, effectiveUtmSource, resolvedRange),
      getDirectLeadsMetrics(teamFilter, resolvedRange, userId),
      getExpressCoursePurchases(teamFilter, effectiveUtmSource, resolvedRange),
      getMainProductMetrics(teamFilter, effectiveUtmSource, resolvedRange)
    ]);

    // 🔥 ОБЪЕДИНЯЕМ direct_leads в proftest_leads для 4-stage funnel
    const totalProftestLeads = (proftest.proftest_leads || 0) + (direct.direct_leads || 0);

    // ════════════════════════════════════════════════════════════════
    // CALCULATE CONVERSIONS (4-stage funnel)
    // ════════════════════════════════════════════════════════════════
    const conv_impressions_to_proftest = facebook.impressions && facebook.impressions > 0
      ? ((totalProftestLeads / facebook.impressions) * 100)
      : 0;

    const conv_proftest_to_express = totalProftestLeads > 0
      ? ((expressPurchases.express_purchases! / totalProftestLeads) * 100)
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
    // BUILD STAGES (4 этапа - убрали 'direct', объединили с proftest)
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
        title: 'ProfTest Лиды',
        emoji: '👥',
        description: 'Регистрации (все лиды включая прямые)',
        metrics: {
          proftest_leads: totalProftestLeads
        },
        conversionRate: parseFloat(conv_impressions_to_proftest.toFixed(2)),
        status: conv_impressions_to_proftest > 1 ? 'success' : 'warning'
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
        conversionRate: parseFloat(conv_proftest_to_express.toFixed(2)),
        status: conv_proftest_to_express > 20 ? 'success' : 'warning'
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

    console.log(`[Funnel Service] ✅ Success: 4 stages (direct merged into proftest)`);
    console.log(`[Funnel Service] 👥 Total ProfTest Leads: ${totalProftestLeads} (proftest: ${proftest.proftest_leads}, direct: ${direct.direct_leads})`);
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
export async function getFunnelStageDetails(stageId: string, teamFilter?: string, userId?: string, dateRange?: FunnelDateRange): Promise<FunnelStage | null> {
  console.log(`[Funnel Service] Getting details for stage: ${stageId}`);

  const allMetrics = await getFunnelMetrics(teamFilter, userId, dateRange);
  const stage = allMetrics.stages.find(s => s.id === stageId);

  if (!stage) {
    console.warn(`[Funnel Service] Stage not found: ${stageId}`);
    return null;
  }

  return stage;
}
