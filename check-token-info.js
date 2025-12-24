#!/usr/bin/env node

/**
 * Скрипт для проверки информации о User Access Token
 * Показывает все доступные scopes, permissions и ресурсы
 */

const NEW_TOKEN = 'EAAPVZCSfHj0YBQVquZClCxwS6vLHo5zvmt3hgMZAP4zoZAd0FiRk3vG2H9Ix4zrf8C0i7V7AihEZB4dTY3gaKBq3eIlZAa1ZAce6ljcj7jLg8OJM24FZAD2vD5M6B2OhZAhUaThnfApvhmHqi1ZCXEQPGFX1uepZAYI2hpDgOzU4UMwFZBd9fdLtOM2aozIayjuC1quHZBQFpRLvzZBqkkjyfZBxtRhpVXVbenXzJt656Kiz9bZBP8PDol2YV5dHwuzhoJq5j6lhplU3VL7UDLZBZBh8ApZBCAf4qru';

async function makeGraphRequest(endpoint, params = {}) {
  try {
    const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
    url.searchParams.set('access_token', NEW_TOKEN);
    
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

async function main() {
  console.log('\n🔐 АНАЛИЗ FACEBOOK ТОКЕНА');
  console.log('═'.repeat(80));
  console.log(`\nТокен: ${NEW_TOKEN.substring(0, 30)}...${NEW_TOKEN.substring(-10)}`);
  console.log(`Длина: ${NEW_TOKEN.length} символов`);
  console.log('\n═'.repeat(80) + '\n');
  
  try {
    // 1. Проверяем базовую информацию о токене
    console.log('1️⃣ ИНФОРМАЦИЯ О ТОКЕНЕ\n');
    const tokenDebug = await makeGraphRequest('/debug_token', {
      input_token: NEW_TOKEN
    });
    
    if (tokenDebug.error) {
      console.log('❌ Ошибка при проверке токена:', tokenDebug.error.message);
      return;
    }
    
    const tokenData = tokenDebug.data;
    console.log('📋 ДАННЫЕ ТОКЕНА:');
    console.log(`   ├─ Статус: ${tokenData.is_valid ? '✅ Валиден' : '❌ Невалиден'}`);
    console.log(`   ├─ User ID: ${tokenData.user_id}`);
    console.log(`   ├─ App ID: ${tokenData.app_id}`);
    console.log(`   ├─ Type: ${tokenData.type}`);
    
    if (tokenData.issued_at) {
      const issuedDate = new Date(tokenData.issued_at * 1000);
      console.log(`   ├─ Issued at: ${issuedDate.toISOString()}`);
    }
    
    if (tokenData.expires_at) {
      const expiresDate = new Date(tokenData.expires_at * 1000);
      console.log(`   └─ Expires: ${expiresDate.toISOString()}`);
    } else {
      console.log(`   └─ Expires: Никогда (постоянный токен)`);
    }
    console.log('');
    
    if (!tokenData.is_valid) {
      console.log('⚠️ Токен невалиден или истек');
      return;
    }
    
    // 2. Scopes и Permissions
    console.log('2️⃣ SCOPES И PERMISSIONS\n');
    const scopes = tokenData.scopes || [];
    console.log(`📋 Найдено scopes: ${scopes.length}\n`);
    
    if (scopes.length > 0) {
      scopes.forEach((scope, idx) => {
        const scopeEmoji = scope.includes('ads') ? '📊' : scope.includes('business') ? '🏢' : '✅';
        console.log(`   ${idx + 1}. ${scopeEmoji} ${scope}`);
      });
    } else {
      console.log('   ⚠️ Scopes не найдены');
    }
    console.log('');
    
    // 3. Текущий пользователь
    console.log('3️⃣ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ\n');
    const user = await makeGraphRequest('/me', {
      fields: 'id,name,email'
    });
    
    if (user.error) {
      console.log('❌ Ошибка:', user.error.message);
    } else {
      console.log('📋 ПОЛЬЗОВАТЕЛЬ:');
      console.log(`   ├─ ID: ${user.id}`);
      console.log(`   ├─ Имя: ${user.name}`);
      console.log(`   └─ Email: ${user.email || 'Н/A'}`);
      console.log('');
    }
    
    // 4. Business Managers
    console.log('4️⃣ BUSINESS MANAGERS\n');
    const businesses = await makeGraphRequest(`/${user.id}/businesses`, {
      fields: 'id,name'
    });
    
    if (businesses.data && businesses.data.length > 0) {
      console.log(`📊 Найдено Business Managers: ${businesses.data.length}\n`);
      businesses.data.forEach((biz, idx) => {
        console.log(`   ${idx + 1}. ${biz.name} (${biz.id})`);
      });
      console.log('');
    } else {
      console.log('⚠️ Business Managers не найдены\n');
    }
    
    // 5. Ad Accounts (через /me/adaccounts)
    console.log('5️⃣ AD ACCOUNTS\n');
    const adAccounts = await makeGraphRequest('/me/adaccounts', {
      fields: 'id,name,account_status,currency'
    });
    
    if (adAccounts.data && adAccounts.data.length > 0) {
      console.log(`📊 Найдено Ad Accounts: ${adAccounts.data.length}\n`);
      adAccounts.data.forEach((acc, idx) => {
        console.log(`   ${idx + 1}. ${acc.name || 'Без названия'} (${acc.id.replace('act_', '')})`);
      });
      console.log('');
    } else {
      console.log('⚠️ Ad Accounts не найдены\n');
    }
    
    // 6. Рекомендации
    console.log('═'.repeat(80));
    console.log('\n💡 РЕКОМЕНДАЦИИ:\n');
    
    const hasAdsManagement = scopes.includes('ads_management');
    const hasBusinessManagement = scopes.includes('business_management');
    
    if (hasAdsManagement && hasBusinessManagement) {
      console.log('✅ Токен имеет ВСЕ необходимые permissions!');
      console.log('   Можно получить доступ ко всем Business Manager и Ad Accounts');
    } else {
      console.log('⚠️ Токену не хватает некоторых permissions:');
      if (!hasAdsManagement) console.log('   ❌ ads_management');
      if (!hasBusinessManagement) console.log('   ❌ business_management');
      console.log('\n   Как получить новый токен:');
      console.log('   1. Перейди на https://developers.facebook.com/apps');
      console.log('   2. Выбери приложение');
      console.log('   3. Settings → Basic → Скопируй App ID');
      console.log('   4. Tools → Access Token Debugger → Создай новый token');
      console.log('   5. Выбери все необходимые scopes');
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log(error.stack);
  }
}

main().catch(console.error);
