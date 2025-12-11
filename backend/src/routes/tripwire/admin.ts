import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../../middleware/auth';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire';

const router = Router();

// ✅ USE TRIPWIRE DATABASE, NOT MAIN!
const supabase = tripwireAdminSupabase;

/**
 * 🎯 GET /api/tripwire/admin/stats
 * Dashboard stats - ONLY TRIPWIRE STUDENTS
 * ONLY for admin role (saint@onaiacademy.kz)
 */
router.get('/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить ВСЕХ студентов Tripwire из tripwire_user_profile
    const { data: tripwireProfiles, error: profilesError } = await supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules');

    if (profilesError) throw profilesError;

    const totalStudents = tripwireProfiles?.length || 0;

    // ✅ ШАГ 2: Получить user_id всех Tripwire студентов
    const tripwireUserIds = tripwireProfiles?.map(p => p.user_id) || [];

    if (tripwireUserIds.length === 0) {
      return res.json({
        total_students: 0,
        active_students: 0,
        completed_students: 0,
        completion_rate: 0,
        total_transcriptions: 0,
        transcriptions_completed: 0,
        total_costs: 0,
        monthly_costs: 0
      });
    }

    // ✅ ШАГ 3: Активные студенты (логинились за последние 7 дней)
    // NOTE: last_sign_in_at находится в auth.users, но мы не можем напрямую к ней обращаться
    // Используем обходной путь через created_at или просто считаем всех как потенциально активных
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Получаем пользователей из public.users
    const { data: publicUsers } = await supabase
      .from('users')
      .select('id, created_at')
      .in('id', tripwireUserIds);

    // Временно считаем активными тех, кто создан за последние 7 дней
    // TODO: добавить поле last_activity_at в public.users для точного трекинга
    const activeStudents = publicUsers?.filter(u => {
      const createdAt = new Date(u.created_at);
      return createdAt >= sevenDaysAgo;
    }).length || 0;

    // ✅ ШАГ 4: Завершили ВСЕ модули Tripwire
    const completedStudents = tripwireProfiles?.filter(p => 
      p.modules_completed >= p.total_modules
    ).length || 0;

    // ✅ ШАГ 5: Completion rate
    const completionRate = totalStudents > 0 
      ? (completedStudents / totalStudents) * 100 
      : 0;

    // ✅ ШАГ 6: Транскрибации (получить video_id из уроков Tripwire)
    // Tripwire курс ID=13, модули ID=16,17,18
    const { data: tripwireModulesForLessons } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', 13); // Tripwire course ID
    
    const tripwireModuleIdsForLessons = tripwireModulesForLessons?.map((m: any) => m.id) || [16, 17, 18];
    
    const { data: lessons } = await supabase
      .from('lessons')
      .select('bunny_video_id')
      .in('module_id', tripwireModuleIdsForLessons) // ✅ Все модули Tripwire
      .not('bunny_video_id', 'is', null);

    const videoIds = lessons?.map(l => l.bunny_video_id).filter(Boolean) || [];

    let totalTranscriptions = 0;
    let completedTranscriptions = 0;

    if (videoIds.length > 0) {
      // ✅ Получаем данные и считаем на клиенте (надежнее чем count)
      const { data: allTranscriptions } = await supabase
        .from('video_transcriptions')
        .select('video_id, status')
        .in('video_id', videoIds);

      totalTranscriptions = allTranscriptions?.length || 0;
      completedTranscriptions = allTranscriptions?.filter(t => t.status === 'completed').length || 0;
    }

    // ✅ ШАГ 7: Затраты из ОТДЕЛЬНОЙ таблицы tripwire_ai_costs
    // Используем tripwire_ai_costs (отдельный трекинг для Tripwire)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    // 7.1: Затраты за текущий месяц
    const { data: costsMonth } = await supabase
      .from('tripwire_ai_costs')
      .select('cost_usd')
      .gte('created_at', firstDayOfMonth.toISOString());

    // 7.2: Все затраты
    const { data: costsAll } = await supabase
      .from('tripwire_ai_costs')
      .select('cost_usd');

    const monthlyCosts = costsMonth?.reduce((sum, row) => 
      sum + (Number(row.cost_usd) || 0), 0
    ) || 0;

    const totalCosts = costsAll?.reduce((sum, row) => 
      sum + (Number(row.cost_usd) || 0), 0
    ) || 0;

    // ✅ ОТВЕТ
    res.json({
      total_students: totalStudents,
      active_students: activeStudents,
      completed_students: completedStudents,
      completion_rate: completionRate,
      total_transcriptions: totalTranscriptions,
      transcriptions_completed: completedTranscriptions,
      total_costs: totalCosts,
      monthly_costs: monthlyCosts
    });
  } catch (error: any) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🎯 GET /api/tripwire/admin/students
 * List ONLY TRIPWIRE students with their progress
 * ONLY for admin role
 */
router.get('/students', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить всех студентов Tripwire из tripwire_user_profile
    const { data: tripwireProfiles, error: profileError } = await supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules, completion_percentage, created_at');

    if (profileError) throw profileError;

    if (!tripwireProfiles || tripwireProfiles.length === 0) {
      return res.json({ students: [] });
    }

    // ✅ ШАГ 2: Получить информацию о пользователях
    const userIds = tripwireProfiles.map(p => p.user_id);

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .in('id', userIds)
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // ✅ ШАГ 3: Объединить данные
    const studentsWithProgress = users?.map(user => {
      const profile = tripwireProfiles.find(p => p.user_id === user.id);
      
      return {
        ...user,
        total_modules: profile?.total_modules || 0,
        completed_modules: profile?.modules_completed || 0,
        progress_percent: Math.round(profile?.completion_percentage || 0),
        enrolled_at: profile?.created_at
      };
    }) || [];

    res.json({ students: studentsWithProgress });
  } catch (error: any) {
    console.error('❌ Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🎯 GET /api/tripwire/admin/costs
 * AI costs breakdown - ONLY TRIPWIRE STUDENTS
 * ONLY for admin role
 */
router.get('/costs', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить затраты из ОТДЕЛЬНОЙ таблицы tripwire_ai_costs
    // Эта таблица содержит ТОЛЬКО затраты Tripwire:
    // - curator_chat (GPT-4o в AI Кураторе Tripwire)
    // - curator_whisper (Whisper для голосовых сообщений в кураторе)
    // - lesson_transcription (Groq Whisper для транскрибации видео уроков)
    
    const { data: costs, error } = await supabase
      .from('tripwire_ai_costs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // ✅ ШАГ 2: Группировка по типу затрат
    const byCostType = (costs || []).reduce((acc, cost) => {
      const type = cost.cost_type || 'unknown';
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0 };
      }
      acc[type].total += Number(cost.cost_usd) || 0;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // ✅ ШАГ 3: Группировка по модели
    const byModel = (costs || []).reduce((acc, cost) => {
      const model = cost.model || 'unknown';
      if (!acc[model]) {
        acc[model] = { total: 0, count: 0 };
      }
      acc[model].total += Number(cost.cost_usd) || 0;
      acc[model].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // ✅ ШАГ 4: Группировка по сервису (openai, groq)
    const byService = (costs || []).reduce((acc, cost) => {
      const service = cost.service || 'unknown';
      if (!acc[service]) {
        acc[service] = { total: 0, count: 0 };
      }
      acc[service].total += Number(cost.cost_usd) || 0;
      acc[service].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // ✅ ШАГ 5: Общая сумма
    const totalCost = (costs || []).reduce((sum, row) => 
      sum + (Number(row.cost_usd) || 0), 0
    );

    // ✅ ШАГ 6: Уникальные студенты
    const uniqueStudents = [...new Set((costs || []).map(c => c.user_id))];

    // ✅ ШАГ 7: Форматируем данные для ответа
    const formattedCosts = (costs || []).map(cost => ({
      id: cost.id,
      user_id: cost.user_id,
      cost_type: cost.cost_type, // curator_chat | curator_whisper | lesson_transcription
      service: cost.service, // openai | groq
      model: cost.model,
      tokens_used: cost.tokens_used || 0,
      cost_usd: Number(cost.cost_usd) || 0,
      metadata: cost.metadata || {},
      created_at: cost.created_at
    }));

    res.json({
      costs: formattedCosts,
      by_cost_type: byCostType, // curator_chat, curator_whisper, lesson_transcription
      by_service: byService, // openai, groq
      by_model: byModel, // gpt-4o, whisper-1, whisper-large-v3
      total: totalCost,
      total_students: uniqueStudents.length
    });
  } catch (error: any) {
    console.error('❌ Error fetching Tripwire AI costs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🎯 GET /api/tripwire/admin/funnel
 * Conversion funnel analytics - ONLY TRIPWIRE STUDENTS
 * ONLY for admin role
 */
router.get('/funnel', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // ✅ ШАГ 1: Получить всех студентов Tripwire
    const { data: tripwireProfiles } = await supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules');

    const totalEnrolled = tripwireProfiles?.length || 0;

    if (totalEnrolled === 0) {
      return res.json({
        funnel: [],
        total_enrolled: 0
      });
    }

    // ✅ ШАГ 2: Получить модули Tripwire (module_id=1 из курса 4)
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title')
      .eq('id', 1)
      .order('order_index', { ascending: true });

    if (!modules || modules.length === 0) {
      // Fallback: если модулей нет, создаем базовую воронку
      const studentsStarted = tripwireProfiles?.filter(p => p.modules_completed > 0).length || 0;
      const studentsCompleted = tripwireProfiles?.filter(p => 
        p.modules_completed >= p.total_modules
      ).length || 0;

      return res.json({
        funnel: [
          {
            step: 'Enrolled',
            label: 'Записались',
            count: totalEnrolled,
            percentage: 100,
            conversion: 100
          },
          {
            step: 'Started',
            label: 'Начали обучение',
            count: studentsStarted,
            percentage: (studentsStarted / totalEnrolled) * 100,
            conversion: (studentsStarted / totalEnrolled) * 100
          },
          {
            step: 'Completed',
            label: 'Завершили',
            count: studentsCompleted,
            percentage: (studentsCompleted / totalEnrolled) * 100,
            conversion: studentsStarted > 0 ? (studentsCompleted / studentsStarted) * 100 : 0
          }
        ],
        total_enrolled: totalEnrolled
      });
    }

    // ✅ ШАГ 3: Построить воронку на основе количества завершенных модулей
    const funnel = [];
    
    // Шаг 1: Записались (enrolled)
    funnel.push({
      step: 'Enrolled',
      label: 'Записались на курс',
      count: totalEnrolled,
      percentage: 100,
      conversion: 100
    });

    // Шаг 2: Начали (хотя бы 1 модуль начат)
    const studentsStarted = tripwireProfiles?.filter(p => p.modules_completed > 0).length || 0;
    funnel.push({
      step: 'Started',
      label: 'Начали обучение',
      count: studentsStarted,
      percentage: (studentsStarted / totalEnrolled) * 100,
      conversion: (studentsStarted / totalEnrolled) * 100
    });

    // Шаг 3-N: По каждому модулю
    for (let i = 1; i <= 3; i++) {
      const studentsCompletedModule = tripwireProfiles?.filter(p => 
        p.modules_completed >= i
      ).length || 0;

      const prevCount = i === 1 ? studentsStarted : 
        (tripwireProfiles?.filter(p => p.modules_completed >= (i - 1)).length || 0);

      funnel.push({
        step: `Module${i}`,
        label: `Модуль ${i} завершен`,
        count: studentsCompletedModule,
        percentage: (studentsCompletedModule / totalEnrolled) * 100,
        conversion: prevCount > 0 ? (studentsCompletedModule / prevCount) * 100 : 0
      });
    }

    // Последний шаг: Полностью завершили
    const studentsCompleted = tripwireProfiles?.filter(p => 
      p.modules_completed >= p.total_modules
    ).length || 0;
    
    funnel.push({
      step: 'FullyCompleted',
      label: 'Получили сертификат',
      count: studentsCompleted,
      percentage: (studentsCompleted / totalEnrolled) * 100,
      conversion: studentsStarted > 0 ? (studentsCompleted / studentsStarted) * 100 : 0
    });

    res.json({
      funnel,
      total_enrolled: totalEnrolled
    });
  } catch (error: any) {
    console.error('❌ Error fetching funnel:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


