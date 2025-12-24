/**
 * AmoCRM Token Refresh Helper
 * Проблема: access_token истёк (401 Unauthorized)
 * Решение: Нужен refresh_token для получения нового access_token
 * 
 * ❌ В env.env есть только AMOCRM_ACCESS_TOKEN (устарел)
 * ❌ Нет AMOCRM_REFRESH_TOKEN
 * 
 * 📝 ДЛЯ ПОЛЬЗОВАТЕЛЯ:
 * Чтобы получить новый токен, нужно:
 * 1. Зайти в AmoCRM: https://onaiagencykz.amocrm.ru
 * 2. Настройки > Интеграции > OAuth2
 * 3. Скопировать Authorization Code
 * 4. Вставить код ниже и запустить скрипт
 */

const axios = require('axios');

const AMOCRM_DOMAIN = 'onaiagencykz';
const AMOCRM_CLIENT_ID = '2944ad66-36f6-4833-9bdc-946e8fe5ef87';
const AMOCRM_CLIENT_SECRET = 'JpyNjVNVITQFWWHVvUxvPUVNIFrMdLMDI7wd6RuQVvnR1wkVPZFpJXR7iEoRYtvS';
const AMOCRM_REDIRECT_URI = 'https://api.onai.academy/webhook/amocrm/auth';

async function getAuthorizationUrl() {
  console.log('\n🔗 Authorization URL:');
  console.log(`https://${AMOCRM_DOMAIN}.amocrm.ru/oauth?client_id=${AMOCRM_CLIENT_ID}&redirect_uri=${encodeURIComponent(AMOCRM_REDIRECT_URI)}&response_type=code&state=random_state`);
  console.log('\n📋 STEPS:');
  console.log('1. Open the URL above in browser');
  console.log('2. Authorize the app');
  console.log('3. Copy the "code" parameter from redirect URL');
  console.log('4. Run: node refresh-amocrm-token.js YOUR_CODE_HERE\n');
}

async function exchangeCodeForTokens(authCode) {
  try {
    console.log('🔄 Exchanging authorization code for tokens...\n');
    
    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/oauth2/access_token`,
      {
        client_id: AMOCRM_CLIENT_ID,
        client_secret: AMOCRM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: AMOCRM_REDIRECT_URI
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const data = response.data;
    
    console.log('✅ SUCCESS! Got tokens:\n');
    console.log(`ACCESS_TOKEN: ${data.access_token}`);
    console.log(`REFRESH_TOKEN: ${data.refresh_token}`);
    console.log(`EXPIRES_IN: ${data.expires_in} seconds (${Math.round(data.expires_in/3600)} hours)\n`);
    
    console.log('📝 UPDATE backend/env.env:');
    console.log(`AMOCRM_ACCESS_TOKEN=${data.access_token}`);
    console.log(`AMOCRM_REFRESH_TOKEN=${data.refresh_token}`);
    console.log(`AMOCRM_TOKEN_EXPIRES_AT=${Date.now() + data.expires_in * 1000}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run
const authCode = process.argv[2];

if (!authCode) {
  getAuthorizationUrl();
} else {
  exchangeCodeForTokens(authCode);
}
