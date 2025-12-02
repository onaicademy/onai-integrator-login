/**
 * Telegram Bot для AI-наставника (студенты)
 * Отправляет мотивационные сообщения и уведомления
 */

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_MENTOR_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const MENTOR_ENABLED = import.meta.env.VITE_AI_MENTOR_ENABLED === 'true';

/**
 * Отправить уведомление студенту
 */
export async function sendMentorNotification(
  telegramUserId: string,
  message: string,
  type: string
): Promise<boolean> {
  if (!MENTOR_ENABLED) {
    console.log('⚠️ AI-наставник отключён (VITE_AI_MENTOR_ENABLED=false)');
    return false;
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramUserId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Уведомление отправлено: ${type}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки в Telegram:', error);
    return false;
  }
}

/**
 * Шаблоны уведомлений
 */
export const NOTIFICATION_TEMPLATES = {
  // Мотивация
  motivation: (name: string, progress: number) => 
    `Привет, ${name}! 💪\n\nТы уже на ${progress}% курса - отличный результат!\nПродолжай в том же духе! 🚀`,
  
  // Напоминание
  reminder: (name: string, daysInactive: number) =>
    `${name}, давно не виделись! 😊\n\nПрошло уже ${daysInactive} дня с последнего урока.\nГотов продолжить обучение? 📚`,
  
  // Помощь
  help: (name: string, lessonName: string) =>
    `${name}, замечаю что урок "${lessonName}" вызывает сложности 🤔\n\nНужна помощь? Напиши AI-куратору или задай вопрос в сообществе!`,
  
  // Достижение
  achievement: (name: string, achievementName: string) =>
    `Поздравляю, ${name}! 🎉\n\nТы разблокировал достижение: "${achievementName}"!\nПродолжай в том же духе! ⭐`,
  
  // Стрик
  streak: (name: string, days: number) =>
    `Огонь, ${name}! 🔥\n\n${days} дней подряд на платформе!\nТы настоящий чемпион! 🏆`,
  
  // Предупреждение (стрик под угрозой)
  warning: (name: string) =>
    `${name}, твой стрик под угрозой! ⚠️\n\nЗайди сегодня на платформу чтобы не потерять прогресс! 💪`,
};

/**
 * Отправить мотивационное сообщение
 */
export async function sendMotivation(
  telegramUserId: string,
  studentName: string,
  progress: number
) {
  const message = NOTIFICATION_TEMPLATES.motivation(studentName, progress);
  return sendMentorNotification(telegramUserId, message, 'motivation');
}

/**
 * Отправить напоминание
 */
export async function sendReminder(
  telegramUserId: string,
  studentName: string,
  daysInactive: number
) {
  const message = NOTIFICATION_TEMPLATES.reminder(studentName, daysInactive);
  return sendMentorNotification(telegramUserId, message, 'reminder');
}

/**
 * Отправить предложение помощи
 */
export async function sendHelpOffer(
  telegramUserId: string,
  studentName: string,
  lessonName: string
) {
  const message = NOTIFICATION_TEMPLATES.help(studentName, lessonName);
  return sendMentorNotification(telegramUserId, message, 'help_offer');
}

/**
 * Отправить поздравление с достижением
 */
export async function sendAchievementNotification(
  telegramUserId: string,
  studentName: string,
  achievementName: string
) {
  const message = NOTIFICATION_TEMPLATES.achievement(studentName, achievementName);
  return sendMentorNotification(telegramUserId, message, 'achievement');
}

/**
 * Отправить напоминание о стрике
 */
export async function sendStreakNotification(
  telegramUserId: string,
  studentName: string,
  streakDays: number
) {
  const message = NOTIFICATION_TEMPLATES.streak(studentName, streakDays);
  return sendMentorNotification(telegramUserId, message, 'streak');
}

/**
 * Отправить предупреждение о стрике
 */
export async function sendStreakWarning(
  telegramUserId: string,
  studentName: string
) {
  const message = NOTIFICATION_TEMPLATES.warning(studentName);
  return sendMentorNotification(telegramUserId, message, 'warning');
}

/**
 * ФУНКЦИОНАЛ ПОКА ОТКЛЮЧЁН
 * Раскомментируй когда будешь готов тестировать
 */

/*
export async function sendDailyNotifications() {
  if (!MENTOR_ENABLED) {
    console.log('⚠️ AI-наставник отключён');
    return;
  }

  // Получить всех студентов с Telegram ID
  const students = await getAllStudentsForNotifications();
  
  for (const student of students) {
    try {
      // Проанализировать студента
      const analysis = await analyzeStudent(student.id);
      
      // Определить тип уведомления
      const notificationType = determineNotificationType(analysis);
      
      // Отправить
      if (notificationType && student.telegram_user_id) {
        const message = generateMessage(notificationType, student, analysis);
        await sendMentorNotification(
          student.telegram_user_id, 
          message, 
          notificationType
        );
        
        // Логируем в БД
        await logNotificationSent(student.id, notificationType);
      }
    } catch (error) {
      console.error(`❌ Ошибка отправки уведомления студенту ${student.id}:`, error);
    }
  }
  
  console.log(`✅ Отправлено ${sentCount} уведомлений`);
}
*/

