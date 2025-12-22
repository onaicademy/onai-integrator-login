import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AMOCRM_CONFIG } from '../config/amocrm-config.js';
import { supabase } from '../config/supabase';

const router = Router();

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_TIMEOUT = 60000;

// Facebook Ads configuration
const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const FB_ACCESS_TOKEN = process.env.FACEBOOK_ADS_TOKEN || 'EAAPVZCSfHj0YBQGxLZAdo9TK0m0Wuj3czwTmXXfEmvUNfwLWMaypNgn4rZBFjsT8w049mzXYBZAGhVkb9Qc7nNXLCpIPMu2NuDfQNEjM3rHXyeSOvSQ2vjhdRppKykbjhLATTRHYFxvPRWEZAg0wnXqXuzRB0BEuZCBELO0yZCPNPpQtiZBijR1c3ZC3p51C8Qb0u';

// 💱 Курс валют (USD → KZT)
let cachedExchangeRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 3600000; // 1 час

async function getUSDtoKZTRate(): Promise<number> {
  try {
    // Проверяем кеш
    if (cachedExchangeRate && Date.now() - cachedExchangeRate.timestamp < CACHE_DURATION) {
      console.log(`💱 Using cached USD/KZT rate: ${cachedExchangeRate.rate}`);
      return cachedExchangeRate.rate;
    }

    // Получаем актуальный курс
    const response = await axios.get('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
      timeout: 5000,
    });
    
    const rate = response.data?.usd?.kzt;
    
    if (!rate || typeof rate !== 'number') {
      console.warn('⚠️ Invalid exchange rate, using fallback: 470');
      return 470; // Fallback курс
    }

    // Кешируем
    cachedExchangeRate = { rate, timestamp: Date.now() };
    console.log(`💱 Fetched new USD/KZT rate: ${rate}`);
    
    return rate;
  } catch (error) {
    console.error('❌ Error fetching exchange rate:', error);
    return cachedExchangeRate?.rate || 470; // Используем кеш или fallback
  }
}

const AD_ACCOUNTS = {
  'Kenesary': { 
    id: 'act_964264512447589', 
    team: 'nutrients_kz', 
    utmPattern: 'kenji',
    // Campaign patterns: ТОЛЬКО tripwire кампании
    campaignPatterns: ['tripwire'],
  },
  'Arystan': { 
    id: 'act_666059476005255', 
    team: 'arystan_3_1', 
    utmPattern: 'arystan',
    // Campaign patterns: arystan_17.12, arystan_13.12
    campaignPatterns: ['arystan'],
  },
  'Muha': { 
    id: 'act_839340528712304', 
    team: 'muha_acc3', 
    utmPattern: 'yourmarketolog',
    // Campaign patterns: Запуск на On AI 16.12
    campaignPatterns: ['on ai', 'onai', 'запуск'],
  },
  'Traf4': { 
    id: 'act_30779210298344970', 
    team: 'traf4_team', 
    utmPattern: 'pb_agency',
    // Campaign patterns: alex/11.12, Proftest/alex
    campaignPatterns: ['alex', 'traf4', 'proftest'],
  },
};

// Create axios client for AmoCRM
const amocrmClient = axios.create({
  baseURL: `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4`,
  timeout: AMOCRM_TIMEOUT,
  headers: {
    'Authorization': `Bearer ${AMOCRM_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

interface LeadWithUTM {
  id: number;
  name: string;
  created_at: number;
  closed_at: number;
  status_id: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

/**
 * Fetch leads from AmoCRM with a specific status
 */
async function fetchLeadsByStatus(statusId: number, page: number = 1, limit: number = 250): Promise<any[]> {
  try {
    const response = await amocrmClient.get('/leads', {
      params: {
        'filter[pipeline_id]': AMOCRM_CONFIG.PIPELINE_ID,
        'filter[statuses][0][status_id]': statusId,
        'filter[statuses][0][pipeline_id]': AMOCRM_CONFIG.PIPELINE_ID,
        'with': 'contacts',
        'limit': limit,
        'page': page,
      },
    });

    return response.data._embedded?.leads || [];
  } catch (error: any) {
    console.error(`❌ Error fetching leads with status ${statusId}:`, error.message);
    return [];
  }
}

/**
 * Get all leads from "Успешно реализовано" stage with pagination
 */
async function getAllPaidLeads(): Promise<any[]> {
  const allLeads: any[] = [];
  let page = 1;
  const limit = 250;
  
  while (true) {
    console.log(`📊 Fetching paid leads page ${page}...`);
    const leads = await fetchLeadsByStatus(AMOCRM_CONFIG.STAGES.УСПЕШНО_РЕАЛИЗОВАНО, page, limit);
    
    if (leads.length === 0) break;
    
    allLeads.push(...leads);
    
    if (leads.length < limit) break;
    page++;
    
    // Rate limiting - wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`✅ Fetched ${allLeads.length} total paid leads`);
  return allLeads;
}

/**
 * Extract UTM fields from lead's custom_fields_values
 */
function extractUTMFromLead(lead: any): Partial<LeadWithUTM> {
  const utmData: Partial<LeadWithUTM> = {
    id: lead.id,
    name: lead.name,
    created_at: lead.created_at,
    closed_at: lead.closed_at,
    status_id: lead.status_id,
  };

  const customFields = lead.custom_fields_values || [];
  
  for (const field of customFields) {
    const value = field.values?.[0]?.value;
    if (!value) continue;
    
    switch (field.field_id) {
      case AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_SOURCE:
        utmData.utm_source = value;
        break;
      case AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_MEDIUM:
        utmData.utm_medium = value;
        break;
      case AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_CAMPAIGN:
        utmData.utm_campaign = value;
        break;
      case AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_CONTENT:
        utmData.utm_content = value;
        break;
    }
  }

  return utmData;
}

// 💰 Revenue per sale in KZT
const REVENUE_PER_SALE = 5000;

// 🎯 Traffic team UTM patterns - REAL patterns from production
const TRAFFIC_TEAM_PATTERNS = {
  'Kenesary': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.source?.toLowerCase().includes('kenji'),
    emoji: '👑',
    color: '#00FF88',
  },
  'Arystan': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.source?.toLowerCase().includes('arystan'),
    emoji: '⚡',
    color: '#00FF88',
  },
  'Muha': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.medium?.toLowerCase() === 'yourmarketolog',
    emoji: '🚀',
    color: '#00FF88',
  },
  'Traf4': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.source?.toLowerCase().includes('pb_agency') || 
      utm.source?.toLowerCase().includes('alex') ||
      utm.campaign?.toLowerCase().includes('alex') ||
      utm.campaign?.toLowerCase().includes('proftest'),
    emoji: '🎯',
    color: '#00FF88',
  },
};

/**
 * Identify traffic team from lead data (UTM)
 * Uses REAL UTM patterns from traffic teams
 */
function identifyTrafficTeam(lead: Partial<LeadWithUTM>): string {
  const utm = {
    source: lead.utm_source?.toLowerCase() || '',
    medium: lead.utm_medium?.toLowerCase() || '',
    campaign: lead.utm_campaign?.toLowerCase() || '',
  };
  
  // Check against known traffic team patterns
  for (const [teamName, config] of Object.entries(TRAFFIC_TEAM_PATTERNS)) {
    if (config.match(utm)) {
      return teamName;
    }
  }
  
  // Fallback: Check for legacy patterns (proftest page slugs)
  const allFields = [utm.source, utm.campaign, lead.name?.toLowerCase() || ''].join(' ');
  
  if (allFields.includes('traf4') || allFields.includes('tf4')) return 'Traf4';
  if (allFields.includes('muha')) return 'Muha';
  if (allFields.includes('arystan')) return 'Arystan';
  if (allFields.includes('kenesary') || allFields.includes('kenji')) return 'Kenesary';
  
  // Return UTM source for unknown teams, or 'Другие'
  return lead.utm_source || 'Другие';
}

/**
 * GET /api/traffic/sales
 * Get sales statistics grouped by traffic team
 */
router.get('/sales', async (req: Request, res: Response) => {
  try {
    if (!AMOCRM_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'AmoCRM not configured' 
      });
    }

    console.log('📊 Fetching paid leads from AmoCRM...');
    
    // Fetch all paid leads
    const paidLeads = await getAllPaidLeads();
    
    // Extract UTM data and identify traffic teams
    const processedLeads = paidLeads.map(lead => {
      const utmData = extractUTMFromLead(lead);
      const trafficTeam = identifyTrafficTeam(utmData);
      
      return {
        ...utmData,
        traffic_team: trafficTeam,
        closed_date: lead.closed_at ? new Date(lead.closed_at * 1000).toISOString() : null,
        created_date: lead.created_at ? new Date(lead.created_at * 1000).toISOString() : null,
      };
    });

    // Group by traffic team
    const teamStats: Record<string, {
      count: number;
      leads: any[];
      today: number;
      yesterday: number;
      last7Days: number;
      last30Days: number;
      revenue: number;
      revenueToday: number;
      revenueLast7Days: number;
      revenueLast30Days: number;
      campaigns: Set<string>;
      adsets: Set<string>;
    }> = {};

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const lead of processedLeads) {
      const team = lead.traffic_team;
      
      if (!teamStats[team]) {
        teamStats[team] = {
          count: 0,
          leads: [],
          today: 0,
          yesterday: 0,
          last7Days: 0,
          last30Days: 0,
          revenue: 0,
          revenueToday: 0,
          revenueLast7Days: 0,
          revenueLast30Days: 0,
          campaigns: new Set(),
          adsets: new Set(),
        };
      }

      teamStats[team].count++;
      teamStats[team].leads.push(lead);
      teamStats[team].revenue += REVENUE_PER_SALE;
      
      // Track campaigns and adsets (from utm_campaign and utm_content)
      if (lead.utm_campaign) teamStats[team].campaigns.add(lead.utm_campaign);
      if (lead.utm_content) teamStats[team].adsets.add(lead.utm_content);

      // Calculate time-based stats using closed_at
      const closedTime = lead.closed_at ? lead.closed_at * 1000 : 0;
      
      if (closedTime >= todayStart) {
        teamStats[team].today++;
        teamStats[team].revenueToday += REVENUE_PER_SALE;
      }
      if (closedTime >= yesterdayStart && closedTime < todayStart) {
        teamStats[team].yesterday++;
      }
      if (closedTime >= weekAgo) {
        teamStats[team].last7Days++;
        teamStats[team].revenueLast7Days += REVENUE_PER_SALE;
      }
      if (closedTime >= monthAgo) {
        teamStats[team].last30Days++;
        teamStats[team].revenueLast30Days += REVENUE_PER_SALE;
      }
    }

    // Generate daily chart data (last 30 days)
    const dailyData: Record<string, Record<string, number>> = {};
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = {};
    }

    for (const lead of processedLeads) {
      if (!lead.closed_at) continue;
      
      const closedDate = new Date(lead.closed_at * 1000);
      const dateKey = closedDate.toISOString().split('T')[0];
      
      if (dailyData[dateKey] !== undefined) {
        const team = lead.traffic_team;
        dailyData[dateKey][team] = (dailyData[dateKey][team] || 0) + 1;
      }
    }

    // Convert to array format for charts
    const chartData = Object.entries(dailyData).map(([date, teams]) => {
      const dateObj = new Date(date);
      return {
        date,
        fullDate: dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        shortDate: dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        total: Object.values(teams).reduce((sum, count) => sum + count, 0),
        ...teams,
      };
    });

    // Sort teams by count and format for response
    const sortedTeams = Object.entries(teamStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([team, stats]) => {
        const teamConfig = TRAFFIC_TEAM_PATTERNS[team as keyof typeof TRAFFIC_TEAM_PATTERNS];
        return {
          team,
          emoji: teamConfig?.emoji || '📊',
          color: teamConfig?.color || '#6b7280',
          count: stats.count,
          today: stats.today,
          yesterday: stats.yesterday,
          last7Days: stats.last7Days,
          last30Days: stats.last30Days,
          revenue: stats.revenue,
          revenueToday: stats.revenueToday,
          revenueLast7Days: stats.revenueLast7Days,
          revenueLast30Days: stats.revenueLast30Days,
          campaignsCount: stats.campaigns.size,
          adsetsCount: stats.adsets.size,
          campaigns: Array.from(stats.campaigns).slice(0, 10), // Top 10 campaigns
        };
      });

    // Total stats with revenue
    const totalStats = {
      total: processedLeads.length,
      today: sortedTeams.reduce((sum, t) => sum + t.today, 0),
      yesterday: sortedTeams.reduce((sum, t) => sum + t.yesterday, 0),
      last7Days: sortedTeams.reduce((sum, t) => sum + t.last7Days, 0),
      last30Days: sortedTeams.reduce((sum, t) => sum + t.last30Days, 0),
      teamsCount: sortedTeams.length,
      // 💰 Revenue stats
      revenue: processedLeads.length * REVENUE_PER_SALE,
      revenueToday: sortedTeams.reduce((sum, t) => sum + t.revenueToday, 0),
      revenueLast7Days: sortedTeams.reduce((sum, t) => sum + t.revenueLast7Days, 0),
      revenueLast30Days: sortedTeams.reduce((sum, t) => sum + t.revenueLast30Days, 0),
      revenuePerSale: REVENUE_PER_SALE,
    };

    console.log(`✅ Processed ${processedLeads.length} sales across ${sortedTeams.length} traffic teams`);

    res.json({
      success: true,
      stats: totalStats,
      teams: sortedTeams,
      chartData,
      updatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Error fetching traffic sales:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch sales data' 
    });
  }
});

/**
 * GET /api/traffic/pipeline
 * Get pipeline stages info (for debugging)
 */
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    if (!AMOCRM_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: 'AmoCRM not configured' 
      });
    }

    const response = await amocrmClient.get(`/leads/pipelines/${AMOCRM_CONFIG.PIPELINE_ID}`);
    
    const pipeline = response.data;
    const statuses = pipeline._embedded?.statuses || [];

    res.json({
      success: true,
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
      },
      stages: statuses.map((s: any) => ({
        id: s.id,
        name: s.name,
        sort: s.sort,
        type: s.type,
        color: s.color,
      })),
    });

  } catch (error: any) {
    console.error('❌ Error fetching pipeline:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/traffic/combined-analytics
 * Combined analytics: FB Ads spend + AmoCRM revenue = Real ROAS
 * STRICT: Only tripwire campaigns, matched by UTM patterns in campaign/adset/ad names
 */
router.get('/combined-analytics', async (req: Request, res: Response) => {
  try {
    const preset = (req.query.preset as string) || '30d';
    const customDate = req.query.date as string; // YYYY-MM-DD format
    
    // Get date range
    let cutoff: number;
    let since: string;
    let until: string;

    if (customDate) {
      // Custom single date - показываем данные за эти сутки
      const selectedDate = new Date(customDate);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      since = selectedDate.toISOString().split('T')[0];
      until = selectedDate.toISOString().split('T')[0];
      cutoff = selectedDate.getTime();
      
      console.log(`📅 Custom date selected: ${since} (single day)`);
    } else {
      // Preset range
    const now = Date.now();
    const daysBack = preset === '7d' ? 7 : preset === '14d' ? 14 : 30;
      cutoff = now - (daysBack * 24 * 60 * 60 * 1000);
      since = new Date(cutoff).toISOString().split('T')[0];
      until = new Date().toISOString().split('T')[0];
    }
    
    console.log(`📊 Fetching combined analytics (TRIPWIRE ONLY): ${since} to ${until}`);
    
    // 1. Fetch FB Ads spend - ONLY tripwire campaigns
    const fbPromises = Object.entries(AD_ACCOUNTS).map(async ([teamName, config]) => {
      try {
        // Fetch ALL campaigns from account
        const campaignResponse = await axios.get(`${FB_BASE_URL}/${config.id}/campaigns`, {
          params: {
            access_token: FB_ACCESS_TOKEN,
            fields: 'id,name,status',
            limit: 200,
          },
          timeout: 15000,
        });
        
        const allCampaigns = campaignResponse.data.data || [];
        
        // 🎯 FILTER: Only campaigns matching team patterns
        const teamCampaigns = allCampaigns.filter((c: any) => {
          const name = c.name.toLowerCase();
          return config.campaignPatterns.some(pattern => name.includes(pattern.toLowerCase()));
        });
        
        console.log(`🎯 ${teamName}: Found ${teamCampaigns.length} matching campaigns (patterns: ${config.campaignPatterns.join(', ')})`);
        
        if (teamCampaigns.length > 0) {
          console.log(`   └─ Campaigns: ${teamCampaigns.map((c: any) => c.name).join(', ')}`);
        }
        
        if (teamCampaigns.length === 0) {
          return { 
            team: teamName, 
            spend: 0, 
            impressions: 0, 
            clicks: 0, 
            ctr: 0,
            campaigns: [],
          };
        }
        
        // Fetch insights for each matching campaign
        const campaignInsights = await Promise.all(
          teamCampaigns.map(async (campaign: any) => {
            try {
              const insightResponse = await axios.get(`${FB_BASE_URL}/${campaign.id}/insights`, {
                params: {
                  access_token: FB_ACCESS_TOKEN,
                  time_range: JSON.stringify({ since, until }),
                  fields: 'campaign_name,spend,impressions,clicks,reach,frequency,cpc,cpm,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_avg_time_watched_actions,video_thruplay_watched_actions',
                  level: 'campaign',
                },
                timeout: 15000,
              });
              const data = insightResponse.data.data[0] || {};
              
              // Extract leads and purchases from actions
              const actions = data.actions || [];
              const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0;
              const purchases = actions.find((a: any) => 
                a.action_type === 'purchase' || 
                a.action_type === 'omni_purchase'
              )?.value || 0;
              
              // 🎬 Extract video engagement metrics
              const getVideoMetric = (arr: any[] | undefined) => {
                if (!arr || !Array.isArray(arr)) return 0;
                return arr.reduce((sum, a) => sum + parseInt(a.value || '0'), 0);
              };
              
              const videoPlays = getVideoMetric(data.video_play_actions);
              const video25 = getVideoMetric(data.video_p25_watched_actions);
              const video50 = getVideoMetric(data.video_p50_watched_actions);
              const video75 = getVideoMetric(data.video_p75_watched_actions);
              const video100 = getVideoMetric(data.video_p100_watched_actions);
              const videoThruplay = getVideoMetric(data.video_thruplay_watched_actions);
              
              // Avg watch time (in seconds)
              const avgWatchTimeArr = data.video_avg_time_watched_actions || [];
              const avgWatchTime = avgWatchTimeArr.length > 0 
                ? avgWatchTimeArr.reduce((sum: number, a: any) => sum + parseFloat(a.value || '0'), 0) / avgWatchTimeArr.length
                : 0;
              
              return {
                campaignId: campaign.id,
                campaignName: campaign.name,
                spend: parseFloat(data.spend || '0'),
                impressions: parseInt(data.impressions || '0'),
                clicks: parseInt(data.clicks || '0'),
                reach: parseInt(data.reach || '0'),
                frequency: parseFloat(data.frequency || '0'),
                cpc: parseFloat(data.cpc || '0'),
                cpm: parseFloat(data.cpm || '0'),
                leads: parseInt(leads),
                purchases: parseInt(purchases),
                // 🎬 Video metrics
                videoPlays,
                video25,
                video50,
                video75,
                video100,
                videoThruplay,
                avgWatchTime,
              };
            } catch (err) {
              console.error(`❌ Error fetching insights for campaign ${campaign.name}`);
              return null;
            }
          })
        );
        
        const valid = campaignInsights.filter(i => i !== null);
        const totals = valid.reduce((acc, i) => ({
          spend: acc.spend + i!.spend,
          impressions: acc.impressions + i!.impressions,
          clicks: acc.clicks + i!.clicks,
          reach: acc.reach + i!.reach,
          leads: acc.leads + i!.leads,
          purchases: acc.purchases + i!.purchases,
          // 🎬 Video aggregation
          videoPlays: acc.videoPlays + (i!.videoPlays || 0),
          video25: acc.video25 + (i!.video25 || 0),
          video50: acc.video50 + (i!.video50 || 0),
          video75: acc.video75 + (i!.video75 || 0),
          video100: acc.video100 + (i!.video100 || 0),
          videoThruplay: acc.videoThruplay + (i!.videoThruplay || 0),
          totalAvgWatchTime: acc.totalAvgWatchTime + (i!.avgWatchTime || 0),
        }), { spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0, purchases: 0, videoPlays: 0, video25: 0, video50: 0, video75: 0, video100: 0, videoThruplay: 0, totalAvgWatchTime: 0 });
        
        // 🎬 Video engagement calculations
        const videoCompletionRate = totals.videoPlays > 0 ? (totals.video100 / totals.videoPlays) * 100 : 0;
        const videoThruplayRate = totals.videoPlays > 0 ? (totals.videoThruplay / totals.videoPlays) * 100 : 0;
        const avgWatchTime = valid.length > 0 ? totals.totalAvgWatchTime / valid.length : 0;
        
        // 🏆 Fetch AD-LEVEL insights for top video creatives
        let topVideoCreatives: any[] = [];
        try {
          // Get all ads from matching campaigns
          const campaignIds = teamCampaigns.map((c: any) => c.id);
          
          if (campaignIds.length > 0) {
            const adsResponse = await axios.get(`${FB_BASE_URL}/${config.id}/ads`, {
              params: {
                access_token: FB_ACCESS_TOKEN,
                fields: 'id,name,creative{id,name,thumbnail_url}',
                filtering: JSON.stringify([{
                  field: 'campaign.id',
                  operator: 'IN',
                  value: campaignIds,
                }]),
                limit: 50,
              },
              timeout: 15000,
            });
            
            const ads = adsResponse.data.data || [];
            
            // Fetch video metrics for each ad
            const adInsights = await Promise.all(
              ads.slice(0, 20).map(async (ad: any) => {
                try {
                  const insightRes = await axios.get(`${FB_BASE_URL}/${ad.id}/insights`, {
                    params: {
                      access_token: FB_ACCESS_TOKEN,
                      time_range: JSON.stringify({ since, until }),
                      fields: 'ad_name,video_play_actions,video_p100_watched_actions,video_thruplay_watched_actions,video_avg_time_watched_actions,impressions,clicks',
                    },
                    timeout: 10000,
                  });
                  
                  const data = insightRes.data.data[0] || {};
                  
                  const getVideoVal = (arr: any[]) => arr?.reduce((s, a) => s + parseInt(a.value || '0'), 0) || 0;
                  const getAvgTime = (arr: any[]) => arr?.length > 0 ? arr.reduce((s, a) => s + parseFloat(a.value || '0'), 0) / arr.length : 0;
                  
                  return {
                    adId: ad.id,
                    name: ad.name || data.ad_name,
                    creativeName: ad.creative?.name || ad.name,
                    thumbnail: ad.creative?.thumbnail_url,
                    videoPlays: getVideoVal(data.video_play_actions),
                    completions: getVideoVal(data.video_p100_watched_actions),
                    thruplay: getVideoVal(data.video_thruplay_watched_actions),
                    avgWatchTime: getAvgTime(data.video_avg_time_watched_actions),
                    impressions: parseInt(data.impressions || '0'),
                    clicks: parseInt(data.clicks || '0'),
                  };
                } catch {
                  return null;
                }
              })
            );
            
            // Filter and sort by video completions
            topVideoCreatives = adInsights
              .filter(a => a && a.videoPlays > 0)
              .sort((a, b) => (b?.completions || 0) - (a?.completions || 0))
              .slice(0, 3)
              .map(a => ({
                name: a!.name,
                creativeName: a!.creativeName,
                thumbnail: a!.thumbnail,
                plays: a!.videoPlays,
                thruplay: a!.thruplay,
                completions: a!.completions,
                completionRate: a!.videoPlays > 0 ? ((a!.completions / a!.videoPlays) * 100).toFixed(1) + '%' : '0%',
                thruplayRate: a!.videoPlays > 0 ? ((a!.thruplay / a!.videoPlays) * 100).toFixed(1) + '%' : '0%',
                avgWatchTime: a!.avgWatchTime?.toFixed(1) + 's',
                ctr: a!.impressions > 0 ? ((a!.clicks / a!.impressions) * 100).toFixed(2) + '%' : '0%',
              }));
            
            console.log(`🏆 ${teamName}: Top ${topVideoCreatives.length} video creatives found`);
          }
        } catch (err: any) {
          console.error(`⚠️ ${teamName}: Could not fetch ad-level video metrics:`, err.message);
        }
        
        return {
          team: teamName,
          spend: totals.spend,
          impressions: totals.impressions,
          clicks: totals.clicks,
          reach: totals.reach,
          leads: totals.leads,
          fbPurchases: totals.purchases,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          // 🎬 Video engagement
          videoMetrics: {
            plays: totals.videoPlays,
            thruplay: totals.videoThruplay,
            completions: totals.video100,
            completionRate: videoCompletionRate,
            thruplayRate: videoThruplayRate,
            avgWatchTime: avgWatchTime,
            retention: {
              '25%': totals.video25,
              '50%': totals.video50,
              '75%': totals.video75,
              '100%': totals.video100,
            },
          },
          topVideoCreatives,
          campaigns: valid.map(c => ({
            name: c!.campaignName,
            spend: c!.spend,
            clicks: c!.clicks,
            impressions: c!.impressions,
            videoPlays: c!.videoPlays || 0,
            videoCompletions: c!.video100 || 0,
          })),
        };
      } catch (error: any) {
        console.error(`❌ FB Ads error for ${teamName}:`, error.message);
        return { team: teamName, spend: 0, impressions: 0, clicks: 0, ctr: 0, campaigns: [] };
      }
    });
    
    const fbResults = await Promise.all(fbPromises);
    
    // 2. Fetch AmoCRM sales (from existing endpoint logic)
    const paidLeads = await getAllPaidLeads();
    const processedLeads = paidLeads.map(lead => {
      const utmData = extractUTMFromLead(lead);
      const trafficTeam = identifyTrafficTeam(utmData);
      return {
        ...utmData,
        traffic_team: trafficTeam,
        closed_at: lead.closed_at,
      };
    });
    
    // 🔍 ДИАГНОСТИКА: Логируем распределение по командам
    console.log(`\n🔍 === ДИАГНОСТИКА AMOCRM LEADS ===`);
    console.log(`📊 Всего платных лидов: ${paidLeads.length}`);
    console.log(`📅 Период: ${since} → ${until}`);
    
    // Group by team
    const amocrmStats: Record<string, { sales: number; revenue: number }> = {};
    let unknownLeadsCount = 0;
    let outsideDateRangeCount = 0;
    const unknownLeadsExamples: any[] = []; // 🔍 Примеры Unknown лидов
    
    for (const lead of processedLeads) {
      const closedTime = lead.closed_at ? lead.closed_at * 1000 : 0;
      
      // Для custom date - проверяем что сделка закрыта именно в этот день
      if (customDate) {
        const leadDate = new Date(closedTime).toISOString().split('T')[0];
        if (leadDate !== customDate) {
          outsideDateRangeCount++;
          continue;
        }
      } else {
        // Для preset - проверяем что сделка в диапазоне
        if (closedTime < cutoff) {
          outsideDateRangeCount++;
          continue;
        }
      }
      
      const team = lead.traffic_team;
      
      // 🔍 Считаем Unknown лиды и сохраняем примеры
      if (team === 'Unknown' || team === 'Другие' || !team) {
        unknownLeadsCount++;
        if (unknownLeadsExamples.length < 5) { // Сохраняем первые 5 примеров
          unknownLeadsExamples.push({
            utm_source: lead.utm_source || 'NULL',
            utm_medium: lead.utm_medium || 'NULL',
            utm_campaign: lead.utm_campaign || 'NULL',
            closed_date: new Date(closedTime).toISOString().split('T')[0],
          });
        }
      }
      
      if (!amocrmStats[team]) {
        amocrmStats[team] = { sales: 0, revenue: 0 };
      }
      amocrmStats[team].sales++;
      amocrmStats[team].revenue += 5000; // 5000₸ per sale
    }
    
    // 🔍 Выводим статистику по командам
    console.log(`\n📊 Распределение продаж по командам:`);
    Object.entries(amocrmStats)
      .sort(([, a], [, b]) => b.sales - a.sales)
      .forEach(([team, stats]) => {
        console.log(`   ${team}: ${stats.sales} продаж, ${stats.revenue.toLocaleString()}₸`);
      });
    console.log(`\n⚠️ Unknown/Другие лиды: ${unknownLeadsCount}`);
    
    if (unknownLeadsExamples.length > 0) {
      console.log(`\n🔍 Примеры Unknown лидов (UTM метки):`);
      unknownLeadsExamples.forEach((example, i) => {
        console.log(`   ${i + 1}. source: "${example.utm_source}" | medium: "${example.utm_medium}" | campaign: "${example.utm_campaign}" | date: ${example.closed_date}`);
      });
    }
    
    console.log(`\n⏰ За пределами диапазона: ${outsideDateRangeCount}`);
    console.log(`✅ В диапазоне: ${processedLeads.length - outsideDateRangeCount}`);
    console.log(`🔍 === КОНЕЦ ДИАГНОСТИКИ ===\n`);
    
    // 3. Combine data
    // 💱 Получаем курс для корректного ROAS
    const usdToKztRate = await getUSDtoKZTRate();
    
    const combined = fbResults.map(fb => {
      // Match team names
      let amocrmTeam = amocrmStats[fb.team] || amocrmStats[fb.team.toLowerCase()];
      
      // Try matching by UTM pattern
      if (!amocrmTeam) {
        const config = AD_ACCOUNTS[fb.team as keyof typeof AD_ACCOUNTS];
        if (config) {
          amocrmTeam = Object.entries(amocrmStats).find(([key]) => 
            key.toLowerCase().includes(config.utmPattern.toLowerCase())
          )?.[1];
        }
      }
      
      const sales = amocrmTeam?.sales || 0;
      const revenueKZT = amocrmTeam?.revenue || 0; // Revenue в KZT
      const spendKZT = fb.spend * usdToKztRate; // Конвертируем spend в KZT
      
      // 🎯 ПРАВИЛЬНЫЙ ROAS: Revenue(KZT) / Spend(KZT)
      const roas = spendKZT > 0 ? revenueKZT / spendKZT : 0;
      
      // CPA остаётся в USD (Spend USD / Sales)
      const cpa = sales > 0 ? fb.spend / sales : 0;
      
      return {
        team: fb.team,
        spend: fb.spend, // USD
        spendKZT, // KZT (для отображения)
        revenue: revenueKZT, // KZT
        roas,
        sales,
        cpa,
        impressions: fb.impressions,
        clicks: fb.clicks,
        ctr: fb.ctr,
        reach: fb.reach || 0,
        leads: fb.leads || 0,
        fbPurchases: fb.fbPurchases || 0,
        // 🎬 Video engagement metrics
        videoMetrics: fb.videoMetrics || null,
        topVideoCreatives: fb.topVideoCreatives || [],
        campaigns: fb.campaigns || [],
      };
    });
    
    // Sort by ROAS
    combined.sort((a, b) => b.roas - a.roas);
    
    // Calculate totals
    const totals = combined.reduce((acc, t) => ({
      spend: acc.spend + t.spend,
      spendKZT: acc.spendKZT + (t.spendKZT || 0),
      revenue: acc.revenue + t.revenue,
      sales: acc.sales + t.sales,
      impressions: acc.impressions + t.impressions,
      clicks: acc.clicks + t.clicks,
    }), { spend: 0, spendKZT: 0, revenue: 0, sales: 0, impressions: 0, clicks: 0 });
    
    // 🎯 ПРАВИЛЬНЫЙ расчёт total ROAS
    const totalRoas = totals.spendKZT > 0 ? totals.revenue / totals.spendKZT : 0;
    const totalCpa = totals.sales > 0 ? totals.spend / totals.sales : 0;
    const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    
    // 🏷️ ТОП UTM МЕТОК ПО ПРОДАЖАМ (из AmoCRM)
    const utmSalesMap: Record<string, { campaign: string; sales: number; revenue: number; team: string }> = {};
    for (const lead of processedLeads) {
      const closedTime = lead.closed_at ? lead.closed_at * 1000 : 0;
      
      // Для custom date - проверяем что сделка закрыта именно в этот день
      if (customDate) {
        const leadDate = new Date(closedTime).toISOString().split('T')[0];
        if (leadDate !== customDate) continue;
      } else {
        // Для preset - проверяем что сделка в диапазоне
        if (closedTime < cutoff) continue;
      }
      
      const campaign = lead.utm_campaign || lead.utm_content || 'unknown';
      if (campaign === 'unknown') continue;
      
      if (!utmSalesMap[campaign]) {
        utmSalesMap[campaign] = {
          campaign,
          sales: 0,
          revenue: 0,
          team: lead.traffic_team,
        };
      }
      utmSalesMap[campaign].sales++;
      utmSalesMap[campaign].revenue += 5000;
    }
    
    const topUtmBySales = Object.values(utmSalesMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));
    
    // 📈 ТОП КАМПАНИЙ ПО CTR (из Facebook Ads)
    const allCampaigns: { name: string; team: string; ctr: number; clicks: number; impressions: number; spend: number }[] = [];
    for (const fb of fbResults) {
      if (fb.campaigns && Array.isArray(fb.campaigns)) {
        for (const camp of fb.campaigns) {
          if (camp.impressions > 100) { // Минимум 100 показов
            allCampaigns.push({
              name: camp.name,
              team: fb.team,
              ctr: camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0,
              clicks: camp.clicks,
              impressions: camp.impressions,
              spend: camp.spend,
            });
          }
        }
      }
    }
    
    const topCampaignsByCtr = allCampaigns
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 10)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
        ctr: Number(item.ctr.toFixed(2)),
      }));
    
    // 🎬 ТОП КАМПАНИЙ ПО ВОВЛЕЧЁННОСТИ ВИДЕО
    const videoCampaigns: { name: string; team: string; plays: number; completions: number; completionRate: number; spend: number }[] = [];
    for (const fb of fbResults) {
      if (fb.campaigns && Array.isArray(fb.campaigns)) {
        for (const camp of fb.campaigns) {
          if (camp.videoPlays > 0) {
            videoCampaigns.push({
              name: camp.name,
              team: fb.team,
              plays: camp.videoPlays || 0,
              completions: camp.videoCompletions || 0,
              completionRate: camp.videoPlays > 0 ? (camp.videoCompletions / camp.videoPlays) * 100 : 0,
              spend: camp.spend,
            });
          }
        }
      }
    }
    
    const topCampaignsByVideo = videoCampaigns
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
        completionRate: Number(item.completionRate.toFixed(1)),
      }));
    
    res.json({
      success: true,
      period: { since, until, preset },
      teams: combined,
      totals: {
        ...totals,
        roas: totalRoas,
        cpa: totalCpa,
        ctr: totalCtr,
      },
      // 🏷️ ТОП UTM МЕТОК
      topUtmBySales,        // Топ по продажам (AmoCRM)
      topCampaignsByCtr,    // Топ по CTR (Facebook Ads)
      topCampaignsByVideo,  // Топ по видео (Facebook Ads)
      exchangeRate: {
        usdToKzt: usdToKztRate,
        updatedAt: cachedExchangeRate?.timestamp ? new Date(cachedExchangeRate.timestamp).toISOString() : new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    // 💾 АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ ОТЧЕТА В БД (если это запрос за конкретную дату)
    if (customDate) {
      try {
        await axios.post('http://localhost:3000/api/traffic/reports/save', {
          report_date: customDate,
          total_spend: totals.spend,
          total_revenue: totals.revenue,
          total_sales: totals.sales,
          total_roas: totalRoas,
          total_impressions: totals.impressions,
          total_clicks: totals.clicks,
          total_ctr: totalCtr,
          usd_to_kzt_rate: usdToKztRate,
          teams_data: combined.map((team: any) => ({
            team: team.team,
            spend: team.spend,
            revenue: team.revenue,
            sales: team.sales,
            roas: team.roas,
            cpa: team.cpa,
            ctr: team.ctr,
            impressions: team.impressions,
            clicks: team.clicks,
          })),
          top_utm_sales: topUtmBySales,
          top_campaigns_ctr: topCampaignsByCtr,
          top_campaigns_video: topCampaignsByVideo,
        });
        console.log(`💾 Отчет за ${customDate} сохранен в БД`);
      } catch (saveError) {
        console.error('⚠️ Не удалось сохранить отчет в БД:', saveError);
        // Не прерываем основной запрос если сохранение не удалось
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching combined analytics:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/traffic-stats/funnel/:teamId
 * Get sales funnel data for a team
 */
router.get('/funnel/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`[Funnel API] Fetching funnel data for team: ${teamId}`);
    
    // ENHANCEMENT: Implement getFacebookImpressions
    const impressions = await getFacebookImpressions(
      teamId, 
      startDate as string, 
      endDate as string
    );
    
    // Get registrations from AmoCRM by UTM
    const { data: registrations } = await supabase
      .from('amocrm_leads')
      .select('id')
      .ilike('custom_fields->>utm_source', `%${teamId}%`)
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    // Get express sales
    const { data: expressSales } = await supabase
      .from('amocrm_sales')
      .select('id')
      .eq('product_type', 'express')
      .ilike('custom_fields->>utm_source', `%${teamId}%`)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);
    
    // Get main course sales
    const { data: mainSales } = await supabase
      .from('amocrm_sales')
      .select('id')
      .eq('product_type', 'main_course')
      .ilike('custom_fields->>utm_source', `%${teamId}%`)
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);
    
    const regCount = registrations?.length || 0;
    const expressCount = expressSales?.length || 0;
    const mainCount = mainSales?.length || 0;
    
    // 💰 Get money data
    // Spent on ads
    const { data: adSpendData } = await supabase
      .from('traffic_stats')
      .select('spend_usd')
      .ilike('team_id', `%${teamId}%`)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);
    
    const spentOnAds = adSpendData?.reduce((sum, row) => sum + (row.spend_usd || 0), 0) || 0;
    
    // Revenue from Express sales
    const revenueExpress = expressSales?.reduce((sum: number, sale: any) => sum + (parseFloat(sale.amount_usd) || 0), 0) || 0;
    
    // Revenue from Main course sales  
    const revenueMain = mainSales?.reduce((sum: number, sale: any) => sum + (parseFloat(sale.amount_usd) || 0), 0) || 0;
    
    const totalRevenue = revenueExpress + revenueMain;
    const roi = spentOnAds > 0 ? ((totalRevenue - spentOnAds) / spentOnAds) * 100 : 0;
    
    const funnelData = {
      impressions,
      registrations: regCount,
      expressSales: expressCount,
      mainSales: mainCount,
      conversionRate1: impressions > 0 ? (regCount / impressions) * 100 : 0,
      conversionRate2: regCount > 0 ? (expressCount / regCount) * 100 : 0,
      conversionRate3: expressCount > 0 ? (mainCount / expressCount) * 100 : 0,
      // 💰 Money data
      spent_on_ads: spentOnAds,
      revenue_express: revenueExpress,
      revenue_main: revenueMain,
      total_revenue: totalRevenue,
      total_spent: spentOnAds,
      roi: roi
    };
    
    console.log(`[Funnel API] ✅ Data with money:`, funnelData);
    res.json(funnelData);
    
  } catch (error: any) {
    console.error('❌ Funnel API error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Facebook impressions for a team
 * ENHANCEMENT: Implementation with fallback options
 */
async function getFacebookImpressions(
  teamId: string, 
  startDate: string, 
  endDate: string
): Promise<number> {
  try {
    // Option 1: From traffic_stats table (if FB data already synced)
    const { data } = await supabase
      .from('traffic_stats')
      .select('impressions')
      .eq('team_id', teamId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);
    
    if (data && data.length > 0) {
      const total = data.reduce((sum, row) => sum + (row.impressions || 0), 0);
      console.log(`[Impressions] From traffic_stats: ${total}`);
      return total;
    }
    
    // Option 2: Fetch directly from Facebook Ads API
    console.log(`[Impressions] No data in traffic_stats, fetching from Facebook API...`);
    
    const teamConfig = AD_ACCOUNTS[teamId as keyof typeof AD_ACCOUNTS];
    if (!teamConfig) {
      console.warn(`[Impressions] No FB account config for team: ${teamId}`);
      return 0;
    }
    
    const response = await axios.get(
      `${FB_BASE_URL}/${teamConfig.id}/insights`,
      {
        params: {
          access_token: FB_ACCESS_TOKEN,
          fields: 'impressions',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          })
        },
        timeout: 10000
      }
    );
    
    const impressions = response.data?.data?.[0]?.impressions || 0;
    console.log(`[Impressions] From Facebook API: ${impressions}`);
    return impressions;
    
  } catch (error: any) {
    console.error(`[Impressions] Error:`, error.message);
    return 0; // Fallback
  }
}

export default router;
