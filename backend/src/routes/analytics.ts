import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';  // ✅ Use admin client with Authorization header

const router = Router();

// POST /api/analytics/video-event - сохранение события просмотра видео
router.post('/video-event', async (req: Request, res: Response) => {
  try {
    console.log('📊 Video analytics event received:', req.body);

    const {
      user_id,
      lesson_id,
      session_id,
      event_type,
      position_seconds,
      playback_rate,
      progress_percent,
    } = req.body;

    // Валидация обязательных полей
    if (!lesson_id || !session_id || !event_type) {
      return res.status(400).json({
        error: 'Missing required fields: lesson_id, session_id, event_type',
      });
    }

    // Валидация event_type
    const validEventTypes = ['play', 'pause', 'progress', 'complete', 'playback_rate_change', 'volume_change', 'quality_change'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    // Сохранение события в БД (собираем только переданные поля)
    const insertData: any = {
      lesson_id: parseInt(lesson_id),
      session_id,
      event_type,
    };

    // Добавляем опциональные поля только если они переданы
    if (user_id) insertData.user_id = user_id;
    if (position_seconds !== undefined && position_seconds !== null) insertData.position_seconds = position_seconds;
    if (playback_rate !== undefined && playback_rate !== null) insertData.playback_rate = playback_rate;
    if (progress_percent !== undefined && progress_percent !== null) insertData.progress_percent = progress_percent;

    const { data, error } = await adminSupabase
      .from('video_analytics')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving video analytics:', error);
      
      // Если таблица не существует - вернем понятное сообщение
      if (error.message.includes('relation "video_analytics" does not exist')) {
        return res.status(500).json({
          error: 'Video analytics table does not exist. Please run the migration SQL.',
          details: error.message,
        });
      }
      
      throw error;
    }

    console.log('✅ Video analytics saved:', data);

    res.json({
      success: true,
      event: data,
    });
  } catch (error: any) {
    console.error('❌ Video analytics error:', error);
    res.status(500).json({
      error: 'Ошибка сохранения аналитики',
      message: error.message,
    });
  }
});

// GET /api/analytics/video/:lessonId - получение статистики по видео
router.get('/video/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const { data, error } = await adminSupabase
      .from('video_analytics')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({
      success: true,
      events: data || [],
    });
  } catch (error: any) {
    console.error('❌ Error fetching video analytics:', error);
    res.status(500).json({
      error: 'Ошибка получения аналитики',
      message: error.message,
    });
  }
});

// GET /analytics/student/:userId/dashboard - получить dashboard для NeuroHub
router.get('/student/:userId/dashboard', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log('📊 [Analytics] Запрос dashboard для:', userId);

    // 1. Получаем информацию о пользователе
    const { data: userProfile, error: userError } = await adminSupabase
      .from('profiles')
      .select('full_name, avatar_url, level, xp, current_streak')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения профиля:', userError);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // 2. Получаем статистику пользователя (level, xp, streak)
    // ПРИОРИТЕТ: profiles (там всегда есть данные), затем user_statistics
    const profile = userProfile as any;
    const stats = {
      level: profile.level || 1,
      total_xp: profile.xp || 0,
      current_streak: profile.current_streak || 0
    };

    console.log('📊 [Analytics] Stats из profiles:', stats);

    // 3. Получаем статистику за сегодня
    const today = new Date().toISOString().split('T')[0];
    
    const { data: todayProgress, error: todayError } = await adminSupabase
      .from('student_progress')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', `${today}T00:00:00`)
      .eq('is_completed', true);

    const lessons_completed_today = todayProgress?.length || 0;

    // Подсчет времени просмотра за сегодня
    const { data: todayWatchTime } = await adminSupabase
      .from('video_watch_sessions')
      .select('max_second_reached')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`);

    const watch_time_minutes = Math.round(
      (todayWatchTime?.reduce((sum, s) => sum + (s.max_second_reached || 0), 0) || 0) / 60
    );

    // XP за сегодня (примерно)
    const xp_earned_today = lessons_completed_today * 50; // 50 XP за урок

    // 4. Активность за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const week_activity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const { data: dayProgress } = await adminSupabase
        .from('student_progress')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', `${dateStr}T00:00:00`)
        .lt('completed_at', `${dateStr}T23:59:59`)
        .eq('is_completed', true);

      week_activity.push({
        date: dateStr,
        lessons_completed: dayProgress?.length || 0,
        watch_time_minutes: 0, // TODO: подсчитать реальное время
        xp_earned: (dayProgress?.length || 0) * 50,
      });
    }

    // 5. Последние достижения
    const { data: recentAchievements, error: achievementsError } = await adminSupabase
      .from('user_achievements')
      .select(`
        achievement_id,
        unlocked_at,
        is_completed,
        current_value,
        required_value
      `)
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('unlocked_at', { ascending: false })
      .limit(5);

    if (achievementsError) {
      console.error('❌ Ошибка получения достижений:', achievementsError);
    }

    // Для каждого достижения получаем базовую информацию из таблицы achievements
    const recent_achievements = [];
    if (recentAchievements && recentAchievements.length > 0) {
      // Получаем все achievement_id, которые нужно запросить
      const achievementIds = recentAchievements
        .map(ua => ua.achievement_id)
        .filter(id => id && id.length > 0); // Фильтруем только валидные UUID

      if (achievementIds.length > 0) {
        const { data: achievementsData, error: achievementsDataError } = await adminSupabase
          .from('achievements')
          .select('id, title, description, icon, xp_requirement')
          .in('id', achievementIds);

        if (achievementsDataError) {
          console.error('❌ Ошибка получения данных достижений:', achievementsDataError);
        } else if (achievementsData) {
          // Собираем финальный массив
          for (const ua of recentAchievements) {
            const achievement = achievementsData.find(a => a.id === ua.achievement_id);
            if (achievement) {
              recent_achievements.push({
                id: achievement.id,
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon,
                xp_reward: achievement.xp_requirement,
                unlocked_at: ua.unlocked_at,
              });
            }
          }
        }
      }
    }

    console.log('🏆 [Analytics] Достижения найдены:', recent_achievements.length);

    // 6. Активные миссии
    const { data: missions, error: missionsError } = await adminSupabase
      .from('missions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('🎯 [Analytics] Миссии из БД:', missions);
    console.log('🎯 [Analytics] missionsError:', missionsError);

    const active_missions = (missions || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      current_value: m.current_value || 0,
      target_value: m.target_value,
      progress_percent: Math.round(((m.current_value || 0) / m.target_value) * 100),
      xp_reward: m.xp_reward,
    }));

    // Формируем ответ
    const dashboardData = {
      user_info: {
        full_name: userProfile.full_name || 'Студент',
        avatar_url: userProfile.avatar_url,
        level: stats.level || 1,
        xp: stats.total_xp || 0,
        current_streak: stats.current_streak || 0,
      },
      today_stats: {
        lessons_completed: lessons_completed_today,
        watch_time_minutes,
        xp_earned: xp_earned_today,
      },
      week_activity,
      recent_achievements,
      active_missions,
    };

    console.log('✅ [Analytics] Dashboard сформирован');
    res.json({ success: true, data: dashboardData });
  } catch (error: any) {
    console.error('❌ [Analytics] Ошибка dashboard:', error);
    res.status(500).json({
      error: 'Ошибка получения dashboard',
      message: error.message,
    });
  }
});

// POST /api/analytics/video-session/end - завершение сессии просмотра видео + агрегация метрик
router.post('/video-session/end', async (req: Request, res: Response) => {
  try {
    const { user_id, lesson_id, session_id } = req.body;
    
    console.log('🎬 [Video Session] Завершение сессии:', { user_id, lesson_id, session_id });

    if (!user_id || !lesson_id || !session_id) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, lesson_id, session_id',
      });
    }

    // 1. Получаем все события сессии из video_analytics
    const { data: events, error: eventsError } = await adminSupabase
      .from('video_analytics')
      .select('*')
      .eq('session_id', session_id)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('❌ Ошибка получения событий:', eventsError);
      throw eventsError;
    }

    if (!events || events.length === 0) {
      console.log('ℹ️ Нет событий для сессии, пропускаем');
      return res.json({ success: true, message: 'No events found' });
    }

    console.log(`📊 Найдено событий: ${events.length}`);

    // 2. Агрегируем метрики
    let seeks_count = 0;
    let pauses_count = 0;
    let max_second_reached = 0;
    let last_position = 0;

    for (const event of events) {
      if (event.event_type === 'pause') {
        pauses_count++;
      }
      
      // Seek = резкое изменение позиции (больше 5 секунд)
      if (event.position_seconds !== undefined && event.position_seconds !== null) {
        const positionDiff = Math.abs(event.position_seconds - last_position);
        if (positionDiff > 5 && last_position > 0) {
          seeks_count++;
          console.log(`⏩ Seek обнаружен: ${last_position}s → ${event.position_seconds}s (diff: ${positionDiff}s)`);
        }
        last_position = event.position_seconds;
        max_second_reached = Math.max(max_second_reached, event.position_seconds);
      }
    }

    const session_start = events[0].created_at;
    const session_end = events[events.length - 1].created_at;
    const duration_seconds = Math.round(
      (new Date(session_end).getTime() - new Date(session_start).getTime()) / 1000
    );

    console.log(`📊 Агрегированные метрики:
      - seeks_count: ${seeks_count}
      - pauses_count: ${pauses_count}
      - max_second_reached: ${max_second_reached}s
      - duration_seconds: ${duration_seconds}s
    `);

    // 3. Получаем video_id из video_content
    const { data: videoData } = await adminSupabase
      .from('video_content')
      .select('id')
      .eq('lesson_id', lesson_id)
      .single();

    const video_id = videoData?.id || null;
    console.log(`🎥 video_id: ${video_id || 'null (видео не найдено)'}`);

    // 4. Создаем/обновляем запись в video_watch_sessions
    const sessionInsertData = {
      user_id,
      lesson_id: parseInt(lesson_id),
      video_id,
      session_start,
      session_end,
      duration_seconds,
      start_second: 0,
      end_second: max_second_reached,
      max_second_reached,
      pauses_count,
      seeks_count,
      playback_speed: 1.0,
      engagement_score: null,
      is_fully_watched: false,
    };

    console.log('💾 Сохраняем в video_watch_sessions...');

    const { data: sessionData, error: sessionError } = await adminSupabase
      .from('video_watch_sessions')
      .insert(sessionInsertData)
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Ошибка создания video_watch_session:', sessionError);
      throw sessionError;
    }

    console.log('✅ Video watch session создана:', sessionData?.id);
    console.log('🤖 AI Mentor триггеры должны сработать автоматически!');

    res.json({
      success: true,
      session: sessionData,
      metrics: { seeks_count, pauses_count, max_second_reached, duration_seconds },
    });
  } catch (error: any) {
    console.error('❌ Video session end error:', error);
    res.status(500).json({ 
      error: 'Ошибка завершения видео-сессии',
      message: error.message 
    });
  }
});

export default router;
