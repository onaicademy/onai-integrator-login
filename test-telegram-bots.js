/**
 * ТЕСТИРОВАНИЕ TELEGRAM БОТОВ
 * 
 * AI-Mentor Bot: 8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo
 * AI-Analyst Bot: 8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4
 * 
 * Запуск: node test-telegram-bots.js
 */

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const AI_MENTOR_TOKEN = "8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo";
const AI_ANALYST_TOKEN = "8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4";

// ============================================
// ФУНКЦИИ ДЛЯ TELEGRAM API
// ============================================

async function sendTelegramMessage(token, chatId, text, parseMode = "Markdown") {
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
    console.error(`❌ Ошибка сети:`, error.message);
    return false;
  }
}

async function getBotInfo(token) {
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
    console.error(`❌ Ошибка сети:`, error.message);
    return null;
  }
}

async function getUpdates(token) {
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      // Получаем последнее сообщение
      const lastMessage = data.result[data.result.length - 1];
      const chatId = lastMessage.message?.chat?.id || lastMessage.message?.from?.id;
      const username = lastMessage.message?.from?.username || lastMessage.message?.from?.first_name;
      
      console.log(`💬 Последнее сообщение от: ${username}`);
      console.log(`🆔 Chat ID: ${chatId}`);
      
      return String(chatId);
    } else {
      console.log(`ℹ️  Нет новых сообщений.`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Ошибка получения обновлений:`, error.message);
    return null;
  }
}

// ============================================
// MOCK ДАННЫЕ
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

function createStudentMotivationMessage(student) {
  // Персонализированные мотивационные фразы на основе настроения
  let motivationPhrase = '';
  let actionPlan = '';
  
  if (student.dailyAnalytics.mood >= 8) {
    motivationPhrase = `✨ *Невероятно!* Твоё настроение на пике! Ты в потоке, и это видно по результатам. Такое состояние драгоценно - используй его по максимуму! 🚀`;
    actionPlan = `🎯 *План действий (ты на волне успеха):*
1. Продолжай в том же темпе - сейчас идеальное время для сложных тем
2. Попробуй решить дополнительные задачи для закрепления
3. Поделись своим успехом в чате - мотивируй других!
4. Запланируй следующий урок, пока энергия на высоте`;
  } else if (student.dailyAnalytics.mood >= 6) {
    motivationPhrase = `😊 *Хорошая работа!* Ты стабильно движешься вперёд. Главное - не останавливаться и поддерживать этот темп. Ты на правильном пути! 💪`;
    actionPlan = `📈 *План действий (продолжай развивать импульс):*
1. Сегодня отлично, завтра будет ещё лучше!
2. Уделяй по 30-45 минут каждый день - это ключ к успеху
3. Если что-то непонятно - сразу спрашивай AI-куратора
4. Отмечай свой прогресс - это мотивирует!`;
  } else if (student.dailyAnalytics.mood >= 4) {
    motivationPhrase = `🤔 *Эй, всё нормально!* Бывают сложные дни, но ты не сдаёшься - это главное. Помни: каждый эксперт когда-то был новичком. Ты справишься! 💪`;
    actionPlan = `🎯 *План действий (преодолеваем трудности):*
1. Не торопись - лучше медленно, но уверенно
2. Разбей сложную тему на маленькие части
3. Задавай вопросы AI-куратору - он всегда готов помочь
4. Сделай перерыв, если устал - свежая голова = новые идеи
5. Вспомни, зачем ты начал учиться - твоя цель ждёт тебя!`;
  } else {
    motivationPhrase = `💪 *Слушай, я вижу, что сейчас непросто.* Но знаешь что? Самые крутые прорывы случаются после самых сложных моментов. НЕ СДАВАЙСЯ! Ты сильнее, чем думаешь! 🔥

*Важно понять:* Временные трудности - это НЕ провал. Это часть пути. Каждый успешный человек проходил через это. И ты пройдёшь!`;
    actionPlan = `🆘 *План срочных действий (вместе преодолеем):*
1. СТОП! Сделай глубокий вдох. Всё решаемо.
2. Напиши AI-куратору - опиши что именно непонятно
3. Пересмотри урок с начала, без спешки
4. Попробуй объяснить тему самому себе вслух
5. Сделай перерыв 15 минут - прогулка, чай, музыка
6. Вернись с новыми силами - я верю в тебя!

📞 *Нужна помощь?* Напиши в чат поддержки - мы рядом!`;
  }
  
  return `
🎯 *Привет, ${student.name}!*

Твой AI-Ментор проанализировал твой прогресс за сегодня и готов дать персональные рекомендации! 📊

━━━━━━━━━━━━━━━━━━━━━━━━

📊 *ТВОЯ СТАТИСТИКА ЗА СЕГОДНЯ:*

⏱ *Время на платформе:* ${student.dailyAnalytics.timeOnPlatform}
   ${student.dailyAnalytics.timeOnPlatform.includes('2ч') ? '✅ Отличная продолжительность!' : student.dailyAnalytics.timeOnPlatform.includes('1ч') ? '👍 Хорошо, но можно больше!' : '⚠️ Попробуй уделить больше времени завтра'}

📚 *Уроков просмотрено:* ${student.dailyAnalytics.lessonsWatched}
   ${student.dailyAnalytics.lessonsWatched >= 3 ? '🔥 Потрясающий темп!' : student.dailyAnalytics.lessonsWatched >= 1 ? '✅ Хороший прогресс!' : '⚠️ Давай активнее!'}

💬 *Вопросов AI-куратору:* ${student.dailyAnalytics.aiCuratorQuestions}
   ${student.dailyAnalytics.aiCuratorQuestions >= 5 ? '👏 Отлично задаёшь вопросы!' : student.dailyAnalytics.aiCuratorQuestions >= 2 ? '✅ Хорошая активность!' : '💡 Не стесняйся спрашивать!'}

😊 *Настроение:* ${student.dailyAnalytics.mood}/10
   ${student.dailyAnalytics.mood >= 7 ? '😊 Позитивный настрой!' : student.dailyAnalytics.mood >= 5 ? '😐 Нейтральное' : '😔 Нужна поддержка'}

━━━━━━━━━━━━━━━━━━━━━━━━

${motivationPhrase}

━━━━━━━━━━━━━━━━━━━━━━━━

${student.dailyAnalytics.problematicTopics.length > 0 ? `⚠️ *ЗАМЕТИЛ ТРУДНОСТИ С:*
${student.dailyAnalytics.problematicTopics.map(t => `
🔴 *${t}*
   → Пересмотри урок ещё раз (можно на скорости 0.75x)
   → Задай конкретный вопрос AI-куратору: "Объясни ${t} простыми словами"
   → Попрактикуйся на примерах из урока
   → Посмотри дополнительные материалы в NeuroHUB
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

${actionPlan}

━━━━━━━━━━━━━━━━━━━━━━━━

📈 *НЕДЕЛЬНЫЙ ПРОГРЕСС:*
• Динамика: ${student.weeklyTrends.progressChange} ${student.weeklyTrends.progressChange.includes('+') ? '📈 Растёшь!' : '📉 Нужно поднажать'}
• Настроение: ${student.weeklyTrends.moodTrend === 'растёт' ? '📈 Улучшается!' : student.weeklyTrends.moodTrend === 'стабильно' ? '➡️ Стабильно' : '📉 Падает'}
• Текущий фокус: ${student.weeklyTrends.stuckLesson}
• Мотивация: ${student.weeklyTrends.motivation === 'высокая' ? '🔥 Высокая!' : student.weeklyTrends.motivation === 'средняя' ? '👍 Средняя' : '⚠️ Низкая'}

━━━━━━━━━━━━━━━━━━━━━━━━

💎 *ТВОИ БЛИЖАЙШИЕ ДОСТИЖЕНИЯ:*
🎯 Завершить "${student.weeklyTrends.stuckLesson}" → +50 XP
🏆 Учиться 7 дней подряд → Значок "Неделя силы"
⭐ Задать 10 вопросов AI-куратору → +30 XP

━━━━━━━━━━━━━━━━━━━━━━━━

🚀 *ПОМНИ:*
Ты не просто учишься - ты инвестируешь в своё будущее!
Каждый урок, каждый вопрос, каждая минута приближают тебя к цели.

${student.dailyAnalytics.mood < 5 ? '\n🔥 *Специально для тебя:* "Успех - это способность идти от неудачи к неудаче, не теряя энтузиазма" - Уинстон Черчилль\n\nТЫ СПРАВИШЬСЯ! МЫ ВЕРИМ В ТЕБЯ! 💪🔥' : '\n✨ Продолжай в том же духе! Ты на верном пути! 🚀'}

━━━━━━━━━━━━━━━━━━━━━━━━

_Твой персональный AI-Ментор от onAI Academy 🤖💚_
_Всегда на связи 24/7_
`.trim();
}

function createAdminAnalyticsMessage(analytics) {
  const activePercentage = Math.round(analytics.activeStudents / analytics.totalStudents * 100);
  const criticalStudents = 3;
  const warningStudents = 5;
  const excellentStudents = 25;
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *AI-АНАЛИТИКА: ОТЧЁТ ЗА ${analytics.period.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗓 *Период:* ${analytics.period}
📅 *Дата отчёта:* ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
⏰ *Время:* ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *ОБЩАЯ СТАТИСТИКА СТУДЕНТОВ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Всего студентов:* ${analytics.totalStudents}
   └─ Новых за период: +12 студентов 📈

✅ *Активных студентов:* ${analytics.activeStudents} (${activePercentage}%)
   ${activePercentage >= 80 ? '🔥 Отличная вовлечённость!' : activePercentage >= 60 ? '✅ Хорошая активность' : '⚠️ Нужно повысить вовлечённость'}
   
📉 *Неактивных:* ${analytics.totalStudents - analytics.activeStudents} (${100 - activePercentage}%)
   └─ Не заходили > 7 дней: ${analytics.totalStudents - analytics.activeStudents} чел.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😊 *АНАЛИЗ НАСТРОЕНИЯ СТУДЕНТОВ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 *Средний mood:* ${analytics.avgMood}/10
   ${analytics.avgMood >= 8 ? '🌟 Превосходно!' : analytics.avgMood >= 7 ? '😊 Отлично!' : analytics.avgMood >= 6 ? '👍 Хорошо' : analytics.avgMood >= 5 ? '😐 Средне' : '😔 Требует внимания'}

📊 *Распределение по настроению:*
• 😊 Высокое (8-10): ${excellentStudents} студентов (${Math.round(excellentStudents/analytics.totalStudents*100)}%)
• 👍 Среднее (6-7): ${analytics.activeStudents - excellentStudents - warningStudents - criticalStudents} студентов
• 😐 Низкое (4-5): ${warningStudents} студентов (${Math.round(warningStudents/analytics.totalStudents*100)}%)
• 😔 Критичное (<4): ${criticalStudents} студентов (${Math.round(criticalStudents/analytics.totalStudents*100)}%) ⚠️

🔄 *Динамика за неделю:*
   ${analytics.avgMood >= 7 ? '📈 +0.5 пункта (растёт!)' : '📉 -0.2 пункта (падает)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 *УЧЕБНАЯ АКТИВНОСТЬ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *Завершённые уроки:* 342 урока
   └─ Среднее на студента: 2.3 урока

⏱ *Среднее время обучения:*
   └─ В день: 1ч 45м на студента
   └─ За неделю: 12ч 15м на студента

💬 *Взаимодействие с AI-куратором:*
   └─ Всего вопросов: ${analytics.aiConversations || 450} вопросов
   └─ Среднее на студента: 3.8 вопросов/день
   └─ Самые частые темы:
      • Backpropagation (45 вопросов)
      • Gradient Descent (38 вопросов)
      • Python синтаксис (32 вопроса)

📝 *Результаты тестов:*
   └─ Средний балл: 72% (👍 Хорошо)
   └─ Сдано тестов: 89 тестов
   └─ Процент сдачи с первого раза: 65%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *СТУДЕНТЫ, ТРЕБУЮЩИЕ ВНИМАНИЯ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 *КРИТИЧНЫЕ (${criticalStudents} студента):*
   ${analytics.topIssues.slice(0, 2).map((issue, i) => `${i + 1}. ${issue}`).join('\n   ')}
   
   💡 *Действия:*
   ✅ Срочно связаться (звонок/email)
   ✅ AI-Mentor отправил мотивацию
   ✅ Назначить консультацию

🟠 *ТРЕВОЖНЫЕ (${warningStudents} студентов):*
   • Не заходили 3-5 дней
   • Застряли на сложных темах
   • Низкие результаты тестов
   
   💡 *Действия:*
   ✅ AI-Mentor отправил напоминания
   ✅ Рекомендации по проблемным темам

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *КАЧЕСТВО РАБОТЫ AI-КУРАТОРА:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 *Конфликты обнаружено:* ${analytics.conflicts}
   ${analytics.conflicts === 0 ? '✅ Отлично! Конфликтов нет!' : '⚠️ Требует внимания!'}

📊 *Типы конфликтов:*
• 💭 Галлюцинации: 1 (critical) ⚠️
• ❓ Непонимание: 1 (medium)
• 📚 Неполные ответы: 1 (low)

⚡ *Среднее время ответа:* 3.2 сек ✅
📏 *Средняя длина ответа:* 280 символов
👍 *Удовлетворённость ответами:* 85% ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *ГЛАВНЫЕ РЕКОМЕНДАЦИИ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 *СРОЧНО (в течение 24ч):*
${analytics.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

📈 *УЛУЧШЕНИЯ:*
1. Добавить дополнительные примеры по Backpropagation
2. Создать шпаргалку по Python синтаксису
3. Упростить тесты по сложным темам
4. Добавить больше практических заданий

🎯 *МАРКЕТИНГ И РОСТ:*
1. Запустить реферальную программу (успешные студенты приводят новых)
2. Собрать отзывы от студентов с высоким mood (8-10)
3. Создать кейсы успеха для привлечения
4. Оптимизировать воронку онбординга

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *ДИНАМИКА ЗА ${analytics.period.toUpperCase()}:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ *Положительные тренды:*
• Вовлечённость растёт (+5% за неделю) 📈
• Среднее время обучения увеличилось (+15 минут) 📈
• Больше вопросов AI-куратору (+12%) 📈
• ${excellentStudents} студентов с отличным настроением 😊

⚠️ *Требуют внимания:*
• ${criticalStudents} студентов в критичном состоянии 🔴
• Урок 8 (Backpropagation) вызывает сложности
• ${analytics.conflicts} конфликтов AI-куратора
• ${100 - activePercentage}% неактивных студентов

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *ПЛАН НА СЛЕДУЮЩУЮ НЕДЕЛЮ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ Исправить галлюцинации бота (обновить контекст)
2. ✅ Упростить урок 8 или добавить доп. материалы
3. ✅ Связаться с ${criticalStudents} критичными студентами
4. ✅ Провести вебинар по Backpropagation
5. ✅ Собрать feedback от лучших студентов
6. ✅ Оптимизировать онбординг новых студентов

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💚 *ИТОГИ:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${analytics.avgMood >= 7 && activePercentage >= 75 ? 
'🌟 *ОТЛИЧНО!* Платформа работает эффективно! Студенты довольны и активны. Продолжайте в том же духе! 🚀' :
analytics.avgMood >= 6 && activePercentage >= 60 ?
'👍 *ХОРОШО!* Платформа стабильно работает. Есть точки роста - фокус на них! 💪' :
'⚠️ *ВНИМАНИЕ!* Нужно улучшить вовлечённость и настроение студентов. Применяйте рекомендации выше! 🔥'}

Следующий отчёт: через 7 дней
${analytics.period === 'Неделя' ? '📊 Ежедневные отчёты в AI-аналитике админ-панели' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_Ваш AI-Аналитик для onAI Academy 🤖📊_
_Всегда на связи для бизнес-аналитики_
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
    console.error("❌ AI-Mentor бот не активен! Проверь токен.");
    return;
  }
  
  console.log(`\nℹ️  Получаю Chat ID из последних сообщений...`);
  const mentorChatId = await getUpdates(AI_MENTOR_TOKEN);
  
  if (!mentorChatId) {
    console.log("\n⚠️  ВНИМАНИЕ! Сначала отправь /start боту @" + mentorInfo.username);
    console.log("Затем запусти скрипт снова.");
    console.log("\nИЛИ укажи Chat ID вручную в скрипте (const ADMIN_CHAT_ID)");
    return;
  }
  
  // Отправляем тестовое сообщение
  console.log(`\n📤 Отправляю мотивационное сообщение студенту на Chat ID: ${mentorChatId}...`);
  const mentorSent = await sendTelegramMessage(
    AI_MENTOR_TOKEN,
    mentorChatId,
    createStudentMotivationMessage(mockStudentData)
  );
  
  if (mentorSent) {
    console.log("\n✅ AI-Mentor бот протестирован! Проверь Telegram!\n");
  }
  
  // ============================================
  // 2. ПРОВЕРКА AI-ANALYST БОТА
  // ============================================
  console.log("2️⃣ Проверка AI-Analyst бота...");
  const analystInfo = await getBotInfo(AI_ANALYST_TOKEN);
  
  if (!analystInfo) {
    console.error("❌ AI-Analyst бот не активен! Проверь токен.");
    return;
  }
  
  console.log(`\nℹ️  Получаю Chat ID из последних сообщений...`);
  let analystChatId = await getUpdates(AI_ANALYST_TOKEN);
  
  // Если не получили Chat ID из обновлений, используем Chat ID из первого бота
  if (!analystChatId && mentorChatId) {
    console.log("ℹ️  Используем Chat ID из AI-Mentor: " + mentorChatId);
    analystChatId = mentorChatId;
  }
  
  if (!analystChatId) {
    console.log("\n⚠️  ВНИМАНИЕ! Сначала отправь /start боту @" + analystInfo.username);
    console.log("Затем запусти скрипт снова.");
    return;
  }
  
  // Отправляем аналитику админу (разбиваем на 2 части из-за лимита Telegram)
  console.log(`\n📤 Отправляю аналитику админу на Chat ID: ${analystChatId}...`);
  
  const fullReport = createAdminAnalyticsMessage(mockAdminAnalytics);
  
  // Разбиваем отчёт на 2 части
  const reportParts = fullReport.split('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 *КАЧЕСТВО РАБОТЫ AI-КУРАТОРА:*');
  
  // Часть 1: Статистика студентов
  const part1 = reportParts[0] + '\n\n_⏭ Продолжение следует..._';
  await sendTelegramMessage(AI_ANALYST_TOKEN, analystChatId, part1);
  
  // Ждём 1 секунду между сообщениями
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Часть 2: Качество AI и рекомендации
  const part2 = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 *КАЧЕСТВО РАБОТЫ AI-КУРАТОРА:*' + reportParts[1];
  const analystSent = await sendTelegramMessage(AI_ANALYST_TOKEN, analystChatId, part2);
  
  if (analystSent) {
    console.log("\n✅ AI-Analyst бот протестирован! Проверь Telegram!\n");
  }
  
  // ============================================
  // ИТОГИ
  // ============================================
  if (mentorSent && analystSent) {
    console.log("=" + "=".repeat(50));
    console.log("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!");
    console.log("=" + "=".repeat(50));
    console.log("\n📱 Проверь свой Telegram:");
    console.log(`  • AI-Mentor (@${mentorInfo.username}): мотивационное сообщение`);
    console.log(`  • AI-Analyst (@${analystInfo.username}): аналитический отчёт`);
    console.log("\n✅ Боты работают и готовы к использованию!");
  }
}

// ============================================
// ЗАПУСК
// ============================================

testTelegramBots().catch(error => {
  console.error("❌ Критическая ошибка:", error.message);
  process.exit(1);
});

