import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import * as path from 'path';

const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const ACTIVATION_CODE = '2134';
const ACTIVE_CHATS_FILE = path.join(__dirname, '../../data/active-telegram-chats.json');

interface ActiveChat {
  chatId: number;
  chatTitle?: string;
  activatedAt: string;
  activatedBy: number;
}

// Инициализация бота
export const bot = new TelegramBot(BOT_TOKEN, { polling: true });

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
    console.error('❌ Ошибка загрузки active chats:', error);
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
  } catch (error) {
    console.error('❌ Ошибка сохранения active chats:', error);
  }
}

// Получить список активных чатов
export function getActiveChats(): number[] {
  return loadActiveChats().map(c => c.chatId);
}

// Активация чата
function activateChat(chatId: number, userId: number, chatTitle?: string) {
  const chats = loadActiveChats();
  
  // Проверка, уже активирован ли чат
  if (chats.some(c => c.chatId === chatId)) {
    return false; // Уже активирован
  }
  
  // Добавление нового чата
  chats.push({
    chatId,
    chatTitle,
    activatedAt: new Date().toISOString(),
    activatedBy: userId,
  });
  
  saveActiveChats(chats);
  return true;
}

// Деактивация чата
function deactivateChat(chatId: number) {
  const chats = loadActiveChats();
  const filtered = chats.filter(c => c.chatId !== chatId);
  saveActiveChats(filtered);
}

// Отправка сообщения во все активные чаты
export async function sendToAllChats(message: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
  const chatIds = getActiveChats();
  const results = [];
  
  for (const chatId of chatIds) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: parseMode });
      results.push({ chatId, success: true });
      console.log(`✅ Отправлено в чат ${chatId}`);
    } catch (error: any) {
      console.error(`❌ Ошибка отправки в чат ${chatId}:`, error.message);
      results.push({ chatId, success: false, error: error.message });
    }
  }
  
  return results;
}

// Инициализация обработчиков бота
export function initTelegramBot() {
  console.log('🤖 Telegram Bot инициализирован');
  
  // Обработка команды /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
      '👋 Привет! Я бот Traffic Command Dashboard.\n\n' +
      '📊 Я отправляю автоматические отчеты:\n' +
      '• 🌅 10:00 - Вчерашние продажи\n' +
      '• 📊 16:00 - Текущий статус\n' +
      '• 🌙 22:00 - Дневной отчет + рейтинги\n' +
      '• 📅 Воскресенье - Недельный отчет\n\n' +
      '🔐 Для активации отправь код активации.'
    );
  });
  
  // Обработка кода активации
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    const userId = msg.from?.id;
    
    if (!text || !userId) return;
    
    // Проверка кода активации
    if (text === ACTIVATION_CODE) {
      const chatTitle = msg.chat.title || `Chat ${chatId}`;
      const activated = activateChat(chatId, userId, chatTitle);
      
      if (activated) {
        await bot.sendMessage(chatId,
          '✅ *АКТИВАЦИЯ УСПЕШНА!*\n\n' +
          '🎯 Теперь этот чат будет получать автоматические отчеты:\n\n' +
          '🌅 *10:00* - Отчет за вчера\n' +
          '📊 *16:00* - Текущий статус\n' +
          '🌙 *22:00* - Дневной рейтинг\n' +
          '📅 *Воскресенье* - Недельный отчет\n\n' +
          '🔥 Следите за результатами команд!',
          { parse_mode: 'Markdown' }
        );
        console.log(`✅ Чат ${chatId} (${chatTitle}) активирован пользователем ${userId}`);
      } else {
        await bot.sendMessage(chatId,
          '⚠️ Этот чат уже активирован.\n\nОтчеты приходят автоматически.',
          { parse_mode: 'Markdown' }
        );
      }
    }
    
    // Деактивация (для админа)
    if (text === '/deactivate' && msg.from?.id) {
      deactivateChat(chatId);
      await bot.sendMessage(chatId, '❌ Чат деактивирован. Отчеты больше не будут приходить.');
      console.log(`❌ Чат ${chatId} деактивирован`);
    }
    
    // Статус
    if (text === '/status') {
      const chats = loadActiveChats();
      const isActive = chats.some(c => c.chatId === chatId);
      
      if (isActive) {
        const chat = chats.find(c => c.chatId === chatId);
        await bot.sendMessage(chatId,
          `✅ *ЧАТ АКТИВЕН*\n\n` +
          `📋 Чат: ${chat?.chatTitle || 'Неизвестно'}\n` +
          `🕐 Активирован: ${chat?.activatedAt ? new Date(chat.activatedAt).toLocaleString('ru-RU') : 'Н/Д'}\n\n` +
          `📊 Отчеты приходят автоматически.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await bot.sendMessage(chatId,
          '❌ *ЧАТ НЕ АКТИВЕН*\n\n' +
          '🔐 Отправь код активации: `2134`',
          { parse_mode: 'Markdown' }
        );
      }
    }
  });
  
  // Обработка ошибок polling
  bot.on('polling_error', (error) => {
    console.error('❌ Telegram polling error:', error.message);
  });
  
  console.log('✅ Telegram Bot handlers настроены');
}

export default bot;
