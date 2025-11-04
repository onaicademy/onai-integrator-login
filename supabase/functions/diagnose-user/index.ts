import { createClient } from 'npm:@supabase/supabase-js@2';

// Инициализация Supabase-клиента с сервисным ключом (админ-доступ)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

type Diagnostics = {
  lessons_completed: number;
  avg_minutes_per_day: number;
  current_streak: number;
  flag_low_engagement: boolean;
  stuck_lessons: string[];
  recommendation: string;
};

// Функция генерации диагностики для одного пользователя
async function generateDiagnostics(userId: string): Promise<Diagnostics> {
  // 1. Запрос данных прогресса пользователя
  const { data: progressData, error: progressError } = await supabaseAdmin
    .from('progress')
    .select('lesson_id, is_completed, seconds_watched, updated_at')
    .eq('user_id', userId);
  
  if (progressError) throw progressError;

  // Подсчёт завершённых уроков и суммарных секунд просмотра
  const lessonsCompleted = progressData.filter(p => p.is_completed).length;
  const totalSecondsWatched = progressData.reduce((sum, p) => sum + (p.seconds_watched || 0), 0);

  // Определение "застрявших" уроков (не завершены > 3 дней)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const stuckLessons = progressData
    .filter(p => !p.is_completed && p.updated_at && new Date(p.updated_at) < threeDaysAgo)
    .map(p => p.lesson_id);

  // 2. Запрос данных ежедневной активности за последние 7 дней
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 дней назад + сегодня = 7 дней
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const { data: activityData, error: activityError } = await supabaseAdmin
    .from('daily_activity')
    .select('date, minutes')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo.toISOString());
  
  if (activityError) throw activityError;

  // Рассчёт среднего времени (минут в день) за неделю
  let totalMinutes7d = 0;
  const activeDaysSet = new Set<string>();
  
  for (const day of activityData) {
    const dateStr = day.date.slice(0, 10);  // формат YYYY-MM-DD
    activeDaysSet.add(dateStr);
    totalMinutes7d += day.minutes || 0;
  }
  
  const avgMinutesPerDay = Math.floor(totalMinutes7d / 7);

  // Расчёт стрика (макс. подряд дней с активностью за 7 дней)
  let currentStreak = 0;
  let maxStreak = 0;
  
  // Получаем список последних 7 дат (от 0 до 6 дней назад)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    if (activeDaysSet.has(dateStr)) {
      currentStreak += 1;
    } else {
      // если день без активности - стрик прерывается
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 0;
    }
  }
  
  // На случай, если последние дни были активны подряд
  maxStreak = Math.max(maxStreak, currentStreak);
  currentStreak = maxStreak;

  // 3. Определение флага низкой вовлечённости
  const flagLowEngagement = (currentStreak < 4 || avgMinutesPerDay < 15);

  // Формирование рекомендации (пока простое правило; можно заменить генерацией AI)
  let recommendation = '';
  if (flagLowEngagement) {
    recommendation = 'Ты учишься нерегулярно. Попробуй ставить цель: 2 урока в день.';
  } else {
    recommendation = 'Отличная регулярность! Продолжай в том же духе.';
  }

  // Собираем JSON-объект диагностики
  return {
    lessons_completed: lessonsCompleted,
    avg_minutes_per_day: avgMinutesPerDay,
    current_streak: currentStreak,
    flag_low_engagement: flagLowEngagement,
    stuck_lessons: stuckLessons,
    recommendation: recommendation
  };
}

// Основной обработчик функции (HTTP-запрос)
Deno.serve(async (req: Request) => {
  try {
    // Получаем user_id из параметров запроса или тела JSON
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('user_id');
    let userId = queryUserId;
    
    if (!userId) {
      const body = await req.json().catch(() => ({}));
      userId = body.user_id;
    }
    
    if (!userId) {
      // На будущее: обработка всех пользователей, если userId не указан
      return new Response(
        JSON.stringify({ error: 'user_id is required' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Генерация диагностики
    const diagnostics = await generateDiagnostics(userId);

    // Проверка на дубликат записи за сегодня
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const { data: existingLogs, error: selectError } = await supabaseAdmin
      .from('diagnostics_log')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());
    
    if (selectError) throw selectError;
    
    if (existingLogs && existingLogs.length > 0) {
      // Уже есть запись сегодня – возвращаем без создания дубликата
      return new Response(
        JSON.stringify({ 
          status: 'skipped', 
          message: 'Diagnosis already exists for today',
          data: diagnostics 
        }), 
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Сохранение новой записи в diagnostics_log
    const { error: insertError } = await supabaseAdmin
      .from('diagnostics_log')
      .insert({ 
        user_id: userId, 
        data_json: diagnostics 
      });
    
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: 'Diagnosis created successfully',
        data: diagnostics 
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in diagnose-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        details: error
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

