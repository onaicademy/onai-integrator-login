/**
 * 🎯 TRAFFIC ANALYTICS ENGINE - Comprehensive Campaign Analysis
 * 
 * РЕШЕНИЕ от Perplexity: Расширенный алгоритм анализа
 * - Industry Benchmarks (CTR, CPM, ROAS по индустриям)
 * - Audience insights
 * - Creative performance
 * - Budget optimization
 * - AI recommendations (prioritized, actionable)
 * 
 * @see TRAFFIC-FIXES-COMPLETE.md (FIX #3)
 */

import Groq from 'groq-sdk';

interface CampaignData {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  conversion_rate?: number;
  roas?: number;
  cost_per_result?: number;
}

interface AnalysisResult {
  campaign_id: string;
  campaign_name: string;
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'okay' | 'poor' | 'failing';
  
  // Detailed analysis
  metrics_analysis: {
    ctr_score: number;
    cpm_score: number;
    roas_score: number;
    efficiency_score: number;
  };

  // Specific recommendations
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    expected_impact: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimated_improvement: string;
  }[];

  // Benchmarks
  benchmarks: {
    metric: string;
    your_value: number;
    industry_average: number;
    percentile: number; // 0-100
    status: 'excellent' | 'above_average' | 'average' | 'below_average';
  }[];

  // Specific issues
  issues: {
    type: 'audience' | 'creative' | 'budget' | 'timing' | 'bid_strategy';
    severity: 'critical' | 'high' | 'medium';
    description: string;
  }[];
}

// Industry Benchmarks (эти данные можно получить из Facebook docs или покупать)
const industryBenchmarks: Record<string, any> = {
  ecommerce: {
    ctr: 1.5,
    cpm: 8.5,
    cpc: 0.65,
    conversion_rate: 2.5,
    roas: 3.0,
  },
  saas: {
    ctr: 0.8,
    cpm: 5.0,
    cpc: 1.2,
    conversion_rate: 1.0,
    roas: 2.0,
  },
  education: {
    ctr: 1.2,
    cpm: 6.0,
    cpc: 0.8,
    conversion_rate: 1.5,
    roas: 2.5,
  },
  // Default (если industry неизвестен)
  default: {
    ctr: 1.0,
    cpm: 7.0,
    cpc: 1.0,
    conversion_rate: 1.5,
    roas: 2.0,
  },
};

export class AnalyticsEngine {
  private groq: Groq;
  private industry: string = 'education'; // OnAI Academy - education industry

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY_ANALYTICS || process.env.GROQ_API_KEY,
    });
  }

  /**
   * Главный метод анализа
   */
  async analyzeCampaign(campaign: CampaignData): Promise<AnalysisResult> {
    console.log(`[ANALYTICS] Analyzing campaign: ${campaign.name}`);

    // 1. Рассчитать все метрики
    const metrics = this.calculateMetrics(campaign);

    // 2. Получить benchmarks
    const benchmarks = this.getBenchmarks(metrics);

    // 3. Выявить проблемы
    const issues = this.identifyIssues(campaign, metrics);

    // 4. Рассчитать score
    const score = this.calculateScore(metrics, benchmarks, issues);
    const grade = this.scoreToGrade(score);

    // 5. Получить AI recommendations
    const recommendations = await this.getAIRecommendations(
      campaign,
      metrics,
      issues
    );

    return {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      score,
      grade,
      status: this.gradeToStatus(grade),
      metrics_analysis: {
        ctr_score: metrics.ctr_score,
        cpm_score: metrics.cpm_score,
        roas_score: metrics.roas_score,
        efficiency_score: metrics.efficiency_score,
      },
      recommendations,
      benchmarks,
      issues,
    };
  }

  /**
   * Рассчитать все метрики
   */
  private calculateMetrics(campaign: CampaignData) {
    const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
    const cpm = campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0;
    const cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;
    const conversion_rate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
    const roas = campaign.roas || (campaign.conversions > 0 ? (campaign.conversions * 50) / campaign.spend : 0); // Assume $50 AOV
    const efficiency = campaign.spend > 0 ? campaign.reach / campaign.spend : 0; // People per $

    // Score each metric (0-100)
    const benchmark = industryBenchmarks[this.industry];
    const ctr_score = Math.min(100, (ctr / benchmark.ctr) * 100);
    const cpm_score = Math.min(100, (benchmark.cpm / cpm) * 100); // Lower CPM = better
    const roas_score = Math.min(100, (roas / benchmark.roas) * 100);
    const efficiency_score = Math.min(100, (efficiency / 10) * 100); // 10 people/$ = excellent

    return {
      ctr,
      cpm,
      cpc,
      conversion_rate,
      roas,
      efficiency,
      ctr_score,
      cpm_score,
      roas_score,
      efficiency_score,
    };
  }

  /**
   * Получить benchmarks для этого campaign
   */
  private getBenchmarks(metrics: ReturnType<AnalyticsEngine['calculateMetrics']>) {
    const benchmark = industryBenchmarks[this.industry];

    return [
      {
        metric: 'CTR',
        your_value: parseFloat(metrics.ctr.toFixed(2)),
        industry_average: benchmark.ctr,
        percentile: Math.min(100, Math.round((metrics.ctr / benchmark.ctr) * 100)),
        status: this.getStatus(metrics.ctr, benchmark.ctr, true), // higher = better
      },
      {
        metric: 'CPM',
        your_value: parseFloat(metrics.cpm.toFixed(2)),
        industry_average: benchmark.cpm,
        percentile: Math.min(100, Math.round((benchmark.cpm / metrics.cpm) * 100)),
        status: this.getStatus(metrics.cpm, benchmark.cpm, false), // lower = better
      },
      {
        metric: 'CPC',
        your_value: parseFloat(metrics.cpc.toFixed(2)),
        industry_average: benchmark.cpc,
        percentile: Math.min(100, Math.round((benchmark.cpc / metrics.cpc) * 100)),
        status: this.getStatus(metrics.cpc, benchmark.cpc, false), // lower = better
      },
      {
        metric: 'Conversion Rate',
        your_value: parseFloat(metrics.conversion_rate.toFixed(2)),
        industry_average: benchmark.conversion_rate,
        percentile: Math.min(100, Math.round((metrics.conversion_rate / benchmark.conversion_rate) * 100)),
        status: this.getStatus(metrics.conversion_rate, benchmark.conversion_rate, true), // higher = better
      },
      {
        metric: 'ROAS',
        your_value: parseFloat(metrics.roas.toFixed(2)),
        industry_average: benchmark.roas,
        percentile: Math.min(100, Math.round((metrics.roas / benchmark.roas) * 100)),
        status: this.getStatus(metrics.roas, benchmark.roas, true), // higher = better
      },
    ];
  }

  /**
   * Выявить проблемы
   */
  private identifyIssues(
    campaign: CampaignData,
    metrics: ReturnType<AnalyticsEngine['calculateMetrics']>
  ) {
    const issues = [];
    const benchmark = industryBenchmarks[this.industry];

    // Check CTR
    if (metrics.ctr < benchmark.ctr * 0.5) {
      issues.push({
        type: 'creative' as const,
        severity: 'high' as const,
        description: `CTR is ${metrics.ctr.toFixed(2)}% (${Math.round((metrics.ctr / benchmark.ctr) * 100)}% of industry benchmark). Consider testing new creatives or audiences.`,
      });
    }

    // Check CPM
    if (metrics.cpm > benchmark.cpm * 1.5) {
      issues.push({
        type: 'bid_strategy' as const,
        severity: 'medium' as const,
        description: `CPM is high at $${metrics.cpm.toFixed(2)} (${Math.round((metrics.cpm / benchmark.cpm) * 100)}% of benchmark). Consider loosening targeting or adjusting bids.`,
      });
    }

    // Check ROAS
    if (metrics.roas < 1.5) {
      issues.push({
        type: 'budget' as const,
        severity: 'critical' as const,
        description: `ROAS is ${metrics.roas.toFixed(2)}x - campaign may not be profitable. Consider pausing or optimizing heavily.`,
      });
    }

    // Check efficiency
    if (metrics.efficiency < 5) {
      issues.push({
        type: 'audience' as const,
        severity: 'high' as const,
        description: `Low reach efficiency (${metrics.efficiency.toFixed(2)} people/$). Audience may be too narrow.`,
      });
    }

    // Check conversion rate
    if (metrics.conversion_rate < benchmark.conversion_rate * 0.5) {
      issues.push({
        type: 'creative' as const,
        severity: 'high' as const,
        description: `Conversion rate is low at ${metrics.conversion_rate.toFixed(2)}%. Check landing page quality or offer relevance.`,
      });
    }

    return issues;
  }

  /**
   * Рассчитать overall score
   */
  private calculateScore(
    metrics: ReturnType<AnalyticsEngine['calculateMetrics']>,
    benchmarks: any[],
    issues: any[]
  ): number {
    // Average metric scores
    const metricsScore =
      (metrics.ctr_score + metrics.cpm_score + metrics.roas_score + metrics.efficiency_score) / 4;

    // Deduct for issues
    let issueDeduction = 0;
    issues.forEach(issue => {
      if (issue.severity === 'critical') issueDeduction += 30;
      if (issue.severity === 'high') issueDeduction += 15;
      if (issue.severity === 'medium') issueDeduction += 5;
    });

    const score = Math.max(0, metricsScore - issueDeduction);
    return Math.round(score);
  }

  /**
   * Получить AI recommendations
   */
  private async getAIRecommendations(
    campaign: CampaignData,
    metrics: ReturnType<AnalyticsEngine['calculateMetrics']>,
    issues: any[]
  ) {
    const prompt = `
You are an expert Facebook Ads analyst for OnAI Academy (education industry). Analyze this campaign data and provide specific, actionable recommendations.

CAMPAIGN DATA:
- Name: ${campaign.name}
- Spend: $${campaign.spend.toFixed(2)}
- Impressions: ${campaign.impressions.toLocaleString()}
- Clicks: ${campaign.clicks.toLocaleString()}
- Conversions: ${campaign.conversions}
- CTR: ${metrics.ctr.toFixed(2)}%
- CPM: $${metrics.cpm.toFixed(2)}
- ROAS: ${metrics.roas.toFixed(2)}x
- Conversion Rate: ${metrics.conversion_rate.toFixed(2)}%

IDENTIFIED ISSUES:
${issues.map(i => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.description}`).join('\n')}

Provide 3-5 specific recommendations. For each recommendation:
1. Action: What to do (be specific!)
2. Why: Why it will help
3. Expected Impact: Specific improvement estimate (e.g., "20% CTR increase")
4. Difficulty: easy/medium/hard

Format as JSON array:
[
  {
    "action": "Specific action here",
    "why": "Reason it works",
    "expected_impact": "20% CTR increase",
    "difficulty": "easy"
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.
`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      // Parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from AI response');
      }

      const aiRecommendations = JSON.parse(jsonMatch[0]);

      return aiRecommendations.map((rec: any, idx: number) => ({
        priority: idx === 0 ? ('critical' as const) : idx === 1 ? ('high' as const) : ('medium' as const),
        action: rec.action,
        expected_impact: rec.expected_impact,
        difficulty: rec.difficulty as 'easy' | 'medium' | 'hard',
        estimated_improvement: rec.expected_impact, // Alias for compatibility
      }));
    } catch (error: any) {
      console.error('[ANALYTICS] Error getting AI recommendations:', error.message);
      
      // Fallback to generic recommendations based on issues
      return this.generateFallbackRecommendations(issues, metrics);
    }
  }

  /**
   * Fallback recommendations если AI не отвечает
   */
  private generateFallbackRecommendations(issues: any[], metrics: any) {
    const recommendations = [];

    // Based on issues
    if (issues.find(i => i.type === 'creative')) {
      recommendations.push({
        priority: 'high' as const,
        action: 'A/B test 3 new creative variations with different hooks',
        expected_impact: '15-25% CTR improvement',
        difficulty: 'easy' as const,
        estimated_improvement: '15-25% CTR improvement',
      });
    }

    if (issues.find(i => i.type === 'audience')) {
      recommendations.push({
        priority: 'high' as const,
        action: 'Expand audience size by adding lookalike audiences (1-3%)',
        expected_impact: '10-20% reach increase',
        difficulty: 'medium' as const,
        estimated_improvement: '10-20% reach increase',
      });
    }

    if (issues.find(i => i.type === 'budget')) {
      recommendations.push({
        priority: 'critical' as const,
        action: 'Reduce daily budget by 30% and reinvest in top-performing campaigns',
        expected_impact: 'Improve overall ROAS by 40%',
        difficulty: 'easy' as const,
        estimated_improvement: 'Improve overall ROAS by 40%',
      });
    }

    // Generic recommendations
    if (recommendations.length < 3) {
      recommendations.push({
        priority: 'medium' as const,
        action: 'Install Facebook Pixel events for better conversion tracking',
        expected_impact: '10% better optimization',
        difficulty: 'medium' as const,
        estimated_improvement: '10% better optimization',
      });
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private scoreToGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 45) return 'D';
    return 'F';
  }

  private gradeToStatus(
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  ): 'excellent' | 'good' | 'okay' | 'poor' | 'failing' {
    if (grade === 'A+' || grade === 'A') return 'excellent';
    if (grade === 'B') return 'good';
    if (grade === 'C') return 'okay';
    if (grade === 'D') return 'poor';
    return 'failing';
  }

  private getStatus(
    value: number,
    benchmark: number,
    higherBetter: boolean
  ): 'excellent' | 'above_average' | 'average' | 'below_average' {
    const ratio = higherBetter ? value / benchmark : benchmark / value;
    if (ratio >= 1.2) return 'excellent';
    if (ratio >= 1.0) return 'above_average';
    if (ratio >= 0.8) return 'average';
    return 'below_average';
  }
}

export const analyticsEngine = new AnalyticsEngine();
