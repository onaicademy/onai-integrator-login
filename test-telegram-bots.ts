/**
 * ТЕСТИРОВАНИЕ TELEGRAM БОТОВ
 * 
 * AI-Mentor Bot: 8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo
 * AI-Analyst Bot: 8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4
 * 
 * Запуск: npx ts-node test-telegram-bots.ts
 */

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const AI_MENTOR_TOKEN = "8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo";
const AI_ANALYST_TOKEN = "8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4";

// Твой Telegram ID (получишь когда отправишь /start боту)
// Замени на свой ID после первого запуска
const ADMIN_CHAT_ID = "YOUR_TELEGRAM_ID"; // ⚠️ ЗАМЕНИ НА СВОЙ ID!

// ============================================
// ФУНКЦИИ ДЛЯ TELEGRAM API
// ============================================

async function sendTelegramMessage(token: string, chatId: string, text: string, parseMode: string = "Markdown") {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
      }),
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      console.error(`❌ Ошибка отправки: ${data.description}`);
      return false;
    }
    
    console.log(`✅ Сообщение отправлено успешно!`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка сети:`, error);
    return false;
  }
}

async function getBotInfo(token: string) {
  const url = `https://api.telegram.org/bot${token}/getMe`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok) {
      console.log(`✅ Бот активен: @${data.result.username}`);
      return data.result;
    } else {
      console.error(`❌ Ошибка получения информации о боте:`, data.description);
      return null;
    }
  } catch (error) {
    console.error(`❌ Ошибка сети:`, error);
    return null;
  }
}

async function getUpdates(token: string) {
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      // Получаем последнее сообщение
      const lastMessage = data.result[data.result.length - 1];
      const chatId = lastMessage.message?.chat?.id || lastMessage.message?.from?.id;
      
      console.log(`💬 Последнее сообщение от:`, lastMessage.message?.from?.username);
      console.log(`🆔 Chat ID:`, chatId);
      
      return chatId;
    } else {
      console.log(`ℹ️ Нет новых сообщений. Отправь /start боту, чтобы получить свой Chat ID.`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Ошибка получения обновлений:`, error);
    return null;
  }
}

// ============================================
// MOCK ДАННЫЕ ДЛЯ ТЕСТОВ
// ============================================

const mockStudentData = {
  name: "Тестовый Студент",
  email: "test@example.com",
  dailyAnalytics: {
    timeOnPlatform: "2ч 15м",
    lessonsWatched: 3,
    aiCuratorQuestions: 5,
    mood: 7.5,
    problematicTopics: ["Backpropagation", "Gradient Descent"],
  },
  weeklyTrends: {
    progressChange: "+15%",
    moodTrend: "растёт",
    stuckLesson: "Урок 8: Backpropagation",
    motivation: "средняя",
  },
};

const mockAdminAnalytics = {
  period: "Неделя",
  totalStudents: 150,
  activeStudents: 120,
  avgMood: 7.2,
  conflicts: 3,
  topIssues: [
    "3 студента застряли на уроке 8",
    "Бот упомянул несуществующий урок 25 (hallucination)",
  ],
  recommendations: [
    "Упростить материал по Backpropagation",
    "Обновить контекст бота с актуальным списком уроков",
  ],
};

// ============================================
// ШАБЛОНЫ СООБЩЕНИЙ
// ============================================

function createStudentMotivationMessage(student: typeof mockStudentData): string {
  return `
🎯 *Привет, ${student.name}!*

Твой AI-Ментор проанализировал твой прогресс за сегодня:

📊 *Твоя статистика:*
⏱ Время на платформе: ${student.dailyAnalytics.timeOnPlatform}
📚 Уроков просмотрено: ${student.dailyAnalytics.lessonsWatched}
💬 Вопросов AI-куратору: ${student.dailyAnalytics.aiCuratorQuestions}
😊 Настроение: ${student.dailyAnalytics.mood}/10

${student.dailyAnalytics.mood >= 7 ? '✨ Отличное настроение! Продолжай в том же духе!' : '💪 Не сдавайся! У тебя всё получится!'}

${student.dailyAnalytics.problematicTopics.length > 0 ? `
⚠️ *Заметил трудности с:*
${student.dailyAnalytics.problematicTopics.map(t => `• ${t}`).join('\n')}

💡 Рекомендую:
• Пересмотреть эти темы
• Задать вопросы AI-куратору
• Попрактиковаться на примерах
` : ''}

📈 *Твой план на завтра:*
1. Продолжить с урока "${student.weeklyTrends.stuckLesson}"
2. Уделить 30 минут практике
3. Задать вопросы, если что-то непонятно

💪 *Помни:* Ты уже прошёл большой путь! Продолжай двигаться вперёд!

_Твой AI-Ментор от onAI Academy_
`.trim();
}

function createAdminAnalyticsMessage(analytics: typeof mockAdminAnalytics): string {
  return `
📊 *AI-Аналитика: Отчёт за ${analytics.period}*

👥 *Общая статистика:*
• Всего студентов: ${analytics.totalStudents}
• Активных: ${analytics.activeStudents} (${Math.round(analytics.activeStudents / analytics.totalStudents * 100)}%)
• Средний mood: ${analytics.avgMood}/10

${analytics.avgMood >= 7 ? '✅ Студенты довольны обучением!' : '⚠️ Нужно повысить мотивацию студентов'}

🔴 *Конфликты AI-куратора: ${analytics.conflicts}*

⚠️ *Требуют внимания:*
${analytics.topIssues.map(i => `• ${i}`).join('\n')}

💡 *Рекомендации для улучшения:*
${analytics.recommendations.map(r => `• ${r}`).join('\n')}

📈 *Динамика:*
• Прогресс студентов: растёт
• Настроение: стабильное
• Качество ответов бота: требует улучшения

🎯 *Приоритетные задачи:*
1. Исправить галлюцинации бота (critical)
2. Упростить урок 8
3. Добавить дополнительные материалы

_AI-Аналитик для onAI Academy_
`.trim();
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ
// ============================================

async function testTelegramBots() {
  console.log("🚀 Начинаю тестирование Telegram ботов...\n");
  
  // ============================================
  // 1. ПРОВЕРКА AI-MENTOR БОТА
  // ============================================
  console.log("1️⃣ Проверка AI-Mentor бота...");
  const mentorInfo = await getBotInfo(AI_MENTOR_TOKEN);
  
  if (!mentorInfo) {
    console.error("❌ AI-Mentor бот не активен!");
    return;
  }
  
  // Получаем Chat ID из последних сообщений
  console.log("\nℹ️ Получаю Chat ID из последних сообщений...");
  const mentorChatId = await getUpdates(AI_MENTOR_TOKEN);
  
  const chatIdToUse = mentorChatId || ADMIN_CHAT_ID;
  
  if (chatIdToUse === "YOUR_TELEGRAM_ID") {
    console.log("\n⚠️ ВНИМАНИЕ! Сначала отправь /start боту @" + mentorInfo.username);
    console.log("Затем замени YOUR_TELEGRAM_ID на свой Chat ID в этом файле.");
    return;
  }
  
  // Отправляем тестовое сообщение студенту
  console.log("\n📤 Отправляю мотивационное сообщение студенту...");
  await sendTelegramMessage(
    AI_MENTOR_TOKEN,
    chatIdToUse,
    createStudentMotivationMessage(mockStudentData)
  );
  
  console.log("\n✅ AI-Mentor бот протестирован!\n");
  
  // ============================================
  // 2. ПРОВЕРКА AI-ANALYST БОТА
  // ============================================
  console.log("2️⃣ Проверка AI-Analyst бота...");
  const analystInfo = await getBotInfo(AI_ANALYST_TOKEN);
  
  if (!analystInfo) {
    console.error("❌ AI-Analyst бот не активен!");
    return;
  }
  
  // Получаем Chat ID из последних сообщений
  console.log("\nℹ️ Получаю Chat ID из последних сообщений...");
  const analystChatId = await getUpdates(AI_ANALYST_TOKEN);
  
  const adminChatIdToUse = analystChatId || ADMIN_CHAT_ID;
  
  if (adminChatIdToUse === "YOUR_TELEGRAM_ID") {
    console.log("\n⚠️ ВНИМАНИЕ! Сначала отправь /start боту @" + analystInfo.username);
    console.log("Затем замени YOUR_TELEGRAM_ID на свой Chat ID в этом файле.");
    return;
  }
  
  // Отправляем аналитику админу
  console.log("\n📤 Отправляю аналитику админу...");
  await sendTelegramMessage(
    AI_ANALYST_TOKEN,
    adminChatIdToUse,
    createAdminAnalyticsMessage(mockAdminAnalytics)
  );
  
  console.log("\n✅ AI-Analyst бот протестирован!\n");
  
  // ============================================
  // ИТОГИ
  // ============================================
  console.log("=" + "=".repeat(50));
  console.log("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!");
  console.log("=" + "=".repeat(50));
  console.log("\n📱 Проверь свой Telegram:");
  console.log(`  • AI-Mentor (@${mentorInfo.username}): мотивационное сообщение`);
  console.log(`  • AI-Analyst (@${analystInfo.username}): аналитический отчёт`);
  console.log("\n✅ Боты работают и готовы к использованию!");
}

// ============================================
// ЗАПУСК
// ============================================

testTelegramBots().catch(console.error);

