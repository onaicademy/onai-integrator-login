/**
 * Traffic Campaign Analyzer with GROQ AI
 * Professional marketer-grade analysis with comprehensive Facebook metrics
 */

import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const PROFESSIONAL_MARKETER_PROMPT = `
You are a senior performance marketing consultant analyzing Facebook Ads campaigns.

ANALYSIS FRAMEWORK:

1. DELIVERY HEALTH
    - Impressions, Reach, Frequency trends
    - Budget utilization rate

2. ENGAGEMENT ANALYSIS
    - CTR (all types)
    - Engagement rate ranking

3. COST EFFICIENCY
    - CPM trends
    - CPC analysis
    - CPA vs target

4. CONVERSION PERFORMANCE
    - Purchase ROAS
    - Lead conversion rate

5. QUALITY SIGNALS
    - Quality ranking (1-5)
    - Ad fatigue indicators

6. AUDIENCE INSIGHTS
    - Demographics breakdown
    - Device performance
    - Placement winners/losers

OUTPUT REQUIRED (Be specific, no fluff):

CAMPAIGN: [Name]
HEALTH SCORE: X/10

RED FLAGS:
- [Metric]: [Current value] | Benchmark: [Expected] | Gap: [%]

IMMEDIATE FIXES (Priority order):
1. [Action]: [How to do it] → Impact: [+X% ROAS]
2. [Action]: [How to do it] → Impact: [+X% CTR]
3. [Action]: [How to do it] → Impact: [-X% CPA]

PROJECTIONS:
Current: ROAS [X], CPA $[Y]
After fixes: ROAS [X+N], CPA $[Y-M]
Timeline: [N] days

ONLY actionable intelligence. NO GENERIC ADVICE.
`;

interface CampaignData {
  name: string;
  impressions?: number;
  reach?: number;
  frequency?: number;
  clicks?: number;
  link_clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  spend?: number;
  roas?: number;
  roi?: number;
  sales?: number;
  revenue?: number;
  cpa?: number;
  quality_ranking?: number;
  engagement_rate_ranking?: number;
  conversion_rate_ranking?: number;
  video_views?: number;
  video_completion_rate?: number;
  [key: string]: any;
}

interface AnalysisResult {
  analysis: string;
  usage?: any;
  fallback: boolean;
}

/**
 * Analyze campaigns using GROQ AI with fallback to rule-based analysis
 */
export async function analyzeCampaigns(campaignData: CampaignData[]): Promise<AnalysisResult> {
  try {
    // Try GROQ first
    const dataString = JSON.stringify(campaignData, null, 2);
    
    console.log('[GROQ] Analyzing campaigns with llama-3.1-70b-versatile...');
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: PROFESSIONAL_MARKETER_PROMPT
        },
        {
          role: 'user',
          content: `Analyze these campaigns:\n\n${dataString}`
        }
      ],
      temperature: 0.3,  // Low temp for analytical accuracy
      max_tokens: 4096
    });
    
    console.log('[GROQ] ✅ Analysis completed successfully');
    
    return {
      analysis: completion.choices[0].message.content || 'No analysis generated',
      usage: completion.usage,
      fallback: false
    };
  } catch (error: any) {
    console.error('[GROQ] ❌ Failed, using rule-based fallback:', error.message);
    
    // ENHANCEMENT: Rule-based fallback
    return {
      analysis: generateBasicAnalysis(campaignData),
      fallback: true
    };
  }
}

/**
 * Rule-based analysis when GROQ fails
 */
function generateBasicAnalysis(campaigns: CampaignData[]): string {
  let analysis = '📊 БАЗОВЫЙ АНАЛИЗ (AI недоступен)\n\n';
  
  campaigns.forEach(c => {
    analysis += `КАМПАНИЯ: ${c.name}\n`;
    analysis += `HEALTH SCORE: ${calculateHealthScore(c)}/10\n\n`;
    
    const issues: string[] = [];
    
    if ((c.ctr || 0) < 1.5) {
      issues.push('🔴 Низкий CTR (<1.5%) → тестируй новые креативы');
    }
    if ((c.frequency || 0) > 3) {
      issues.push('🔴 Частота >3 → усталость аудитории, расширь таргетинг');
    }
    if ((c.roi || 0) < 200) {
      issues.push('🔴 ROI <200% → увеличь ставку или останови кампанию');
    }
    if ((c.cpc || 0) > 5) {
      issues.push('🔴 Высокий CPC (>$5) → улучши таргетинг и креативы');
    }
    if ((c.cpm || 0) > 50) {
      issues.push('🟡 Высокий CPM (>$50) → усталость аудитории или высокая конкуренция');
    }
    
    if (issues.length > 0) {
      analysis += 'RED FLAGS:\n' + issues.join('\n') + '\n\n';
    } else {
      analysis += '✅ Проблем не обнаружено\n\n';
    }
    
    analysis += 'РЕКОМЕНДАЦИИ:\n';
    if ((c.ctr || 0) < 1.5) {
      analysis += '1. Протестируй 3-5 новых креативов с четким value proposition\n';
    }
    if ((c.frequency || 0) > 3) {
      analysis += '2. Создай новую похожую аудиторию (Lookalike 1-2%)\n';
    }
    if ((c.roi || 0) < 200) {
      analysis += '3. Пересмотри воронку конверсии и landing page\n';
    }
    if ((c.cpc || 0) > 5) {
      analysis += '4. Уточни таргетинг (narrow audience) или измени креатив\n';
    }
    
    analysis += '\n---\n\n';
  });
  
  return analysis;
}

/**
 * Calculate health score (1-10) based on key metrics
 */
function calculateHealthScore(campaign: CampaignData): number {
  let score = 10;
  
  // CTR penalty
  if ((campaign.ctr || 0) < 1.0) score -= 3;
  else if ((campaign.ctr || 0) < 1.5) score -= 2;
  
  // Frequency penalty
  if ((campaign.frequency || 0) > 4) score -= 3;
  else if ((campaign.frequency || 0) > 3) score -= 2;
  
  // ROI penalty
  if ((campaign.roi || 0) < 100) score -= 4;
  else if ((campaign.roi || 0) < 200) score -= 3;
  else if ((campaign.roi || 0) < 300) score -= 1;
  
  // CPC penalty
  if ((campaign.cpc || 0) > 10) score -= 3;
  else if ((campaign.cpc || 0) > 5) score -= 2;
  
  return Math.max(score, 1);
}

/**
 * Enrich campaign data with additional calculations
 */
export function enrichCampaignData(campaign: any): CampaignData {
  return {
    name: campaign.name || campaign.campaign_name || 'Unnamed Campaign',
    impressions: campaign.impressions || 0,
    reach: campaign.reach || 0,
    frequency: campaign.frequency || (campaign.impressions && campaign.reach ? campaign.impressions / campaign.reach : 0),
    clicks: campaign.clicks || 0,
    link_clicks: campaign.link_clicks || 0,
    ctr: campaign.ctr || (campaign.clicks && campaign.impressions ? (campaign.clicks / campaign.impressions) * 100 : 0),
    cpc: campaign.cpc || (campaign.spend && campaign.clicks ? campaign.spend / campaign.clicks : 0),
    cpm: campaign.cpm || (campaign.spend && campaign.impressions ? (campaign.spend / campaign.impressions) * 1000 : 0),
    spend: campaign.spend || 0,
    roas: campaign.roas || 0,
    roi: campaign.roi || 0,
    sales: campaign.sales || 0,
    revenue: campaign.revenue || 0,
    cpa: campaign.cpa || (campaign.spend && campaign.sales ? campaign.spend / campaign.sales : 0),
    quality_ranking: campaign.quality_ranking || null,
    engagement_rate_ranking: campaign.engagement_rate_ranking || null,
    conversion_rate_ranking: campaign.conversion_rate_ranking || null,
    video_views: campaign.video_views || 0,
    video_completion_rate: campaign.video_completion_rate || 0
  };
}
