import { Router, Request, Response } from 'express';
import axios from 'axios';
import { generateTeamRecommendations, getLatestRecommendations } from '../services/trafficRecommendations.js';
import { facebookRequestManager } from '../services/circuit-breaker';

const router = Router();

// Facebook Graph API configuration
const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const FB_ACCESS_TOKEN = process.env.FACEBOOK_ADS_TOKEN || 'EAAPVZCSfHj0YBQGxLZAdo9TK0m0Wuj3czwTmXXfEmvUNfwLWMaypNgn4rZBFjsT8w049mzXYBZAGhVkb9Qc7nNXLCpIPMu2NuDfQNEjM3rHXyeSOvSQ2vjhdRppKykbjhLATTRHYFxvPRWEZAg0wnXqXuzRB0BEuZCBELO0yZCPNPpQtiZBijR1c3ZC3p51C8Qb0u';

// Ad accounts mapping
const AD_ACCOUNTS = {
  'Kenesary': { id: 'act_964264512447589', team: 'nutrients_kz', color: '#3b82f6' },
  'Arystan': { id: 'act_666059476005255', team: 'arystan_3_1', color: '#8b5cf6' },
  'Muha': { id: 'act_839340528712304', team: 'muha_acc3', color: '#eab308' },
  'Traf4': { id: 'act_30779210298344970', team: 'traf4_team', color: '#ef4444' },
};

interface FBInsights {
  spend: string;
  impressions: string;
  clicks: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
}

/**
 * Helper: Extract action value from Facebook actions array
 */
function getActionValue(actions: any[] | undefined, actionType: string = 'purchase'): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const action = actions.find(a => 
    a.action_type === actionType || 
    a.action_type === `offsite_conversion.fb_pixel_${actionType}` ||
    a.action_type === `omni_${actionType}`
  );
  
  return action ? parseFloat(action.value) : 0;
}

/**
 * Helper: Get date range based on preset
 */
function getDateRange(preset: string): { since: string; until: string } {
  const today = new Date();
  const until = today.toISOString().split('T')[0];
  
  let since: Date;
  switch (preset) {
    case '7d':
      since = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '14d':
      since = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return {
    since: since.toISOString().split('T')[0],
    until,
  };
}

/**
 * GET /api/facebook-ads/insights
 * Fetch insights from all ad accounts with UTM filtering
 */
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const preset = (req.query.preset as string) || '30d';
    const { since, until } = getDateRange(preset);
    
    console.log(`📊 Fetching Facebook Ads insights with UTM filtering: ${since} to ${until}`);
    
    const results = await Promise.all(
      Object.entries(AD_ACCOUNTS).map(async ([teamName, config]) => {
        try {
          // 🎯 Fetch campaigns with UTM filtering
          // Look for campaigns that contain team identifier in name
          const campaignResponse = await facebookRequestManager.execute(async () =>
            axios.get(`${FB_BASE_URL}/${config.id}/campaigns`, {
              params: {
                access_token: FB_ACCESS_TOKEN,
                fields: 'id,name,status',
                limit: 100,
              },
              timeout: 15000,
            })
          );
          
          const campaigns = campaignResponse.data.data || [];
          
          // Filter campaigns by team name patterns
          const teamPatterns = [
            teamName.toLowerCase(),
            config.team.toLowerCase(),
            teamName.toLowerCase().replace(/\s+/g, '_'),
          ];
          
          const relevantCampaigns = campaigns.filter((c: any) => {
            const name = c.name.toLowerCase();
            return teamPatterns.some(pattern => name.includes(pattern)) || 
                   name.includes('proftest') || 
                   name.includes('tripwire');
          });
          
          console.log(`🎯 ${teamName}: Found ${relevantCampaigns.length} relevant campaigns out of ${campaigns.length}`);
          
          if (relevantCampaigns.length === 0) {
            console.warn(`⚠️ No campaigns found for ${teamName}`);
            return {
              team: teamName,
              accountId: config.id,
              teamSlug: config.team,
              color: config.color,
              period: `${since} - ${until}`,
              spend: 0,
              revenue: 0,
              roas: 0,
              purchases: 0,
              cpa: 0,
              impressions: 0,
              clicks: 0,
              ctr: 0,
              campaigns: [],
            };
          }
          
          // Fetch insights for relevant campaigns
          const campaignInsights = await Promise.all(
            relevantCampaigns.map(async (campaign: any) => {
              try {
                const insightResponse = await facebookRequestManager.execute(async () =>
                  axios.get(`${FB_BASE_URL}/${campaign.id}/insights`, {
                    params: {
                      access_token: FB_ACCESS_TOKEN,
                      time_range: JSON.stringify({ since, until }),
                      fields: 'campaign_name,spend,impressions,clicks,actions,action_values',
                      level: 'campaign',
                    },
                    timeout: 15000,
                  })
                );
                
                const insights = insightResponse.data.data[0] || {};
                
                return {
                  campaignId: campaign.id,
                  campaignName: campaign.name,
                  spend: parseFloat(insights.spend || '0'),
                  impressions: parseInt(insights.impressions || '0'),
                  clicks: parseInt(insights.clicks || '0'),
                  purchases: getActionValue(insights.actions, 'purchase'),
                  revenue: getActionValue(insights.action_values, 'purchase'),
                };
              } catch (err) {
                console.error(`❌ Error fetching insights for campaign ${campaign.name}:`, err);
                return null;
              }
            })
          );
          
          // Aggregate metrics from all campaigns
          const validInsights = campaignInsights.filter(i => i !== null);
          
          const totals = validInsights.reduce((acc, insight) => ({
            spend: acc.spend + insight!.spend,
            impressions: acc.impressions + insight!.impressions,
            clicks: acc.clicks + insight!.clicks,
            purchases: acc.purchases + insight!.purchases,
            revenue: acc.revenue + insight!.revenue,
          }), { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 });
          
          const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
          const cpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0;
          const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
          
          return {
            team: teamName,
            accountId: config.id,
            teamSlug: config.team,
            color: config.color,
            period: `${since} - ${until}`,
            spend: totals.spend,
            revenue: totals.revenue,
            roas,
            purchases: totals.purchases,
            cpa,
            impressions: totals.impressions,
            clicks: totals.clicks,
            ctr,
            campaigns: validInsights.map(i => ({
              name: i!.campaignName,
              spend: i!.spend,
              revenue: i!.revenue,
              roas: i!.spend > 0 ? i!.revenue / i!.spend : 0,
            })),
          };
        } catch (error: any) {
          console.error(`❌ Error fetching insights for ${teamName}:`, error.message);
          return {
            team: teamName,
            accountId: config.id,
            teamSlug: config.team,
            color: config.color,
            period: `${since} - ${until}`,
            spend: 0,
            revenue: 0,
            roas: 0,
            purchases: 0,
            cpa: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            campaigns: [],
            error: error.message,
          };
        }
      })
    );
    
    // Calculate totals
    const totals = results.reduce((acc, r) => ({
      spend: acc.spend + r.spend,
      revenue: acc.revenue + r.revenue,
      purchases: acc.purchases + r.purchases,
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
    }), { spend: 0, revenue: 0, purchases: 0, impressions: 0, clicks: 0 });
    
    const totalRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const totalCpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0;
    const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    
    res.json({
      success: true,
      period: { since, until },
      teams: results,
      totals: {
        ...totals,
        roas: totalRoas,
        cpa: totalCpa,
        ctr: totalCtr,
      },
      updatedAt: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching Facebook Ads insights:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/facebook-ads/recommendations/:team
 * Get AI recommendations for a specific team
 */
router.get('/recommendations/:team', async (req: Request, res: Response) => {  try {
    const teamName = req.params.team;
    
    // Get latest recommendations from DB
    const recommendations = await getLatestRecommendations(teamName);
    
    if (!recommendations) {
      return res.json({
        success: true,
        team: teamName,
        recommendations: null,
        message: 'Рекомендации ещё не сгенерированы. Попробуйте позже.',
      });
    }
    
    res.json({
      success: true,
      team: teamName,
      recommendations,
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching recommendations:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/facebook-ads/recommendations/generate
 * Generate fresh AI recommendations for a team
 */
router.post('/recommendations/generate', async (req: Request, res: Response) => {
  try {
    const metrics = req.body;
    
    if (!metrics.team || typeof metrics.spend !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Invalid metrics data',
      });
    }
    
    const recommendations = await generateTeamRecommendations(metrics);
    
    res.json({
      success: true,
      team: metrics.team,
      recommendations,
    });
    
  } catch (error: any) {
    console.error('❌ Error generating recommendations:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
