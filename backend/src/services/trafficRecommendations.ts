import Groq from 'groq-sdk';
import { landingSupabase } from '../config/supabase-landing.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface VideoMetrics {
  plays: number;
  thruplay: number;
  completions: number;
  completionRate: number;
  thruplayRate: number;
  avgWatchTime: number;
  retention?: {
    '25%': number;
    '50%': number;
    '75%': number;
    '100%': number;
  };
}

interface TopCreative {
  name: string;
  creativeName?: string;
  thumbnail?: string;
  plays: number;
  thruplay: number;
  completions: number;
  completionRate: string;
  thruplayRate?: string;
  avgWatchTime: string;
  ctr?: string;
}

interface TeamMetrics {
  team: string;
  spend: number;
  revenue: number;
  roas: number;
  purchases?: number;
  sales?: number;
  cpa: number;
  ctr: number;
  impressions?: number;
  clicks?: number;
  // 🎬 Video engagement
  videoMetrics?: VideoMetrics | null;
  topVideoCreatives?: TopCreative[];
}

/**
 * Generate AI recommendations for a traffic team using Groq
 */
export async function generateTeamRecommendations(metrics: TeamMetrics): Promise<string> {
  try {
    // Handle both purchases and sales naming
    const purchases = metrics.purchases || metrics.sales || 0;
    const impressions = metrics.impressions || 0;
    const clicks = metrics.clicks || 0;
    
    // 📊 Расчет дополнительных метрик
    const cpc = clicks > 0 ? metrics.spend / clicks : 0; // Cost Per Click
    const cpm = impressions > 0 ? (metrics.spend / impressions) * 1000 : 0; // Cost Per Mille
    const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0; // CR%
    const revenuePerSale = purchases > 0 ? metrics.revenue / purchases : 0;
    
    // 🎯 Бенчмарки для сравнения (Kazakhstan market)
    const benchmarks = {
      roas: { excellent: 5, good: 3, acceptable: 1.5, critical: 1 },
      ctr: { excellent: 2, good: 1.5, acceptable: 1, critical: 0.5 },
      cpc: { excellent: 0.5, good: 1, acceptable: 2, critical: 3 },
      conversionRate: { excellent: 5, good: 3, acceptable: 1.5, critical: 0.5 },
    };
    
    // 📈 Статус метрик
    const roasStatus = metrics.roas >= benchmarks.roas.excellent ? 'отличный' :
                      metrics.roas >= benchmarks.roas.good ? 'хороший' :
                      metrics.roas >= benchmarks.roas.acceptable ? 'приемлемый' : 'критический';
    
    const ctrStatus = metrics.ctr >= benchmarks.ctr.excellent ? 'отличный' :
                     metrics.ctr >= benchmarks.ctr.good ? 'хороший' :
                     metrics.ctr >= benchmarks.ctr.acceptable ? 'приемлемый' : 'критический';

    // 🎬 Video engagement section
    const video = metrics.videoMetrics;
    const topCreatives = metrics.topVideoCreatives || [];
    
    const videoSection = video ? `
🎬 ВОВЛЕЧЁННОСТЬ ВИДЕО:
  • Просмотры видео: ${video.plays?.toLocaleString() || 0}
  • Thruplay (15+ сек): ${video.thruplay?.toLocaleString() || 0} (${video.thruplayRate?.toFixed(1) || 0}%)
  • Досмотры до конца: ${video.completions?.toLocaleString() || 0} (${video.completionRate?.toFixed(1) || 0}%)
  • Среднее время просмотра: ${video.avgWatchTime?.toFixed(1) || 0} сек
  • Удержание:
    - 25%: ${video.retention?.['25%']?.toLocaleString() || 0}
    - 50%: ${video.retention?.['50%']?.toLocaleString() || 0}
    - 75%: ${video.retention?.['75%']?.toLocaleString() || 0}
    - 100%: ${video.retention?.['100%']?.toLocaleString() || 0}

🏆 ТОП-3 КРЕАТИВА ПО ВОВЛЕЧЁННОСТИ ВИДЕО:
${topCreatives.length > 0 ? topCreatives.map((c, i) => 
  `  ${i + 1}. "${c.name}"
     └─ Просмотры: ${c.plays?.toLocaleString() || 0} | Thruplay: ${c.thruplayRate || c.completionRate} | Досмотры: ${c.completions?.toLocaleString() || 0} (${c.completionRate})
     └─ Ср. время: ${c.avgWatchTime} | CTR: ${c.ctr || 'N/A'}`
).join('\n') : '  Нет данных по видео-креативам'}

📊 БЕНЧМАРКИ ВИДЕО:
  • Thruplay Rate: >30% (excellent), 15-30% (good), <15% (poor hook)
  • Completion Rate: >15% (excellent), 5-15% (good), <5% (boring content)
  • Avg Watch Time: >10s (engaging), 5-10s (average), <5s (weak hook)
` : '';

    const prompt = `Ты - senior performance-маркетолог с 15+ летним опытом в Facebook Ads, специализирующийся на Kazakhstan market. Твои рекомендации основаны на data-driven подходе и увеличивают ROAS в среднем на 45%.

🎯 КОМАНДА: "${metrics.team}"

📊 ТЕКУЩИЕ МЕТРИКИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 ФИНАНСЫ:
  • Ad Spend: $${metrics.spend.toFixed(2)}
  • Выручка: ₸${metrics.revenue.toFixed(0)} (~$${(metrics.revenue / 470).toFixed(2)})
  • ROAS: ${metrics.roas.toFixed(2)}x (статус: ${roasStatus})
  • Продажи: ${purchases} шт
  • CPA: $${metrics.cpa.toFixed(2)}
  • Revenue/Sale: ₸${revenuePerSale.toFixed(0)}

📈 ВОРОНКА:
  • Показы: ${impressions.toLocaleString()}
  • Клики: ${clicks.toLocaleString()}
  • CTR: ${metrics.ctr.toFixed(2)}% (статус: ${ctrStatus})
  • CPC: $${cpc.toFixed(3)}
  • CPM: $${cpm.toFixed(2)}
  • Conversion Rate: ${conversionRate.toFixed(2)}%
${videoSection}

📊 БЕНЧМАРКИ (Kazakhstan EdTech):
  • ROAS: 3-5x (excellent), 1.5-3x (good), <1.5x (critical)
  • CTR: >1.5% (good), 1-1.5% (acceptable), <1% (poor creatives)
  • CPC: <$1 (good), $1-2 (acceptable), >$2 (expensive traffic)
  • CR: >3% (excellent), 1.5-3% (good), <1.5% (funnel issues)

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ЗАДАЧА: Дай 2-3 ГЛАВНЫХ действия для улучшения результатов. КОРОТКО и ПО ДЕЛУ.

⚡ КРИТИЧЕСКИ ВАЖНО:
- КОРОТКИЕ рекомендации (1-2 строки каждая, НЕ абзацы!)
- КОНКРЕТНЫЕ цифры и действия
- Анализируй ВСЕ метрики включая 🎬 VIDEO (thruplay, completion rate, удержание)
- Если видео плохое - говори какое именно и что делать
- Kazakhstan market: билингвальность (kz/ru), средний чек ₸15-50K, CPA $50-100

━━━━━━━━━━━━━━━━━━━━━━━━━━━

ФОРМАТ ОТВЕТА (СТРОГО СЛЕДУЙ):

**📊 СТАТУС**
Продажи: ${purchases} шт | ROAS: ${metrics.roas.toFixed(1)}x | CPA: $${metrics.cpa.toFixed(0)}

**🎯 ТОП-3 ДЕЙСТВИЯ**

**1️⃣ [Название действия]**
└ Что делать: [конкретное действие с цифрами в 1 строку]
└ Результат: [прогноз улучшения]

**2️⃣ [Название действия]**
└ Что делать: [конкретное действие с цифрами в 1 строку]
└ Результат: [прогноз улучшения]

**3️⃣ [Название действия]** (если есть третья проблема)
└ Что делать: [конкретное действие с цифрами в 1 строку]
└ Результат: [прогноз улучшения]

**⚡ СЕГОДНЯ**
• [Быстрое действие 1]
• [Быстрое действие 2]

**📈 ПРОГНОЗ**
ROAS: ${metrics.roas.toFixed(1)}x → [цель]x | CPA: $${metrics.cpa.toFixed(0)} → $[цель]

━━━━━━━━━━━━━━━━━━━━━━━━━━━

ВАЖНО:
- НЕ пиши длинные абзацы - только bullet points
- НЕ используй "Проблема/Решение/Прогноз" - только "Что делать" и "Результат"
- Если видео метрики плохие - анализируй ТОП-3 креатива и говори какой слабый`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Ты - senior performance-маркетолог Александр Семёнов (15+ лет опыта, $50M+ ad spend, средний ROAS клиентов 4.2x).

ТВОЯ ЭКСПЕРТИЗА:
• Facebook Ads для EdTech в Kazakhstan
• Data-driven оптимизация (статистическая значимость)
• Funnel optimization (увеличение CR на каждом этапе)
• Creative testing frameworks (Control vs Challenger)
• Advanced targeting (Lookalike scaling, interest stacking)

ТВОЙ ПОДХОД:
1. Анализируешь ВСЕ метрики воронки
2. Находишь узкие места (bottlenecks)
3. Даешь КОНКРЕТНЫЕ решения с цифрами
4. Прогнозируешь результаты на основе опыта
5. Приоритизируешь по ROI изменений

ТВОЙ СТИЛЬ:
- Прямой и конкретный
- Без воды и общих фраз
- Только действия, которые работают
- Каждый совет = actionable item
- Фокус на максимальном impact`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Снижаем для коротких, четких ответов
      max_tokens: 800, // СНИЖАЕМ чтобы AI не писал много текста
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
