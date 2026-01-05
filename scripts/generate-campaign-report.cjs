#!/usr/bin/env node

/**
 * Скрипт для генерации полного отчета по эффективности рекламной кампании
 * Период: 29 декабря 2025 - 3 января 2026
 */

const fs = require('fs');

// Данные из Facebook Ads API (из facebook-spend-report.json)
const FACEBOOK_DATA = {
  period: { start: '2025-12-29', end: '2026-01-03' },
  accounts: [
    {
      account_id: 'act_964264512447589',
      account_name: 'Nutrients.kz (Kenji)',
      total_spend: 268.93,
      total_impressions: 52195,
      total_clicks: 1105,
      ads_count: 33,
      campaigns_count: 3
    },
    {
      account_id: 'act_30779210298344970',
      account_name: 'onAI Academy (Александр)',
      total_spend: 427.12,
      total_impressions: 110601,
      total_clicks: 1456,
      ads_count: 10,
      campaigns_count: 2
    }
  ],
  summary: {
    total_spend: 696.05,
    total_impressions: 162796,
    total_clicks: 2561,
    overall_ctr: '1.57',
    overall_cpc: '0.27'
  }
};

// Данные о лидах по UTM Source (из Landing DB)
const LEADS_DATA = [
  { utm_source: 'fb_traf4', utm_medium: 'h3 t-D', utm_campaign: 'OnAI | Test | 11.12', source: 'challenge3d', total_leads: 91, campaign_leads: 91 },
  { utm_source: 'facebook', utm_medium: 'wide', utm_campaign: 'nutcab_3days_alexcreos_14.11', source: 'challenge3d', total_leads: 58, campaign_leads: 58 },
  { utm_source: 'fb_traf4', utm_medium: 'h2 t-D', utm_campaign: 'OnAI | Test | 11.12', source: 'challenge3d', total_leads: 46, campaign_leads: 46 },
  { utm_source: 'pb_agency_FB', utm_medium: 'Instagram_Reels', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 33, campaign_leads: 33 },
  { utm_source: null, utm_medium: null, utm_campaign: null, source: 'proftest_unknown', total_leads: 25, campaign_leads: 25 },
  { utm_source: 'kenjifb', utm_medium: 'ta2', utm_campaign: 'nutcab_3days_newcreos_06.12', source: 'challenge3d', total_leads: 25, campaign_leads: 25 },
  { utm_source: null, utm_medium: null, utm_campaign: null, source: 'challenge3d', total_leads: 18, campaign_leads: 18 },
  { utm_source: 'pb_agency_FB', utm_medium: 'Instagram_Stories', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 18, campaign_leads: 18 },
  { utm_source: 'pb_agency_FB', utm_medium: 'Instagram_Feed', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 17, campaign_leads: 17 },
  { utm_source: 'instagramalex', utm_medium: 'social', utm_campaign: null, source: 'challenge3d', total_leads: 13, campaign_leads: 13 },
  { utm_source: 'alex_FB', utm_medium: 'Instagram_Reels', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 12, campaign_leads: 12 },
  { utm_source: 'kenjifb', utm_medium: 'ta3', utm_campaign: 'nutcab_3days_newcreos_06.12', source: 'challenge3d', total_leads: 8, campaign_leads: 8 },
  { utm_source: 'kenjifb', utm_medium: 'ta3', utm_campaign: 'nutcab_3days_diascreos_06.12', source: 'challenge3d', total_leads: 7, campaign_leads: 7 },
  { utm_source: 'kenjifb', utm_medium: 'ta1', utm_campaign: 'nutcab_3days_diascreos_06.12', source: 'challenge3d', total_leads: 4, campaign_leads: 4 },
  { utm_source: 'alex_FB', utm_medium: 'Instagram_Feed', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 4, campaign_leads: 4 },
  { utm_source: 'alex_FB', utm_medium: 'Instagram_Stories', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 4, campaign_leads: 4 },
  { utm_source: 'fb_traf4', utm_medium: '{{ad.name}}', utm_campaign: '{{campaign.name}}', source: 'challenge3d', total_leads: 3, campaign_leads: 3 },
  { utm_source: 'kenjifb', utm_medium: 'wide', utm_campaign: 'nutcab_3days_newcreos_06.12', source: 'challenge3d', total_leads: 3, campaign_leads: 3 },
  { utm_source: 'onai_inst', utm_medium: 'social', utm_campaign: null, source: 'challenge3d', total_leads: 3, campaign_leads: 3 },
  { utm_source: 'kenjifb', utm_medium: 'wide', utm_campaign: 'nutcab_3days_diascreos_06.12', source: 'challenge3d', total_leads: 2, campaign_leads: 2 },
  { utm_source: null, utm_medium: null, utm_campaign: null, source: 'challenge3d', total_leads: 1, campaign_leads: 1 },
  { utm_source: 'alex_FB', utm_medium: '{{placement}}', utm_campaign: '{{campaign.name}}', source: 'challenge3d', total_leads: 1, campaign_leads: 1 },
  { utm_source: 'pb_agency_FB', utm_medium: 'Others', utm_campaign: 'alex/11.12', source: 'challenge3d', total_leads: 1, campaign_leads: 1 },
  { utm_source: 'kenjifb', utm_medium: 'ta2', utm_campaign: 'nutcab_3days_diascreos_06.12', source: 'challenge3d', total_leads: 1, campaign_leads: 1 },
  { utm_source: 'kenjifb', utm_medium: '{{adset.name}}', utm_campaign: '{{campaign.name}}', source: 'challenge3d', total_leads: 1, campaign_leads: 1 },
  { utm_source: 'fb', utm_medium: 'paid', utm_campaign: '120237921216020535', source: 'challenge3d', total_leads: 1, campaign_leads: 1 },
  { utm_source: null, utm_medium: null, utm_campaign: null, source: 'expresscourse', total_leads: 8, campaign_leads: 8 }
];

// Данные о продажах (из AmoCRM)
const SALES_DATA = {
  express_course: {
    total_sales: 87,
    total_amount: 432504,
    campaign_sales: 0,
    campaign_amount: 0
  },
  main_product: {
    total_sales: 12,
    total_amount: 5880000,
    campaign_sales: 0,
    campaign_amount: 0
  },
  challenge3d: {
    total_sales: 1,
    total_amount: 5000,
    campaign_sales: 1,
    campaign_amount: 5000,
    details: [
      {
        deal_id: 99999999,
        amount: 5000,
        currency: 'KZT',
        prepaid: true,
        utm_source: 'kenjifb',
        utm_medium: 'cpc',
        customer_name: 'TEST_PREPAYMENT_WEBHOOK',
        sale_date: '2026-01-03 18:35:34'
      }
    ]
  }
};

// Данные о воронке продаж (из journey_stages)
const FUNNEL_DATA = {
  proftest_submitted: { count: 25, description: 'Отправка профтеста' },
  payment_card: { count: 6, description: 'Оплата картой' },
  expresscourse_submitted: { count: 1, description: 'Запись на Express Course' },
  payment_kaspi: { count: 1, description: 'Оплата через Kaspi' }
};

// Курс валют (USD → KZT)
const USD_TO_KZT_RATE = 520; // Примерный курс

/**
 * Атрибуция лидов по таргетологам
 */
function attributeLeadsToTargetologists() {
  const attribution = {
    kenji: {
      name: 'Kenji',
      team: 'Kenesary',
      utm_source: 'kenjifb',
      leads: 0,
      spend: 0,
      sales: 0,
      revenue: 0
    },
    alexander: {
      name: 'Александр',
      team: 'Alexander Team',
      utm_sources: ['fb_traf4', 'alex_FB', 'instagramalex', 'pb_agency_FB'],
      leads: 0,
      spend: 0,
      sales: 0,
      revenue: 0
    }
  };

  // Атрибуция лидов
  LEADS_DATA.forEach(lead => {
    if (lead.utm_source === 'kenjifb') {
      attribution.kenji.leads += lead.campaign_leads;
    } else if (attribution.alexander.utm_sources.includes(lead.utm_source)) {
      attribution.alexander.leads += lead.campaign_leads;
    }
  });

  // Атрибуция затрат
  FACEBOOK_DATA.accounts.forEach(account => {
    if (account.account_name.includes('Kenji')) {
      attribution.kenji.spend = account.total_spend;
    } else if (account.account_name.includes('Александр')) {
      attribution.alexander.spend = account.total_spend;
    }
  });

  // Атрибуция продаж
  SALES_DATA.challenge3d.details.forEach(sale => {
    if (sale.utm_source === 'kenjifb') {
      attribution.kenji.sales += 1;
      attribution.kenji.revenue += parseFloat(sale.amount);
    } else {
      attribution.alexander.sales += 1;
      attribution.alexander.revenue += parseFloat(sale.amount);
    }
  });

  return attribution;
}

/**
 * Расчет метрик эффективности
 */
function calculateMetrics(attribution) {
  const metrics = {
    kenji: {},
    alexander: {}
  };

  ['kenji', 'alexander'].forEach(targetologist => {
    const data = attribution[targetologist];
    
    metrics[targetologist] = {
      cpl: data.leads > 0 ? (data.spend / data.leads).toFixed(2) : '0.00',
      conversion_rate: data.leads > 0 ? ((data.sales / data.leads) * 100).toFixed(2) : '0.00',
      roas: data.spend > 0 ? (data.revenue / (data.spend * USD_TO_KZT_RATE)).toFixed(2) : '0.00',
      roi: data.spend > 0 ? (((data.revenue - (data.spend * USD_TO_KZT_RATE)) / (data.spend * USD_TO_KZT_RATE)) * 100).toFixed(2) : '0.00',
      cpa: data.sales > 0 ? ((data.spend * USD_TO_KZT_RATE) / data.sales).toFixed(2) : '0.00'
    };
  });

  return metrics;
}

/**
 * Генерация отчета
 */
function generateReport() {
  console.log('📊 ГЕНЕРАЦИЯ ОТЧЕТА ПО ЭФФЕКТИВНОСТИ РЕКЛАМНОЙ КАМПАНИИ');
  console.log('📅 Период: 29.12.2025 - 03.01.2026\n');

  // Атрибуция по таргетологам
  const attribution = attributeLeadsToTargetologists();
  const metrics = calculateMetrics(attribution);

  console.log('='.repeat(80));
  console.log('📊 ОБЩАЯ СТАТИСТИКА ПО КАМПАНИИ');
  console.log('='.repeat(80));
  console.log(`💰 Общие затраты (Facebook Ads): $${FACEBOOK_DATA.summary.total_spend.toFixed(2)}`);
  console.log(`💰 Общие затраты (в KZT): ${(FACEBOOK_DATA.summary.total_spend * USD_TO_KZT_RATE).toFixed(2)} KZT`);
  console.log(`👁️ Общие показы: ${FACEBOOK_DATA.summary.total_impressions.toLocaleString()}`);
  console.log(`👆 Общие клики: ${FACEBOOK_DATA.summary.total_clicks.toLocaleString()}`);
  console.log(`📈 Общий CTR: ${FACEBOOK_DATA.summary.overall_ctr}%`);
  console.log(`💵 Общий CPC: $${FACEBOOK_DATA.summary.overall_cpc}`);
  console.log(`👥 Общее количество лидов: ${LEADS_DATA.reduce((sum, l) => sum + l.campaign_leads, 0)}`);
  console.log(`💵 Стоимость лида (CPL): $${(FACEBOOK_DATA.summary.total_spend / LEADS_DATA.reduce((sum, l) => sum + l.campaign_leads, 0)).toFixed(2)}`);

  console.log('\n' + '='.repeat(80));
  console.log('📊 ДЕТАЛЬНЫЙ ОТЧЕТ ПО ТАРГЕТОЛОГАМ');
  console.log('='.repeat(80));

  // Отчет по Kenji
  console.log('\n🎯 КЕНДЗИ (Kenji)');
  console.log('-'.repeat(80));
  console.log(`👤 Команда: ${attribution.kenji.team}`);
  console.log(`📦 UTM Source: ${attribution.kenji.utm_source}`);
  console.log(`💰 Затраты (Facebook Ads): $${attribution.kenji.spend.toFixed(2)}`);
  console.log(`💰 Затраты (в KZT): ${(attribution.kenji.spend * USD_TO_KZT_RATE).toFixed(2)} KZT`);
  console.log(`👥 Количество лидов: ${attribution.kenji.leads}`);
  console.log(`💵 Стоимость лида (CPL): $${metrics.kenji.cpl}`);
  console.log(`💸 Количество продаж: ${attribution.kenji.sales}`);
  console.log(`💰 Выручка: ${attribution.kenji.revenue.toFixed(2)} KZT`);
  console.log(`📊 Конверсия: ${metrics.kenji.conversion_rate}%`);
  console.log(`📈 ROAS: ${metrics.kenji.roas}`);
  console.log(`📊 ROI: ${metrics.kenji.roi}%`);
  console.log(`💵 CPA: ${metrics.kenji.cpa} KZT`);

  // Отчет по Александру
  console.log('\n🎯 АЛЕКСАНДР (Alexander Team)');
  console.log('-'.repeat(80));
  console.log(`👤 Команда: ${attribution.alexander.team}`);
  console.log(`📦 UTM Sources: ${attribution.alexander.utm_sources.join(', ')}`);
  console.log(`💰 Затраты (Facebook Ads): $${attribution.alexander.spend.toFixed(2)}`);
  console.log(`💰 Затраты (в KZT): ${(attribution.alexander.spend * USD_TO_KZT_RATE).toFixed(2)} KZT`);
  console.log(`👥 Количество лидов: ${attribution.alexander.leads}`);
  console.log(`💵 Стоимость лида (CPL): $${metrics.alexander.cpl}`);
  console.log(`💸 Количество продаж: ${attribution.alexander.sales}`);
  console.log(`💰 Выручка: ${attribution.alexander.revenue.toFixed(2)} KZT`);
  console.log(`📊 Конверсия: ${metrics.alexander.conversion_rate}%`);
  console.log(`📈 ROAS: ${metrics.alexander.roas}`);
  console.log(`📊 ROI: ${metrics.alexander.roi}%`);
  console.log(`💵 CPA: ${metrics.alexander.cpa} KZT`);

  console.log('\n' + '='.repeat(80));
  console.log('📊 ВОРОНКА ПРОДАЖ');
  console.log('='.repeat(80));
  
  console.log(`📝 Профтесты отправлены: ${FUNNEL_DATA.proftest_submitted.count}`);
  console.log(`💳 Оплаты картой: ${FUNNEL_DATA.payment_card.count}`);
  console.log(`📚 Записи на Express Course: ${FUNNEL_DATA.expresscourse_submitted.count}`);
  console.log(`💳 Оплаты через Kaspi: ${FUNNEL_DATA.payment_kaspi.count}`);

  console.log('\n' + '='.repeat(80));
  console.log('📊 ПРОДАЖИ ПО ПРОДУКТАМ');
  console.log('='.repeat(80));
  console.log(`📚 Express Course: ${SALES_DATA.express_course.campaign_sales} продаж (${SALES_DATA.express_course.campaign_amount} KZT)`);
  console.log(`🏆 Flagman (Main Product): ${SALES_DATA.main_product.campaign_sales} продаж (${SALES_DATA.main_product.campaign_amount} KZT)`);
  console.log(`🎯 Challenge 3D: ${SALES_DATA.challenge3d.campaign_sales} продаж (${SALES_DATA.challenge3d.campaign_amount} KZT)`);
  
  if (SALES_DATA.challenge3d.details.length > 0) {
    console.log('\n📋 Детали продаж Challenge 3D:');
    SALES_DATA.challenge3d.details.forEach(sale => {
      console.log(`   • Deal ID: ${sale.deal_id}`);
      console.log(`   • Сумма: ${sale.amount} ${sale.currency}`);
      console.log(`   • Тип: ${sale.prepaid ? 'Предоплата' : 'Полная оплата'}`);
      console.log(`   • UTM Source: ${sale.utm_source}`);
      console.log(`   • Клиент: ${sale.customer_name}`);
      console.log(`   • Дата: ${sale.sale_date}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 СРАВНИТЕЛЬНЫЙ АНАЛИЗ');
  console.log('='.repeat(80));

  const totalLeads = attribution.kenji.leads + attribution.alexander.leads;
  const totalSales = attribution.kenji.sales + attribution.alexander.sales;
  const totalRevenue = attribution.kenji.revenue + attribution.alexander.revenue;
  const totalSpend = FACEBOOK_DATA.summary.total_spend;

  console.log(`👥 Общее количество лидов: ${totalLeads}`);
  console.log(`💸 Общее количество продаж: ${totalSales}`);
  console.log(`💰 Общая выручка: ${totalRevenue.toFixed(2)} KZT`);
  console.log(`💰 Общие затраты: $${totalSpend.toFixed(2)} (${(totalSpend * USD_TO_KZT_RATE).toFixed(2)} KZT)`);
  console.log(`📊 Общая конверсия: ${totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(2) : '0.00'}%`);
  console.log(`📈 Общий ROAS: ${totalSpend > 0 ? (totalRevenue / (totalSpend * USD_TO_KZT_RATE)).toFixed(2) : '0.00'}`);
  console.log(`📊 Общий ROI: ${totalSpend > 0 ? (((totalRevenue - (totalSpend * USD_TO_KZT_RATE)) / (totalSpend * USD_TO_KZT_RATE)) * 100).toFixed(2) : '0.00'}%`);

  // Сохранение отчета в JSON
  const reportData = {
    period: FACEBOOK_DATA.period,
    generated_at: new Date().toISOString(),
    summary: {
      total_leads: totalLeads,
      total_sales: totalSales,
      total_revenue_kzt: totalRevenue,
      total_spend_usd: totalSpend,
      total_spend_kzt: totalSpend * USD_TO_KZT_RATE,
      overall_conversion_rate: totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(2) : '0.00',
      overall_roas: totalSpend > 0 ? (totalRevenue / (totalSpend * USD_TO_KZT_RATE)).toFixed(2) : '0.00',
      overall_roi: totalSpend > 0 ? (((totalRevenue - (totalSpend * USD_TO_KZT_RATE)) / (totalSpend * USD_TO_KZT_RATE)) * 100).toFixed(2) : '0.00',
      overall_cpl_usd: totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '0.00',
      overall_cpl_kzt: totalLeads > 0 ? ((totalSpend * USD_TO_KZT_RATE) / totalLeads).toFixed(2) : '0.00'
    },
    targetologists: [
      {
        name: attribution.kenji.name,
        team: attribution.kenji.team,
        utm_source: attribution.kenji.utm_source,
        spend_usd: attribution.kenji.spend,
        spend_kzt: attribution.kenji.spend * USD_TO_KZT_RATE,
        leads: attribution.kenji.leads,
        sales: attribution.kenji.sales,
        revenue_kzt: attribution.kenji.revenue,
        metrics: metrics.kenji
      },
      {
        name: attribution.alexander.name,
        team: attribution.alexander.team,
        utm_sources: attribution.alexander.utm_sources,
        spend_usd: attribution.alexander.spend,
        spend_kzt: attribution.alexander.spend * USD_TO_KZT_RATE,
        leads: attribution.alexander.leads,
        sales: attribution.alexander.sales,
        revenue_kzt: attribution.alexander.revenue,
        metrics: metrics.alexander
      }
    ],
    funnel: FUNNEL_DATA,
    sales: SALES_DATA,
    facebook_data: FACEBOOK_DATA,
    leads_data: LEADS_DATA
  };

  const outputPath = './campaign-effectiveness-report.json';
  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
  
  console.log(`\n✅ Отчет сохранен: ${outputPath}`);
  console.log('🎉 Генерация отчета завершена!\n');
}

// Запуск
generateReport();
