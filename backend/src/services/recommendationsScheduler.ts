import cron from 'node-cron';
import axios from 'axios';
import { generateDailyRecommendations } from './trafficRecommendations.js';

const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const FB_ACCESS_TOKEN = process.env.FACEBOOK_ADS_TOKEN || 'EAAPVZCSfHj0YBQGxLZAdo9TK0m0Wuj3czwTmXXfEmvUNfwLWMaypNgn4rZBFjsT8w049mzXYBZAGhVkb9Qc7nNXLCpIPMu2NuDfQNEjM3rHXyeSOvSQ2vjhdRppKykbjhLATTRHYFxvPRWEZAg0wnXqXuzRB0BEuZCBELO0yZCPNPpQtiZBijR1c3ZC3p51C8Qb0u';

const AD_ACCOUNTS = {
  'Kenesary': { id: 'act_964264512447589', team: 'nutrients_kz' },
  'Arystan': { id: 'act_666059476005255', team: 'arystan_3_1' },
  'Muha': { id: 'act_839340528712304', team: 'muha_acc3' },
  'Traf4': { id: 'act_30779210298344970', team: 'traf4_team' },
};

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
 * Fetch metrics for all teams (last 7 days)
 */
async function fetchTeamsMetrics() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const since = weekAgo.toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];
  
  console.log(`📊 Fetching metrics for recommendations: ${since} to ${until}`);
  
  const results = await Promise.all(
    Object.entries(AD_ACCOUNTS).map(async ([teamName, config]) => {
      try {
        const response = await axios.get(`${FB_BASE_URL}/${config.id}/insights`, {
          params: {
            access_token: FB_ACCESS_TOKEN,
            time_range: JSON.stringify({ since, until }),
            fields: 'spend,impressions,clicks,actions,action_values',
            level: 'account',
          },
          timeout: 15000,
        });
        
        const insights = response.data.data[0] || {};
        
        const spend = parseFloat(insights.spend || '0');
        const impressions = parseInt(insights.impressions || '0');
        const clicks = parseInt(insights.clicks || '0');
        const purchases = getActionValue(insights.actions, 'purchase');
        const revenue = getActionValue(insights.action_values, 'purchase');
        const roas = spend > 0 ? revenue / spend : 0;
        const cpa = purchases > 0 ? spend / purchases : 0;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        
        return {
          team: teamName,
          spend,
          revenue,
          roas,
          purchases,
          cpa,
          ctr,
          impressions,
          clicks,
        };
      } catch (error: any) {
        console.error(`❌ Error fetching metrics for ${teamName}:`, error.message);
        return null;
      }
    })
  );
  
  return results.filter(r => r !== null);
}

/**
 * Daily cron job: Generate AI recommendations at 00:10
 */
export function startRecommendationsScheduler() {
  // Run at 00:10 every day (Almaty timezone UTC+5)
  // Cron format: minute hour day month weekday
  const cronSchedule = '10 0 * * *'; // Every day at 00:10
  
  console.log('🤖 [Recommendations Scheduler] Starting...');
  console.log('📅 Schedule: Daily at 00:10 AM (Almaty time)');
  
  cron.schedule(cronSchedule, async () => {
    try {
      console.log('🤖 [Recommendations Scheduler] Running daily recommendations generation...');
      
      // Fetch latest metrics from Facebook Ads
      const metrics = await fetchTeamsMetrics();
      
      if (metrics.length === 0) {
        console.error('❌ No metrics fetched. Skipping recommendations generation.');
        return;
      }
      
      // Generate recommendations using Groq AI
      await generateDailyRecommendations(metrics as any);
      
      console.log('✅ [Recommendations Scheduler] Daily recommendations generated successfully');
    } catch (error: any) {
      console.error('❌ [Recommendations Scheduler] Error:', error.message);
    }
  }, {
    timezone: 'Asia/Almaty', // UTC+5
  });
  
  console.log('✅ [Recommendations Scheduler] Started successfully');
}
