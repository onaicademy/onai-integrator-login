/**
 * Traffic Test Data Generator
 * Генератор тестовых данных с корректной логикой калькуляции метрик
 */

import {
  Product,
  ProductType,
  ProductDashboardData,
  CampaignMetrics,
  FunnelStage,
  ProductFunnel,
  AdPerformance,
  MetricCriticality,
  CriticalityLevel,
  Recommendation,
  ForecastData,
  AllProductsData,
} from '@/types/traffic-products.types';

// ============================================
// ПРОДУКТЫ (КОНСТАНТЫ)
// ============================================

export const PRODUCTS: Record<ProductType, Product> = {
  express: {
    id: 'express',
    name: 'Экспресс-курс',
    nameKz: 'Экспресс-курс',
    price: 10, // USD
    priceKZT: 5000, // KZT
    color: '#00FF88', // Tripwire green
    icon: '⚡',
  },
  challenge3d: {
    id: 'challenge3d',
    name: 'Трехдневник',
    nameKz: 'Үш күндік',
    price: 0, // Free
    priceKZT: 0,
    color: '#FFD700', // Gold
    icon: '🔥',
  },
  intensive1d: {
    id: 'intensive1d',
    name: 'Однодневник',
    nameKz: 'Бір күндік',
    price: 0, // Free
    priceKZT: 0,
    color: '#FF6B6B', // Red
    icon: '⚡',
  },
};

// ============================================
// ВОРОНКИ ПРОДАЖ (STAGES)
// ============================================

const EXPRESS_FUNNEL_STAGES: Omit<FunnelStage, 'count' | 'percentage'>[] = [
  { id: 'impressions', name: 'Показы', nameKz: 'Көрсетулер', color: '#6366f1', previousStage: undefined },
  { id: 'clicks', name: 'Клики', nameKz: 'Басу', color: '#8b5cf6', previousStage: 'impressions' },
  { id: 'landing', name: 'Посадочная', nameKz: 'Бастапқы бет', color: '#a855f7', previousStage: 'clicks' },
  { id: 'leads', name: 'Лиды', nameKz: 'Лидтер', color: '#c084fc', previousStage: 'landing' },
  { id: 'purchases', name: 'Покупки', nameKz: 'Сатып алу', color: '#00FF88', previousStage: 'leads' },
];

const CHALLENGE3D_FUNNEL_STAGES: Omit<FunnelStage, 'count' | 'percentage'>[] = [
  { id: 'impressions', name: 'Показы', nameKz: 'Көрсетулер', color: '#6366f1', previousStage: undefined },
  { id: 'clicks', name: 'Клики', nameKz: 'Басу', color: '#8b5cf6', previousStage: 'impressions' },
  { id: 'registration', name: 'Регистрации', nameKz: 'Тіркелулер', color: '#a855f7', previousStage: 'clicks' },
  { id: 'day1', name: 'День 1', nameKz: '1-күн', color: '#c084fc', previousStage: 'registration' },
  { id: 'day2', name: 'День 2', nameKz: '2-күн', color: '#d8b4fe', previousStage: 'day1' },
  { id: 'day3', name: 'День 3', nameKz: '3-күн', color: '#e9d5ff', previousStage: 'day2' },
  { id: 'completed', name: 'Завершили', nameKz: 'Аяқтады', color: '#FFD700', previousStage: 'day3' },
];

const INTENSIVE1D_FUNNEL_STAGES: Omit<FunnelStage, 'count' | 'percentage'>[] = [
  { id: 'impressions', name: 'Показы', nameKz: 'Көрсетулер', color: '#6366f1', previousStage: undefined },
  { id: 'clicks', name: 'Клики', nameKz: 'Басу', color: '#8b5cf6', previousStage: 'impressions' },
  { id: 'registration', name: 'Регистрации', nameKz: 'Тіркелулер', color: '#a855f7', previousStage: 'clicks' },
  { id: 'attended', name: 'Присутствовали', nameKz: 'Қатысты', color: '#c084fc', previousStage: 'registration' },
  { id: 'completed', name: 'Завершили', nameKz: 'Аяқтады', color: '#FF6B6B', previousStage: 'attended' },
];

// ============================================
// ГЕНЕРАТОР ТЕСТОВЫХ ДАННЫХ
// ============================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * Генерация воронки с реалистичной конверсией
 */
function generateFunnel(
  productId: ProductType,
  baseImpressions: number
): ProductFunnel {
  const stages = productId === 'express'
    ? EXPRESS_FUNNEL_STAGES
    : productId === 'challenge3d'
      ? CHALLENGE3D_FUNNEL_STAGES
      : INTENSIVE1D_FUNNEL_STAGES;

  const funnelStages: FunnelStage[] = [];
  let previousCount = baseImpressions;

  stages.forEach((stage, index) => {
    let count: number;

    if (index === 0) {
      // Первый этап - показы
      count = baseImpressions;
    } else {
      // Каждый следующий этап - процент от предыдущего
      const conversionRate = randomFloat(0.15, 0.45); // 15-45% конверсия между этапами
      count = Math.floor(previousCount * conversionRate);
    }

    const percentage = (count / baseImpressions) * 100;

    funnelStages.push({
      ...stage,
      count,
      percentage: parseFloat(percentage.toFixed(2)),
    });

    previousCount = count;
  });

  const totalLeads = funnelStages.find((s) => s.id === 'leads' || s.id === 'registration')?.count || 0;
  const totalPurchases = funnelStages.find((s) => s.id === 'purchases' || s.id === 'completed')?.count || 0;
  const overallConversion = totalLeads > 0 ? (totalPurchases / totalLeads) * 100 : 0;

  return {
    productId,
    stages: funnelStages,
    totalLeads,
    totalPurchases,
    overallConversion: parseFloat(overallConversion.toFixed(2)),
  };
}

/**
 * Генерация метрик кампании с корректной логикой
 */
function generateMetrics(funnel: ProductFunnel, product: Product): CampaignMetrics {
  const impressions = funnel.stages[0].count;
  const clicks = funnel.stages.find((s) => s.id === 'clicks')?.count || 0;
  const leads = funnel.totalLeads;
  const purchases = funnel.totalPurchases;

  // Траты (случайные, но реалистичные)
  const spend = randomFloat(500, 5000, 2);

  // Базовые метрики
  const ctr = clicks > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  // Лиды
  const cpl = leads > 0 ? spend / leads : 0;
  const leadConversion = clicks > 0 ? (leads / clicks) * 100 : 0;

  // Продажи
  const revenue = purchases * product.price;
  const cpa = purchases > 0 ? spend / purchases : 0;
  const purchaseConversion = leads > 0 ? (purchases / leads) * 100 : 0;

  // Окупаемость
  const roas = spend > 0 ? revenue / spend : 0;
  const profit = revenue - spend;
  const roi = spend > 0 ? (profit / spend) * 100 : 0;
  const profitability = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    impressions,
    clicks,
    ctr: parseFloat(ctr.toFixed(2)),
    spend: parseFloat(spend.toFixed(2)),
    cpc: parseFloat(cpc.toFixed(2)),
    cpm: parseFloat(cpm.toFixed(2)),
    leads,
    cpl: parseFloat(cpl.toFixed(2)),
    leadConversion: parseFloat(leadConversion.toFixed(2)),
    purchases,
    revenue: parseFloat(revenue.toFixed(2)),
    cpa: parseFloat(cpa.toFixed(2)),
    purchaseConversion: parseFloat(purchaseConversion.toFixed(2)),
    roas: parseFloat(roas.toFixed(2)),
    roi: parseFloat(roi.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profitability: parseFloat(profitability.toFixed(2)),
  };
}

/**
 * Оценка критичности метрики
 */
function evaluateCriticality(
  metric: keyof CampaignMetrics,
  value: number
): MetricCriticality {
  const thresholds: Record<string, MetricCriticality['threshold']> = {
    ctr: { critical: 0.5, warning: 1.0, normal: 2.0, good: 3.0, excellent: 5.0 },
    roas: { critical: 0.5, warning: 1.0, normal: 2.0, good: 3.0, excellent: 5.0 },
    roi: { critical: -50, warning: 0, normal: 50, good: 100, excellent: 200 },
    leadConversion: { critical: 5, warning: 10, normal: 20, good: 30, excellent: 50 },
    purchaseConversion: { critical: 2, warning: 5, normal: 10, good: 15, excellent: 25 },
  };

  const threshold = thresholds[metric];
  if (!threshold) {
    return {
      metric,
      value,
      level: 'normal',
      threshold: { critical: 0, warning: 0, normal: 0, good: 0, excellent: 0 },
      message: 'No threshold defined',
      messageKz: 'Шек белгіленбеген',
    };
  }

  let level: CriticalityLevel;
  let message: string;
  let messageKz: string;

  if (value < threshold.critical) {
    level = 'critical';
    message = 'Критично низкий показатель';
    messageKz = 'Өте төмен көрсеткіш';
  } else if (value < threshold.warning) {
    level = 'warning';
    message = 'Требует внимания';
    messageKz = 'Назар аудару керек';
  } else if (value < threshold.normal) {
    level = 'normal';
    message = 'В пределах нормы';
    messageKz = 'Қалыпты';
  } else if (value < threshold.good) {
    level = 'good';
    message = 'Хороший результат';
    messageKz = 'Жақсы нәтиже';
  } else {
    level = 'excellent';
    message = 'Отличный результат';
    messageKz = 'Өте жақсы нәтиже';
  }

  return { metric, value, level, threshold, message, messageKz };
}

/**
 * Генерация рекомендаций на основе метрик
 */
function generateRecommendations(metrics: CampaignMetrics): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // ROAS < 2.0 - увеличить бюджет успешных кампаний
  if (metrics.roas > 3.0) {
    recommendations.push({
      id: 'rec_scale',
      type: 'scale_campaign',
      priority: 'high',
      title: 'Масштабировать успешную кампанию',
      titleKz: 'Табысты науқанды кеңейту',
      description: `ROAS ${metrics.roas.toFixed(2)} - отличный результат. Рекомендуется увеличить бюджет на 20-30%.`,
      descriptionKz: `ROAS ${metrics.roas.toFixed(2)} - өте жақсы нәтиже. Бюджетті 20-30% арттыру ұсынылады.`,
      impact: '+$500-1000 выручки',
      impactKz: '+$500-1000 табыс',
      actionLabel: 'Увеличить бюджет',
      actionLabelKz: 'Бюджетті арттыру',
      relatedMetric: 'roas',
    });
  }

  // CTR < 1% - оптимизировать креатив
  if (metrics.ctr < 1.0) {
    recommendations.push({
      id: 'rec_creative',
      type: 'optimize_creative',
      priority: 'high',
      title: 'Оптимизировать креативы',
      titleKz: 'Креативтерді оңтайландыру',
      description: `CTR ${metrics.ctr.toFixed(2)}% ниже нормы. Рекомендуется обновить объявления.`,
      descriptionKz: `CTR ${metrics.ctr.toFixed(2)}% қалыптан төмен. Жарнамаларды жаңарту ұсынылады.`,
      impact: '+0.5-1% CTR',
      impactKz: '+0.5-1% CTR',
      actionLabel: 'Создать новые креативы',
      actionLabelKz: 'Жаңа креативтер жасау',
      relatedMetric: 'ctr',
    });
  }

  // ROAS < 1.0 - приостановить кампанию
  if (metrics.roas < 1.0) {
    recommendations.push({
      id: 'rec_pause',
      type: 'pause_campaign',
      priority: 'high',
      title: 'Приостановить неэффективную кампанию',
      titleKz: 'Тиімсіз науқанды тоқтату',
      description: `ROAS ${metrics.roas.toFixed(2)} - кампания убыточна. Рекомендуется приостановить и провести аудит.`,
      descriptionKz: `ROAS ${metrics.roas.toFixed(2)} - науқан зиянды. Тоқтатып, аудит жүргізу ұсынылады.`,
      impact: 'Экономия $${metrics.spend.toFixed(0)}',
      impactKz: '${metrics.spend.toFixed(0)}$ үнемдеу',
      actionLabel: 'Приостановить',
      actionLabelKz: 'Тоқтату',
      relatedMetric: 'roas',
    });
  }

  return recommendations;
}

/**
 * Генерация прогноза
 */
function generateForecast(metrics: CampaignMetrics, period: '7d' | '14d' | '30d'): ForecastData {
  const multiplier = period === '7d' ? 7 : period === '14d' ? 14 : 30;

  return {
    period,
    predictedLeads: Math.floor(metrics.leads * multiplier * randomFloat(0.9, 1.1)),
    leadsConfidence: randomFloat(75, 95),
    predictedPurchases: Math.floor(metrics.purchases * multiplier * randomFloat(0.9, 1.1)),
    purchasesConfidence: randomFloat(70, 90),
    predictedRevenue: parseFloat((metrics.revenue * multiplier * randomFloat(0.9, 1.1)).toFixed(2)),
    revenueConfidence: randomFloat(70, 90),
    predictedSpend: parseFloat((metrics.spend * multiplier * randomFloat(0.95, 1.05)).toFixed(2)),
    spendConfidence: randomFloat(80, 95),
    predictedROAS: parseFloat((metrics.roas * randomFloat(0.95, 1.05)).toFixed(2)),
    roasConfidence: randomFloat(65, 85),
  };
}

/**
 * Генерация топ-объявлений
 */
function generateTopAds(metrics: CampaignMetrics, productId: ProductType): AdPerformance[] {
  const topAds: AdPerformance[] = [];

  for (let i = 0; i < 5; i++) {
    const adMetrics = { ...metrics };
    // Варьируем метрики для каждого объявления
    adMetrics.impressions = Math.floor(metrics.impressions / 5 * randomFloat(0.8, 1.2));
    adMetrics.clicks = Math.floor(metrics.clicks / 5 * randomFloat(0.8, 1.2));
    adMetrics.leads = Math.floor(metrics.leads / 5 * randomFloat(0.8, 1.2));
    adMetrics.purchases = Math.floor(metrics.purchases / 5 * randomFloat(0.8, 1.2));
    adMetrics.spend = parseFloat((metrics.spend / 5 * randomFloat(0.8, 1.2)).toFixed(2));
    adMetrics.revenue = parseFloat((metrics.revenue / 5 * randomFloat(0.8, 1.2)).toFixed(2));
    adMetrics.roas = adMetrics.spend > 0 ? adMetrics.revenue / adMetrics.spend : 0;

    topAds.push({
      ...adMetrics,
      adId: `ad_${productId}_${i + 1}`,
      adName: `${PRODUCTS[productId].name} - Креатив ${i + 1}`,
      campaignId: `campaign_${productId}`,
      campaignName: `${PRODUCTS[productId].name} Campaign`,
      adsetId: `adset_${productId}_${i + 1}`,
      adsetName: `Adset ${i + 1}`,
      status: i === 0 ? 'active' : randomInt(1, 10) > 3 ? 'active' : 'paused',
      createdAt: new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Сортируем по ROAS (лучшие первыми)
  return topAds.sort((a, b) => b.roas - a.roas);
}

/**
 * Генерация данных дашборда для одного продукта
 */
export function generateProductDashboard(productId: ProductType): ProductDashboardData {
  const product = PRODUCTS[productId];
  const funnel = generateFunnel(productId, randomInt(50000, 200000));
  const metrics = generateMetrics(funnel, product);
  const topAds = generateTopAds(metrics, productId);
  const criticality: MetricCriticality[] = [
    evaluateCriticality('ctr', metrics.ctr),
    evaluateCriticality('roas', metrics.roas),
    evaluateCriticality('roi', metrics.roi),
    evaluateCriticality('leadConversion', metrics.leadConversion),
    evaluateCriticality('purchaseConversion', metrics.purchaseConversion),
  ];
  const recommendations = generateRecommendations(metrics);
  const forecast = generateForecast(metrics, '7d');

  return {
    product,
    funnel,
    metrics,
    topAds,
    criticality,
    recommendations,
    forecast,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Генерация данных для всех продуктов
 */
export function generateAllProductsData(): AllProductsData {
  const express = generateProductDashboard('express');
  const challenge3d = generateProductDashboard('challenge3d');
  const intensive1d = generateProductDashboard('intensive1d');

  // Агрегированные метрики
  const totalMetrics: CampaignMetrics = {
    impressions: express.metrics.impressions + challenge3d.metrics.impressions + intensive1d.metrics.impressions,
    clicks: express.metrics.clicks + challenge3d.metrics.clicks + intensive1d.metrics.clicks,
    ctr: 0,
    spend: express.metrics.spend + challenge3d.metrics.spend + intensive1d.metrics.spend,
    cpc: 0,
    cpm: 0,
    leads: express.metrics.leads + challenge3d.metrics.leads + intensive1d.metrics.leads,
    cpl: 0,
    leadConversion: 0,
    purchases: express.metrics.purchases + challenge3d.metrics.purchases + intensive1d.metrics.purchases,
    revenue: express.metrics.revenue + challenge3d.metrics.revenue + intensive1d.metrics.revenue,
    cpa: 0,
    purchaseConversion: 0,
    roas: 0,
    roi: 0,
    profit: 0,
    profitability: 0,
  };

  // Пересчитываем агрегированные показатели
  totalMetrics.ctr = totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;
  totalMetrics.cpc = totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0;
  totalMetrics.cpm = totalMetrics.impressions > 0 ? (totalMetrics.spend / totalMetrics.impressions) * 1000 : 0;
  totalMetrics.cpl = totalMetrics.leads > 0 ? totalMetrics.spend / totalMetrics.leads : 0;
  totalMetrics.leadConversion = totalMetrics.clicks > 0 ? (totalMetrics.leads / totalMetrics.clicks) * 100 : 0;
  totalMetrics.cpa = totalMetrics.purchases > 0 ? totalMetrics.spend / totalMetrics.purchases : 0;
  totalMetrics.purchaseConversion = totalMetrics.leads > 0 ? (totalMetrics.purchases / totalMetrics.leads) * 100 : 0;
  totalMetrics.roas = totalMetrics.spend > 0 ? totalMetrics.revenue / totalMetrics.spend : 0;
  totalMetrics.profit = totalMetrics.revenue - totalMetrics.spend;
  totalMetrics.roi = totalMetrics.spend > 0 ? (totalMetrics.profit / totalMetrics.spend) * 100 : 0;
  totalMetrics.profitability = totalMetrics.revenue > 0 ? (totalMetrics.profit / totalMetrics.revenue) * 100 : 0;

  return {
    products: {
      express,
      challenge3d,
      intensive1d,
    },
    totalMetrics,
    totalRevenue: totalMetrics.revenue,
    totalProfit: totalMetrics.profit,
    overallROAS: totalMetrics.roas,
    lastUpdated: new Date().toISOString(),
  };
}
