import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import * as path from 'path';

const IAE_BOT_TOKEN = process.env.IAE_BOT_TOKEN || '8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4';
const ACTIVATION_CODE = '2134';
const ACTIVE_CHATS_FILE = path.join(__dirname, '../../data/iae-active-chats.json');

interface ActiveChat {
  chatId: number;
  chatTitle?: string;
  activatedAt: string;
  activatedBy: number;
}

// Инициализация IAE бота
export const iaeBot = new TelegramBot(IAE_BOT_TOKEN, { 
  polling: true 
});

console.log('🤖 [IAE Bot] Initialized with token:', IAE_BOT_TOKEN.substring(0, 20) + '...');

// Загрузка активных чатов
function loadActiveChats(): ActiveChat[] {
  try {
    const dir = path.dirname(ACTIVE_CHATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(ACTIVE_CHATS_FILE)) {
      const data = fs.readFileSync(ACTIVE_CHATS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ [IAE Bot] Ошибка загрузки active chats:', error);
  }
  return [];
}

// Сохранение активных чатов
function saveActiveChats(chats: ActiveChat[]) {
  try {
    const dir = path.dirname(ACTIVE_CHATS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ACTIVE_CHATS_FILE, JSON.stringify(chats, null, 2), 'utf-8');
    console.log(`💾 [IAE Bot] Saved ${chats.length} active chats`);
  } catch (error) {
    console.error('❌ [IAE Bot] Ошибка сохранения active chats:', error);
  }
}

// Получить список активных чатов
export function getActiveChats(): number[] {
  const chats = loadActiveChats();
  console.log(`📋 [IAE Bot] Active chats: ${chats.length}`);
  return chats.map(c => c.chatId);
}

// Активация чата
function activateChat(chatId: number, userId: number, chatTitle?: string): boolean {
  const chats = loadActiveChats();
  
  // Проверка, уже активирован ли чат
  if (chats.some(c => c.chatId === chatId)) {
    console.log(`⚠️ [IAE Bot] Chat ${chatId} already activated`);
    return false;
  }
  
  // Добавление нового чата
  chats.push({
    chatId,
    chatTitle,
    activatedAt: new Date().toISOString(),
    activatedBy: userId,
  });
  
  saveActiveChats(chats);
  console.log(`✅ [IAE Bot] Chat ${chatId} (${chatTitle}) activated by user ${userId}`);
  return true;
}

// Деактивация чата
function deactivateChat(chatId: number): boolean {
  const chats = loadActiveChats();
  const initialLength = chats.length;
  const filtered = chats.filter(c => c.chatId !== chatId);
  
  if (filtered.length < initialLength) {
    saveActiveChats(filtered);
    console.log(`🗑️ [IAE Bot] Chat ${chatId} deactivated`);
    return true;
  }
  
  return false;
}

// Команда /start
iaeBot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `🤖 *Привет! Я IAE Agent*

Intelligence Analytics Engine - система мониторинга и проверки аналитики трафика.

*Что я умею:*
• ✅ Проверяю состояние систем (AmoCRM, Facebook Ads)
• 📊 Анализирую качество данных
• 🚨 Обнаруживаю аномалии и проблемы
• 💡 Даю AI рекомендации от Groq
• 📅 Отправляю отчеты по расписанию

*Расписание отчетов:*
• ⏰ 10:00 - Отчет за вчера
• ⏰ 16:00 - Текущий статус
• 📅 1-го числа - Месячный отчет
• 🔍 Каждый час - Health check (только при проблемах)

*Для активации отправь код:* \`2134\`

━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by Groq AI • v1.0`;

  try {
    await iaeBot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown'
    });
    console.log(`📨 [IAE Bot] Sent welcome to chat ${chatId}`);
  } catch (error) {
    console.error(`❌ [IAE Bot] Error sending welcome:`, error);
  }
});

// Команда /help
iaeBot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `📖 *IAE Agent - Помощь*

*Команды:*
/start - Приветствие и инструкция
/help - Эта справка
/status - Проверить статус активации
/deactivate - Отключить отчеты

*Активация:*
Отправь код \`2134\` для активации отчетов

*Расписание:*
• ⏰ 10:00 - Отчет за вчера
• ⏰ 16:00 - Текущий статус  
• 📅 1-го числа - Месячный отчет
• 🔍 Каждый час - Health check

*Метрики в отчетах:*
• Health Score (0-100)
• Статус систем (AmoCRM, FB Ads, DB)
• Траты, доход, продажи, ROAS, CTR
• Обнаруженные проблемы и аномалии
• AI рекомендации и риски

━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by Groq AI`;

  try {
    await iaeBot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error(`❌ [IAE Bot] Error sending help:`, error);
  }
});

// Команда /status
iaeBot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const chats = loadActiveChats();
  const isActive = chats.some(c => c.chatId === chatId);
  
  const statusMessage = isActive
    ? `✅ *Чат активирован*\n\nБуду присылать отчеты IAE Agent по расписанию.`
    : `❌ *Чат не активирован*\n\nДля активации отправь код: \`2134\``;
  
  try {
    await iaeBot.sendMessage(chatId, statusMessage, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error(`❌ [IAE Bot] Error sending status:`, error);
  }
});

// Команда /deactivate
iaeBot.onText(/\/deactivate/, async (msg) => {
  const chatId = msg.chat.id;
  const deactivated = deactivateChat(chatId);
  
  const message = deactivated
    ? `🗑️ *Чат деактивирован*\n\nОтчеты больше не будут приходить.\n\nДля повторной активации отправь код: \`2134\``
    : `❌ *Чат не был активирован*`;
  
  try {
    await iaeBot.sendMessage(chatId, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error(`❌ [IAE Bot] Error sending deactivate:`, error);
  }
});

// Обработка кода активации
iaeBot.on('message', async (msg) => {
  // Игнорируем команды
  if (msg.text?.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from?.id || 0;
  const chatTitle = msg.chat.title || msg.chat.first_name;
  
  if (msg.text === ACTIVATION_CODE) {
    const activated = activateChat(chatId, userId, chatTitle);
    
    const message = activated
      ? `✅ *Чат активирован!*

Буду присылать отчеты IAE Agent:
• ⏰ 10:00 - За вчера
• ⏰ 16:00 - Текущий статус
• 📅 1-го числа - За месяц
• 🔍 Каждый час - Health check (при проблемах)

*Первый отчет придет по расписанию.*

Используй /help для справки.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 IAE Agent готов к работе!`
      : `⚠️ *Чат уже активирован*\n\nОтчеты уже настроены.`;
    
    try {
      await iaeBot.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error(`❌ [IAE Bot] Error sending activation:`, error);
    }
  }
});

// Отправка отчета во все активные чаты
export async function sendIAEReport(report: string, reportId?: string): Promise<number> {
  const chats = getActiveChats();
  let successCount = 0;
  
  console.log(`📤 [IAE Bot] Sending report to ${chats.length} chats...`);
  
  for (const chatId of chats) {
    try {
      const sentMessage = await iaeBot.sendMessage(chatId, report, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      successCount++;
      console.log(`✅ [IAE Bot] Report sent to chat ${chatId}, message ${sentMessage.message_id}`);
    } catch (error: any) {
      console.error(`❌ [IAE Bot] Failed to send to chat ${chatId}:`, error.message);
      
      // Если чат заблокировал бота или не найден - деактивируем
      if (error.response?.statusCode === 403 || error.response?.statusCode === 400) {
        console.log(`🗑️ [IAE Bot] Deactivating unreachable chat ${chatId}`);
        deactivateChat(chatId);
      }
    }
  }
  
  console.log(`📊 [IAE Bot] Report sent: ${successCount}/${chats.length} chats`);
  return successCount;
}

// Обработка ошибок polling
iaeBot.on('polling_error', (error) => {
  console.error('❌ [IAE Bot] Polling error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 [IAE Bot] Stopping...');
  iaeBot.stopPolling();
  process.exit(0);
});

console.log('✅ [IAE Bot] Started successfully');
