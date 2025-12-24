#!/usr/bin/env node

/**
 * Финальный скрипт для получения всех Business Manager ID и их Ad Accounts
 * 
 * Проблема: текущий токен может не иметь доступ ко всем Business Manager напрямую.
 * Решение: Используем известные Business Manager IDs из скриншота пользователя
 */

const CONFIG = {
  ACCESS_TOKEN: 'EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc',
};

// Эти Business Manager ID видны на скриншоте в интерфейсе Facebook
// Названия из скриншота:
// 1. ONAI Academy, TOO (5 рекламных аккаунтов)
// 2. Nakama group (2 рекламных аккаунта)
// 3. Onai academy (0 рекламных аккаунтов)
// 4. Residence Astana (2 рекламных аккаунта)
// 5. TOO Academy (1 рекламный аккаунт) - это наш основной (1425104648731040)
// 6. White Kimberly Flores (0 рекламных аккаунтов)
// 7. labonte__1uwx25 (0 рекламных аккаунтов)
// 8. Дискус Реклама (1 рекламный аккаунт)

const BUSINESS_IDS_TO_CHECK = [
  '1425104648731040'  // TOO Academy (уже знаем этот)
  // Остальные IDs нужно получить из API или вручную добавить
];

async function makeGraphRequest(endpoint, params = {}) {
  try {
    const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
    url.searchParams.set('access_token', CONFIG.ACCESS_TOKEN);
    url.searchParams.set('limit', '100');
    
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

async function getBusinessInfo(businessId) {
  try {
    const response = await makeGraphRequest(`/${businessId}`, {
      fields: 'id,name'
    });
    
    if (response.error) {
      return null;
    }
    
    return response;
  } catch (error) {
    return null;
  }
}

async function getAdAccountsForBusiness(businessId) {
  try {
    const response = await makeGraphRequest(`/${businessId}/owned_ad_accounts`, {
      fields: 'id,name,account_status,currency,owner'
    });
    
    if (response.error) {
      return [];
    }
    
    return response.data || [];
  } catch (error) {
    return [];
  }
}

async function getAllAccessibleAdAccounts() {
  try {
    // Способ 1: Получаем через основной Business ID все accessible ad accounts
    const response = await makeGraphRequest(`/${BUSINESS_IDS_TO_CHECK[0]}/owned_ad_accounts`, {
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

async function main() {
  console.log('\n🚀 Facebook All Business Manager & Ad Accounts Fetcher');
  console.log('═'.repeat(80));
  console.log(`\n🔐 Token: ${CONFIG.ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('\n═'.repeat(80) + '\n');
  
  try {
    // Получаем все доступные Ad Accounts через основной Business Manager
    console.log('📊 Сканирую ВСЕ доступные Ad Accounts...\n');
    const allAdAccounts = await getAllAccessibleAdAccounts();
    
    console.log(`✅ Найдено Ad Accounts: ${allAdAccounts.length}\n`);
    
    // Группируем по Business Manager
    const businessMap = new Map();
    
    allAdAccounts.forEach(acc => {
      const businessId = acc.business?.id;
      const businessName = acc.business?.name || 'Неизвестный Business Manager';
      
      if (!businessMap.has(businessId)) {
        businessMap.set(businessId, {
          id: businessId,
          name: businessName,
          accounts: []
        });
      }
      
      businessMap.get(businessId).accounts.push({
        accountId: acc.id.replace('act_', ''),
        fullId: acc.id,
        name: acc.name,
        status: acc.account_status,
        currency: acc.currency
      });
    });
    
    // Вывод результатов
    console.log('═'.repeat(80));
    console.log('\n📊 BUSINESS MANAGERS И ИХ РЕКЛАМНЫЕ КАБИНЕТЫ:\n');
    
    let businessIndex = 1;
    const allResults = [];
    let totalAccounts = 0;
    
    for (const [businessId, businessData] of businessMap.entries()) {
      console.log(`${businessIndex}. 🏢 ${businessData.name}`);
      console.log(`   ID: ${businessId}`);
      console.log(`   Рекламные кабинеты: ${businessData.accounts.length}`);
      console.log('');
      
      if (businessData.accounts.length > 0) {
        businessData.accounts.forEach((acc, idx) => {
          console.log(`   ${businessIndex}.${idx + 1}. 📱 ${acc.name}`);
          console.log(`       ├─ ID: ${acc.accountId}`);
          console.log(`       ├─ Status: ${acc.status}`);
          console.log(`       └─ Currency: ${acc.currency}`);
        });
      } else {
        console.log('   └─ ⚠️  Нет привязанных рекламных кабинетов');
      }
      
      console.log('');
      
      allResults.push({
        businessId: businessId,
        businessName: businessData.name,
        accountsCount: businessData.accounts.length,
        accounts: businessData.accounts
      });
      
      totalAccounts += businessData.accounts.length;
      businessIndex++;
    }
    
    // Итоги
    console.log('═'.repeat(80));
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`✅ Business Managers найдено: ${businessMap.size}`);
    console.log(`✅ Ad Accounts найдено: ${totalAccounts}`);
    console.log(`✅ Среднее Ad Accounts на Business Manager: ${(totalAccounts / businessMap.size).toFixed(1)}`);
    
    // Детальная статистика по каждому Business Manager
    console.log('\n📈 ДЕТАЛЬНАЯ СТАТИСТИКА:');
    const sortedBusinesses = Array.from(businessMap.entries())
      .sort((a, b) => b[1].accounts.length - a[1].accounts.length);
    
    sortedBusinesses.forEach(([, bizData], idx) => {
      console.log(`${idx + 1}. ${bizData.name}: ${bizData.accounts.length} аккаунтов`);
    });
    
    // JSON результаты
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        businessManagersFound: businessMap.size,
        totalAdAccounts: totalAccounts,
        averageAccountsPerBusiness: parseFloat((totalAccounts / businessMap.size).toFixed(2))
      },
      businesses: allResults
    };
    
    console.log('\n📄 JSON РЕЗУЛЬТАТЫ:');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(results, null, 2));
    
    // Сохраняем в файл
    const fs = await import('fs');
    const filename = `/Users/miso/onai-integrator-login/facebook_all_managers_and_accounts_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

main().catch(console.error);
