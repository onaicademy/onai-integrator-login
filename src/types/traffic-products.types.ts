/**
 * Traffic Products Types
 * Типы данных для системы продуктов Traffic Dashboard
 *
 * Продукты:
 * - Экспресс-курс (Express Course)
 * - Трехдневник (3-Day Challenge)
 * - Однодневник (1-Day Intensive)
 */

// ============================================
// ПРОДУКТЫ
// ============================================

export type ProductType = 'express' | 'challenge3d' | 'intensive1d';

export interface Product {
  id: ProductType;
  name: string;
  nameKz: string;
  price: number;
  priceKZT: number;
  color: string; // Brand color for this product
  icon: string;
}

// ============================================
// ВОРОНКА ПРОДАЖ (FUNNEL STAGES)
// ============================================

export interface FunnelStage {
  id: string;
  name: string;
  nameKz: string;
  count: number;
  percentage: number;
  color: string;
  previousStage?: string; // Для расчета конверсии между этапами
}

export interface ProductFunnel {
  productId: ProductType;
  stages: FunnelStage[];
  totalLeads: number;
  totalPurchases: number;
  overallConversion: number; // Общая конверсия от лидов к покупкам
}

// ============================================
// МЕТРИКИ МАРКЕТИНГА
// ============================================

export interface CampaignMetrics {
  // Базовые метрики
  impressions: number; // Показы
  clicks: number; // Клики
  ctr: number; // Click-Through Rate (%)

  // Стоимостные метрики
  spend: number; // Траты на рекламу
  cpc: number; // Cost Per Click
  cpm: number; // Cost Per Mille (1000 impressions)

  // Лиды
  leads: number; // Количество лидов
  cpl: number; // Cost Per Lead
  leadConversion: number; // % конверсии в лиды

  // Продажи
  purchases: number; // Количество покупок
  revenue: number; // Выручка
  cpa: number; // Cost Per Acquisition
  purchaseConversion: number; // % конверсии в покупки

  // Окупаемость
  roas: number; // Return on Ad Spend
  roi: number; // Return on Investment (%)
  profit: number; // Прибыль
  profitability: number; // Рентабельность (%)
}

export interface AdPerformance extends CampaignMetrics {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// КРИТИЧНОСТЬ ПОКАЗАТЕЛЕЙ
// ============================================

export type CriticalityLevel = 'critical' | 'warning' | 'normal' | 'good' | 'excellent';

export interface MetricCriticality {
  metric: keyof CampaignMetrics;
  value: number;
  level: CriticalityLevel;
  threshold: {
    critical: number; // Критично плохо
    warning: number; // Требует внимания
    normal: number; // Норма
    good: number; // Хорошо
    excellent: number; // Отлично
  };
  message: string;
  messageKz: string;
}

// ============================================
// РЕКОМЕНДАЦИИ
// ============================================

export type RecommendationType =
  | 'increase_budget'
  | 'decrease_budget'
  | 'pause_campaign'
  | 'optimize_creative'
  | 'optimize_targeting'
  | 'scale_campaign'
  | 'test_new_audience';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  titleKz: string;
  description: string;
  descriptionKz: string;
  impact: string; // Прогнозируемый эффект
  impactKz: string;
  actionLabel: string;
  actionLabelKz: string;
  relatedMetric?: keyof CampaignMetrics;
  campaignId?: string;
}

// ============================================
// ПРОГНОЗЫ
// ============================================

export interface ForecastData {
  period: '7d' | '14d' | '30d';

  // Прогноз по лидам
  predictedLeads: number;
  leadsConfidence: number; // Уверенность прогноза (0-100%)

  // Прогноз по продажам
  predictedPurchases: number;
  purchasesConfidence: number;

  // Прогноз по выручке
  predictedRevenue: number;
  revenueConfidence: number;

  // Прогноз по тратам
  predictedSpend: number;
  spendConfidence: number;

  // Прогноз ROAS
  predictedROAS: number;
  roasConfidence: number;
}

// ============================================
// ДАШБОРД ДАННЫЕ
// ============================================

export interface ProductDashboardData {
  product: Product;
  funnel: ProductFunnel;
  metrics: CampaignMetrics;
  topAds: AdPerformance[]; // Топ-5 объявлений
  criticality: MetricCriticality[];
  recommendations: Recommendation[];
  forecast: ForecastData;
  lastUpdated: string;
}

// ============================================
// АГРЕГИРОВАННЫЕ ДАННЫЕ ПО ВСЕМ ПРОДУКТАМ
// ============================================

export interface AllProductsData {
  products: {
    express: ProductDashboardData;
    challenge3d: ProductDashboardData;
    intensive1d: ProductDashboardData;
  };
  totalMetrics: CampaignMetrics;
  totalRevenue: number;
  totalProfit: number;
  overallROAS: number;
  lastUpdated: string;
}

// ============================================
// ТЕСТОВЫЕ ДАННЫЕ (для разработки)
// ============================================

export interface TestDataConfig {
  useTestData: boolean;
  randomize: boolean;
  dateRange: '7d' | '14d' | '30d';
}
