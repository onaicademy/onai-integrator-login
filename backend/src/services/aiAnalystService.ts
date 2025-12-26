/**
 * AI Analyst Service - Groq-powered tactical advice for targetologists
 *
 * Analyzes FB Ads metrics and provides ONE specific, actionable insight
 * Triggered after facebookService syncs data
 */

import Groq from 'groq-sdk';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY && GROQ_API_KEY !== 'gsk_placeholder_for_local_dev'
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

interface MetricsInput {
  userId: string;
  teamName: string;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpm: number;
  impressions: number;
  clicks: number;
  sales: number;
  dateRange: string;
}

interface AIInsight {
  userId: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
  category: 'creative' | 'targeting' | 'budget' | 'optimization';
  createdAt: string;
}

/**
 * Generate AI tactical advice using Groq SDK
 */
export async function generateTacticalAdvice(metrics: MetricsInput): Promise<string | null> {
  if (!groq) {
    console.warn('⚠️ [AI Analyst] Groq API key not configured');
    return null;
  }

  try {
    const prompt = `Ты — senior-специалист по Facebook Ads. Проанализируй метрики таргетолога "${metrics.teamName}":

**Данные (${metrics.dateRange}):**
- ROAS: ${metrics.roas.toFixed(2)}x
- Затраты: $${metrics.spend.toFixed(2)}
- Доход: ${metrics.revenue.toLocaleString()} ₸
- Продажи: ${metrics.sales}
- CPA: $${metrics.cpa.toFixed(2)}
- CTR: ${metrics.ctr.toFixed(2)}%
- CPM: $${metrics.cpm.toFixed(2)}
- Показы: ${metrics.impressions.toLocaleString()}
- Клики: ${metrics.clicks}

**Задача:**
Дай ОДНУ конкретную тактическую рекомендацию (максимум 15 слов на русском), которая сразу улучшит результаты.

Примеры:
- "CTR ниже 1% — тестируй новые креативы с сильным хуком"
- "CPM слишком высокий ($12) — расширь таргетинг или используй lookalike"
- "ROAS отличный — масштабируй бюджет на 30%"

Фокусируйся на САМОЙ КРИТИЧНОЙ проблеме. Будь прямым и конкретным.`;

    const completion = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: 'Ты — тактический аналитик Facebook Ads. Давай только краткие, действенные советы на русском языке.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const insight = completion.choices[0]?.message?.content?.trim();

    if (!insight) {
      console.error('❌ [AI Analyst] Empty response from Groq');
      return null;
    }

    console.log(`✅ [AI Analyst] Generated insight for ${metrics.teamName}: ${insight}`);
    return insight;

  } catch (error: any) {
    console.error('❌ [AI Analyst] Groq API error:', error.message);
    return null;
  }
}

/**
 * Save AI insight to database
 */
export async function saveInsight(insight: AIInsight): Promise<boolean> {
  try {
    const { error } = await trafficAdminSupabase
      .from('ai_insights')
      .insert({
        user_id: insight.userId,
        insight_text: insight.insight,
        priority: insight.priority,
        category: insight.category,
        created_at: insight.createdAt,
        is_read: false,
      });

    if (error) {
      console.error('❌ [AI Analyst] Failed to save insight:', error);
      return false;
    }

    console.log(`✅ [AI Analyst] Saved insight for user ${insight.userId}`);
    return true;

  } catch (error: any) {
    console.error('❌ [AI Analyst] Database error:', error.message);
    return false;
  }
}

/**
 * Get latest AI insight for a user
 */
export async function getLatestInsight(userId: string): Promise<string | null> {
  try {
    const { data, error } = await trafficAdminSupabase
      .from('ai_insights')
      .select('insight_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Only return insights from the last 24 hours
    const insightAge = Date.now() - new Date(data.created_at).getTime();
    if (insightAge > 24 * 60 * 60 * 1000) {
      return null;
    }

    return data.insight_text;

  } catch (error: any) {
    console.error('❌ [AI Analyst] Failed to fetch insight:', error.message);
    return null;
  }
}

/**
 * Categorize insight based on content
 */
function categorizeInsight(insight: string): 'creative' | 'targeting' | 'budget' | 'optimization' {
  const lower = insight.toLowerCase();

  if (lower.includes('creative') || lower.includes('ad') || lower.includes('hook') || lower.includes('copy')) {
    return 'creative';
  }
  if (lower.includes('target') || lower.includes('audience') || lower.includes('lookalike')) {
    return 'targeting';
  }
  if (lower.includes('budget') || lower.includes('bid') || lower.includes('spend')) {
    return 'budget';
  }
  return 'optimization';
}

/**
 * Determine priority based on metrics
 */
function determinePriority(metrics: MetricsInput): 'high' | 'medium' | 'low' {
  // High priority: ROAS < 1 (losing money) or CTR < 0.5%
  if (metrics.roas < 1 || metrics.ctr < 0.5) {
    return 'high';
  }

  // Medium priority: ROAS < 2 or CTR < 1%
  if (metrics.roas < 2 || metrics.ctr < 1) {
    return 'medium';
  }

  // Low priority: Everything else (optimization mode)
  return 'low';
}

/**
 * Main function: Analyze metrics and generate insight
 */
export async function analyzeAndGenerateInsight(metrics: MetricsInput): Promise<AIInsight | null> {
  try {
    const insightText = await generateTacticalAdvice(metrics);

    if (!insightText) {
      return null;
    }

    const insight: AIInsight = {
      userId: metrics.userId,
      insight: insightText,
      priority: determinePriority(metrics),
      category: categorizeInsight(insightText),
      createdAt: new Date().toISOString(),
    };

    await saveInsight(insight);

    return insight;

  } catch (error: any) {
    console.error('❌ [AI Analyst] Error in analyzeAndGenerateInsight:', error.message);
    return null;
  }
}
