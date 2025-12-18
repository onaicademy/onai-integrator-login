import Groq from 'groq-sdk';
import { ValidationResult, AIAnalysis } from './iaeAgentService.js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 🤖 Analyze data with Groq AI
export async function analyzeWithGroq(
  validationResult: ValidationResult,
  metricsData: any,
  reportType: string
): Promise<AIAnalysis> {
  console.log('🤖 [IAE] Running Groq AI analysis...');
  
  const prompt = buildAnalysisPrompt(validationResult, metricsData, reportType);
  
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты - IAE Agent (Intelligence Analytics Engine), эксперт по аналитике трафика и продаж. Твоя задача - анализировать состояние систем аналитики и давать конкретные рекомендации. Отвечай только на русском языке. Будь конкретным и профессиональным.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Groq AI');
    }
    
    const analysis = JSON.parse(content);
    
    // Validate response structure
    if (!analysis.healthScore || !analysis.summary) {
      throw new Error('Invalid response structure from Groq AI');
    }
    
    console.log(`✅ [IAE] AI Analysis complete. Health Score: ${analysis.healthScore}/100`);
    
    return {
      healthScore: Math.min(100, Math.max(0, analysis.healthScore)),
      summary: analysis.summary || 'Анализ завершен',
      insights: analysis.insights || analysis.summary,
      recommendations: analysis.recommendations || [],
      risks: analysis.risks || []
    };
    
  } catch (error: any) {
    console.error('❌ [IAE] Groq AI analysis error:', error.message);
    
    // Fallback analysis based on validation
    return generateFallbackAnalysis(validationResult, metricsData);
  }
}

function buildAnalysisPrompt(
  validation: ValidationResult,
  metrics: any,
  reportType: string
): string {
  const reportTypeText = {
    'daily': 'за вчерашний день',
    'current': 'по текущему состоянию',
    'monthly': 'за прошедший месяц',
    'health_check': 'проверка систем',
    'manual': 'ручная проверка'
  }[reportType] || 'аналитику';
  
  return `
Проведи анализ состояния систем аналитики трафика ${reportTypeText}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ДАННЫЕ ЗА ПЕРИОД:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💵 Траты FB Ads: $${metrics.spend.toFixed(2)}
💰 Доход AmoCRM: ₸${metrics.revenue.toLocaleString()}
🛒 Продажи: ${metrics.sales} шт
📈 ROAS: ${metrics.roas.toFixed(2)}x
👁 Показы: ${metrics.impressions.toLocaleString()}
🖱 Клики: ${metrics.clicks.toLocaleString()}
📊 CTR: ${metrics.ctr.toFixed(2)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 СТАТУС СИСТЕМ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AmoCRM API: ${validation.amocrm_status.healthy ? '✅ Работает' : '❌ Недоступен'}
  Token: ${validation.amocrm_status.token_valid ? 'Valid' : 'Invalid'}
  Issues: ${validation.amocrm_status.issues.join(', ') || 'Нет'}

Facebook Ads API: ${validation.facebook_ads_status.healthy ? '✅ Работает' : '❌ Недоступен'}
  Token: ${validation.facebook_ads_status.token_valid ? 'Valid' : 'Invalid'}
  Issues: ${validation.facebook_ads_status.issues.join(', ') || 'Нет'}

Database: ${validation.database_status.healthy ? '✅ Работает' : '❌ Недоступен'}
  Issues: ${validation.database_status.issues.join(', ') || 'Нет'}

Качество данных:
  Полнота: ${validation.dataQuality.completeness}%
  Точность: ${validation.dataQuality.accuracy}%
  Консистентность: ${validation.dataQuality.consistency}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${validation.issues.length > 0 ? validation.issues.map(i => 
  `[${i.severity.toUpperCase()}] ${i.source}: ${i.message}`
).join('\n') : 'Нет критических проблем'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 АНОМАЛИИ В ДАННЫХ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${validation.anomalies.length > 0 ? validation.anomalies.map(a => 
  `[${a.severity.toUpperCase()}] ${a.metric}: ${a.description} (value: ${a.value}${a.threshold ? `, threshold: ${a.threshold}` : ''})`
).join('\n') : 'Аномалий не обнаружено'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 ТВОИ ЗАДАЧИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Оцени общее состояние систем аналитики (Health Score 0-100):
   - 90-100: Отлично, все работает
   - 70-89: Хорошо, есть мелкие проблемы
   - 50-69: Предупреждение, требуется внимание
   - 0-49: Критично, нужны срочные действия

2. Дай краткую оценку (2-3 предложения) текущего состояния

3. Проведи детальный анализ:
   - Оцени каждую систему (AmoCRM, Facebook Ads, Database)
   - Проанализируй метрики (ROAS, CTR, конверсии)
   - Выяви тренды и паттерны
   - Оцени риски

4. Дай конкретные рекомендации (3-5 пунктов):
   - Что нужно исправить СРОЧНО
   - Что можно оптимизировать
   - Как улучшить результаты
   - Конкретные действия с приоритетами

5. Спрогнозируй риски (если есть проблемы):
   - Что случится если не исправить
   - Какие потери возможны
   - Критичность ситуации

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "healthScore": 85,
  "summary": "Краткая оценка состояния систем (2-3 предложения)",
  "insights": "Детальный анализ: статус каждой системы, анализ метрик, выявленные тренды",
  "recommendations": [
    "Конкретная рекомендация 1 с приоритетом",
    "Конкретная рекомендация 2 с приоритетом",
    "Конкретная рекомендация 3 с приоритетом"
  ],
  "risks": [
    "Риск 1 если не исправить проблемы",
    "Риск 2 с оценкой критичности"
  ]
}

ВАЖНО:
- Будь конкретным, не используй общие фразы
- Указывай цифры и метрики
- Давай actionable рекомендации
- Пиши профессионально но понятно
- Отвечай ТОЛЬКО на русском языке
- Формат ответа: ТОЛЬКО валидный JSON без markdown
`;
}

// 🔄 Fallback analysis if Groq AI fails
function generateFallbackAnalysis(
  validation: ValidationResult,
  metrics: any
): AIAnalysis {
  let healthScore = 100;
  const recommendations: string[] = [];
  const risks: string[] = [];
  
  // Reduce score based on issues
  const criticalIssues = validation.issues.filter(i => i.severity === 'critical').length;
  const warningIssues = validation.issues.filter(i => i.severity === 'warning').length;
  
  healthScore -= (criticalIssues * 30);
  healthScore -= (warningIssues * 10);
  
  // Reduce score based on data quality
  healthScore -= (100 - validation.dataQuality.completeness) * 0.2;
  healthScore -= (100 - validation.dataQuality.accuracy) * 0.3;
  healthScore -= (100 - validation.dataQuality.consistency) * 0.2;
  
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  
  // Generate summary
  let summary = '';
  if (healthScore >= 90) {
    summary = 'Все системы работают отлично. Данные синхронизированы корректно, аномалий не обнаружено.';
  } else if (healthScore >= 70) {
    summary = 'Системы работают стабильно, но есть несколько предупреждений. Рекомендуется проверить выявленные проблемы.';
  } else if (healthScore >= 50) {
    summary = 'Обнаружены проблемы, требующие внимания. Некоторые системы работают некорректно или данные неполные.';
  } else {
    summary = 'КРИТИЧЕСКОЕ СОСТОЯНИЕ! Обнаружены серьезные проблемы. Требуется срочное вмешательство.';
  }
  
  // Generate recommendations based on issues
  if (!validation.amocrm_status.healthy) {
    recommendations.push('Проверить токен AmoCRM API и восстановить подключение');
    risks.push('Отсутствие данных о продажах приведет к неточному расчету ROAS');
  }
  
  if (!validation.facebook_ads_status.healthy) {
    recommendations.push('Обновить токен Facebook Ads API');
    risks.push('Невозможно отслеживать эффективность рекламных кампаний');
  }
  
  if (metrics.roas < 1.0) {
    recommendations.push(`Оптимизировать кампании - текущий ROAS ${metrics.roas.toFixed(2)}x ниже окупаемости`);
    risks.push('Продолжение работы убыточных кампаний приведет к финансовым потерям');
  }
  
  if (metrics.ctr < 0.5) {
    recommendations.push(`Улучшить креативы - CTR ${metrics.ctr.toFixed(2)}% слишком низкий`);
  }
  
  if (metrics.spend > 0 && metrics.sales === 0) {
    recommendations.push('СРОЧНО: есть траты но нет продаж - проверить воронку');
    risks.push('Критический риск: бюджет расходуется без результата');
  }
  
  // Add general recommendations if none specific
  if (recommendations.length === 0) {
    recommendations.push('Продолжить мониторинг текущих показателей');
    recommendations.push('Тестировать новые рекламные креативы');
  }
  
  const insights = `
Статус систем:
- AmoCRM: ${validation.amocrm_status.healthy ? 'Работает корректно' : 'Требует внимания'}
- Facebook Ads: ${validation.facebook_ads_status.healthy ? 'Работает корректно' : 'Требует внимания'}
- Database: ${validation.database_status.healthy ? 'Работает корректно' : 'Требует внимания'}

Качество данных: ${validation.dataQuality.completeness}% полнота, ${validation.dataQuality.accuracy}% точность

Метрики:
- ROAS: ${metrics.roas.toFixed(2)}x ${metrics.roas >= 1.0 ? '(окупаемо)' : '(убыточно)'}
- CTR: ${metrics.ctr.toFixed(2)}% ${metrics.ctr >= 1.0 ? '(хорошо)' : '(требует улучшения)'}
- Продажи: ${metrics.sales} шт при тратах $${metrics.spend.toFixed(2)}
`.trim();
  
  return {
    healthScore,
    summary,
    insights,
    recommendations,
    risks
  };
}

// 🎯 Main function to run IAE Agent
export async function runIAEAnalysis(
  validation: ValidationResult,
  metrics: any,
  reportType: string
): Promise<AIAnalysis> {
  try {
    return await analyzeWithGroq(validation, metrics, reportType);
  } catch (error) {
    console.warn('⚠️ [IAE] Groq AI failed, using fallback analysis');
    return generateFallbackAnalysis(validation, metrics);
  }
}
