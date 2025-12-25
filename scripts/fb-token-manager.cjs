#!/usr/bin/env node

/**
 * Facebook Token Manager
 * Автоматическое обновление Facebook Access Token
 * 
 * Использование:
 *   node scripts/fb-token-manager.js --init     # Получить долгоживущий токен из короткого
 *   node scripts/fb-token-manager.js --refresh  # Обновить текущий долгоживущий токен
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// КОНФИГУРАЦИЯ (ХАРДКОД)
// ============================================
const CONFIG = {
  APP_ID: '1079708200963910',
  APP_SECRET: '48a635657fd97b73afc817d95a1f9dff',
  STARTING_SHORT_TOKEN: 'EAAPVZCSfHj0YBQTiIzqxUdVESomUHSmN84XUjG5JlvHpZACMI27RwUR6w1tQ7pBzagjdJw3NbvNUpZB0wIDvoUjJFw8kMDLsUhVzHXcyGuWamYZCEZBQpM4aXsmVaWF90AROo3iLPcD6hydW39uIZAiwrmxuA10AZBZA1ywD490IAPanpZBxd6m4tF05EosaP08H3sdOF6zHpiSNGfIesHMiozPUU16s2X9iZCZCcXlVlpfyQQ6ZB4gVScYNHKQN4PVqS3C7QolhlSV2kjc7TkkPYJVzr0Qe',
  FB_API_VERSION: 'v22.0',
  ENV_FILES: [
    './.env',
    './.env.production',
    './backend/.env',
    './backend/env.env'
  ]
};

// ============================================
// ФУНКЦИИ РАБОТЫ С ТОКЕНАМИ
// ============================================

/**
 * Получает долгоживущий токен из короткоживущего
 * @param {string} shortToken - Короткоживущий токен
 * @returns {Promise<{access_token: string, expires_in: number}>}
 */
async function getLongLivedToken(shortToken) {
  console.log('🔄 Обмениваем короткий токен на долгоживущий...');
  
  const url = `https://graph.facebook.com/${CONFIG.FB_API_VERSION}/oauth/access_token`;
  
  try {
    const response = await axios.get(url, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: CONFIG.APP_ID,
        client_secret: CONFIG.APP_SECRET,
        fb_exchange_token: shortToken
      }
    });
    
    const { access_token, expires_in } = response.data;
    const expiresInDays = Math.floor(expires_in / 86400);
    
    console.log(`✅ Получен долгоживущий токен!`);
    console.log(`   Срок действия: ${expiresInDays} дней (${expires_in} секунд)`);
    console.log(`   Токен начинается с: ${access_token.substring(0, 20)}...`);
    
    return { access_token, expires_in };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ Ошибка при получении токена: ${errorMsg}`);
    throw error;
  }
}

/**
 * Обновляет долгоживущий токен (получает новый на основе текущего)
 * @param {string} currentToken - Текущий долгоживущий токен
 * @returns {Promise<{access_token: string, expires_in: number}>}
 */
async function refreshLongLivedToken(currentToken) {
  console.log('🔄 Обновляем долгоживущий токен...');
  
  const url = `https://graph.facebook.com/${CONFIG.FB_API_VERSION}/oauth/access_token`;
  
  try {
    const response = await axios.get(url, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: CONFIG.APP_ID,
        client_secret: CONFIG.APP_SECRET,
        fb_exchange_token: currentToken
      }
    });
    
    const { access_token, expires_in } = response.data;
    const expiresInDays = Math.floor(expires_in / 86400);
    
    console.log(`✅ Токен успешно обновлён!`);
    console.log(`   Новый срок действия: ${expiresInDays} дней (${expires_in} секунд)`);
    console.log(`   Новый токен начинается с: ${access_token.substring(0, 20)}...`);
    
    return { access_token, expires_in };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ Ошибка при обновлении токена: ${errorMsg}`);
    throw error;
  }
}

// ============================================
// ФУНКЦИИ РАБОТЫ С ENV ФАЙЛАМИ
// ============================================

/**
 * Обновляет FB_ACCESS_TOKEN в env-файле
 * @param {string} filePath - Путь к env-файлу
 * @param {string} newToken - Новый токен
 * @returns {boolean} - Успех операции
 */
function updateEnvFile(filePath, newToken) {
  const absolutePath = path.resolve(filePath);
  
  // Проверяем существование файла
  if (!fs.existsSync(absolutePath)) {
    console.log(`   ⚠️  Файл не найден: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(absolutePath, 'utf8');
    const tokenLine = `FB_ACCESS_TOKEN=${newToken}`;
    
    // Ищем существующую строку FB_ACCESS_TOKEN
    const regex = /^FB_ACCESS_TOKEN=.*/m;
    
    if (regex.test(content)) {
      // Заменяем существующее значение
      content = content.replace(regex, tokenLine);
      console.log(`   ✅ Обновлён: ${filePath}`);
    } else {
      // Добавляем новую строку в конец файла
      content = content.trimEnd() + '\n' + tokenLine + '\n';
      console.log(`   ✅ Добавлен: ${filePath}`);
    }
    
    fs.writeFileSync(absolutePath, content, 'utf8');
    return true;
  } catch (error) {
    console.log(`   ❌ Ошибка записи: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * Обновляет токен во всех env-файлах
 * @param {string} newToken - Новый токен
 */
function updateAllEnvFiles(newToken) {
  console.log('\n📁 Обновляем .env файлы...');
  
  let updated = 0;
  let failed = 0;
  
  for (const envFile of CONFIG.ENV_FILES) {
    if (updateEnvFile(envFile, newToken)) {
      updated++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n📊 Результат: ${updated} обновлено, ${failed} пропущено`);
}

/**
 * Читает текущий токен из первого существующего env-файла
 * @returns {string|null} - Текущий токен или null
 */
function getCurrentToken() {
  for (const envFile of CONFIG.ENV_FILES) {
    const absolutePath = path.resolve(envFile);
    
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      const match = content.match(/^FB_ACCESS_TOKEN=(.+)$/m);
      
      if (match && match[1]) {
        console.log(`📖 Текущий токен найден в: ${envFile}`);
        return match[1].trim();
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

/**
 * Сохраняет информацию о токене в JSON файл для отслеживания
 * @param {string} token - Токен
 * @param {number} expiresIn - Время жизни в секундах
 */
function saveTokenInfo(token, expiresIn) {
  const info = {
    token_prefix: token.substring(0, 30) + '...',
    updated_at: new Date().toISOString(),
    expires_in_seconds: expiresIn,
    expires_in_days: Math.floor(expiresIn / 86400),
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
  };
  
  const infoPath = path.resolve('./.facebook_token.json');
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf8');
  console.log(`\n💾 Информация о токене сохранена в: .facebook_token.json`);
}

// ============================================
// ГЛАВНЫЕ КОМАНДЫ
// ============================================

/**
 * Команда --init: Получает долгоживущий токен из начального короткого
 */
async function commandInit() {
  console.log('🚀 ИНИЦИАЛИЗАЦИЯ: Получение долгоживущего токена\n');
  console.log(`   App ID: ${CONFIG.APP_ID}`);
  console.log(`   Исходный токен: ${CONFIG.STARTING_SHORT_TOKEN.substring(0, 20)}...`);
  console.log('');
  
  try {
    const { access_token, expires_in } = await getLongLivedToken(CONFIG.STARTING_SHORT_TOKEN);
    updateAllEnvFiles(access_token);
    saveTokenInfo(access_token, expires_in);
    
    console.log('\n✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('   Токен сохранён во все .env файлы.');
    console.log('   Используйте --refresh для обновления в будущем.');
  } catch (error) {
    console.error('\n❌ ИНИЦИАЛИЗАЦИЯ ПРОВАЛЕНА');
    process.exit(1);
  }
}

/**
 * Команда --refresh: Обновляет текущий долгоживущий токен
 */
async function commandRefresh() {
  console.log('🔄 ОБНОВЛЕНИЕ: Продление срока действия токена\n');
  
  const currentToken = getCurrentToken();
  
  if (!currentToken) {
    console.error('❌ Токен не найден ни в одном .env файле!');
    console.error('   Сначала выполните: node scripts/fb-token-manager.js --init');
    process.exit(1);
  }
  
  console.log(`   Текущий токен: ${currentToken.substring(0, 20)}...`);
  console.log('');
  
  try {
    const { access_token, expires_in } = await refreshLongLivedToken(currentToken);
    updateAllEnvFiles(access_token);
    saveTokenInfo(access_token, expires_in);
    
    console.log('\n✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!');
    console.log('   Новый токен сохранён во все .env файлы.');
  } catch (error) {
    console.error('\n❌ ОБНОВЛЕНИЕ ПРОВАЛЕНО');
    console.error('   Возможно, токен истёк. Получите новый короткий токен и используйте --init');
    process.exit(1);
  }
}

/**
 * Показывает справку
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║            Facebook Token Manager v1.0                    ║
╚════════════════════════════════════════════════════════════╝

Использование:
  node scripts/fb-token-manager.js <команда>

Команды:
  --init      Получить долгоживущий токен из начального короткого токена
              (используется при первом запуске или когда нужен новый токен)

  --refresh   Обновить текущий долгоживущий токен
              (продлевает срок действия существующего токена)

  --help      Показать эту справку

Примеры:
  node scripts/fb-token-manager.js --init
  node scripts/fb-token-manager.js --refresh

Cron (раз в месяц, 1-го числа в 03:00):
  0 3 1 * * cd /Users/miso/onai-integrator-login && /usr/local/bin/node scripts/fb-token-manager.js --refresh >> /var/log/fb-token.log 2>&1

Файлы, которые обновляются:
${CONFIG.ENV_FILES.map(f => `  - ${f}`).join('\n')}
`);
}

// ============================================
// ТОЧКА ВХОДА
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('            🔐 Facebook Token Manager');
  console.log(`            📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  switch (command) {
    case '--init':
      await commandInit();
      break;
    case '--refresh':
      await commandRefresh();
      break;
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log('❓ Неизвестная команда или команда не указана.\n');
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Критическая ошибка:', error.message);
  process.exit(1);
});
