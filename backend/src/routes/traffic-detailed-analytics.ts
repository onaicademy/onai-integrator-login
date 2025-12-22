/**
 * Traffic Detailed Analytics API
 * 
 * Детальная аналитика по кампаниям, группам объявлений и объявлениям
 * Берет данные из наших кабинетов Facebook Ads напрямую
 * + AI анализ через GROQ API (llama-3.1-70b-versatile)
 * + 🎯 Comprehensive Analytics Engine (FIX #3)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { analyticsEngine } from '../services/analyticsEngine.js';
import { analyticsEngine } from '../services/analyticsEngine.js';

// Rate limiting для GROQ API
const groqRequestTimestamps: number[] = [];
const MAX_GROQ_REQUESTS_PER_MINUTE = 10;

const router = Router();

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// Helper to get Supabase client (lazy initialization)
function getSupabaseClient() {
  return createClient(
    process.env.TRIPWIRE_SUPABASE_URL || '',
    process.env.TRIPWIRE_SERVICE_ROLE_KEY || ''
  );
}

/**
 * GET /api/traffic-detailed-analytics
 * Получить все кампании для команды из их FB кабинета
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { team, dateRange = '7d', status = 'all' } = req.query;
    
    if (!team) {
      return res.status(400).json({
        success: false,
        error: 'team parameter is required'
      });
    }
    
    // Получаем FB Ad Account ID из БД traffic_teams
    const supabase = getSupabaseClient();
    
    const { data: teamData, error: teamError } = await supabase
      .from('traffic_teams')
      .select('fb_ad_account_id')
      .eq('name', team)
      .single();
    
    if (teamError || !teamData || !teamData.fb_ad_account_id) {
      // Возвращаем пустой массив вместо ошибки
      return res.json({
        success: true,
        campaigns: []
      });
    }
    
    const adAccountId = teamData.fb_ad_account_id;
    
    // Получаем токен доступа
    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        campaigns: []
      });
    }
    
    // Calculate date range
    const since = getDateRange(dateRange as string);
    
    // Fetch campaigns из кабинета команды (basic data only)
    const campaignsResponse = await axios.get(
      `${FB_API_BASE}/act_${adAccountId}/campaigns`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective',
          date_preset: dateRange === '14d' ? 'last_14d' : dateRange === '30d' ? 'last_30d' : dateRange === '90d' ? 'last_90d' : 'last_7d',
          limit: 100
        }
      }
    );
    
    const campaigns = (campaignsResponse.data.data || []).map((campaign: any) => {
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        spend: 0, // TODO: Get from insights
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        conversions: 0,
        revenue: 0,
        roas: 0
      };
    });
    
    // Filter by status if needed
    const filteredCampaigns = status === 'all' 
      ? campaigns 
      : campaigns.filter((c: any) => c.status.toLowerCase() === status);
    
    res.json({
      success: true,
      campaigns: filteredCampaigns
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch campaigns:', error.response?.data || error.message);
    res.json({
      success: true,
      campaigns: []
    });
  }
});

/**
 * GET /api/traffic-detailed-analytics/campaign/:campaignId/adsets
 * Получить группы объявлений для кампании
 */
router.get('/campaign/:campaignId/adsets', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { dateRange = '7d' } = req.query;
    
    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        adsets: []
      });
    }
    
    const since = getDateRange(dateRange as string);
    
    // Fetch ad sets
    const adsetsResponse = await axios.get(
      `${FB_API_BASE}/${campaignId}/adsets`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,insights.time_range({"since":"' + since + '","until":"today"}){spend,impressions,clicks,ctr,cpc,actions}',
          limit: 100
        }
      }
    );
    
    const adsets = (adsetsResponse.data.data || []).map((adset: any) => {
      const insights = adset.insights?.data?.[0] || {};
      const conversions = extractConversions(insights.actions);
      
      return {
        id: adset.id,
        campaign_id: campaignId,
        name: adset.name,
        status: adset.status,
        spend: parseFloat(insights.spend || 0),
        impressions: parseInt(insights.impressions || 0),
        clicks: parseInt(insights.clicks || 0),
        ctr: parseFloat(insights.ctr || 0),
        cpc: parseFloat(insights.cpc || 0),
        conversions
      };
    });
    
    res.json({
      success: true,
      adsets
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch adsets:', error.response?.data || error.message);
    res.json({
      success: true,
      adsets: []
    });
  }
});

/**
 * GET /api/traffic-detailed-analytics/adset/:adsetId/ads
 * Получить объявления для группы
 */
router.get('/adset/:adsetId/ads', async (req: Request, res: Response) => {
  try {
    const { adsetId } = req.params;
    const { dateRange = '7d' } = req.query;
    
    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        ads: []
      });
    }
    
    const since = getDateRange(dateRange as string);
    
    // Fetch ads
    const adsResponse = await axios.get(
      `${FB_API_BASE}/${adsetId}/ads`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,insights.time_range({"since":"' + since + '","until":"today"}){spend,impressions,clicks,ctr,cpc,actions}',
          limit: 100
        }
      }
    );
    
    const ads = (adsResponse.data.data || []).map((ad: any) => {
      const insights = ad.insights?.data?.[0] || {};
      const conversions = extractConversions(insights.actions);
      
      return {
        id: ad.id,
        adset_id: adsetId,
        name: ad.name,
        status: ad.status,
        spend: parseFloat(insights.spend || 0),
        impressions: parseInt(insights.impressions || 0),
        clicks: parseInt(insights.clicks || 0),
        ctr: parseFloat(insights.ctr || 0),
        cpc: parseFloat(insights.cpc || 0),
        conversions
      };
    });
    
    res.json({
      success: true,
      ads
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch ads:', error.response?.data || error.message);
    res.json({
      success: true,
      ads: []
    });
  }
});

// Helper functions

function getDateRange(range: string): string {
  const now = new Date();
  let daysAgo = 7;
  
  switch (range) {
    case '14d': daysAgo = 14; break;
    case '30d': daysAgo = 30; break;
    case '90d': daysAgo = 90; break;
    default: daysAgo = 7;
  }
  
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  // ✅ Format as YYYY-MM-DD in UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractConversions(actions: any[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const conversionAction = actions.find(
    (a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
  );
  
  return conversionAction ? parseInt(conversionAction.value) : 0;
}

function extractRevenue(actions: any[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const revenueAction = actions.find(
    (a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase' && a.value
  );
  
  return revenueAction ? parseFloat(revenueAction.value) : 0;
}

/**
 * POST /api/traffic-detailed-analytics/ai-analysis
 * AI analysis of campaigns using GROQ (with rate limiting)
 */
router.post('/ai-analysis', async (req: Request, res: Response) => {
  try {
    const { campaigns, team, teamRoas } = req.body;
    
    if (!campaigns || campaigns.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No campaigns provided' 
      });
    }
    
    // ✅ Rate Limiting: Check if we exceeded 10 requests per minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old timestamps
    while (groqRequestTimestamps.length > 0 && groqRequestTimestamps[0] < oneMinuteAgo) {
      groqRequestTimestamps.shift();
    }
    
    if (groqRequestTimestamps.length >= MAX_GROQ_REQUESTS_PER_MINUTE) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please wait a minute.',
        retryAfter: 60
      });
    }
    
    // Add current request timestamp
    groqRequestTimestamps.push(now);
    
    console.log(`[AI Analysis] Analyzing ${campaigns.length} campaigns for ${team}...`);
    console.log(`[AI Analysis] Rate limit: ${groqRequestTimestamps.length}/${MAX_GROQ_REQUESTS_PER_MINUTE} requests in last minute`);
    
    // ✅ Call GROQ AI with proper prompt
    const analysis = await analyzeWithGROQ(campaigns, team, teamRoas);
    
    res.json({
      success: true,
      analysis: analysis.content,
      metadata: {
        model: 'llama-3.1-70b-versatile',
        campaigns_analyzed: campaigns.length,
        timestamp: new Date().toISOString(),
        rate_limit_remaining: MAX_GROQ_REQUESTS_PER_MINUTE - groqRequestTimestamps.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ AI analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      fallback: generateFallbackAnalysis(req.body.campaigns)
    });
  }
});

/**
 * Analyze campaigns with GROQ AI
 */
async function analyzeWithGROQ(campaigns: any[], team: string, teamRoas: number): Promise<any> {
  const GROQ_API_KEY = process.env.GROQ_CAMPAIGN_ANALYZER_KEY || process.env.GROQ_API_KEY;
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  if (!GROQ_API_KEY) {
    throw new Error('GROQ API KEY not configured');
  }
  
  // Prepare campaign data
  const campaignsSummary = campaigns.map(c => ({
    name: c.name,
    status: c.status,
    spend: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    ctr: c.ctr,
    cpc: c.cpc,
    cpm: c.cpm,
    frequency: c.frequency,
    reach: c.reach,
    conversions: c.conversions || 0,
    roas: c.roas || 0,
    quality_ranking: c.quality_ranking,
    engagement_rate_ranking: c.engagement_rate_ranking
  }));
  
  const prompt = `Ты - профессиональный маркетолог с 10+ годами опыта в Facebook Ads. Анализируешь кампании таргетолога "${team}".

**ДАННЫЕ КОМАНДЫ:**
- Текущий ROAS: ${teamRoas.toFixed(2)}x
- Цель: ROAS > 2.0x
- Количество кампаний: ${campaigns.length}

**КАМПАНИИ:**
${JSON.stringify(campaignsSummary, null, 2)}

**ЗАДАЧА:** Проанализируй ВСЕ метрики и дай конкретные рекомендации БЕЗ ВОДЫ.

**АНАЛИЗИРУЙ:**
1. **Delivery Health:** Impressions, Reach, Frequency (оптимум 1.5-2.5)
2. **Engagement:** CTR (цель >1.5%), Engagement Rate Ranking
3. **Cost Efficiency:** CPM, CPC, CPA
4. **Conversion:** ROAS, Conversions
5. **Quality Signals:** Quality Ranking, Ad Fatigue

**ФОРМАТ ОТВЕТА:**

## 📊 АНАЛИЗ КАМПАНИЙ - ${team}

### 🎯 Общая оценка: X/10

### 🔴 КРИТИЧНЫЕ ПРОБЛЕМЫ:
1. [Название кампании]: [Проблема] → [Что делать КОНКРЕТНО]
2. ...

### 🟡 ТРЕБУЮТ ВНИМАНИЯ:
1. [Кампания]: [Метрика] = [Значение] (ниже/выше нормы) → [Конкретный шаг]

### ✅ ЧТО РАБОТАЕТ ХОРОШО:
- [Кампания]: [Метрика] показывает отличные результаты

### 💡 ACTIONABLE РЕКОМЕНДАЦИИ (по приоритетам):
1. **[Название кампании]**: [Конкретное действие] → Прогноз: +X% ROAS
2. **[Название кампании]**: [Конкретное действие] → Прогноз: -X% CPA
3. **[Общая стратегия]**: [Что сделать]

### 📈 ПРОГНОЗ ПОСЛЕ ПРИМЕНЕНИЯ:
- Текущий ROAS: ${teamRoas.toFixed(2)}x
- После фиксов: [X.XX]x
- Рост: +[X]%
- Срок: [N] дней

**ВАЖНО:** Только конкретные действия, никакой воды, никаких общих фраз!`;

  console.log('[AI Analysis] Sending to GROQ...');
  
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты - профессиональный маркетолог. Анализируй только цифры и метрики. Никакой воды.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );
  
  console.log('[AI Analysis] ✅ GROQ responded');
  
  return {
    content: response.data.choices[0].message.content,
    model: 'llama-3.1-70b-versatile',
    usage: response.data.usage
  };
}

/**
 * Fallback analysis (if GROQ fails)
 */
function generateFallbackAnalysis(campaigns: any[]): string {
  let analysis = '## 📊 БАЗОВЫЙ АНАЛИЗ\n\n';
  analysis += '*(AI временно недоступен, показываю автоматический анализ)*\n\n';
  
  campaigns.forEach((c, i) => {
    analysis += `### ${i + 1}. ${c.name}\n\n`;
    
    const issues: string[] = [];
    if (c.ctr < 1.5) issues.push('🔴 Низкий CTR (<1.5%)');
    if (c.frequency > 3) issues.push('🔴 Частота >3 (усталость аудитории)');
    if (c.roas < 2) issues.push('🔴 ROAS <2.0x (не достигнута цель)');
    if (c.cpc > 5) issues.push('🔴 Высокий CPC (>$5)');
    
    if (issues.length > 0) {
      analysis += '**Проблемы:**\n' + issues.map(i => `- ${i}`).join('\n') + '\n\n';
    } else {
      analysis += '✅ Кампания работает нормально\n\n';
    }
    
    analysis += `**Метрики:**\n`;
    analysis += `- Расходы: $${c.spend.toFixed(2)}\n`;
    analysis += `- CTR: ${c.ctr.toFixed(2)}%\n`;
    analysis += `- CPC: $${c.cpc.toFixed(2)}\n`;
    analysis += `- ROAS: ${c.roas.toFixed(2)}x\n\n`;
  });
  
  return analysis;
}

/**
 * 🎯 POST /api/traffic-detailed-analytics/campaign/:campaignId/analyze
 * Comprehensive AI Analysis с использованием Analytics Engine (FIX #3)
 * 
 * Возвращает:
 * - Score (0-100) и Grade (A+ до F)
 * - Metrics analysis (CTR, CPM, ROAS scores)
 * - Industry benchmarks comparison
 * - Specific issues (audience, creative, budget, timing, bid_strategy)
 * - AI-powered recommendations (prioritized, actionable)
 */
router.post('/campaign/:campaignId/analyze', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const campaignData = req.body;

    console.log(`[Analytics Engine] Analyzing campaign: ${campaignId}`);

    // Validate required fields
    if (!campaignData.spend || !campaignData.impressions || !campaignData.clicks) {
      return res.status(400).json({
        success: false,
        error: 'Missing required campaign data (spend, impressions, clicks)'
      });
    }

    // Ensure all required fields have default values
    const enrichedCampaignData = {
      id: campaignId,
      name: campaignData.name || 'Unnamed Campaign',
      spend: parseFloat(campaignData.spend) || 0,
      impressions: parseInt(campaignData.impressions) || 0,
      clicks: parseInt(campaignData.clicks) || 0,
      conversions: parseInt(campaignData.conversions) || 0,
      reach: parseInt(campaignData.reach) || parseInt(campaignData.impressions) || 0,
      ctr: parseFloat(campaignData.ctr) || 0,
      cpm: parseFloat(campaignData.cpm) || 0,
      cpc: parseFloat(campaignData.cpc) || 0,
      conversion_rate: parseFloat(campaignData.conversion_rate) || 0,
      roas: parseFloat(campaignData.roas) || 0,
      cost_per_result: parseFloat(campaignData.cost_per_result) || 0,
    };

    // 🎯 Call Analytics Engine
    const analysis = await analyticsEngine.analyzeCampaign(enrichedCampaignData);

    console.log(`✅ [Analytics Engine] Analysis complete: ${analysis.grade} (${analysis.score}/100)`);

    res.json({
      success: true,
      analysis,
      metadata: {
        engine: 'comprehensive-analytics-v1',
        timestamp: new Date().toISOString(),
        campaign_id: campaignId,
      }
    });

  } catch (error: any) {
    console.error('❌ [Analytics Engine] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to analyze campaign with Analytics Engine'
    });
  }
});

export default router;
