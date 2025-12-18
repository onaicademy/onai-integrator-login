import Groq from 'groq-sdk';
import { landingSupabase } from '../config/supabase-landing.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface TeamMetrics {
  team: string;
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
  cpa: number;
  ctr: number;
  impressions: number;
  clicks: number;
}

/**
 * Generate AI recommendations for a traffic team using Groq
 */
export async function generateTeamRecommendations(metrics: TeamMetrics): Promise<string> {
  try {
    const prompt = `Ты - профессиональный performance-маркетолог с опытом работы в Facebook Ads.

Проанализируй метрики рекламной кампании команды "${metrics.team}":

📊 МЕТРИКИ:
- Расход: $${metrics.spend.toFixed(2)}
- Выручка: $${metrics.revenue.toFixed(2)}
- ROAS: ${metrics.roas.toFixed(2)}x
- Покупки: ${metrics.purchases}
- CPA (стоимость покупки): $${metrics.cpa.toFixed(2)}
- Показы: ${metrics.impressions.toLocaleString()}
- Клики: ${metrics.clicks.toLocaleString()}
- CTR: ${metrics.ctr.toFixed(2)}%

🎯 ЗАДАЧА:
Дай 3-4 конкретных профессиональных совета, как улучшить результаты этой команды.

ТРЕБОВАНИЯ:
- Советы должны быть КОНКРЕТНЫМИ и ПРИМЕНИМЫМИ
- Фокусируйся на реальных проблемах в метриках
- Используй маркетинговую терминологию
- Будь кратким (2-3 предложения на совет)
- Если ROAS > 2.5x - хвали команду, но дай советы по масштабированию
- Если ROAS < 1.5x - укажи на критические проблемы
- Если CTR < 1% - проблема с креативами
- Если CPA слишком высок - проблема с таргетингом

Формат ответа (emoji + текст):
✅ [Что делают хорошо]
⚠️ [Что нужно улучшить - совет 1]
🎯 [Совет 2]
💡 [Совет 3]`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Ты - эксперт по Facebook Ads с 10+ летним опытом. Твои советы основаны на реальных данных и помогают увеличивать ROAS.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || 'Не удалось сгенерировать рекомендации';
  } catch (error: any) {
    console.error(`❌ Error generating recommendations for ${metrics.team}:`, error.message);
    return '❌ Ошибка генерации рекомендаций. Попробуйте позже.';
  }
}

/**
 * Save recommendations to database
 */
export async function saveRecommendations(teamName: string, recommendations: string): Promise<void> {
  try {
    if (!landingSupabase) {
      throw new Error('Landing Supabase client not initialized');
    }

    await landingSupabase.from('traffic_recommendations').insert({
      team_name: teamName,
      recommendations,
      created_at: new Date().toISOString(),
    });

    console.log(`✅ Recommendations saved for ${teamName}`);
  } catch (error: any) {
    console.error(`❌ Error saving recommendations for ${teamName}:`, error.message);
  }
}

/**
 * Get latest recommendations for a team
 */
export async function getLatestRecommendations(teamName: string): Promise<string | null> {
  try {
    if (!landingSupabase) {
      throw new Error('Landing Supabase client not initialized');
    }

    const { data, error } = await landingSupabase
      .from('traffic_recommendations')
      .select('recommendations')
      .eq('team_name', teamName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(`❌ Error fetching recommendations for ${teamName}:`, error.message);
      return null;
    }

    return data?.recommendations || null;
  } catch (error: any) {
    console.error(`❌ Error in getLatestRecommendations:`, error.message);
    return null;
  }
}

/**
 * Generate recommendations for all teams (daily cron job)
 */
export async function generateDailyRecommendations(teamsMetrics: TeamMetrics[]): Promise<void> {
  console.log('🤖 Starting daily recommendations generation...');

  for (const metrics of teamsMetrics) {
    try {
      const recommendations = await generateTeamRecommendations(metrics);
      await saveRecommendations(metrics.team, recommendations);
      console.log(`✅ Generated recommendations for ${metrics.team}`);
    } catch (error: any) {
      console.error(`❌ Failed to generate recommendations for ${metrics.team}:`, error.message);
    }
  }

  console.log('✅ Daily recommendations generation complete');
}
