import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import * as path from 'path';

const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I';
const ACTIVATION_CODE = '2134';
const ACTIVE_CHATS_FILE = path.join(__dirname, '../../data/active-telegram-chats.json');

interface ActiveChat {
  chatId: number;
  chatTitle?: string;
  messageThreadId?: number; // 🎯 Для поддержки Telegram Topics (вкладок)
  topicName?: string; // 🎯 Название вкладки (например, "Отчеты")
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

// Получить список активных чатов (с топиками)
export function getActiveChats(): Array<{ chatId: number; messageThreadId?: number }> {
  return loadActiveChats().map(c => ({
    chatId: c.chatId,
    messageThreadId: c.messageThreadId,
  }));
}

// Активация чата (с поддержкой Topics)
function activateChat(
  chatId: number, 
  userId: number, 
  chatTitle?: string,
  messageThreadId?: number,
  topicName?: string
) {
  const chats = loadActiveChats();
  
  // 🎯 Для топиков: проверяем уникальность по chatId + messageThreadId
  const chatKey = messageThreadId 
    ? `${chatId}_${messageThreadId}` 
    : `${chatId}`;
  
  const alreadyExists = chats.some(c => {
    const existingKey = c.messageThreadId 
      ? `${c.chatId}_${c.messageThreadId}` 
      : `${c.chatId}`;
    return existingKey === chatKey;
  });
  
  if (alreadyExists) {
    return false; // Уже активирован
  }
  
  // Добавление нового чата/топика
  chats.push({
    chatId,
    chatTitle,
    messageThreadId,
    topicName,
    activatedAt: new Date().toISOString(),
    activatedBy: userId,
  });
  
  saveActiveChats(chats);
  return true;
}

// Деактивация чата/топика
function deactivateChat(chatId: number, messageThreadId?: number) {
  const chats = loadActiveChats();
  
  // 🎯 Для топиков: фильтруем по chatId + messageThreadId
  const filtered = chats.filter(c => {
    if (messageThreadId) {
      // Деактивируем только конкретный топик
      return !(c.chatId === chatId && c.messageThreadId === messageThreadId);
    } else {
      // Деактивируем общий чат (без топика)
      return !(c.chatId === chatId && !c.messageThreadId);
    }
  });
  
  saveActiveChats(filtered);
}

// Отправка сообщения во все активные чаты (с поддержкой Topics)
export async function sendToAllChats(message: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
  const chats = getActiveChats();
  const results = [];
  
  for (const chat of chats) {
    try {
      // 🎯 Если есть messageThreadId - отправляем в топик, иначе в общий чат
      const options: any = { parse_mode: parseMode };
      
      if (chat.messageThreadId) {
        options.message_thread_id = chat.messageThreadId;
        console.log(`📨 Отправка в топик: chatId=${chat.chatId}, threadId=${chat.messageThreadId}`);
      } else {
        console.log(`📨 Отправка в общий чат: chatId=${chat.chatId}`);
      }
      
      await bot.sendMessage(chat.chatId, message, options);
      results.push({ chatId: chat.chatId, messageThreadId: chat.messageThreadId, success: true });
      console.log(`✅ Отправлено успешно`);
    } catch (error: any) {
      console.error(`❌ Ошибка отправки в чат ${chat.chatId}:`, error.message);
      results.push({ chatId: chat.chatId, messageThreadId: chat.messageThreadId, success: false, error: error.message });
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
    const messageThreadId = msg.message_thread_id; // 🎯 Топик если есть
    
    const options: any = {};
    if (messageThreadId) {
      options.message_thread_id = messageThreadId;
    }
    
    await bot.sendMessage(chatId, 
      '👋 Привет! Я бот Traffic Command Dashboard.\n\n' +
      '📊 Я отправляю автоматические отчеты:\n' +
      '• 🌅 10:00 - Вчерашние продажи\n' +
      '• 📊 16:00 - Текущий статус\n' +
      '• 🌙 22:00 - Дневной отчет + рейтинги\n' +
      '• 📅 Воскресенье - Недельный отчет\n\n' +
      (messageThreadId ? '🎯 Отчеты будут приходить в ЭТУ вкладку!\n' : '') +
      '🔐 Для активации отправь код активации.',
      options
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
      const messageThreadId = msg.message_thread_id; // 🎯 ID топика (если это топик)
      
      // 🎯 Получаем название топика из reply_to_message или forum_topic_created
      let topicName: string | undefined;
      if (messageThreadId) {
        // Пробуем получить название топика
        if (msg.reply_to_message?.forum_topic_created) {
          topicName = msg.reply_to_message.forum_topic_created.name;
        } else {
          topicName = 'Отчеты'; // Дефолтное название
        }
      }
      
      const activated = activateChat(chatId, userId, chatTitle, messageThreadId, topicName);
      
      if (activated) {
        const options: any = { parse_mode: 'Markdown' };
        if (messageThreadId) {
          options.message_thread_id = messageThreadId;
        }
        
        const locationText = messageThreadId 
          ? `🎯 Отчеты будут приходить в топик "${topicName}"!` 
          : '🎯 Отчеты будут приходить в этот чат!';
        
        await bot.sendMessage(chatId,
          '✅ *АКТИВАЦИЯ УСПЕШНА!*\n\n' +
          locationText + '\n\n' +
          '📊 Автоматические отчеты:\n\n' +
          '🌅 *10:00* - Отчет за вчера\n' +
          '📊 *16:00* - Текущий статус\n' +
          '🌙 *22:00* - Дневной рейтинг\n' +
          '📅 *Воскресенье* - Недельный отчет\n\n' +
          '🔥 Следите за результатами команд!',
          options
        );
        
        const locationLog = messageThreadId 
          ? `топик "${topicName}" (threadId=${messageThreadId})` 
          : 'общий чат';
        console.log(`✅ Чат ${chatId} (${chatTitle}) - ${locationLog} активирован пользователем ${userId}`);
      } else {
        const options: any = { parse_mode: 'Markdown' };
        if (messageThreadId) {
          options.message_thread_id = messageThreadId;
        }
        
        await bot.sendMessage(chatId,
          '⚠️ Эта вкладка уже активирована.\n\nОтчеты приходят автоматически.',
          options
        );
      }
    }
    
    // Деактивация (для админа)
    if (text === '/deactivate' && msg.from?.id) {
      const messageThreadId = msg.message_thread_id;
      
      deactivateChat(chatId, messageThreadId);
      
      const options: any = {};
      if (messageThreadId) {
        options.message_thread_id = messageThreadId;
      }
      
      const locationText = messageThreadId 
        ? 'Эта вкладка деактивирована.' 
        : 'Чат деактивирован.';
      
      await bot.sendMessage(chatId, `❌ ${locationText} Отчеты больше не будут приходить.`, options);
      
      const locationLog = messageThreadId ? `топик (threadId=${messageThreadId})` : 'общий чат';
      console.log(`❌ Чат ${chatId} - ${locationLog} деактивирован`);
    }
    
    // Статус
    if (text === '/status') {
      const messageThreadId = msg.message_thread_id;
      const chats = loadActiveChats();
      
      // 🎯 Проверяем активацию конкретного топика или общего чата
      const chat = chats.find(c => {
        if (messageThreadId) {
          return c.chatId === chatId && c.messageThreadId === messageThreadId;
        } else {
          return c.chatId === chatId && !c.messageThreadId;
        }
      });
      
      const options: any = { parse_mode: 'Markdown' };
      if (messageThreadId) {
        options.message_thread_id = messageThreadId;
      }
      
      if (chat) {
        const locationText = chat.messageThreadId 
          ? `🎯 Вкладка: ${chat.topicName || 'Отчеты'}` 
          : '💬 Общий чат';
        
        await bot.sendMessage(chatId,
          `✅ *АКТИВИРОВАНА*\n\n` +
          `📋 Группа: ${chat.chatTitle || 'Неизвестно'}\n` +
          locationText + '\n' +
          `🕐 Активирована: ${new Date(chat.activatedAt).toLocaleString('ru-RU')}\n\n` +
          `📊 Отчеты приходят автоматически.`,
          options
        );
      } else {
        const locationText = messageThreadId 
          ? 'ЭТА ВКЛАДКА НЕ АКТИВИРОВАНА' 
          : 'ЧАТ НЕ АКТИВЕН';
        
        await bot.sendMessage(chatId,
          `❌ *${locationText}*\n\n` +
          '🔐 Отправь код активации: `2134`',
          options
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
