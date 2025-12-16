/**
 * 🤖 Telegram Leads Bot - Бот для уведомлений о новых лидах
 * 
 * Функционал:
 * 1. Добавляешь бота в группу как админа
 * 2. Вводишь код "2134" в группе
 * 3. Бот активирует группу и сохраняет chat_id
 * 4. Все новые лиды (профтест + экспресс курс) отправляются в эту группу
 */

import { Router } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// ============================================
// КОНФИГУРАЦИЯ БОТА
// ============================================
const LEADS_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || '';
const ACTIVATION_CODE = '2134'; // Код для активации группы

if (!LEADS_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_LEADS_BOT_TOKEN not configured! Leads bot disabled.');
}

// Подключение к Landing Supabase (там лежат лиды)
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ БОТА
// ============================================
let leadsBot: TelegramBot | null = null;

if (LEADS_BOT_TOKEN) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && process.env.BACKEND_URL) {
    // PRODUCTION: Webhook mode
    leadsBot = new TelegramBot(LEADS_BOT_TOKEN);
    const webhookUrl = `${process.env.BACKEND_URL}/api/telegram-leads/webhook/${LEADS_BOT_TOKEN}`;
    
    leadsBot.setWebHook(webhookUrl)
      .then(() => {
        console.log('✅ Telegram Leads Bot webhook set:', webhookUrl);
      })
      .catch((error) => {
        console.error('❌ Failed to set Telegram Leads Bot webhook:', error);
      });
  } else {
    // DEVELOPMENT: Polling mode
    leadsBot = new TelegramBot(LEADS_BOT_TOKEN, { 
      polling: {
        params: {
          allowed_updates: ['message', 'my_chat_member']
        }
      }
    });
    console.log('✅ Telegram Leads Bot started in POLLING mode (development)');
  }
}

// ============================================
// WEBHOOK ENDPOINT
// ============================================
router.post('/webhook/:token', async (req, res) => {
  try {
    if (!leadsBot) {
      return res.status(503).json({ success: false, message: 'Leads bot is disabled' });
    }

    const { token } = req.params;

    // Verify webhook token matches bot token
    if (token !== LEADS_BOT_TOKEN) {
      return res.status(403).json({ success: false, message: 'Invalid webhook token' });
    }

    // Process Telegram update
    await leadsBot.processUpdate(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Leads bot webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// ============================================
// ОБРАБОТЧИКИ СООБЩЕНИЙ
// ============================================

if (leadsBot) {
  /**
   * 🎯 ГЛАВНЫЙ ОБРАБОТЧИК: Активация группы по коду "2134"
   */
  leadsBot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;
      const messageText = msg.text?.trim();

      // Игнорируем личные сообщения, обрабатываем только группы
      if (chatType === 'private') {
        await leadsBot!.sendMessage(
          chatId,
          '👋 Привет! Я бот для уведомлений о новых лидах.\n\n' +
          '📋 Чтобы активировать группу:\n' +
          '1️⃣ Добавь меня в группу как администратора\n' +
          '2️⃣ Отправь код активации: 2134\n' +
          '3️⃣ Все новые лиды будут приходить в твою группу! 🚀'
        );
        return;
      }

      // Проверяем код активации
      if (messageText === ACTIVATION_CODE) {
        console.log(`🔐 Activation code received from chat ${chatId} (${msg.chat.title})`);

        // Проверяем, является ли бот администратором
        try {
          const chatMember = await leadsBot!.getChatMember(chatId, leadsBot!.options.polling ? leadsBot!['_WebHook']?.bot?.id || 0 : 0);
          const botInfo = await leadsBot!.getMe();
          const botChatMember = await leadsBot!.getChatMember(chatId, botInfo.id);

          if (botChatMember.status !== 'administrator') {
            await leadsBot!.sendMessage(
              chatId,
              '❌ Я должен быть администратором группы!\n\n' +
              'Пожалуйста, назначьте меня администратором и попробуйте снова.'
            );
            return;
          }
        } catch (error) {
          console.error('❌ Error checking bot admin status:', error);
        }

        // Получаем username активатора
        const activatedBy = msg.from?.username || msg.from?.first_name || 'Unknown';

        // Сохраняем или обновляем группу в БД
        const { data: existingGroup, error: checkError } = await landingSupabase
          .from('telegram_groups')
          .select('*')
          .eq('chat_id', chatId.toString())
          .eq('group_type', 'leads')
          .single();

        if (existingGroup) {
          // Обновляем существующую группу
          const { error: updateError } = await landingSupabase
            .from('telegram_groups')
            .update({
              is_active: true,
              chat_title: msg.chat.title || null,
              activated_by: activatedBy,
              activated_at: new Date().toISOString(),
              metadata: {
                username: msg.from?.username,
                last_activation: new Date().toISOString()
              }
            })
            .eq('chat_id', chatId.toString());

          if (updateError) {
            console.error('❌ Error updating group:', updateError);
            await leadsBot!.sendMessage(chatId, '❌ Ошибка активации группы. Попробуйте позже.');
            return;
          }

          console.log(`✅ Group ${chatId} reactivated by ${activatedBy}`);
        } else {
          // Создаём новую запись
          const { error: insertError } = await landingSupabase
            .from('telegram_groups')
            .insert({
              chat_id: chatId.toString(),
              chat_title: msg.chat.title || null,
              group_type: 'leads',
              is_active: true,
              activated_by: activatedBy,
              activated_at: new Date().toISOString(),
              metadata: {
                username: msg.from?.username,
                first_activation: new Date().toISOString()
              }
            });

          if (insertError) {
            console.error('❌ Error inserting group:', insertError);
            await leadsBot!.sendMessage(chatId, '❌ Ошибка активации группы. Попробуйте позже.');
            return;
          }

          console.log(`✅ New group ${chatId} activated by ${activatedBy}`);
        }

        // Получаем информацию о группе
        const { data: groupInfo } = await landingSupabase
          .from('telegram_groups')
          .select('*')
          .eq('chat_id', chatId.toString())
          .single();

        // Отправляем подтверждение
        await leadsBot!.sendMessage(
          chatId,
          '✅ <b>БОТ АКТИВИРОВАН!</b>\n\n' +
          `📍 <b>Chat ID:</b> <code>${chatId}</code>\n` +
          `🏷️ <b>Группа:</b> ${msg.chat.title || 'Без названия'}\n\n` +
          `Теперь все новые заявки с сайта будут приходить сюда! 🚀\n\n` +
          `<i>Активировано: ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</i>`,
          { parse_mode: 'HTML' }
        );

        // Отправляем тестовое сообщение
        await leadsBot!.sendMessage(
          chatId,
          '🎉 <b>НОВАЯ ЗАЯВКА!</b>\n\n' +
          '👤 <b>Имя:</b> Мурзилка Арыков\n' +
          '📱 <b>Телефон:</b> +7 777 123 45 67\n' +
          '📧 <b>Email:</b> test@example.com\n' +
          '💳 <b>Способ оплаты:</b> 💳 Kaspi банк\n' +
          '📍 <b>Источник:</b> expresscourse\n\n' +
          '⏰ ' + new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }),
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      console.error('❌ Error in message handler:', error);
    }
  });

  /**
   * 📝 Обработчик добавления бота в группу
   */
  leadsBot.on('my_chat_member', async (update) => {
    try {
      const chat = update.chat;
      const newStatus = update.new_chat_member.status;
      const oldStatus = update.old_chat_member.status;

      console.log(`🔄 Chat member update: ${oldStatus} → ${newStatus} in ${chat.title} (${chat.id})`);

      // Бота добавили как админа
      if (newStatus === 'administrator' && oldStatus !== 'administrator') {
        console.log(`✅ Bot added as admin to group: ${chat.title} (${chat.id})`);
        
        await leadsBot!.sendMessage(
          chat.id,
          '👋 <b>Привет!</b>\n\n' +
          'Я бот для уведомлений о новых лидах! 🤖\n\n' +
          '📋 <b>Чтобы активировать группу, отправь:</b>\n' +
          '<code>2134</code>\n\n' +
          'После этого все заявки с лендингов <b>ProfTest</b> и <b>ExpressCourse</b> будут приходить сюда! 🚀',
          { parse_mode: 'HTML' }
        );
      }
      
      // Бота удалили из группы
      if (newStatus === 'left' || newStatus === 'kicked') {
        console.log(`🚫 Bot removed from group: ${chat.title} (${chat.id})`);
        
        // Деактивируем группу в БД
        await landingSupabase
          .from('telegram_groups')
          .update({ is_active: false })
          .eq('chat_id', chat.id.toString());
      }
    } catch (error) {
      console.error('❌ Error in my_chat_member handler:', error);
    }
  });

  /**
   * 🛠️ Команда /help
   */
  leadsBot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    await leadsBot!.sendMessage(
      chatId,
      '🤖 <b>Leads Bot - Справка</b>\n\n' +
      '<b>Как активировать группу:</b>\n' +
      '1️⃣ Добавьте меня в группу как администратора\n' +
      '2️⃣ Отправьте код: <code>2134</code>\n' +
      '3️⃣ Готово! Все лиды будут приходить в эту группу\n\n' +
      '<b>Команды:</b>\n' +
      '/help - Показать эту справку\n' +
      '/status - Проверить статус группы\n' +
      '/deactivate - Деактивировать группу\n\n' +
      '<b>Поддержка:</b> @onaiagency',
      { parse_mode: 'HTML' }
    );
  });

  /**
   * 📊 Команда /status
   */
  leadsBot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    if (chatType === 'private') {
      await leadsBot!.sendMessage(chatId, '❌ Эта команда работает только в группах.');
      return;
    }

    try {
      const { data: group } = await landingSupabase
        .from('telegram_groups')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (group && group.is_active) {
        await leadsBot!.sendMessage(
          chatId,
          '✅ <b>Группа активна!</b>\n\n' +
          `📍 <b>Chat ID:</b> <code>${group.chat_id}</code>\n` +
          `🏷️ <b>Название:</b> ${group.chat_title || 'Без названия'}\n` +
          `👤 <b>Активировал:</b> ${group.activated_by || 'Unknown'}\n` +
          `⏰ <b>Дата активации:</b> ${new Date(group.activated_at).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n` +
          'Все новые лиды приходят в эту группу! 🚀',
          { parse_mode: 'HTML' }
        );
      } else {
        await leadsBot!.sendMessage(
          chatId,
          '❌ <b>Группа не активирована</b>\n\n' +
          'Отправьте код <code>2134</code> для активации.',
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      console.error('❌ Error checking status:', error);
      await leadsBot!.sendMessage(chatId, '❌ Ошибка при проверке статуса.');
    }
  });

  /**
   * 🚫 Команда /deactivate
   */
  leadsBot.onText(/\/deactivate/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    if (chatType === 'private') {
      await leadsBot!.sendMessage(chatId, '❌ Эта команда работает только в группах.');
      return;
    }

    try {
      // Проверяем, является ли отправитель админом
      const userId = msg.from?.id;
      if (userId) {
        const member = await leadsBot!.getChatMember(chatId, userId);
        if (member.status !== 'administrator' && member.status !== 'creator') {
          await leadsBot!.sendMessage(chatId, '❌ Только администраторы могут деактивировать группу.');
          return;
        }
      }

      // Деактивируем группу
      const { error } = await landingSupabase
        .from('telegram_groups')
        .update({ is_active: false })
        .eq('chat_id', chatId.toString());

      if (error) {
        console.error('❌ Error deactivating group:', error);
        await leadsBot!.sendMessage(chatId, '❌ Ошибка при деактивации группы.');
        return;
      }

      await leadsBot!.sendMessage(
        chatId,
        '🚫 <b>Группа деактивирована</b>\n\n' +
        'Уведомления о лидах больше не будут приходить в эту группу.\n\n' +
        'Чтобы активировать снова, отправьте код <code>2134</code>.',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('❌ Error in deactivate handler:', error);
      await leadsBot!.sendMessage(chatId, '❌ Ошибка при деактивации группы.');
    }
  });
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/telegram-leads/active-groups
 * Получить список активных групп
 */
router.get('/active-groups', async (req, res) => {
  try {
    const { data: groups, error } = await landingSupabase
      .from('telegram_groups')
      .select('*')
      .eq('group_type', 'leads')
      .eq('is_active', true)
      .order('activated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      groups: groups || [],
      count: groups?.length || 0
    });
  } catch (error: any) {
    console.error('❌ Error fetching active groups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/telegram-leads/test
 * Отправить тестовое уведомление в активные группы
 */
router.post('/test', async (req, res) => {
  try {
    if (!leadsBot) {
      return res.status(503).json({ success: false, message: 'Leads bot is disabled' });
    }

    // Получаем активные группы
    const { data: groups, error } = await landingSupabase
      .from('telegram_groups')
      .select('*')
      .eq('group_type', 'leads')
      .eq('is_active', true);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!groups || groups.length === 0) {
      return res.status(404).json({ success: false, message: 'No active groups found' });
    }

    // Отправляем тестовое сообщение во все активные группы
    const results = [];
    for (const group of groups) {
      try {
        await leadsBot.sendMessage(
          parseInt(group.chat_id),
          '🧪 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ</b>\n\n' +
          '👤 <b>Имя:</b> Тест Тестович\n' +
          '📱 <b>Телефон:</b> +7 777 123 45 67\n' +
          '📧 <b>Email:</b> test@example.com\n' +
          '💳 <b>Способ оплаты:</b> 💳 Kaspi банк\n' +
          '📍 <b>Источник:</b> expresscourse\n\n' +
          '⏰ ' + new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }),
          { parse_mode: 'HTML' }
        );
        results.push({ chat_id: group.chat_id, success: true });
      } catch (error: any) {
        console.error(`❌ Error sending to ${group.chat_id}:`, error);
        results.push({ chat_id: group.chat_id, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Test notifications sent',
      results
    });
  } catch (error: any) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
export { leadsBot };
