// ═════════════════════════════════════════════════════════════
// 🔑 ВОССТАНОВЛЕНИЕ ТОКЕНОВ ИЗ TRIPWIRE БАЗЫ ДАННЫХ
// ═════════════════════════════════════════════════════════════
// 
// Этот скрипт:
// 1. Читает зашифрованные токены из Tripwire базы данных
// 2. Расшифровывает их
// 3. Записывает в .env файл на продакшене
//
// Использование:
//   npx tsx scripts/restore-tokens-from-tripwire.ts
//
// ═════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════
// 📦 КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const TRIPWIRE_URL = process.env.TRIPWIRE_DATABASE_URL || 'https://arqhkacellqbhjhbebfh.supabase.co';
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

const PRODUCTION_SERVER = 'root@207.154.231.30';
const PRODUCTION_PATH = '/var/www/onai-integrator-login-main';

// ═══════════════════════════════════════════════════════════════
// 🔐 ИНТЕРФЕЙС ТОКЕНА
// ═════════════════════════════════════════════════════════════════

interface ApiToken {
  id: number;
  token_name: string;
  encrypted_token: string;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════
// 🔑 ФУНКЦИЯ РАСШИФРОВКИ (простая base64 для примера)
// ═══════════════════════════════════════════════════════════════════

function decryptToken(encrypted: string): string {
  try {
    // ПРИМЕЧАНИЕ: Это простая base64 декодировка
    // В реальном проекте нужно использовать AES-256-GCM или другое шифрование
    const decrypted = Buffer.from(encrypted, 'base64').toString('utf-8');
    return decrypted;
  } catch (error) {
    console.error('❌ Ошибка расшифровки токена:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📊 ФУНКЦИЯ ПОЛУЧЕНИЯ ТОКЕНОВ ИЗ TRIPWIRE
// ═════════════════════════════════════════════════════════════════

async function fetchTokensFromTripwire(): Promise<Map<string, string>> {
  console.log('🔍 Получение токенов из Tripwire базы данных...');

  const supabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

  const { data: tokens, error } = await supabase
    .from('api_tokens')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Ошибка получения токенов:', error);
    throw error;
  }

  if (!tokens || tokens.length === 0) {
    console.warn('⚠️  Токены не найдены в Tripwire базе данных');
    return new Map();
  }

  console.log(`✅ Получено ${tokens.length} токенов`);

  // Расшифровываем токены
  const decryptedTokens = new Map<string, string>();
  for (const token of tokens) {
    try {
      const decrypted = decryptToken(token.encrypted_token);
      decryptedTokens.set(token.token_name, decrypted);
      console.log(`   ✅ ${token.token_name}: ${decrypted.substring(0, 20)}...`);
    } catch (error) {
      console.error(`   ❌ Ошибка расшифровки ${token.token_name}:`, error);
    }
  }

  return decryptedTokens;
}

// ═══════════════════════════════════════════════════════════════════
// 📝 ФУНКЦИЯ СОЗДАНИЯ .ENV ФАЙЛА
// ═══════════════════════════════════════════════════════════════════

function createEnvFile(tokens: Map<string, string>): string {
  let envContent = '';

  // Карта соответствия token_name → env variable name
  const tokenMap: Record<string, string> = {
    'FACEBOOK_ADS_TOKEN': 'FACEBOOK_ADS_TOKEN',
    'FACEBOOK_APP_ID': 'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET': 'FACEBOOK_APP_SECRET',
    'FACEBOOK_BUSINESS_ID': 'FACEBOOK_BUSINESS_ID',
    'AMOCRM_ACCESS_TOKEN': 'AMOCRM_ACCESS_TOKEN',
    'AMOCRM_REFRESH_TOKEN': 'AMOCRM_REFRESH_TOKEN',
    'AMOCRM_CLIENT_ID': 'AMOCRM_CLIENT_ID',
    'AMOCRM_CLIENT_SECRET': 'AMOCRM_CLIENT_SECRET',
    'OPENAI_API_KEY': 'OPENAI_API_KEY',
    'RESEND_API_KEY': 'RESEND_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY': 'SUPABASE_SERVICE_ROLE_KEY',
    'TRAFFIC_SUPABASE_ANON_KEY': 'TRAFFIC_SUPABASE_ANON_KEY',
    'TRAFFIC_SUPABASE_SERVICE_ROLE_KEY': 'TRAFFIC_SUPABASE_SERVICE_ROLE_KEY',
  };

  // Добавляем токены в .env
  for (const [tokenName, envName] of Object.entries(tokenMap)) {
    if (tokens.has(tokenName)) {
      const value = tokens.get(tokenName)!;
      envContent += `${envName}=${value}\n`;
    }
  }

  return envContent;
}

// ═════════════════════════════════════════════════════════════════
// 🚀 ФУНКЦИЯ ЗАГРУЗКИ .ENV НА ПРОДАКШЕН
// ═══════════════════════════════════════════════════════════════════

async function uploadEnvToServer(envContent: string): Promise<void> {
  console.log('📤 Загрузка .env на продакшен...');

  const { execSync } = await import('child_process');

  // Создаем временный файл
  const tempFile = '/tmp/.env.restored';
  execSync(`echo '${envContent}' > ${tempFile}`);

  // Загружаем на сервер
  execSync(`scp ${tempFile} ${PRODUCTION_SERVER}:/tmp/`);

  // Перемещаем в правильное место с бэкапом
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  execSync(`ssh ${PRODUCTION_SERVER} "cp ${PRODUCTION_PATH}/.env ${PRODUCTION_PATH}/.env.backup.${timestamp}"`);
  execSync(`ssh ${PRODUCTION_SERVER} "mv /tmp/.env.restored ${PRODUCTION_PATH}/.env"`);

  // Удаляем временный файл
  execSync(`rm ${tempFile}`);

  console.log('✅ .env загружен на продакшен');
  console.log(`   Бэкап: ${PRODUCTION_PATH}/.env.backup.${timestamp}`);
}

// ═══════════════════════════════════════════════════════════════════
// 🔄 ФУНКЦИЯ ПЕРЕЗАПУСКА PM2
// ═══════════════════════════════════════════════════════════════════

async function restartPM2(): Promise<void> {
  console.log('🔄 Перезапуск PM2...');

  const { execSync } = await import('child_process');

  execSync(`ssh ${PRODUCTION_SERVER} "cd ${PRODUCTION_PATH} && pm2 reload ecosystem.config.cjs --update-env"`);

  console.log('✅ PM2 перезапущен');

  // Ждем 5 секунд
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Проверяем статус
  const status = execSync(`ssh ${PRODUCTION_SERVER} "pm2 status --json | grep -o '\"status\":\"[^\"]*\"' | grep -o '[^\"]*'"`).toString().trim();

  if (status === 'online') {
    console.log('✅ PM2 статус: ONLINE');
  } else {
    console.error(`❌ PM2 статус: ${status}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🎯 ГЛАВНАЯ ФУНКЦИЯ
// ═════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('🔑 ВОССТАНОВЛЕНИЕ ТОКЕНОВ ИЗ TRIPWIRE БАЗЫ ДАННЫХ');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Получаем токены из Tripwire
    const tokens = await fetchTokensFromTripwire();

    if (tokens.size === 0) {
      console.error('❌ Нет токенов для восстановления!');
      process.exit(1);
    }

    // 2. Создаем .env файл
    const envContent = createEnvFile(tokens);

    // 3. Загружаем на продакшен
    await uploadEnvToServer(envContent);

    // 4. Перезапускаем PM2
    await restartPM2();

    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('✅ ВОССТАНОВЛЕНИЕ ТОКЕНОВ УСПЕШНО ЗАВЕРШЕНО');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Итог:');
    console.log(`   ✅ Восстановлено токенов: ${tokens.size}`);
    console.log('   ✅ .env обновлен на продакшене');
    console.log('   ✅ PM2 перезапущен');
    console.log('');
    console.log('🎯 Следующие шаги:');
    console.log('   1. Протестировать API эндпоинты');
    console.log('   2. Проверить, что все токены работают');
    console.log('   3. Проверить логи на ошибки');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('══════════════════════════════════════════════════════════════');
    console.error('❌ ОШИБКА ВОССТАНОВЛЕНИЯ ТОКЕНОВ');
    console.error('══════════════════════════════════════════════════════════════');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 🚀 ЗАПУСК
// ═══════════════════════════════════════════════════════════════════

main();
