/**
 * Funnel Service - ONAI Academy Sales Funnel (Landing DB Only)
 * 
 * Воронка продаж (3 этапа):
 * 1. ProfTest (🧪) - тестирование профессии
 * 2. ExpressCourse Landing (📚) - просмотр оффера
 * 3. Payment (💳) - оплата экспресс-курса 5K
 * 
 * Production-ready: кэширование, error handling, query optimization
 */

import { landingSupabase } from '../config/supabase-landing.js';
import { getCachedOrFresh } from './cache-service.js';

// Date filter: last 30 days
const THIRTY_DAYS_AGO = new Date();
THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

export interface FunnelMetrics {
  visitors?: number;
  passed?: number;
  views?: number;
  purchases?: number;
  revenue?: number;
  avgValue?: number;
}

export interface FunnelStage {
  id: string;
  title: string;
  emoji: string;
  metrics: FunnelMetrics;
  conversionRate: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  description?: string;
}

export interface FunnelResponse {
  success: boolean;
  stages: FunnelStage[];
  totalRevenue: number;
  totalConversions: number;
  overallConversionRate: number;
  timestamp: string;
}

/**
 * STAGE 1: ProfTest Metrics
 * Источник: landing_leads WHERE source LIKE 'proftest%'
 */
async function getProfTestMetrics(): Promise<FunnelMetrics> {
  return getCachedOrFresh('funnel:proftest', async () => {
    try {
      console.log('[Funnel] Fetching ProfTest metrics from Landing DB...');
      
      const { data, error } = await landingSupabase
        .from('landing_leads')
        .select('id, created_at')
        .like('source', 'proftest%') // source = 'proftest_arystan', 'proftest_aruzhan', etc
        .gte('created_at', THIRTY_DAYS_AGO.toISOString())
        .limit(10000)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[Funnel] ProfTest error:', error.message);
        throw error;
      }
      
      const visitors = data?.length || 0;
      
      console.log(`[Funnel] ✅ ProfTest: ${visitors} visitors`);
      
      return {
        visitors: visitors,
        passed: visitors // все кто посетил = прошли тест
      };
    } catch (error: any) {
      console.error('[Funnel] getProfTestMetrics failed:', error.message);
      // Fallback: return zero metrics on error
      return { visitors: 0, passed: 0 };
    }
  }, 300); // TTL 5 мин
}

/**
 * STAGE 2: Express Course Landing Metrics
 * Источник: landing_leads WHERE email_sent=true (получили оффер)
 */
async function getExpressCourseMetrics(): Promise<FunnelMetrics> {
  return getCachedOrFresh('funnel:express', async () => {
    try {
      console.log('[Funnel] Fetching Express Course metrics from Landing DB...');
      
      const { data, error } = await landingSupabase
        .from('landing_leads')
        .select('id')
        .eq('email_sent', true) // Получили email с оффером = посмотрели лендинг
        .gte('created_at', THIRTY_DAYS_AGO.toISOString())
        .limit(10000);
      
      if (error) {
        console.error('[Funnel] Express error:', error.message);
        throw error;
      }
      
      const views = data?.length || 0;
      
      console.log(`[Funnel] ✅ Express Course: ${views} views`);
      
      return {
        views: views,
        avgValue: 5000 // Express курс = 5K KZT
      };
    } catch (error: any) {
      console.error('[Funnel] getExpressCourseMetrics failed:', error.message);
      return { views: 0, avgValue: 0 };
    }
  }, 300);
}

/**
 * STAGE 3: Payment Metrics (5K Express Course)
 * Источник: landing_leads WHERE sms_clicked=true (индикатор оплаты)
 * ✅ sms_clicked = пользователь перешёл по SMS-ссылке = купил курс
 */
async function getPaymentMetrics(): Promise<FunnelMetrics> {
  return getCachedOrFresh('funnel:payment', async () => {
    try {
      console.log('[Funnel] Fetching Payment metrics from Landing DB...');
      
      // ✅ Правильный индикатор: sms_clicked = true (переход по SMS = покупка)
      const { data, error } = await landingSupabase
        .from('landing_leads')
        .select('id, source')
        .eq('sms_clicked', true)
        .gte('created_at', THIRTY_DAYS_AGO.toISOString())
        .limit(10000);
      
      if (error) {
        console.error('[Funnel] Payment error:', error.message);
        throw error;
      }
      
      const purchases = data?.length || 0;
      const revenue = purchases * 5000; // 5K за каждый курс
      
      console.log(`[Funnel] ✅ Payment: ${purchases} purchases, ${revenue} KZT`);
      
      // Debug: показать распределение по таргетологам
      if (data && data.length > 0) {
        const byTargetologist = data.reduce((acc: any, lead: any) => {
          const source = lead.source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {});
        console.log('[Funnel] 📊 Payment by targetologist:', byTargetologist);
      }
      
      return {
        purchases: purchases,
        revenue: revenue
      };
    } catch (error: any) {
      console.error('[Funnel] getPaymentMetrics failed:', error.message);
      return { purchases: 0, revenue: 0 };
    }
  }, 300);
}

/**
 * Главная функция - получить все метрики воронки
 * Загружает ВСЕ 3 этапа ПАРАЛЛЕЛЬНО
 */
export async function getFunnelMetrics(): Promise<FunnelResponse> {
  console.log('[Funnel Service] 🚀 Getting funnel metrics from Landing DB...');

  try {
    // 🚀 Параллельная загрузка всех 3 этапов
    const [proftest, express, payment] = await Promise.all([
      getProfTestMetrics(),
      getExpressCourseMetrics(),
      getPaymentMetrics()
    ]);

    // Рассчитываем conversion rates
    const expressConversion = proftest.visitors && proftest.visitors > 0
      ? Math.round((express.views! / proftest.visitors) * 100) 
      : 0;

    const paymentConversion = express.views && express.views > 0
      ? Math.round((payment.purchases! / express.views) * 100) 
      : 0;

    const stages: FunnelStage[] = [
      {
        id: 'proftest',
        title: 'ProfTest',
        emoji: '🧪',
        description: 'Тестирование профессии - первый контакт',
        metrics: proftest,
        conversionRate: 100,
        status: 'success'
      },
      {
        id: 'express',
        title: 'Express Course Landing',
        emoji: '📚',
        description: 'Просмотр оффера экспресс-курса',
        metrics: express,
        conversionRate: expressConversion,
        status: expressConversion > 30 ? 'success' : 'warning'
      },
      {
        id: 'payment',
        title: 'Paid Express Course (5K)',
        emoji: '💳',
        description: 'Оплата экспресс-курса',
        metrics: payment,
        conversionRate: paymentConversion,
        status: paymentConversion > 20 ? 'success' : 'warning'
      }
    ];

    const totalRevenue = payment.revenue || 0;
    const totalConversions = payment.purchases || 0;
    const firstInput = proftest.visitors || 0;
    const overallConversion = firstInput > 0 
      ? (totalConversions / firstInput) * 100 
      : 0;

    console.log(`[Funnel Service] ✅ Success: 3 stages, ${totalRevenue.toLocaleString()} KZT, ${totalConversions} conversions`);

    return {
      success: true,
      stages,
      totalRevenue,
      totalConversions,
      overallConversionRate: parseFloat(overallConversion.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('[Funnel Service] ❌ FATAL ERROR:', error.message);
    
    // Return empty funnel on fatal error
    return {
      success: false,
      stages: [],
      totalRevenue: 0,
      totalConversions: 0,
      overallConversionRate: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Получить детальную информацию по конкретному stage
 */
export async function getFunnelStageDetails(stageId: string): Promise<FunnelStage | null> {
  console.log(`[Funnel Service] Getting details for stage: ${stageId}`);

  const allMetrics = await getFunnelMetrics();
  const stage = allMetrics.stages.find(s => s.id === stageId);

  if (!stage) {
    console.warn(`[Funnel Service] Stage not found: ${stageId}`);
    return null;
  }

  return stage;
}
