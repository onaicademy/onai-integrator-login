#!/usr/bin/env node

/**
 * 🔐 Facebook Permanent Page Access Token Generator
 * Получает вечный токен страницы через Graph API
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ КОНСТАНТЫ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const APP_ID = "1079708200963910";
const APP_SECRET = "48a635657fd97b73afc817d95a1f9dff";
const SHORT_USER_TOKEN = "EAAPVZCSfHj0YBQMbUxSZCVgEvQWiEc9sKxDRawAEqngaFKEvH67YjuZCKqGA9cTZCNJlGjSAJND1RiF6pAdCuiFdhQGOfc6j34wJfaMtfmNHprlWT3oyywGZCBNKoUfK8e7O2L69igQktmt3rZBG2ZB9ClV1kZCPRRSXHZCSTSeYNIQjjXMMLwNCQTAJ4G9IYZCSCIZAzH7v7x6Ksbqqo0pzoUcB61eGzJZCwu6xZBR2D";

const GRAPH_API_VERSION = "v21.0"; // Последняя версия на Dec 2024

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function makeFacebookRequest(url, errorContext) {
  try {
    console.log(`\n🔄 ${errorContext}...`);
    console.log(`📡 URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok || data.error) {
      console.error(`\n❌ ОШИБКА: ${errorContext}`);
      console.error(`Status: ${response.status}`);
      console.error(`Error:`, JSON.stringify(data.error || data, null, 2));
      throw new Error(data.error?.message || 'Facebook API request failed');
    }
    
    return data;
  } catch (error) {
    console.error(`\n💥 КРИТИЧЕСКАЯ ОШИБКА: ${errorContext}`);
    console.error(error.message);
    throw error;
  }
}

function printTokenInfo(token, label) {
  console.log(`\n✅ ${label}:`);
  console.log(`📝 Token (first 50 chars): ${token.substring(0, 50)}...`);
  console.log(`📏 Length: ${token.length} characters`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣ ГЛАВНАЯ ЛОГИКА
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getPermanentPageToken() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║  🔐 FACEBOOK PERMANENT PAGE ACCESS TOKEN GENERATOR        ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ШАГ 1: Short-Lived → Long-Lived User Token (60 дней)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const step1Url = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${APP_ID}&` +
    `client_secret=${APP_SECRET}&` +
    `fb_exchange_token=${SHORT_USER_TOKEN}`;
  
  const step1Data = await makeFacebookRequest(
    step1Url,
    'ШАГ 1: Обмен Short-Lived → Long-Lived User Token'
  );
  
  const longLivedUserToken = step1Data.access_token;
  
  if (!longLivedUserToken) {
    throw new Error('Не получен Long-Lived User Token!');
  }
  
  printTokenInfo(longLivedUserToken, 'Long-Lived User Token (60 дней)');
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ШАГ 2: Получить список страниц с PERMANENT токенами
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const step2Url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?` +
    `access_token=${longLivedUserToken}&` +
    `fields=name,id,access_token,category,tasks`;
  
  const step2Data = await makeFacebookRequest(
    step2Url,
    'ШАГ 2: Получение списка страниц с Permanent токенами'
  );
  
  const pages = step2Data.data;
  
  if (!pages || pages.length === 0) {
    console.log('\n⚠️  У вас нет страниц Facebook, или у токена нет прав "pages_show_list"');
    return;
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3️⃣ ВЫВОД РЕЗУЛЬТАТОВ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║  ✅ PERMANENT PAGE ACCESS TOKENS (Вечные!)               ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  pages.forEach((page, index) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📄 СТРАНИЦА ${index + 1}:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 Название:  ${page.name}`);
    console.log(`🆔 Page ID:   ${page.id}`);
    console.log(`📁 Категория: ${page.category || 'N/A'}`);
    console.log(`\n🔐 PERMANENT PAGE ACCESS TOKEN:`);
    console.log(`${page.access_token}`);
    
    if (page.tasks) {
      console.log(`\n🔑 Права: ${page.tasks.join(', ')}`);
    }
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4️⃣ ИНСТРУКЦИИ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║  📋 КАК ИСПОЛЬЗОВАТЬ                                      ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('1️⃣  Скопируй PERMANENT PAGE ACCESS TOKEN из списка выше');
  console.log('2️⃣  Обнови в production env.env:');
  console.log('    FACEBOOK_ADS_TOKEN=<твой_permanent_page_token>');
  console.log('3️⃣  Перезапусти backend: pm2 restart onai-backend');
  console.log('\n✅ Этот токен НЕ ИСТЕЧЕТ, пока:');
  console.log('   - Страница существует');
  console.log('   - Пользователь имеет права на страницу');
  console.log('   - Приложение не отозвано\n');
  
  console.log('🔥 ТОКЕН БУДЕТ РАБОТАТЬ ВЕЧНО! ♾️\n');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 ЗАПУСК
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

getPermanentPageToken().catch((error) => {
  console.error('\n💥 ФАТАЛЬНАЯ ОШИБКА:\n');
  console.error(error);
  console.log('\n\n📚 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
  console.log('1. Short-Lived User Token истек (живет 1-2 часа)');
  console.log('2. Приложение не имеет нужных permissions');
  console.log('3. Нет интернета или Facebook API недоступен');
  console.log('\n💡 РЕШЕНИЕ:');
  console.log('Получи новый Short-Lived User Token:');
  console.log('https://developers.facebook.com/tools/explorer/');
  console.log('Permissions: pages_show_list, pages_read_engagement, ads_read\n');
  process.exit(1);
});




