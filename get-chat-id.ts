/**
 * 🔍 ПОЛУЧИТЬ ПРАВИЛЬНЫЙ CHAT ID
 * 
 * Получает последние обновления бота и показывает правильный Chat ID
 * 
 * Запуск: npx tsx get-chat-id.ts
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'backend', 'env.env') });

const BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || '';

console.log('🔍 ПОЛУЧАЮ ПРАВИЛЬНЫЙ CHAT ID...\n');

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_LEADS_BOT_TOKEN не найден!');
  process.exit(1);
}

async function getChatId() {
  try {
    console.log('📥 Получаю последние обновления от Telegram...\n');
    
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`API Error: ${JSON.stringify(data)}`);
    }
    
    if (data.result.length === 0) {
      console.log('⚠️  Нет обновлений от бота.');
      console.log('\n📝 ЧТО СДЕЛАТЬ:');
      console.log('   1. Зайди в группу');
      console.log('   2. Зайди в нужный топик');
      console.log('   3. Напиши любое сообщение или /start');
      console.log('   4. Запусти этот скрипт снова\n');
      process.exit(0);
    }
    
    console.log(`✅ Найдено обновлений: ${data.result.length}\n`);
    console.log('═══════════════════════════════════════════════\n');
    
    // Показываем последние 5 обновлений
    const recent = data.result.slice(-5);
    
    recent.forEach((update: any, index: number) => {
      console.log(`📨 Обновление ${index + 1}:\n`);
      
      if (update.message) {
        const msg = update.message;
        console.log(`   Chat ID: ${msg.chat.id}`);
        console.log(`   Chat Type: ${msg.chat.type}`);
        console.log(`   Chat Title: ${msg.chat.title || 'N/A'}`);
        console.log(`   Thread ID: ${msg.message_thread_id || 'N/A (не топик)'}`);
        console.log(`   Is Forum: ${msg.chat.is_forum || false}`);
        console.log(`   Is Topic Message: ${msg.is_topic_message || false}`);
        console.log(`   From: ${msg.from?.username || msg.from?.first_name || 'unknown'}`);
        console.log(`   Text: "${(msg.text || '').substring(0, 50)}..."`);
        console.log(`   Date: ${new Date(msg.date * 1000).toLocaleString('ru-RU')}`);
      } else if (update.channel_post) {
        const post = update.channel_post;
        console.log(`   Chat ID: ${post.chat.id}`);
        console.log(`   Chat Type: ${post.chat.type}`);
        console.log(`   Chat Title: ${post.chat.title || 'N/A'}`);
        console.log(`   Thread ID: ${post.message_thread_id || 'N/A'}`);
        console.log(`   Text: "${(post.text || '').substring(0, 50)}..."`);
      }
      
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════\n');
    
    // Находим последнее сообщение с топиком
    const topicMessage = data.result
      .slice()
      .reverse()
      .find((u: any) => u.message?.is_topic_message || u.message?.message_thread_id);
    
    if (topicMessage && topicMessage.message) {
      const msg = topicMessage.message;
      console.log('🎯 ИСПОЛЬЗУЙ ЭТИ ДАННЫЕ:\n');
      console.log(`   CHAT_ID = '${msg.chat.id}'`);
      console.log(`   THREAD_ID = ${msg.message_thread_id}`);
      console.log(`\n📋 Для теста скопируй:\n`);
      console.log(`const CHAT_ID = '${msg.chat.id}';`);
      console.log(`const THREAD_ID = ${msg.message_thread_id};`);
      console.log('');
    } else {
      const lastMessage = data.result[data.result.length - 1]?.message;
      if (lastMessage) {
        console.log('💡 ПОСЛЕДНИЙ ЧАТ:\n');
        console.log(`   CHAT_ID = '${lastMessage.chat.id}'`);
        console.log('');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

getChatId();
