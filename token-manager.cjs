#!/usr/bin/env node

/**
 * Скрипт для автоматического обновления Facebook Access Token
 * Проверяет срок действия и обновляет за 7 дней до истечения
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  TOKEN_FILE: path.join(__dirname, '.facebook_token.json'),
  CURRENT_TOKEN: 'EAAPVZCSfHj0YBQVquZClCxwS6vLHo5zvmt3hgMZAP4zoZAd0FiRk3vG2H9Ix4zrf8C0i7V7AihEZB4dTY3gaKBq3eIlZAa1ZAce6ljcj7jLg8OJM24FZAD2vD5M6B2OhZAhUaThnfApvhmHqi1ZCXEQPGFX1uepZAYI2hpDgOzU4UMwFZBd9fdLtOM2aozIayjuC1quHZBQFpRLvzZBqkkjyfZBxtRhpVXVbenXzJt656Kiz9bZBP8PDol2YV5dHwuzhoJq5j6lhplU3VL7UDLZBZBh8ApZBCAf4qru',
  // Получи эти данные из Facebook Developer Console
  APP_ID: '1079708200963910',
  APP_SECRET: '48a635657fd97b73afc817d95a1f9dff'
};

async function makeGraphRequest(endpoint, params = {}, token = CONFIG.CURRENT_TOKEN) {
  try {
    const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
    url.searchParams.set('access_token', token);
    
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
 * Получает информацию о текущем токене
 */
async function getTokenInfo(token) {
  try {
    const response = await makeGraphRequest('/debug_token', { input_token: token }, token);
    
    if (response.error) {
      return null;
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Ошибка при проверке токена:', error.message);
    return null;
  }
}

/**
 * Сохраняет токен в файл
 */
function saveToken(token, expiresAt) {
  try {
    const data = {
      token: token,
      expiresAt: expiresAt,
      savedAt: new Date().toISOString(),
      daysRemaining: Math.floor((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    };
    
    fs.writeFileSync(CONFIG.TOKEN_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Токен сохранен в ${CONFIG.TOKEN_FILE}`);
    return data;
  } catch (error) {
    console.error('❌ Ошибка при сохранении токена:', error.message);
    return null;
  }
}

/**
 * Обновляет токен в .env файле
 */
function updateEnvFile(newToken) {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('⚠️ .env файл не найден');
      return false;
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update both FB_ACCESS_TOKEN and FACEBOOK_ADS_TOKEN
    envContent = envContent.replace(/^FB_ACCESS_TOKEN=.*/m, `FB_ACCESS_TOKEN=${newToken}`);
    envContent = envContent.replace(/^FACEBOOK_ADS_TOKEN=.*/m, `FACEBOOK_ADS_TOKEN=${newToken}`);
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env файл обновлен с новым токеном');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при обновлении .env:', error.message);
    return false;
  }
}

/**
 * Загружает токен из файла
 */
function loadToken() {
  try {
    if (fs.existsSync(CONFIG.TOKEN_FILE)) {
      const data = fs.readFileSync(CONFIG.TOKEN_FILE, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('❌ Ошибка при загрузке токена:', error.message);
    return null;
  }
}

/**
 * Обновляет токен на более долгоживущий
 */
async function refreshToken(token) {
  try {
    console.log('🔄 Обновляю токен...\n');
    
    // Способ 1: Используем Facebook API для refresh
    // Это работает для Instagram токенов, попробуем
    const response = await makeGraphRequest('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: CONFIG.APP_ID,
      client_secret: CONFIG.APP_SECRET,
      fb_exchange_token: token
    }, token);
    
    if (response.error) {
      console.log('⚠️ Автоматический refresh не поддерживается');
      console.log('💡 Рекомендация: Используй System User Token вместо этого');
      return null;
    }
    
    if (response.access_token) {
      console.log('✅ Токен успешно обновлен!');
      return response.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Ошибка при обновлении токена:', error.message);
    return null;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('\n🔐 FACEBOOK TOKEN MANAGER');
  console.log('═'.repeat(70));
  console.log(`\n📁 Файл токена: ${CONFIG.TOKEN_FILE}`);
  console.log(`\n═'.repeat(70) + '\n`);
  
  try {
    // 1. Проверяем текущий токен
    console.log('1️⃣ ПРОВЕРЯЮ ТЕКУЩИЙ ТОКЕН\n');
    const tokenInfo = await getTokenInfo(CONFIG.CURRENT_TOKEN);
    
    if (!tokenInfo || !tokenInfo.is_valid) {
      console.log('❌ Текущий токен невалиден или истек');
      return;
    }
    
    console.log('✅ Токен валиден\n');
    console.log('📋 ИНФОРМАЦИЯ О ТОКЕНЕ:');
    console.log(`   ├─ User ID: ${tokenInfo.user_id}`);
    console.log(`   ├─ App ID: ${tokenInfo.app_id}`);
    
    if (tokenInfo.expires_at) {
      const expiresDate = new Date(tokenInfo.expires_at * 1000);
      const daysLeft = Math.floor((expiresDate - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`   ├─ Expires: ${expiresDate.toISOString()}`);
      console.log(`   └─ Days left: ${daysLeft} дней`);
      
      // Сохраняем информацию о токене
      const saved = saveToken(CONFIG.CURRENT_TOKEN, tokenInfo.expires_at * 1000);
      
      // 2. Проверяем нужно ли обновление
      console.log('\n2️⃣ ПРОВЕРЯЮ НУЖНО ЛИ ОБНОВЛЕНИЕ\n');
      
      if (daysLeft <= 7) {
        console.log(`⚠️ Токен истекает через ${daysLeft} дней!`);
        console.log('🔄 Пытаюсь обновить...\n');
        
        const newToken = await refreshToken(CONFIG.CURRENT_TOKEN);
        
        if (newToken) {
          const newInfo = await getTokenInfo(newToken);
          if (newInfo && newInfo.expires_at) {
            const newExpiresDate = new Date(newInfo.expires_at * 1000);
            const newDaysLeft = Math.floor((newExpiresDate - Date.now()) / (1000 * 60 * 60 * 24));
            
            saveToken(newToken, newInfo.expires_at * 1000);
            
            // 🔥 Also update .env file with new token
            updateEnvFile(newToken);
            
            // Update CONFIG for current session
            CONFIG.CURRENT_TOKEN = newToken;
            
            console.log(`✅ Новый токен действует ${newDaysLeft} дней`);
            console.log('⚠️ ПЕРЕЗАПУСТИ BACKEND ДЛЯ ПРИМЕНЕНИЯ НОВОГО ТОКЕНА!');
          }
        }
      } else {
        console.log(`✅ Токен в порядке (${daysLeft} дней осталось)`);
      }
      
    } else {
      console.log('   └─ Expires: Никогда (System User Token?)');
      saveToken(CONFIG.CURRENT_TOKEN, Date.now() + 1000 * 60 * 60 * 24 * 365 * 100);
    }
    
  } catch (error) {
    console.error('❌ ОШИБКА:', error.message);
  }
  
  // 3. Инструкции по System User Token
  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 РЕКОМЕНДАЦИЯ: ИСПОЛЬЗУЙ SYSTEM USER TOKEN\n');
  console.log('Это токен, который НИКОГДА не требует обновления:\n');
  console.log('📋 КАК ПОЛУЧИТЬ:');
  console.log('   1. Перейди на https://business.facebook.com');
  console.log('   2. Settings → Users and Assets → System Users');
  console.log('   3. Создай System User (если нет)');
  console.log('   4. Нажми "Generate Token"');
  console.log('   5. Выбери Business Manager');
  console.log('   6. Выбери нужные permissions (ads_management, business_management)');
  console.log('   7. Копируй токен и используй его в скриптах\n');
  
  console.log('✅ ПЛЮСЫ System User Token:');
  console.log('   ✓ Никогда не истекает');
  console.log('   ✓ Безопаснее User токена');
  console.log('   ✓ Идеально для автоматизации');
  console.log('   ✓ Работает со всем Business Manager\n');
}

// Запуск
main().catch(console.error);
