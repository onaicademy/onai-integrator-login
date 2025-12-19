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

// Инициализация IAE бота (ленивая)
let _iaeBot: TelegramBot | null = null;

export function getIAEBot(): TelegramBot {
  if (!_iaeBot) {
    _iaeBot = new TelegramBot(IAE_BOT_TOKEN, { polling: false }); // Polling включится в initIAEBot()
    console.log('🤖 [IAE Bot] Instance created with token:', IAE_BOT_TOKEN.substring(0, 20) + '...');
  }
  return _iaeBot;
}

export const iaeBot = getIAEBot();

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

// Инициализация обработчиков бота
export function initIAEBot() {
  console.log('🤖 [IAE Bot] Инициализация обработчиков...');
  
  // 🚀 Запускаем polling только если еще не запущен
  if (!iaeBot.isPolling()) {
    iaeBot.startPolling();
    console.log('🤖 [IAE Bot] Polling started');
  }
  
  // Команда /start
  iaeBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `👋 Привет! Я бот IAE Agent.

🤖 Intelligence Analytics Engine - система мониторинга трафика.

📊 Я отправляю автоматические отчеты:
• 🌅 10:00 - Отчет за вчера
• 📊 16:00 - Текущий статус
• 📅 1-го числа - Месячный отчет
• 🔍 Каждый час - Health check (при проблемах)

🔐 Для активации отправь код активации.`;

    try {
      await iaeBot.sendMessage(chatId, welcomeMessage);
      console.log(`📨 [IAE Bot] Sent welcome to chat ${chatId}`);
    } catch (error) {
      console.error(`❌ [IAE Bot] Error sending welcome:`, error);
    }
  });

  // Команда /status
  iaeBot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const chats = loadActiveChats();
    const isActive = chats.some(c => c.chatId === chatId);
    const chat = chats.find(c => c.chatId === chatId);
    
    if (isActive) {
      await iaeBot.sendMessage(chatId,
        `✅ *ЧАТ АКТИВЕН*\n\n` +
        `📋 Чат: ${chat?.chatTitle || 'Неизвестно'}\n` +
        `🕐 Активирован: ${chat?.activatedAt ? new Date(chat.activatedAt).toLocaleString('ru-RU') : 'Н/Д'}\n\n` +
        `📊 Отчеты IAE Agent приходят автоматически.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await iaeBot.sendMessage(chatId,
        '❌ *ЧАТ НЕ АКТИВЕН*\n\n' +
        '🔐 Отправь код активации: `2134`',
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Обработка кода активации (как у основного бота!)
  iaeBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const userId = msg.from?.id;
    
    if (!text || !userId) return;
    
    // Проверка кода активации
    if (text === ACTIVATION_CODE) {
      const chatTitle = msg.chat.title || `Chat ${chatId}`;
      const activated = activateChat(chatId, userId, chatTitle);
      
      if (activated) {
        await iaeBot.sendMessage(chatId,
          '✅ *АКТИВАЦИЯ УСПЕШНА!*\n\n' +
          '🎯 Теперь этот чат будет получать отчеты IAE Agent:\n\n' +
          '🌅 *10:00* - Отчет за вчера\n' +
          '📊 *16:00* - Текущий статус\n' +
          '📅 *1-го числа* - Месячный отчет\n' +
          '🔍 *Каждый час* - Health check\n\n' +
          '🤖 Powered by Groq AI',
          { parse_mode: 'Markdown' }
        );
        console.log(`✅ [IAE Bot] Чат ${chatId} (${chatTitle}) активирован пользователем ${userId}`);
      } else {
        await iaeBot.sendMessage(chatId,
          '⚠️ Чат уже активирован ранее.\n\n' +
          'Используй /status для проверки статуса.'
        );
        console.log(`ℹ️ [IAE Bot] Чат ${chatId} уже был активирован`);
      }
    }
  });
  
  // Обработка ошибок polling
  iaeBot.on('polling_error', (error) => {
    const errorMsg = error.message || '';
    
    // Игнорируем временные ошибки
    if (errorMsg.includes('Logged out')) {
      // Ждем, Telegram API восстановит сессию автоматически
      return;
    }
    
    // Логируем только важные ошибки
    if (!errorMsg.includes('409 Conflict')) {
      console.error('❌ [IAE Bot] Polling error:', errorMsg);
    }
  });
  
  console.log('✅ [IAE Bot] Handlers настроены');
}

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

// ✅ Bot готов к инициализации через initIAEBot()
console.log('✅ [IAE Bot] Bot initialized, call initIAEBot() to start handlers');
