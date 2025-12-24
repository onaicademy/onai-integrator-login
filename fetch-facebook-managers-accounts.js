#!/usr/bin/env node

/**
 * Скрипт для получения всех Business Manager ID и Ad Account ID
 * из Facebook аккаунта используя постоянный токен доступа
 */

// Твои данные
const CONFIG = {
  ACCESS_TOKEN: 'EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc',
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
 * Получает User ID текущего пользователя
 */
async function getCurrentUser() {
  try {
    console.log('👤 Получаю информацию о текущем пользователе...\n');
    
    const response = await makeGraphRequest('/me', {
      fields: 'id,name'
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    console.log('📋 ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ:');
    console.log('─'.repeat(60));
    console.log(`ID: ${response.id}`);
    console.log(`Имя: ${response.name}`);
    console.log('');
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка при получении информации пользователя:', error.message);
    return null;
  }
}

/**
 * Получает все Business Managers, доступные для пользователя
 */
async function getAllBusinessManagers() {
  try {
    console.log('📊 Получаю ВСЕ Business Managers...\n');
    
    // Получаем все businesses, которыми владеет/может управлять пользователь
    let response = await makeGraphRequest(`/${CONFIG.BUSINESS_ID}/owned_businesses`, {
      fields: 'id,name,timezone_id,vertical'
    });
    
    if (!response.data) {
      // Альтернативный подход - получаем через сам Business Manager
      response = await makeGraphRequest(`/${CONFIG.BUSINESS_ID}`, {
        fields: 'id,name,timezone_id,vertical'
      });
      
      if (response.id) {
        response.data = [response];
      } else {
        response.data = [];
      }
    }
    
    const businesses = response.data || [];
    
    console.log(`✅ Найдено Business Managers: ${businesses.length}\n`);
    
    if (businesses.length > 0) {
      console.log('📋 ВСЕ БИЗНЕС-МЕНЕДЖЕРЫ:');
      console.log('─'.repeat(60));
      businesses.forEach((biz, idx) => {
        console.log(`${idx + 1}. ID: ${biz.id}`);
        console.log(`   Название: ${biz.name || 'Н/A'}`);
        console.log(`   Timezone: ${biz.timezone_id || 'Н/A'}`);
        console.log(`   Категория: ${biz.vertical || 'Н/A'}`);
        console.log('');
      });
    }
    
    return businesses;
  } catch (error) {
    console.error('❌ Ошибка при получении Business Managers:', error.message);
    return [];
  }
}

/**
 * Получает все Ad Accounts для конкретного Business Manager
 */
async function getAdAccountsForBusiness(businessId) {
  try {
    // Получаем owned ad accounts
    const response = await makeGraphRequest(`/${businessId}/owned_ad_accounts`, {
      fields: 'id,name,account_status,currency,business_name'
    });
    
    if (response.error && response.error.code !== 100) {
      throw new Error(response.error.message);
    }
    
    return response.data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Получает все Ad Accounts
 */
async function getAdAccounts() {
  try {
    console.log('📊 Получаю Ad Accounts через Business Manager...\n');
    
    // Способ 1: Попытка получить через Business-specific endpoint для owned_ad_accounts
    let response = await makeGraphRequest(`/${CONFIG.BUSINESS_ID}/owned_ad_accounts`);
    
    if (response.error || !response.data || response.data.length === 0) {
      // Способ 2: Попытка получить через Ad Accounts endpoint
      console.log('📊 Пробую альтернативный endpoint...');
      response = await makeGraphRequest(`/${CONFIG.BUSINESS_ID}/adaccounts`);
    }
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    const accounts = response.data || [];
    
    console.log(`✅ Найдено Ad Accounts: ${accounts.length}\n`);
    
    if (accounts.length > 0) {
      console.log('📋 AD ACCOUNTS:');
      console.log('─'.repeat(60));
      accounts.forEach((acc, idx) => {
        const accountId = acc.id.replace('act_', '');
        console.log(`${idx + 1}. ID: ${accountId}`);
        console.log(`   Полный ID: ${acc.id}`);
        console.log(`   Название: ${acc.name || 'Н/A'}`);
        console.log(`   Статус: ${acc.account_status || 'Н/A'}`);
        console.log(`   Валюта: ${acc.currency || 'Н/A'}`);
        console.log('');
      });
    }
    
    return accounts;
  } catch (error) {
    console.error('❌ Ошибка при получении Ad Accounts:', error.message);
    console.error('   Код ошибки:', error.code || 'unknown');
    // Не выбрасываем ошибку - продолжаем
    return [];
  }
}

/**
 * Получает дополнительную информацию об аккаунте
 */
async function getAccountInfo() {
  try {
    console.log('📊 Получаю информацию об аккаунте...\n');
    
    const response = await makeGraphRequest(`/${CONFIG.BUSINESS_ID}`, {
      fields: 'id,name,timezone_id,vertical'
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    console.log('📋 ИНФОРМАЦИЯ О BUSINESS:');
    console.log('─'.repeat(60));
    console.log(`ID: ${response.id}`);
    console.log(`Название: ${response.name || 'Н/A'}`);
    console.log(`Timezone: ${response.timezone_id || 'Н/A'}`);
    console.log(`Категория: ${response.vertical || 'Н/A'}`);
    console.log('');
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка при получении информации:', error.message);
    throw error;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('\n🚀 Facebook Business Manager & Ad Accounts Fetcher');
  console.log('═'.repeat(60));
  console.log(`\n� Токен: ${CONFIG.ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('\n═'.repeat(60) + '\n');
  
  try {
    // 1. Получаем текущего пользователя
    const user = await getCurrentUser();
    
    // 2. Получаем ВСЕ Business Managers
    const businesses = await getAllBusinessManagers();
    
    if (businesses.length === 0) {
      console.log('⚠️  Business Managers не найдены');
      return;
    }
    
    // 3. Для каждого Business Manager получаем Ad Accounts
    console.log('═'.repeat(60));
    console.log('\n📊 ДЕТАЛЬНЫЙ СПИСОК БИЗНЕС-МЕНЕДЖЕРОВ И РЕКЛАМНЫХ КАБИНЕТОВ:\n');
    
    const allResults = [];
    let totalAccounts = 0;
    
    for (let i = 0; i < businesses.length; i++) {
      const biz = businesses[i];
      console.log(`${i + 1}. 🏢 ${biz.name} (ID: ${biz.id})`);
      
      const accounts = await getAdAccountsForBusiness(biz.id);
      
      if (accounts.length === 0) {
        console.log(`   ├─ ⚠️  Рекламных кабинетов не найдено`);
      } else {
        console.log(`   ├─ 📊 Найдено рекламных кабинетов: ${accounts.length}`);
        accounts.forEach((acc, idx) => {
          const isLast = idx === accounts.length - 1;
          const prefix = isLast ? '   └─' : '   ├─';
          const accountId = acc.id.replace('act_', '');
          console.log(`${prefix} ${idx + 1}. ID: ${accountId}`);
          console.log(`${prefix}    Название: ${acc.name || 'Н/A'}`);
          console.log(`${prefix}    Статус: ${acc.account_status || 'Н/A'}`);
          console.log(`${prefix}    Валюта: ${acc.currency || 'Н/A'}`);
        });
      }
      
      totalAccounts += accounts.length;
      
      allResults.push({
        businessId: biz.id,
        businessName: biz.name,
        timezone: biz.timezone_id,
        vertical: biz.vertical,
        accounts: accounts.map(acc => ({
          accountId: acc.id.replace('act_', ''),
          fullId: acc.id,
          name: acc.name,
          status: acc.account_status,
          currency: acc.currency
        }))
      });
      
      console.log('');
    }
    
    // Итоговая статистика
    console.log('═'.repeat(60));
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`✅ Business Managers всего: ${businesses.length}`);
    console.log(`✅ Рекламных кабинетов всего: ${totalAccounts}`);
    
    // Выводим полный JSON результат
    console.log('\n📄 ПОЛНЫЕ JSON РЕЗУЛЬТАТЫ:');
    console.log('─'.repeat(60));
    const results = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, name: user.name } : null,
      summary: {
        totalBusinessManagers: businesses.length,
        totalAdAccounts: totalAccounts
      },
      businesses: allResults
    };
    
    console.log(JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('\n📋 Продолжаю с полученными данными...');
  }
}

// Запуск
main().catch(console.error);
