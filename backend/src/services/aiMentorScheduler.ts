/**
 * AI MENTOR SCHEDULER SERVICE
 * Автоматический анализ прогресса студентов и отправка мотивационных сообщений
 */

import cron from 'node-cron';
import { adminSupabase } from '../config/supabase';
import { sendMentorMessage, MENTOR_TEMPLATES } from './telegramService';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_MENTOR_ID || '';

interface StudentProgress {
  userId: string;
  fullName: string;
  email: string;
  telegramChatId: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastActivityDate: string | null;
  currentStreak: number;
  xp: number;
  level: number;
  daysInactive: number;
}

/**
 * Получить прогресс всех активных студентов
 */
async function getStudentsProgress(): Promise<StudentProgress[]> {
  try {
    console.log('📊 [AI Mentor] Fetching students progress...');

    // Получаем всех пользователей с их профилями и прогрессом
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select(`
        id,
        email,
        profiles (
          full_name,
          telegram_chat_id,
          current_streak,
          xp,
          level
        ),
        student_progress (
          is_completed,
          updated_at
        )
      `)
      .eq('role', 'student')
      .not('profiles', 'is', null);

    if (usersError) {
      console.error('❌ [AI Mentor] Error fetching users:', usersError);
      return [];
    }

    if (!users || users.length === 0) {
      console.log('⚠️ [AI Mentor] No students found');
      return [];
    }

    // Получаем общее количество уроков
    const { count: totalLessonsCount } = await adminSupabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const studentsProgress: StudentProgress[] = users.map((user: any) => {
      const profile = user.profiles?.[0] || {};
      const completedLessons = user.student_progress?.filter((p: any) => p.is_completed).length || 0;
      const totalLessons = totalLessonsCount || 0;
      const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Определяем последнюю активность
      const lastActivityDate = user.student_progress?.[0]?.updated_at || null;
      const daysInactive = lastActivityDate
        ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        userId: user.id,
        fullName: profile.full_name || 'Студент',
        email: user.email,
        telegramChatId: profile.telegram_chat_id,
        totalLessons,
        completedLessons,
        progressPercentage,
        lastActivityDate,
        currentStreak: profile.current_streak || 0,
        xp: profile.xp || 0,
        level: profile.level || 1,
        daysInactive,
      };
    });

    console.log(`✅ [AI Mentor] Found ${studentsProgress.length} students`);
    return studentsProgress;
  } catch (error: any) {
    console.error('❌ [AI Mentor] Error in getStudentsProgress:', error);
    return [];
  }
}

/**
 * Анализировать прогресс студента через OpenAI и отправить персонализированное сообщение
 */
async function analyzeAndMotivateStudent(student: StudentProgress) {
  try {
    console.log(`🤖 [AI Mentor] Analyzing student: ${student.fullName} (${student.email})`);

    if (!student.telegramChatId) {
      console.log(`⚠️ [AI Mentor] Student ${student.fullName} has no telegram_chat_id, skipping`);
      return;
    }

    // Создаем контекст для AI
    const context = `
Студент: ${student.fullName}
Email: ${student.email}
Прогресс: ${student.completedLessons}/${student.totalLessons} уроков (${student.progressPercentage}%)
Текущий стрик: ${student.currentStreak} дней
Уровень: ${student.level}
XP: ${student.xp}
Дней неактивен: ${student.daysInactive}
Последняя активность: ${student.lastActivityDate || 'никогда'}

Твоя задача: На основе этих данных сформируй КОРОТКОЕ (2-3 предложения) персонализированное мотивационное сообщение для студента.

Правила:
1. Будь дружелюбным и мотивирующим
2. Используй emoji для визуального акцента
3. Если студент неактивен >3 дня - напомни вернуться
4. Если прогресс >70% - похвали и подбодри к финишу
5. Если стрик >5 дней - отметь его упорство
6. Если прогресс <10% - мягко мотивируй начать

ВАЖНО: Пиши ТОЛЬКО само сообщение, без вступлений и объяснений!
`;

    // Вызываем OpenAI Assistant API
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: context,
    });

    let run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Polling loop (вместо createAndPoll для совместимости со старыми версиями SDK)
    while (run.status === 'queued' || run.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (run.status !== 'completed') {
      console.error(`❌ [AI Mentor] Run failed for ${student.fullName}: ${run.status}`);
      return;
    }

    // Получаем ответ от AI
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

    if (!assistantMessage || !assistantMessage.content[0]) {
      console.error(`❌ [AI Mentor] No response from AI for ${student.fullName}`);
      return;
    }

    // @ts-ignore
    const motivationText = assistantMessage.content[0].text?.value || '';

    if (!motivationText) {
      console.error(`❌ [AI Mentor] Empty motivation text for ${student.fullName}`);
      return;
    }

    console.log(`💬 [AI Mentor] Generated message for ${student.fullName}:`, motivationText);

    // Отправляем сообщение через Telegram
    const sent = await sendMentorMessage(student.telegramChatId, motivationText);

    if (sent) {
      console.log(`✅ [AI Mentor] Message sent to ${student.fullName}`);

      // Логируем в базу данных
      await adminSupabase.from('ai_mentor_advice_log').insert({
        user_id: student.userId,
        advice_type: 'motivation',
        advice_text: motivationText,
        context: JSON.stringify(student),
        sent_via: 'telegram',
      });
    }
  } catch (error: any) {
    console.error(`❌ [AI Mentor] Error analyzing student ${student.fullName}:`, error.message);
  }
}

/**
 * Основная функция: проверить всех студентов и отправить мотивацию
 */
async function checkAndMotivateStudents() {
  try {
    console.log('🚀 [AI Mentor] Starting daily motivation check...');

    const students = await getStudentsProgress();

    if (students.length === 0) {
      console.log('⚠️ [AI Mentor] No students to motivate');
      return;
    }

    console.log(`📋 [AI Mentor] Processing ${students.length} students...`);

    // Обрабатываем студентов по очереди (чтобы не перегрузить OpenAI API)
    for (const student of students) {
      // Отправляем мотивацию только тем, кто:
      // 1. Неактивен >3 дней, ИЛИ
      // 2. Имеет стрик >5 дней (похвала), ИЛИ
      // 3. Прогресс >70% (финальный пуш)
      const shouldMotivate =
        student.daysInactive >= 3 ||
        student.currentStreak >= 5 ||
        student.progressPercentage >= 70;

      if (shouldMotivate) {
        await analyzeAndMotivateStudent(student);
        // Задержка между запросами к OpenAI (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`⏭️ [AI Mentor] Skipping ${student.fullName} (no motivation criteria met)`);
      }
    }

    console.log('✅ [AI Mentor] Daily motivation check completed');
  } catch (error: any) {
    console.error('❌ [AI Mentor] Error in checkAndMotivateStudents:', error);
  }
}

/**
 * Генерировать еженедельный отчет для администратора
 */
async function generateWeeklyReport() {
  try {
    console.log('📊 [AI Mentor] Generating weekly report...');

    const students = await getStudentsProgress();

    if (students.length === 0) {
      console.log('⚠️ [AI Mentor] No students for weekly report');
      return;
    }

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.daysInactive < 7).length;
    const avgProgress = Math.round(
      students.reduce((sum, s) => sum + s.progressPercentage, 0) / totalStudents
    );
    const topPerformers = students
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 3);

    const reportText = `
📈 *ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ AI-НАСТАВНИКА*

*Общая статистика:*
👥 Всего студентов: ${totalStudents}
🔥 Активных (за неделю): ${activeStudents} (${Math.round((activeStudents / totalStudents) * 100)}%)
📊 Средний прогресс: ${avgProgress}%

*Топ-3 студента:*
${topPerformers.map((s, i) => `${i + 1}. ${s.fullName} - ${s.progressPercentage}% (Стрик: ${s.currentStreak} дней)`).join('\n')}

*Проблемные зоны:*
⚠️ Неактивных >7 дней: ${students.filter(s => s.daysInactive >= 7).length}
📉 Прогресс <10%: ${students.filter(s => s.progressPercentage < 10).length}

_Отчет сгенерирован: ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}_
`;

    console.log('📊 Weekly Report:\n', reportText);

    // Сохраняем отчет в базу данных
    await adminSupabase.from('ai_mentor_advice_log').insert({
      user_id: null, // Отчет для админа, не для конкретного студента
      advice_type: 'weekly_report',
      advice_text: reportText,
      context: JSON.stringify({
        totalStudents,
        activeStudents,
        avgProgress,
        topPerformers: topPerformers.map(s => s.fullName),
      }),
      sent_via: 'system',
    });

    console.log('✅ [AI Mentor] Weekly report generated and saved');

    // TODO: Отправить отчет админу через Telegram
    // await sendAdminNotification(reportText);
  } catch (error: any) {
    console.error('❌ [AI Mentor] Error generating weekly report:', error);
  }
}

/**
 * Запуск планировщика AI-наставника
 */
export function startAIMentorScheduler() {
  console.log('🤖 [AI Mentor Scheduler] Starting...');

  if (!ASSISTANT_ID) {
    console.warn('⚠️ [AI Mentor Scheduler] OPENAI_ASSISTANT_MENTOR_ID not configured, scheduler disabled');
    return;
  }

  // Ежедневная мотивация в 8:00 утра (UTC+6 Almaty time)
  // В cron это будет 2:00 UTC (8:00 - 6 часов)
  cron.schedule('0 2 * * *', () => {
    console.log('⏰ [AI Mentor] Daily motivation trigger (8:00 Almaty time)');
    checkAndMotivateStudents();
  });

  // Еженедельный отчет каждый понедельник в 9:00 утра (3:00 UTC)
  cron.schedule('0 3 * * 1', () => {
    console.log('⏰ [AI Mentor] Weekly report trigger (9:00 Monday Almaty time)');
    generateWeeklyReport();
  });

  console.log('✅ [AI Mentor Scheduler] Started successfully');
  console.log('📅 Schedule:');
  console.log('  - Daily motivation: 8:00 AM (Almaty time)');
  console.log('  - Weekly report: Monday 9:00 AM (Almaty time)');
}

/**
 * Ручной запуск проверки (для тестирования)
 */
export async function triggerManualMotivationCheck() {
  console.log('🧪 [AI Mentor] Manual trigger: checking students...');
  await checkAndMotivateStudents();
}

/**
 * Ручной запуск еженедельного отчета (для тестирования)
 */
export async function triggerManualWeeklyReport() {
  console.log('🧪 [AI Mentor] Manual trigger: generating weekly report...');
  await generateWeeklyReport();
}

