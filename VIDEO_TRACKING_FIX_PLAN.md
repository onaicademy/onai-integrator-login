# 📹 ПЛАН ИСПРАВЛЕНИЯ ВИДЕО-ТРЕКИНГА

## 🚨 ПРОБЛЕМА

Фронтенд отправляет события просмотра видео, но они не попадают в `video_watch_sessions`, которую использует AI Наставник.

### Текущая ситуация:
1. ✅ Фронтенд (`src/pages/Lesson.tsx`) отправляет события: `play`, `pause`, `progress`
2. ❌ Бэкенд (`backend/src/routes/analytics.ts`) сохраняет в `video_analytics` (неправильная таблица)
3. ❌ AI Mentor триггеры ждут данные в `video_watch_sessions`

---

## ✅ РЕШЕНИЕ: 2 варианта

### ВАРИАНТ 1: Агрегация на бэкенде (Рекомендуется)

**Идея:** Бэкенд агрегирует события из `video_analytics` и создает сессии в `video_watch_sessions`.

**Что делать:**
1. Добавить эндпоинт `POST /api/analytics/video-session/end` на бэкенде
2. При окончании просмотра фронтенд вызывает этот эндпоинт
3. Бэкенд:
   - Получает все события сессии из `video_analytics`
   - Подсчитывает `seeks_count`, `pauses_count`, `max_second_reached`
   - Создает запись в `video_watch_sessions`
   - Триггер AI Mentor автоматически срабатывает!

**Преимущества:**
- ✅ Не нужно менять фронтенд
- ✅ Агрегация на сервере (надежнее)
- ✅ Можно добавить ретроспективную агрегацию для старых данных

---

### ВАРИАНТ 2: Прямая отправка с фронтенда

**Идея:** Фронтенд сам подсчитывает метрики и отправляет сессию.

**Что делать:**
1. Модифицировать `src/pages/Lesson.tsx`
2. Добавить счетчики: `seekCount`, `pauseCount`, `maxSecondReached`
3. При завершении урока отправить в `video_watch_sessions` напрямую

**Недостатки:**
- ❌ Можно легко потерять данные (закрыл вкладку = данные потеряны)
- ❌ Нужно менять фронтенд

---

## 🚀 РЕКОМЕНДАЦИЯ: ВАРИАНТ 1

**План действий:**

1. **Создать эндпоинт на бэкенде** (`backend/src/routes/analytics.ts`):

```typescript
// POST /api/analytics/video-session/end
router.post('/video-session/end', async (req: Request, res: Response) => {
  try {
    const { user_id, lesson_id, session_id } = req.body;

    // 1. Получаем все события сессии из video_analytics
    const { data: events, error: eventsError } = await adminSupabase
      .from('video_analytics')
      .select('*')
      .eq('session_id', session_id)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: true });

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return res.json({ success: true, message: 'No events found' });
    }

    // 2. Агрегируем метрики
    let seeks_count = 0;
    let pauses_count = 0;
    let max_second_reached = 0;
    let last_position = 0;

    for (const event of events) {
      if (event.event_type === 'pause') pauses_count++;
      
      // Seek = резкое изменение позиции (больше 5 секунд)
      if (event.position_seconds !== undefined) {
        if (Math.abs(event.position_seconds - last_position) > 5) {
          seeks_count++;
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

    // 3. Получаем video_id из video_content
    const { data: videoData } = await adminSupabase
      .from('video_content')
      .select('id')
      .eq('lesson_id', lesson_id)
      .single();

    // 4. Создаем/обновляем запись в video_watch_sessions
    const { data: sessionData, error: sessionError } = await adminSupabase
      .from('video_watch_sessions')
      .upsert({
        user_id,
        lesson_id,
        video_id: videoData?.id || null,
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
      }, {
        onConflict: 'user_id,lesson_id,session_start',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Error creating video_watch_session:', sessionError);
      throw sessionError;
    }

    console.log('✅ Video watch session created:', sessionData);
    console.log(`📊 Metrics: seeks=${seeks_count}, pauses=${pauses_count}, max=${max_second_reached}s`);

    res.json({
      success: true,
      session: sessionData,
      metrics: { seeks_count, pauses_count, max_second_reached, duration_seconds },
    });
  } catch (error: any) {
    console.error('❌ Video session end error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

2. **Модифицировать фронтенд** (`src/pages/Lesson.tsx`):

Добавить вызов при завершении урока:

```typescript
// При завершении урока или закрытии страницы
const endVideoSession = async () => {
  if (!sessionId || !user?.id || !lessonId) return;
  
  try {
    await api.post('/api/analytics/video-session/end', {
      user_id: user.id,
      lesson_id: parseInt(lessonId),
      session_id: sessionId,
    });
    console.log('✅ Video session ended');
  } catch (error) {
    console.error('❌ Error ending video session:', error);
  }
};

// Вызывать:
// - При завершении урока (completeLesson)
// - При закрытии страницы (useEffect cleanup / beforeunload)
```

---

## 🎯 РЕЗУЛЬТАТ

После исправления:
- ✅ Все просмотры видео попадают в `video_watch_sessions`
- ✅ AI Mentor триггер `create_mentor_task_from_video_struggle()` автоматически срабатывает
- ✅ Если `seeks_count > 5` или `pauses_count > 10` → создается задача для AI Наставника
- ✅ AI Наставник получает полный контекст о проблемах студента

---

## 📋 ГОТОВНОСТЬ AI MENTOR: 70% → 90%

После этого исправления AI Mentor будет готов на **90%**. Останется только:
- Проверить на реальных данных
- Настроить пороги срабатывания триггеров
- Добавить больше типов задач





