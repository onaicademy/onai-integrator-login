#!/usr/bin/env node

/**
 * Альтернативный скрипт для получения всех Business Managers и Ad Accounts
 * Использует другой подход через Facebook Marketing API
 */

// Твои данные
const CONFIG = {
  ACCESS_TOKEN: 'EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc',
  // Это Business ID, но будем использовать его для доступа к списку
  BUSINESS_ID: '1425104648731040'
};

/**
 * Делает запрос к Facebook Graph API
 */
async function makeGraphRequest(endpoint, params = {}) {
  try {
    const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
    url.searchParams.set('access_token', CONFIG.ACCESS_TOKEN);
    url.searchParams.set('limit', '100');
    
    // Добавляем дополнительные параметры
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Получает все Ad Accounts и их Business Manager информацию
 */
async function getAllAdAccountsWithBusinessInfo() {
  try {
    console.log('📊 Получаю ВСЕ Ad Accounts с информацией о Business Manager...\n');
    
    // Способ 1: Получаем owned ad accounts с полной информацией
    const response = await makeGraphRequest(`/${CONFIG.BUSINESS_ID}/owned_ad_accounts`, {
      fields: 'id,name,account_status,currency,owner,business'
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    const accounts = response.data || [];
    
    console.log(`✅ Найдено Ad Accounts: ${accounts.length}\n`);
    
    const businessMap = new Map();
    
    if (accounts.length > 0) {
      console.log('📋 ВСЕ РЕКЛАМНЫЕ КАБИНЕТЫ:');
      console.log('─'.repeat(80));
      
      accounts.forEach((acc, idx) => {
        const accountId = acc.id.replace('act_', '');
        const businessId = acc.business?.id || 'unknown';
        const businessName = acc.business?.name || 'Неизвестно';
        
        // Группируем по Business Manager
        if (!businessMap.has(businessId)) {
          businessMap.set(businessId, {
            id: businessId,
            name: businessName,
            accounts: []
          });
        }
        
        businessMap.get(businessId).accounts.push({
          accountId: accountId,
          fullId: acc.id,
          name: acc.name,
          status: acc.account_status,
          currency: acc.currency
        });
        
        console.log(`${idx + 1}. 📱 ${acc.name || 'Без названия'}`);
        console.log(`   ├─ ID: ${accountId}`);
        console.log(`   ├─ Статус: ${acc.account_status || 'Н/A'}`);
        console.log(`   ├─ Валюта: ${acc.currency || 'Н/A'}`);
        console.log(`   └─ Business Manager: ${businessName} (${businessId})`);
        console.log('');
      });
    }
    
    return {
      accounts,
      businessMap
    };
  } catch (error) {
    console.error('❌ Ошибка при получении Ad Accounts:', error.message);
    return {
      accounts: [],
      businessMap: new Map()
    };
  }
}

/**
 * Получает подробную информацию об Ad Account
 */
async function getAdAccountDetails(accountId) {
  try {
    const response = await makeGraphRequest(`/${accountId}`, {
      fields: 'id,name,account_status,currency,owner,business,timezone_name'
    });
    
    if (response.error) {
      return null;
    }
    
    return response;
  } catch (error) {
    return null;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('\n🚀 Facebook All Business Manager & Ad Accounts Fetcher');
  console.log('═'.repeat(80));
  console.log(`\n🔑 Business ID (основной): ${CONFIG.BUSINESS_ID}`);
  console.log(`🔐 Токен: ${CONFIG.ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('\n═'.repeat(80) + '\n');
  
  try {
    // Получаем все Ad Accounts с информацией о Business Manager
    const { accounts, businessMap } = await getAllAdAccountsWithBusinessInfo();
    
    if (accounts.length === 0) {
      console.log('⚠️  Ad Accounts не найдены');
      return;
    }
    
    // Вывод сгруппированной информации
    console.log('═'.repeat(80));
    console.log('\n📊 РЕКЛАМНЫЕ КАБИНЕТЫ, СГРУППИРОВАННЫЕ ПО BUSINESS MANAGER:\n');
    
    let businessIndex = 1;
    const allResults = [];
    let totalAccounts = 0;
    
    for (const [businessId, businessData] of businessMap.entries()) {
      console.log(`${businessIndex}. 🏢 ${businessData.name}`);
      console.log(`   ID: ${businessId}`);
      console.log(`   Рекламные кабинеты: ${businessData.accounts.length}`);
      console.log('');
      
      businessData.accounts.forEach((acc, idx) => {
        console.log(`   ${businessIndex}.${idx + 1}. 📱 ${acc.name || 'Без названия'}`);
        console.log(`       ├─ Account ID: ${acc.accountId}`);
        console.log(`       ├─ Статус: ${acc.status || 'Н/A'}`);
        console.log(`       └─ Валюта: ${acc.currency || 'Н/A'}`);
      });
      
      console.log('');
      
      allResults.push({
        businessId: businessId,
        businessName: businessData.name,
        accounts: businessData.accounts
      });
      
      totalAccounts += businessData.accounts.length;
      businessIndex++;
    }
    
    // Итоговая статистика
    console.log('═'.repeat(80));
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`✅ Unique Business Managers: ${businessMap.size}`);
    console.log(`✅ Всего Ad Accounts: ${totalAccounts}`);
    
    // Сохраняем полный JSON результат
    const results = {
      timestamp: new Date().toISOString(),
      primaryBusinessId: CONFIG.BUSINESS_ID,
      summary: {
        uniqueBusinessManagers: businessMap.size,
        totalAdAccounts: totalAccounts
      },
      businesses: allResults
    };
    
    console.log('\n📄 ПОЛНЫЕ JSON РЕЗУЛЬТАТЫ:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(results, null, 2));
    
    // Сохраняем результаты в файл
    const fs = await import('fs');
    const filename = `/Users/miso/onai-integrator-login/facebook_all_managers_accounts_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log(error.stack);
  }
}

// Запуск
main().catch(console.error);
