import { Router, Request, Response } from 'express';
import axios from 'axios';
import { AMOCRM_CONFIG } from '../config/amocrm-config.js';

const router = Router();

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_TIMEOUT = 60000;

// Facebook Ads configuration
const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const FB_ACCESS_TOKEN = process.env.FACEBOOK_ADS_TOKEN || 'EAAPVZCSfHj0YBQGxLZAdo9TK0m0Wuj3czwTmXXfEmvUNfwLWMaypNgn4rZBFjsT8w049mzXYBZAGhVkb9Qc7nNXLCpIPMu2NuDfQNEjM3rHXyeSOvSQ2vjhdRppKykbjhLATTRHYFxvPRWEZAg0wnXqXuzRB0BEuZCBELO0yZCPNPpQtiZBijR1c3ZC3p51C8Qb0u';

const AD_ACCOUNTS = {
  'Kenesary': { id: 'act_964264512447589', team: 'nutrients_kz', utmPattern: 'kenji' },
  'Arystan': { id: 'act_666059476005255', team: 'arystan_3_1', utmPattern: 'arystan' },
  'Muha': { id: 'act_839340528712304', team: 'muha_acc3', utmPattern: 'yourmarketolog' },
  'Traf4': { id: 'act_30779210298344970', team: 'traf4_team', utmPattern: 'pb_agency' },
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
    emoji: '👨‍💼',
    color: '#3b82f6',
  },
  'Arystan': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.source?.toLowerCase().includes('arystan'),
    emoji: '⚡',
    color: '#8b5cf6',
  },
  'Muha': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.medium?.toLowerCase() === 'yourmarketolog',
    emoji: '🐝',
    color: '#eab308',
  },
  'Traf4': {
    match: (utm: { source?: string; medium?: string; campaign?: string }) => 
      utm.source?.toLowerCase().includes('pb_agency'),
    emoji: '🔴',
    color: '#ef4444',
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
 */
router.get('/combined-analytics', async (req: Request, res: Response) => {
  try {
    const preset = (req.query.preset as string) || '30d';
    
    // Get date range
    const now = Date.now();
    const daysBack = preset === '7d' ? 7 : preset === '14d' ? 14 : 30;
    const cutoff = now - (daysBack * 24 * 60 * 60 * 1000);
    const since = new Date(cutoff).toISOString().split('T')[0];
    const until = new Date().toISOString().split('T')[0];
    
    console.log(`📊 Fetching combined analytics: ${since} to ${until}`);
    
    // 1. Fetch FB Ads spend
    const fbPromises = Object.entries(AD_ACCOUNTS).map(async ([teamName, config]) => {
      try {
        const campaignResponse = await axios.get(`${FB_BASE_URL}/${config.id}/campaigns`, {
          params: {
            access_token: FB_ACCESS_TOKEN,
            fields: 'id,name,status',
            limit: 100,
          },
          timeout: 15000,
        });
        
        const campaigns = campaignResponse.data.data || [];
        const relevantCampaigns = campaigns.filter((c: any) => {
          const name = c.name.toLowerCase();
          return name.includes('proftest') || name.includes('tripwire') || name.includes(teamName.toLowerCase());
        });
        
        if (relevantCampaigns.length === 0) {
          return { team: teamName, spend: 0, impressions: 0, clicks: 0, ctr: 0 };
        }
        
        const insights = await Promise.all(
          relevantCampaigns.map(async (campaign: any) => {
            try {
              const insightResponse = await axios.get(`${FB_BASE_URL}/${campaign.id}/insights`, {
                params: {
                  access_token: FB_ACCESS_TOKEN,
                  time_range: JSON.stringify({ since, until }),
                  fields: 'spend,impressions,clicks',
                  level: 'campaign',
                },
                timeout: 15000,
              });
              const data = insightResponse.data.data[0] || {};
              return {
                spend: parseFloat(data.spend || '0'),
                impressions: parseInt(data.impressions || '0'),
                clicks: parseInt(data.clicks || '0'),
              };
            } catch (err) {
              return null;
            }
          })
        );
        
        const valid = insights.filter(i => i !== null);
        const totals = valid.reduce((acc, i) => ({
          spend: acc.spend + i!.spend,
          impressions: acc.impressions + i!.impressions,
          clicks: acc.clicks + i!.clicks,
        }), { spend: 0, impressions: 0, clicks: 0 });
        
        return {
          team: teamName,
          ...totals,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        };
      } catch (error: any) {
        console.error(`❌ FB Ads error for ${teamName}:`, error.message);
        return { team: teamName, spend: 0, impressions: 0, clicks: 0, ctr: 0 };
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
    
    // Group by team
    const amocrmStats: Record<string, { sales: number; revenue: number }> = {};
    
    for (const lead of processedLeads) {
      const closedTime = lead.closed_at ? lead.closed_at * 1000 : 0;
      if (closedTime < cutoff) continue;
      
      const team = lead.traffic_team;
      if (!amocrmStats[team]) {
        amocrmStats[team] = { sales: 0, revenue: 0 };
      }
      amocrmStats[team].sales++;
      amocrmStats[team].revenue += 5000; // 5000₸ per sale
    }
    
    // 3. Combine data
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
      const revenue = amocrmTeam?.revenue || 0;
      const roas = fb.spend > 0 ? revenue / fb.spend : 0;
      const cpa = sales > 0 ? fb.spend / sales : 0;
      
      return {
        team: fb.team,
        spend: fb.spend,
        revenue,
        roas,
        sales,
        cpa,
        impressions: fb.impressions,
        clicks: fb.clicks,
        ctr: fb.ctr,
      };
    });
    
    // Sort by ROAS
    combined.sort((a, b) => b.roas - a.roas);
    
    // Calculate totals
    const totals = combined.reduce((acc, t) => ({
      spend: acc.spend + t.spend,
      revenue: acc.revenue + t.revenue,
      sales: acc.sales + t.sales,
      impressions: acc.impressions + t.impressions,
      clicks: acc.clicks + t.clicks,
    }), { spend: 0, revenue: 0, sales: 0, impressions: 0, clicks: 0 });
    
    const totalRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const totalCpa = totals.sales > 0 ? totals.spend / totals.sales : 0;
    const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    
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
      updatedAt: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching combined analytics:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
