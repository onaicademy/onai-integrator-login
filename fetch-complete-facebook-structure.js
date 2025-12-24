#!/usr/bin/env node

/**
 * Продвинутый скрипт для получения всех доступных Business Managers и их Ad Accounts
 * Использует иерархический поход через Facebook API
 */

// Твои данные
const CONFIG = {
  ACCESS_TOKEN: 'EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc',
  BUSINESS_ID: '1425104648731040'
};

// Set для отслеживания уже проверенных Business Manager IDs
const processedBusinessIds = new Set();
const allBusinesses = new Map();

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
 * Получает информацию о Business Manager
 */
async function getBusinessInfo(businessId) {
  try {
    const response = await makeGraphRequest(`/${businessId}`, {
      fields: 'id,name'
    });
    
    if (response.error) {
      console.log(`   ├─ ❌ Ошибка: ${response.error.message}`);
      return null;
    }
    
    if (!response.id) {
      return null;
    }
    
    return response;
  } catch (error) {
    console.log(`   ├─ ❌ Исключение: ${error.message}`);
    return null;
  }
}

/**
 * Получает все Ad Accounts для Business Manager
 */
async function getAdAccountsForBusiness(businessId) {
  try {
    const response = await makeGraphRequest(`/${businessId}/owned_ad_accounts`, {
      fields: 'id,name,account_status,currency,business'
    });
    
    if (response.error) {
      return [];
    }
    
    return response.data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Получает рекурсивно все связанные Business Manager
 */
async function discoverBusinessManagers(startBusinessId) {
  const queue = [startBusinessId];
  
  while (queue.length > 0) {
    const businessId = queue.shift();
    
    if (processedBusinessIds.has(businessId)) {
      continue;
    }
    
    processedBusinessIds.add(businessId);
    console.log(`🔍 Проверяю Business Manager: ${businessId}`);
    
    // Получаем информацию о Business Manager
    const businessInfo = await getBusinessInfo(businessId);
    
    if (!businessInfo) {
      console.log(`   └─ ❌ Не удалось получить информацию`);
      continue;
    }
    
    console.log(`   ├─ ✅ Найден: ${businessInfo.name}`);
    
    allBusinesses.set(businessId, {
      id: businessId,
      name: businessInfo.name,
      timezone: businessInfo.timezone_id,
      vertical: businessInfo.vertical,
      currency: businessInfo.currency,
      accounts: []
    });
    
    // Получаем Ad Accounts
    const accounts = await getAdAccountsForBusiness(businessId);
    console.log(`   ├─ Ad Accounts найдено: ${accounts.length}`);
    
    allBusinesses.get(businessId).accounts = accounts.map(acc => ({
      accountId: acc.id.replace('act_', ''),
      fullId: acc.id,
      name: acc.name,
      status: acc.account_status,
      currency: acc.currency
    }));
    
    // Получаем owned businesses (если есть)
    try {
      const ownedBiz = await makeGraphRequest(`/${businessId}/owned_businesses`, {
        fields: 'id'
      });
      
      if (ownedBiz.data) {
        console.log(`   └─ Owned Businesses найдено: ${ownedBiz.data.length}`);
        
        for (const ownedBusiness of ownedBiz.data) {
          if (!processedBusinessIds.has(ownedBusiness.id)) {
            queue.push(ownedBusiness.id);
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибку если owned_businesses не доступны
    }
    
    console.log('');
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('\n🚀 Facebook Advanced Business Manager & Ad Accounts Discoverer');
  console.log('═'.repeat(80));
  console.log(`\n🔑 Starting Business ID: ${CONFIG.BUSINESS_ID}`);
  console.log(`🔐 Token: ${CONFIG.ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('\n═'.repeat(80) + '\n');
  
  try {
    console.log('📊 Сканирую все доступные Business Managers...\n');
    
    // Открываем все доступные Business Managers
    await discoverBusinessManagers(CONFIG.BUSINESS_ID);
    
    // Вывод результатов
    console.log('═'.repeat(80));
    console.log('\n📊 НАЙДЕНО BUSINESS MANAGERS И ИХ AD ACCOUNTS:\n');
    
    let businessIndex = 1;
    let totalAccounts = 0;
    const allResults = [];
    
    for (const [businessId, businessData] of allBusinesses.entries()) {
      console.log(`${businessIndex}. 🏢 ${businessData.name}`);
      console.log(`   ├─ ID: ${businessId}`);
      console.log(`   ├─ Timezone: ${businessData.timezone || 'Н/A'}`);
      console.log(`   ├─ Vertical: ${businessData.vertical || 'Н/A'}`);
      console.log(`   └─ Ad Accounts: ${businessData.accounts.length}`);
      console.log('');
      
      if (businessData.accounts.length > 0) {
        businessData.accounts.forEach((acc, idx) => {
          const isLast = idx === businessData.accounts.length - 1;
          const prefix = isLast ? '      └─' : '      ├─';
          console.log(`${prefix} ${acc.name || 'Без названия'}`);
          console.log(`         ├─ ID: ${acc.accountId}`);
          console.log(`         ├─ Статус: ${acc.status}`);
          console.log(`         └─ Валюта: ${acc.currency}`);
        });
      } else {
        console.log(`      └─ ⚠️  Рекламные кабинеты не привязаны\n`);
      }
      
      console.log('');
      
      allResults.push({
        businessId: businessId,
        businessName: businessData.name,
        timezone: businessData.timezone,
        vertical: businessData.vertical,
        accounts: businessData.accounts
      });
      
      totalAccounts += businessData.accounts.length;
      businessIndex++;
    }
    
    // Итоговая статистика
    console.log('═'.repeat(80));
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`✅ Business Managers найдено: ${allBusinesses.size}`);
    console.log(`✅ Ad Accounts найдено: ${totalAccounts}`);
    
    // Сохраняем полный JSON результат
    const results = {
      timestamp: new Date().toISOString(),
      startingBusinessId: CONFIG.BUSINESS_ID,
      summary: {
        businessManagersFound: allBusinesses.size,
        totalAdAccounts: totalAccounts
      },
      businesses: allResults
    };
    
    console.log('\n📄 ПОЛНЫЕ JSON РЕЗУЛЬТАТЫ:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(results, null, 2));
    
    // Сохраняем результаты в файл
    const fs = await import('fs');
    const filename = `/Users/miso/onai-integrator-login/facebook_complete_structure_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log(error.stack);
  }
}

// Запуск
main().catch(console.error);
