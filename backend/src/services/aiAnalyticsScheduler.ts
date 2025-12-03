/**
 * AI ANALYTICS SCHEDULER SERVICE
 * Автоматический анализ платформы и отправка отчетов администратору
 */

import cron from 'node-cron';
import { adminSupabase } from '../config/supabase';
import { sendAdminNotification } from './telegramService';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYST_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ANALYST_ID || '';

interface PlatformMetrics {
  // Пользователи
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  
  // Уроки
  totalLessons: number;
  lessonsCompletedToday: number;
  lessonsCompletedWeek: number;
  
  // Курсы
  totalCourses: number;
  avgCourseProgress: number;
  
  // Видео
  totalVideoWatchTime: number; // в минутах
  videoWatchTimeToday: number;
  avgVideoCompletionRate: number;
  
  // Достижения
  achievementsUnlockedToday: number;
  achievementsUnlockedWeek: number;
  
  // AI ассистенты
  curatorQuestionsToday: number;
  curatorQuestionsWeek: number;
  avgCuratorResponseTime: number;
  
  // Проблемы
  usersWithNoProgress: number;
  usersInactive7Days: number;
  lowEngagementUsers: number;
}

/**
 * Получить метрики платформы
 */
async function getPlatformMetrics(): Promise<PlatformMetrics> {
  try {
    console.log('📊 [AI Analytics] Collecting platform metrics...');

    // Временные метки
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. ПОЛЬЗОВАТЕЛИ
    const { count: totalUsers } = await adminSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    const { count: newUsersToday } = await adminSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .gte('created_at', `${today}T00:00:00`);

    const { count: newUsersWeek } = await adminSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .gte('created_at', weekAgo);

    // Активные пользователи (были на платформе)
    const { data: activeToday } = await adminSupabase
      .from('video_watch_sessions')
      .select('user_id')
      .gte('created_at', `${today}T00:00:00`);

    const activeUsersToday = new Set(activeToday?.map(s => s.user_id) || []).size;

    const { data: activeWeek } = await adminSupabase
      .from('video_watch_sessions')
      .select('user_id')
      .gte('created_at', weekAgo);

    const activeUsersWeek = new Set(activeWeek?.map(s => s.user_id) || []).size;

    // 2. УРОКИ
    const { count: totalLessons } = await adminSupabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: lessonsCompletedToday } = await adminSupabase
      .from('student_progress')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', true)
      .gte('completed_at', `${today}T00:00:00`);

    const { count: lessonsCompletedWeek } = await adminSupabase
      .from('student_progress')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', true)
      .gte('completed_at', weekAgo);

    // 3. КУРСЫ
    const { count: totalCourses } = await adminSupabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    const { data: courseProgress } = await adminSupabase
      .from('course_progress')
      .select('progress_percent');

    const avgCourseProgress = courseProgress && courseProgress.length > 0
      ? Math.round(courseProgress.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / courseProgress.length)
      : 0;

    // 4. ВИДЕО
    const { data: allSessions } = await adminSupabase
      .from('video_watch_sessions')
      .select('max_second_reached');

    const totalVideoWatchTime = Math.round(
      (allSessions?.reduce((sum, s) => sum + (s.max_second_reached || 0), 0) || 0) / 60
    );

    const { data: todaySessions } = await adminSupabase
      .from('video_watch_sessions')
      .select('max_second_reached')
      .gte('created_at', `${today}T00:00:00`);

    const videoWatchTimeToday = Math.round(
      (todaySessions?.reduce((sum, s) => sum + (s.max_second_reached || 0), 0) || 0) / 60
    );

    // Средняя степень завершения видео
    const { data: videoProgress } = await adminSupabase
      .from('student_progress')
      .select('video_progress_percent')
      .not('video_progress_percent', 'is', null);

    const avgVideoCompletionRate = videoProgress && videoProgress.length > 0
      ? Math.round(videoProgress.reduce((sum, p) => sum + (p.video_progress_percent || 0), 0) / videoProgress.length)
      : 0;

    // 5. ДОСТИЖЕНИЯ
    const { count: achievementsUnlockedToday } = await adminSupabase
      .from('achievement_history')
      .select('*', { count: 'exact', head: true })
      .gte('unlocked_at', `${today}T00:00:00`);

    const { count: achievementsUnlockedWeek } = await adminSupabase
      .from('achievement_history')
      .select('*', { count: 'exact', head: true })
      .gte('unlocked_at', weekAgo);

    // 6. AI КУРАТОР
    const { count: curatorQuestionsToday } = await adminSupabase
      .from('student_questions_log')
      .select('*', { count: 'exact', head: true })
      .gte('asked_at', `${today}T00:00:00`);

    const { count: curatorQuestionsWeek } = await adminSupabase
      .from('student_questions_log')
      .select('*', { count: 'exact', head: true })
      .gte('asked_at', weekAgo);

    const { data: responseTimes } = await adminSupabase
      .from('student_questions_log')
      .select('response_time_ms')
      .not('response_time_ms', 'is', null);

    const avgCuratorResponseTime = responseTimes && responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / responseTimes.length)
      : 0;

    // 7. ПРОБЛЕМЫ
    const { data: allUsers } = await adminSupabase
      .from('users')
      .select('id, created_at')
      .eq('role', 'student');

    let usersWithNoProgress = 0;
    let usersInactive7Days = 0;
    let lowEngagementUsers = 0;

    if (allUsers) {
      for (const user of allUsers) {
        // Проверяем прогресс
        const { count: progressCount } = await adminSupabase
          .from('student_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_completed', true);

        if (!progressCount || progressCount === 0) {
          usersWithNoProgress++;
        }

        // Проверяем активность за 7 дней
        const { count: recentActivity } = await adminSupabase
          .from('video_watch_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo);

        if (!recentActivity || recentActivity === 0) {
          usersInactive7Days++;
        }

        // Низкая вовлеченность (зарегистрирован >3 дней, но <2 завершенных уроков)
        const userAge = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (userAge >= 3 && (!progressCount || progressCount < 2)) {
          lowEngagementUsers++;
        }
      }
    }

    const metrics: PlatformMetrics = {
      totalUsers: totalUsers || 0,
      newUsersToday: newUsersToday || 0,
      newUsersWeek: newUsersWeek || 0,
      activeUsersToday,
      activeUsersWeek,
      totalLessons: totalLessons || 0,
      lessonsCompletedToday: lessonsCompletedToday || 0,
      lessonsCompletedWeek: lessonsCompletedWeek || 0,
      totalCourses: totalCourses || 0,
      avgCourseProgress,
      totalVideoWatchTime,
      videoWatchTimeToday,
      avgVideoCompletionRate,
      achievementsUnlockedToday: achievementsUnlockedToday || 0,
      achievementsUnlockedWeek: achievementsUnlockedWeek || 0,
      curatorQuestionsToday: curatorQuestionsToday || 0,
      curatorQuestionsWeek: curatorQuestionsWeek || 0,
      avgCuratorResponseTime,
      usersWithNoProgress,
      usersInactive7Days,
      lowEngagementUsers,
    };

    console.log('✅ [AI Analytics] Metrics collected:', metrics);
    return metrics;
  } catch (error: any) {
    console.error('❌ [AI Analytics] Error collecting metrics:', error);
    throw error;
  }
}

/**
 * Анализировать метрики через OpenAI и сгенерировать отчет
 */
async function analyzeMetricsWithAI(metrics: PlatformMetrics): Promise<string> {
  try {
    console.log('🤖 [AI Analytics] Analyzing metrics with OpenAI...');

    // Формируем контекст для AI
    const context = `
Ты - AI-аналитик образовательной платформы onAI Academy.

**МЕТРИКИ ПЛАТФОРМЫ:**

👥 **Пользователи:**
- Всего студентов: ${metrics.totalUsers}
- Новых за сегодня: ${metrics.newUsersToday}
- Новых за неделю: ${metrics.newUsersWeek}
- Активных сегодня: ${metrics.activeUsersToday} (${metrics.totalUsers > 0 ? Math.round((metrics.activeUsersToday / metrics.totalUsers) * 100) : 0}%)
- Активных за неделю: ${metrics.activeUsersWeek} (${metrics.totalUsers > 0 ? Math.round((metrics.activeUsersWeek / metrics.totalUsers) * 100) : 0}%)

📚 **Обучение:**
- Всего уроков: ${metrics.totalLessons}
- Завершено сегодня: ${metrics.lessonsCompletedToday}
- Завершено за неделю: ${metrics.lessonsCompletedWeek}
- Всего курсов: ${metrics.totalCourses}
- Средний прогресс курсов: ${metrics.avgCourseProgress}%

🎥 **Видео:**
- Всего просмотрено: ${metrics.totalVideoWatchTime} минут
- Просмотрено сегодня: ${metrics.videoWatchTimeToday} минут
- Средняя степень завершения: ${metrics.avgVideoCompletionRate}%

🏆 **Достижения:**
- Разблокировано сегодня: ${metrics.achievementsUnlockedToday}
- Разблокировано за неделю: ${metrics.achievementsUnlockedWeek}

🤖 **AI-куратор:**
- Вопросов сегодня: ${metrics.curatorQuestionsToday}
- Вопросов за неделю: ${metrics.curatorQuestionsWeek}
- Среднее время ответа: ${Math.round(metrics.avgCuratorResponseTime / 1000)}с

⚠️ **Проблемные зоны:**
- Пользователей без прогресса: ${metrics.usersWithNoProgress}
- Неактивны 7+ дней: ${metrics.usersInactive7Days}
- Низкая вовлеченность: ${metrics.lowEngagementUsers}

**ТВОЯ ЗАДАЧА:**
1. Проанализируй метрики и выяви ключевые тренды (рост/падение)
2. Определи проблемные зоны и риски
3. Дай 2-3 конкретные рекомендации для улучшения метрик
4. Сформируй краткий отчет (до 10 строк)

**ФОРМАТ ОТВЕТА:**
Пиши ТОЛЬКО сам отчет, БЕЗ вступлений!
Используй emoji для визуального акцента.
Будь лаконичным и конкретным.
`;

    // Вызываем OpenAI Assistant API
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: context,
    });

    let run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ANALYST_ASSISTANT_ID,
    });

    // Polling loop
    let attempts = 0;
    const maxAttempts = 60;
    while ((run.status === 'queued' || run.status === 'in_progress') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (run.status !== 'completed') {
      console.error(`❌ [AI Analytics] Run failed: ${run.status}`);
      throw new Error(`OpenAI run failed with status: ${run.status}`);
    }

    // Получаем ответ от AI
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error('No response from AI');
    }

    // @ts-ignore
    const analysisText = assistantMessage.content[0].text?.value || '';

    console.log('✅ [AI Analytics] Analysis completed');
    return analysisText;
  } catch (error: any) {
    console.error('❌ [AI Analytics] Error in AI analysis:', error.message);
    throw error;
  }
}

/**
 * Генерировать ежедневный отчет AI-аналитики
 */
async function generateDailyAnalyticsReport() {
  try {
    console.log('📊 [AI Analytics] Generating daily analytics report...');

    // Собираем метрики
    const metrics = await getPlatformMetrics();

    // Если нет пользователей, отправляем упрощенный отчет
    if (metrics.totalUsers === 0) {
      const reportText = `
📊 *ЕЖЕДНЕВНЫЙ ОТЧЁТ AI-АНАЛИТИКИ*
_${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'long' })}_

⚠️ Платформа пока без студентов.

📋 **Текущее состояние:**
📚 Уроков: ${metrics.totalLessons}
🎓 Курсов: ${metrics.totalCourses}

💡 **Рекомендация:** 
Как только появятся первые студенты, я начну отслеживать их прогресс и отправлять детальную аналитику.

_Следующий отчет: завтра в 9:00_
`;

      await sendAdminNotification(reportText);
      console.log('✅ [AI Analytics] Empty platform report sent');
      return;
    }

    // Анализируем метрики через AI
    let aiAnalysis = '';
    try {
      if (ANALYST_ASSISTANT_ID) {
        aiAnalysis = await analyzeMetricsWithAI(metrics);
      }
    } catch (aiError) {
      console.warn('⚠️ [AI Analytics] AI analysis failed, using basic report');
    }

    // Формируем финальный отчет
    const reportText = `
📊 *ЕЖЕДНЕВНЫЙ ОТЧЁТ AI-АНАЛИТИКИ*
_${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'long' })}_

**📈 Ключевые метрики:**
👥 Студентов: ${metrics.totalUsers} (+${metrics.newUsersToday} сегодня)
🔥 Активность: ${metrics.activeUsersToday}/${metrics.totalUsers} (${metrics.totalUsers > 0 ? Math.round((metrics.activeUsersToday / metrics.totalUsers) * 100) : 0}%)
✅ Уроков завершено: ${metrics.lessonsCompletedToday}
🎥 Видео: ${metrics.videoWatchTimeToday} мин
🏆 Достижений: ${metrics.achievementsUnlockedToday}

${aiAnalysis ? `**🤖 AI-анализ:**\n${aiAnalysis}` : ''}

⚠️ **Требуют внимания:**
${metrics.usersWithNoProgress > 0 ? `• ${metrics.usersWithNoProgress} без прогресса\n` : ''}${metrics.usersInactive7Days > 0 ? `• ${metrics.usersInactive7Days} неактивны 7+ дней\n` : ''}${metrics.lowEngagementUsers > 0 ? `• ${metrics.lowEngagementUsers} низкая вовлеченность\n` : ''}
_Следующий отчет: завтра в 9:00_
`;

    console.log('📊 Analytics Report:\n', reportText);

    // Сохраняем в базу
    await adminSupabase.from('ai_analytics_reports').insert({
      report_type: 'daily',
      report_text: reportText,
      metrics: JSON.stringify(metrics),
      ai_analysis: aiAnalysis || null,
    });

    // Отправляем админу
    await sendAdminNotification(reportText);

    console.log('✅ [AI Analytics] Daily report generated and sent');
  } catch (error: any) {
    console.error('❌ [AI Analytics] Error generating daily report:', error);
    
    // Отправляем уведомление об ошибке админу
    try {
      await sendAdminNotification(
        `⚠️ *ОШИБКА AI-АНАЛИТИКИ*\n\nНе удалось сгенерировать отчет:\n${error.message}\n\n_${new Date().toLocaleString('ru-RU')}_`
      );
    } catch (notifyError) {
      console.error('❌ Failed to send error notification:', notifyError);
    }
  }
}

/**
 * Запуск планировщика AI-аналитики
 */
export function startAIAnalyticsScheduler() {
  console.log('📊 [AI Analytics Scheduler] Starting...');

  // ⏰ ЕЖЕДНЕВНЫЙ ОТЧЁТ в 9:00 утра (UTC+6 Almaty time)
  // В cron это будет 3:00 UTC (9:00 - 6 часов)
  cron.schedule('0 3 * * *', () => {
    console.log('⏰ [AI Analytics] Daily report trigger (9:00 AM Almaty time)');
    generateDailyAnalyticsReport();
  });

  console.log('✅ [AI Analytics Scheduler] Started successfully');
  console.log('📅 Schedule:');
  console.log('  - Daily analytics report: 9:00 AM каждый день (Almaty time)');

  if (!ANALYST_ASSISTANT_ID) {
    console.warn('⚠️ [AI Analytics] OPENAI_ASSISTANT_ANALYST_ID not configured, reports will be basic (without AI analysis)');
  }
}

/**
 * Ручной запуск отчета (для тестирования)
 */
export async function triggerManualAnalyticsReport() {
  console.log('🧪 [AI Analytics] Manual trigger: generating analytics report...');
  await generateDailyAnalyticsReport();
}

