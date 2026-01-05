#!/usr/bin/env node

/**
 * Скрипт для получения данных о затратах из Facebook Ads API
 * за период с 29 декабря 2025 по 3 января 2026
 */

const https = require('https');

// Facebook токен из базы данных
const FB_ACCESS_TOKEN = 'EAAPVZCSfHj0YBQdsTBeonRqQF1DcERtcyKAYveUthxcvpHoij3Q2KEAhy19ZCFQfp5OAi6whZBPGNj6d552EGp35J2gfmebZC6FO3dJLhgRk0cB3LiSYloAqKDm6623rZA6Rq7zK9osUbilo1W4MmMoP4ujVBW94iz3AER95KS9dVZCVzoAsswPePiBJZABjdZBq';

// Рекламные кабинеты и кампании для анализа
const AD_ACCOUNTS = [
  {
    id: 'act_964264512447589',
    name: 'Nutrients.kz (Kenji)',
    campaigns: [
      '120237149691640477', // nutcab_3days_newcreos_06.12
      '120237149468470477', // nutcab_3days_diascreos_06.12
      '120235780414090477'  // nutcab_3days_alexcreos_14.11
    ]
  },
  {
    id: 'act_30779210298344970',
    name: 'onAI Academy (Александр)',
    campaigns: [
      '120237934038040535', // alex/11.12
      '120237921216020535'  // OnAI | Test | 11.12
    ]
  }
];

// Период анализа
const START_DATE = '2025-12-29';
const END_DATE = '2026-01-03';

// Поля для запроса
const FIELDS = [
  'campaign_name',
  'campaign_id',
  'adset_name',
  'adset_id',
  'ad_name',
  'ad_id',
  'spend',
  'impressions',
  'clicks',
  'ctr',
  'cpc',
  'cpm',
  'date_start',
  'date_stop'
];

/**
 * Выполняет HTTP запрос к Facebook Marketing API
 */
function fetchFacebookData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(JSON.stringify(json.error)));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Получает статистику по рекламному кабинету
 */
async function getAdAccountInsights(accountId) {
  const url = `https://graph.facebook.com/v19.0/${accountId}/insights?` +
    `access_token=${FB_ACCESS_TOKEN}` +
    `&fields=${FIELDS.join(',')}` +
    `&time_range={'since':'${START_DATE}','until':'${END_DATE}'}` +
    `&level=ad` +
    `&limit=100`;
  
  console.log(`\n📊 Получение данных для кабинета: ${accountId}`);
  console.log(`URL: ${url.substring(0, 100)}...`);
  
  try {
    const response = await fetchFacebookData(url);
    return response.data || [];
  } catch (error) {
    console.error(`❌ Ошибка для кабинета ${accountId}:`, error.message);
    return [];
  }
}

/**
 * Получает статистику по конкретной кампании
 */
async function getCampaignInsights(accountId, campaignId) {
  const url = `https://graph.facebook.com/v19.0/${campaignId}/insights?` +
    `access_token=${FB_ACCESS_TOKEN}` +
    `&fields=${FIELDS.join(',')}` +
    `&time_range={'since':'${START_DATE}','until':'${END_DATE}'}` +
    `&level=ad` +
    `&limit=100`;
  
  try {
    const response = await fetchFacebookData(url);
    return response.data || [];
  } catch (error) {
    console.error(`❌ Ошибка для кампании ${campaignId}:`, error.message);
    return [];
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 Начало сбора данных Facebook Ads');
  console.log(`📅 Период: ${START_DATE} - ${END_DATE}`);
  console.log(`🎯 Анализируемые кабинеты: ${AD_ACCOUNTS.length}`);
  
  const allResults = [];
  
  for (const account of AD_ACCOUNTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Рекламный кабинет: ${account.name}`);
    console.log(`🆔 ID: ${account.id}`);
    console.log(`🎯 Кампании: ${account.campaigns.length}`);
    
    const accountResults = [];
    
    // Получаем данные по каждой кампании отдельно
    for (const campaignId of account.campaigns) {
      console.log(`\n  📢 Кампания: ${campaignId}`);
      const campaignData = await getCampaignInsights(account.id, campaignId);
      
      if (campaignData.length > 0) {
        console.log(`     ✅ Получено записей: ${campaignData.length}`);
        accountResults.push(...campaignData);
      } else {
        console.log(`     ⚠️ Нет данных за указанный период`);
      }
    }
    
    // Агрегируем данные по кабинету
    const accountSummary = {
      account_id: account.id,
      account_name: account.name,
      total_spend: accountResults.reduce((sum, r) => sum + parseFloat(r.spend || 0), 0),
      total_impressions: accountResults.reduce((sum, r) => sum + parseInt(r.impressions || 0), 0),
      total_clicks: accountResults.reduce((sum, r) => sum + parseInt(r.clicks || 0), 0),
      ads_count: accountResults.length,
      campaigns_count: account.campaigns.length,
      raw_data: accountResults
    };
    
    accountSummary.ctr = accountSummary.total_clicks > 0 
      ? (accountSummary.total_clicks / accountSummary.total_impressions * 100).toFixed(2)
      : '0.00';
    
    accountSummary.cpc = accountSummary.total_clicks > 0
      ? (accountSummary.total_spend / accountSummary.total_clicks).toFixed(2)
      : '0.00';
    
    accountSummary.cpm = accountSummary.total_impressions > 0
      ? (accountSummary.total_spend / accountSummary.total_impressions * 1000).toFixed(2)
      : '0.00';
    
    allResults.push(accountSummary);
    
    console.log(`\n  📊 ИТОГИ ПО КАБИНЕТУ:`);
    console.log(`     💰 Затраты: $${accountSummary.total_spend.toFixed(2)}`);
    console.log(`     👁️ Показы: ${accountSummary.total_impressions.toLocaleString()}`);
    console.log(`     👆 Клики: ${accountSummary.total_clicks.toLocaleString()}`);
    console.log(`     📈 CTR: ${accountSummary.ctr}%`);
    console.log(`     💵 CPC: $${accountSummary.cpc}`);
    console.log(`     📦 CPM: $${accountSummary.cpm}`);
  }
  
  // Общий итог
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 ОБЩИЙ ИТОГ ПО ВСЕМ КАБИНЕТАМ:');
  
  const totalSpend = allResults.reduce((sum, r) => sum + r.total_spend, 0);
  const totalImpressions = allResults.reduce((sum, r) => sum + r.total_impressions, 0);
  const totalClicks = allResults.reduce((sum, r) => sum + r.total_clicks, 0);
  
  console.log(`💰 Общие затраты: $${totalSpend.toFixed(2)}`);
  console.log(`👁️ Общие показы: ${totalImpressions.toLocaleString()}`);
  console.log(`👆 Общие клики: ${totalClicks.toLocaleString()}`);
  console.log(`📈 Общий CTR: ${totalClicks > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00'}%`);
  console.log(`💵 Общий CPC: $${totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00'}`);
  
  // Сохраняем результаты в JSON файл
  const fs = require('fs');
  const outputPath = './facebook-spend-report.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    period: { start: START_DATE, end: END_DATE },
    generated_at: new Date().toISOString(),
    accounts: allResults,
    summary: {
      total_spend: totalSpend,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      overall_ctr: totalClicks > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00',
      overall_cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00'
    }
  }, null, 2));
  
  console.log(`\n✅ Отчет сохранен: ${outputPath}`);
  console.log('🎉 Анализ завершен!\n');
}

// Запуск
main().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
