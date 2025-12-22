/**
 * Funnel Service - ONAI Academy Sales Funnel
 * 
 * Воронка продаж:
 * 1. ProfTest (🧪) - тестирование профессии
 * 2. ExpressCourse Landing (📚) - интерес к экспресс-курсу
 * 3. Payment (💳) - покупка ExpressCourse
 * 4. Tripwire (🎁) - основная воронка
 * 5. Main Product (🏆) - покупка основного продукта 490k
 * 
 * Метрики в реальном времени из Supabase + AmoCRM
 */

import { trafficAdminSupabase } from '../config/supabase-traffic.js';

export interface FunnelMetrics {
  visitors?: number;
  passed?: number;
  views?: number;
  addedCart?: number;
  purchases?: number;
  revenue?: number;
  completed?: number;
  deals?: number;
  upsells?: number;
  active?: number;
  avgTime?: number;
  avgValue?: number;
  conversions?: number;
}

export interface FunnelStage {
  id: string;
  title: string;
  emoji: string;
  metrics: FunnelMetrics;
  conversionRate: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  churnRisk?: number;
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
 * Получить все метрики воронки продаж
 */
export async function getFunnelMetrics(): Promise<FunnelResponse> {
  console.log('[Funnel Service] Getting funnel metrics...');

  const stages: FunnelStage[] = [
    // ═══════════════════════════════════════════════════════════════
    // STAGE 1: PROFTEST (🧪)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'proftest',
      title: 'ProfTest',
      emoji: '🧪',
      description: 'Тестирование профессии - первый контакт',
      metrics: await getProfTestMetrics(),
      conversionRate: 69.4,
      status: 'success'
    },

    // ═══════════════════════════════════════════════════════════════
    // STAGE 2: EXPRESS COURSE LANDING (📚)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'express',
      title: 'ExpressCourse Landing',
      emoji: '📚',
      description: 'Просмотр оффера экспресс-курса',
      metrics: await getExpressCourseMetrics(),
      conversionRate: 36.4,
      status: 'warning'
    },

    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: PAYMENT (💳)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'payment',
      title: 'Paid ExpressCourse',
      emoji: '💳',
      description: 'Оплата экспресс-курса',
      metrics: await getPaymentMetrics(),
      conversionRate: 89.1,
      status: 'success',
      churnRisk: 12
    },

    // ═══════════════════════════════════════════════════════════════
    // STAGE 4: TRIPWIRE (🎁)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'tripwire',
      title: 'Tripwire (Main Funnel)',
      emoji: '🎁',
      description: 'Прохождение основной воронки',
      metrics: await getTripwireMetrics(),
      conversionRate: 56.1,
      status: 'warning'
    },

    // ═══════════════════════════════════════════════════════════════
    // STAGE 5: MAIN PRODUCT (🏆)
    // ═══════════════════════════════════════════════════════════════
    {
      id: 'main',
      title: 'Main Product (490k)',
      emoji: '🏆',
      description: 'Покупка основного продукта 490,000 KZT',
      metrics: await getMainProductMetrics(),
      conversionRate: 100,
      status: 'success'
    }
  ];

  // Calculate totals
  const totalRevenue = stages.reduce((sum, stage) => {
    return sum + (stage.metrics.revenue || 0);
  }, 0);

  const firstStageInput = stages[0]?.metrics.visitors || 0;
  const lastStageOutput = stages[stages.length - 1]?.metrics.conversions || 0;
  const overallConversionRate = firstStageInput > 0 
    ? (lastStageOutput / firstStageInput) * 100 
    : 0;

  console.log(`[Funnel Service] ✅ Funnel calculated: ${stages.length} stages, ${totalRevenue.toLocaleString()} KZT total`);

  return {
    success: true,
    stages,
    totalRevenue,
    totalConversions: lastStageOutput,
    overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
    timestamp: new Date().toISOString()
  };
}

/**
 * STAGE 1: ProfTest Metrics
 * - Посещения landing page
 * - Завершенные тесты
 * - Среднее время прохождения
 */
async function getProfTestMetrics(): Promise<FunnelMetrics> {
  try {
    // TODO: Connect to real analytics
    // For now, return mock data based on requirements
    
    // Query example:
    // const { data: visits } = await trafficAdminSupabase
    //   .from('page_views')
    //   .select('count')
    //   .eq('page', 'proftest')
    //   .gte('created_at', getDateRange());
    
    // const { data: completed } = await trafficAdminSupabase
    //   .from('proftest_results')
    //   .select('count')
    //   .eq('status', 'completed')
    //   .gte('created_at', getDateRange());

    return {
      visitors: 1234,
      passed: 856,
      avgTime: 12 // minutes
    };
  } catch (error) {
    console.error('[Funnel Service] Error in getProfTestMetrics:', error);
    return {
      visitors: 0,
      passed: 0,
      avgTime: 0
    };
  }
}

/**
 * STAGE 2: ExpressCourse Landing Metrics
 * - Просмотры landing page
 * - Добавления в корзину
 * - Средняя стоимость
 */
async function getExpressCourseMetrics(): Promise<FunnelMetrics> {
  try {
    // TODO: Connect to real analytics
    
    // Query example:
    // const { data: views } = await trafficAdminSupabase
    //   .from('page_views')
    //   .select('count')
    //   .eq('page', 'express_course')
    //   .gte('created_at', getDateRange());
    
    // const { data: cart } = await trafficAdminSupabase
    //   .from('cart_events')
    //   .select('count')
    //   .eq('product', 'express_course')
    //   .eq('action', 'add')
    //   .gte('created_at', getDateRange());

    return {
      views: 856,
      addedCart: 312,
      avgValue: 8500 // KZT
    };
  } catch (error) {
    console.error('[Funnel Service] Error in getExpressCourseMetrics:', error);
    return {
      views: 0,
      addedCart: 0,
      avgValue: 0
    };
  }
}

/**
 * STAGE 3: Payment Metrics
 * - Оплаченные курсы
 * - Выручка
 * - Риск оттока
 */
async function getPaymentMetrics(): Promise<FunnelMetrics> {
  try {
    // TODO: Connect to payment system (AmoCRM/Supabase)
    
    // Query example:
    // const { data: payments } = await trafficAdminSupabase
    //   .from('payments')
    //   .select('*')
    //   .eq('product', 'express_course')
    //   .eq('status', 'completed')
    //   .gte('created_at', getDateRange());
    
    // const revenue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      purchases: 278,
      revenue: 2_370_000, // KZT
    };
  } catch (error) {
    console.error('[Funnel Service] Error in getPaymentMetrics:', error);
    return {
      purchases: 0,
      revenue: 0
    };
  }
}

/**
 * STAGE 4: Tripwire Metrics
 * - Активные студенты
 * - Завершившие курс
 * - Закрытые сделки
 */
async function getTripwireMetrics(): Promise<FunnelMetrics> {
  try {
    // TODO: Connect to Tripwire database
    
    // Query example:
    // const { data: active } = await supabaseTripwire
    //   .from('students')
    //   .select('count')
    //   .eq('status', 'active')
    //   .gte('enrolled_at', getDateRange());
    
    // const { data: completed } = await supabaseTripwire
    //   .from('students')
    //   .select('count')
    //   .eq('status', 'completed')
    //   .gte('enrolled_at', getDateRange());
    
    // const { data: deals } = await supabaseTripwire
    //   .from('deals')
    //   .select('count')
    //   .eq('status', 'closed_won')
    //   .gte('created_at', getDateRange());

    return {
      active: 278,
      completed: 156,
      deals: 142
    };
  } catch (error) {
    console.error('[Funnel Service] Error in getTripwireMetrics:', error);
    return {
      active: 0,
      completed: 0,
      deals: 0
    };
  }
}

/**
 * STAGE 5: Main Product Metrics
 * - Конверсии в основной продукт
 * - Выручка
 * - Апсейлы
 */
async function getMainProductMetrics(): Promise<FunnelMetrics> {
  try {
    // TODO: Connect to AmoCRM for main product sales
    
    // Query example:
    // const { data: sales } = await trafficAdminSupabase
    //   .from('sales')
    //   .select('*')
    //   .eq('product', 'main_490k')
    //   .eq('status', 'paid')
    //   .gte('created_at', getDateRange());
    
    // const revenue = sales.reduce((sum, s) => sum + s.amount, 0);
    // const upsells = sales.filter(s => s.is_upsell).length;

    return {
      conversions: 142,
      revenue: 69_580_000, // KZT
      upsells: 34
    };
  } catch (error) {
    console.error('[Funnel Service] Error in getMainProductMetrics:', error);
    return {
      conversions: 0,
      revenue: 0,
      upsells: 0
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

  // Add additional detailed metrics here if needed
  return {
    ...stage,
    // Add drill-down data
  };
}

/**
 * Helper: Get date range for queries (default: last 30 days)
 */
function getDateRange(days: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
