# Perplexity Query: Best Practice для архитектуры завершения урока и разблокировки модулей

## Контекст проекта

Мы разрабатываем **Learning Management System (LMS)** на следующем стеке:

### Frontend:
- **React 18** + **TypeScript**
- **React Router v6** для навигации
- **Vite** как dev-сервер и bundler
- **Tailwind CSS** + **Framer Motion** для анимаций
- **Custom video player** (Plyr + HLS.js)
- **Custom hooks**: `useHonestVideoTracking` для отслеживания прогресса видео (правило 80%)

### Backend:
- **Node.js 20** + **Express**
- **PostgreSQL 17** через **Supabase**
- **Direct DB queries** (`pg.Pool`) для обхода PostgREST schema cache
- **ACID transactions** для целостности данных

### Архитектура БД:
```sql
-- Tripwire platform schema
CREATE TABLE tripwire_modules (
  id INTEGER PRIMARY KEY,
  title TEXT,
  description TEXT,
  is_locked BOOLEAN DEFAULT true,
  order_index INTEGER
);

CREATE TABLE tripwire_lessons (
  id INTEGER PRIMARY KEY,
  module_id INTEGER REFERENCES tripwire_modules(id),
  title TEXT,
  video_url TEXT,
  duration INTEGER, -- в секундах
  order_index INTEGER
);

CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  module_id INTEGER REFERENCES tripwire_modules(id),
  lesson_id INTEGER REFERENCES tripwire_lessons(id),
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')),
  video_progress_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id, lesson_id)
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  achievement_type TEXT, -- 'module_completed', 'first_lesson', 'certificate_earned'
  module_id INTEGER,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Текущая проблема

### Что НЕ работает:
1. **Кнопка "Завершить урок"** при клике не вызывает обработчик события
2. Запрос `POST /api/tripwire/complete` НЕ доходит до backend
3. Frontend функция `handleComplete` не выполняется (нет логов в консоли)
4. **Кнопка "Следующий модуль"** мешает UX (нужно убрать)

### Текущий код (НЕ РАБОТАЕТ):

#### Frontend (`TripwireLesson.tsx`):
```typescript
const handleComplete = async () => {
  try {
    if (!tripwireUserId) {
      console.error('❌ tripwireUserId не загружен!');
      toast({
        title: "Ошибка",
        description: "Не удалось определить пользователя. Обновите страницу.",
        variant: "destructive",
      });
      return;
    }

    console.log(`🎯 Завершаем урок ${lessonId} для пользователя ${tripwireUserId}`);

    await api.post('/api/tripwire/complete', {
      lesson_id: parseInt(lessonId!),
      tripwire_user_id: tripwireUserId,
    });
    
    setIsCompleted(true);
    
    // Confetti animation...
    
    // Navigate to main page
    setTimeout(() => {
      navigate('/tripwire');
    }, 2000);
  } catch (error: any) {
    console.error('❌ Error completing lesson:', error);
    toast({
      title: "Ошибка",
      description: error.response?.data?.error || "Не удалось завершить урок",
      variant: "destructive",
    });
  }
};

// Button JSX (упрощённо):
<Button
  onClick={handleComplete}
  disabled={!canComplete}
  className="complete-button"
>
  {isCompleted ? '✅ ЗАВЕРШЕНО' : 'ЗАВЕРШИТЬ'}
</Button>
```

#### Backend (`/api/tripwire/complete`):
```typescript
router.post('/complete', async (req, res) => {
  try {
    const { lesson_id, tripwire_user_id } = req.body;

    if (!tripwire_user_id || !lesson_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`✅ [Complete] Marking lesson ${lesson_id} as complete for user ${tripwire_user_id}`);

    // ✅ DIRECT DB QUERY (bypasses PostgREST schema cache)
    const { tripwirePool } = await import('../config/tripwire-db');
    
    const result = await tripwirePool.query(`
      INSERT INTO student_progress (
        user_id, module_id, lesson_id, status, completed_at, updated_at
      )
      VALUES (
        $1::uuid,
        CASE WHEN $2 = 67 THEN 16 WHEN $2 = 68 THEN 17 WHEN $2 = 69 THEN 18 END,
        $2::integer,
        'completed',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, module_id, lesson_id) 
      DO UPDATE SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      RETURNING *;
    `, [tripwire_user_id, lesson_id]);

    console.log(`✅ [Complete] Progress saved via Direct DB`);

    // Check if module is complete → unlock next module
    const moduleCompleteResult = await checkTripwireCompletion(tripwire_user_id, module_id);

    res.json({ 
      success: true, 
      message: 'Lesson marked as complete', 
      progress: result.rows[0],
      ...moduleCompleteResult
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Желаемое поведение (Best Practice)

### UX Flow:
1. **Студент смотрит видео** → hook `useHonestVideoTracking` отслеживает прогресс
2. **При достижении 80% просмотра** → кнопка "ЗАВЕРШИТЬ" становится активной
3. **Клик на "ЗАВЕРШИТЬ"**:
   - ✅ Сохранение прогресса в БД (`student_progress` → status='completed')
   - ✅ Проверка: завершены ли ВСЕ уроки модуля?
   - ✅ Если да → разблокировка следующего модуля + создание achievement
   - ✅ Confetti анимация (2-3 сек)
   - ✅ Redirect на главную страницу (`/tripwire`)
   - ✅ На главной → показ **Module Unlock Animation** (если модуль разблокирован)
4. **"Следующий модуль" кнопка** → УДАЛИТЬ (не нужна)

### Backend Logic:
```typescript
// Pseudo-code
async function completeLesson(userId, lessonId) {
  const transaction = await db.beginTransaction();
  
  try {
    // 1. Mark lesson as completed
    await db.query(`
      INSERT INTO student_progress (user_id, lesson_id, status, completed_at)
      VALUES ($1, $2, 'completed', NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET status='completed'
    `);
    
    // 2. Check if ALL lessons in current module are completed
    const moduleId = await getModuleIdByLessonId(lessonId);
    const allLessons = await getLessonsByModuleId(moduleId);
    const completedLessons = await getCompletedLessons(userId, moduleId);
    
    if (allLessons.length === completedLessons.length) {
      // 3. Unlock NEXT module
      const nextModuleId = moduleId + 1;
      await db.query(`
        UPDATE tripwire_modules SET is_locked = false WHERE id = $1
      `, [nextModuleId]);
      
      // 4. Create achievement
      await db.query(`
        INSERT INTO user_achievements (user_id, achievement_type, module_id)
        VALUES ($1, 'module_completed', $2)
      `, [userId, moduleId]);
      
      await transaction.commit();
      
      return { 
        moduleCompleted: true, 
        unlockedModuleId: nextModuleId,
        achievement: true
      };
    }
    
    await transaction.commit();
    return { moduleCompleted: false };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

## Вопросы для Perplexity

### 1. React Event Handling Best Practices:
- **Почему `onClick` handler может НЕ срабатывать в React 18?**
- Есть ли конфликты между `Button` из UI library (shadcn/ui) и custom event handlers?
- Как правильно дебажить "silent failures" в React event handlers?
- Нужно ли использовать `useCallback` для `handleComplete`?

### 2. Video Completion Flow Architecture:
- **Best practice для LMS систем**: как правильно архитектурировать "lesson completion"?
- Должна ли кнопка "Завершить" быть частью video player или отдельным компонентом?
- Как правильно обрабатывать race conditions (пользователь кликает дважды)?
- Нужен ли optimistic UI update или ждать ответа от backend?

### 3. Module Unlock Logic:
- **Где лучше проверять "все уроки завершены"**: frontend или backend?
- Как правильно использовать ACID transactions для атомарного unlock?
- Должен ли unlock быть синхронным (в том же запросе) или асинхронным (через background job)?
- Как обрабатывать edge cases (например, одновременное завершение нескольких уроков)?

### 4. Navigation & Redirects:
- **Best practice для post-action redirects в React Router v6**?
- Должен ли redirect быть немедленным или после анимации (setTimeout)?
- Как правильно передавать state между роутами (например, "показать Module Unlock Animation")?
- Нужно ли использовать `navigate(path, { state: {...} })` или Context API?

### 5. Error Handling & UX:
- Как обрабатывать случай, когда backend не отвечает?
- Должна ли кнопка показывать loading state?
- Как правильно использовать toast notifications для success/error?
- Нужно ли сохранять "незавершённый урок" в localStorage для retry?

### 6. Database Schema Optimization:
- Наша схема `student_progress` оптимальна для LMS?
- Нужна ли отдельная таблица для module unlocks или достаточно `is_locked` boolean?
- Как правильно индексировать для быстрых запросов "проверка завершения модуля"?
- Должна ли `video_progress_seconds` быть в той же таблице или отдельно?

### 7. PostgREST Schema Cache:
- **Почему Supabase PostgREST может не видеть новые таблицы/изменения?**
- Как правильно обходить schema cache: Direct DB queries или `NOTIFY pgrst, 'reload schema'`?
- Есть ли недостатки у Direct DB queries через `pg.Pool`?
- Как обеспечить type safety при использовании raw SQL queries?

### 8. Performance & Scalability:
- Если у нас 1000+ студентов одновременно завершают уроки, выдержит ли такая архитектура?
- Нужен ли caching для "список завершённых уроков"?
- Как оптимизировать запрос "проверка завершения всех уроков модуля"?
- Нужна ли очередь (Redis/Bull) для обработки completions?

---

## Технические ограничения

1. **Supabase Hosted** (не self-hosted) → нет прямого доступа к PostgreSQL конфигу
2. **PostgREST schema cache** → требует обхода через Direct DB или `NOTIFY`
3. **React 18 Strict Mode** → может вызывать двойные рендеры
4. **Vite HMR** → иногда не обновляет event handlers
5. **Production build** → minification может ломать некоторые patterns

---

## Ожидаемый output от Perplexity

1. **Детальная пошаговая архитектура** с code examples (TypeScript)
2. **Common pitfalls** и как их избежать
3. **Best practices** из реальных LMS систем (Udemy, Coursera, Khan Academy)
4. **Performance benchmarks** (если доступны)
5. **Security considerations** (например, можно ли пользователю "обмануть" систему?)
6. **Testing strategy** (как правильно тестировать lesson completion flow?)
7. **Конкретные решения** для нашей проблемы: почему `onClick` не срабатывает?

---

## Дополнительный контекст

### Что УЖЕ работает:
- ✅ Video tracking (прогресс сохраняется в БД)
- ✅ Auth через Supabase
- ✅ Direct DB queries для других endpoints
- ✅ Module unlock animation компонент готов
- ✅ Achievement modal компонент готов

### Что НЕ работает:
- ❌ onClick handler на кнопке "Завершить"
- ❌ Redirect после completion
- ❌ Module unlock после завершения всех уроков

---

## Запрос для Perplexity (финальная версия):

**"I'm building a Learning Management System (LMS) with React 18, TypeScript, Node.js, Express, and PostgreSQL via Supabase. I need architectural best practices for implementing a 'Complete Lesson' flow that includes:**

1. **Video progress tracking** (80% rule before allowing completion)
2. **Atomic lesson completion** with database transaction
3. **Automatic module unlock** when all lessons in a module are completed
4. **Achievement system** triggered on module completion
5. **Post-completion redirect** to main page with unlock animation

**Current issues:**
- `onClick` handler on 'Complete' button doesn't fire (no logs, no API call)
- Need to remove 'Next Module' button (bad UX)
- Unsure about transaction boundaries for module unlock
- Concerns about PostgREST schema cache causing stale data

**Questions:**
- What's the industry standard architecture for LMS lesson completion?
- How do platforms like Udemy/Coursera handle module unlocks?
- Should completion check (all lessons done) happen on frontend or backend?
- Best practices for React event handlers that involve async operations?
- How to handle race conditions (double-click on complete button)?
- Database schema optimization for fast 'module completion check' queries?
- Security: how to prevent users from bypassing completion requirements?

**Please provide:**
- Step-by-step implementation guide with TypeScript code examples
- Common pitfalls and how to avoid them
- Performance considerations for 1000+ concurrent users
- Testing strategy for this flow

**Tech stack details:** React 18 + Vite, Express, PostgreSQL 17, Supabase (hosted), Direct DB queries via pg.Pool to bypass PostgREST cache."

---

## Примечания для разработчика

После получения ответа от Perplexity:
1. Применить рекомендации по архитектуре
2. Исправить проблему с onClick handler
3. Убрать кнопку "Следующий модуль"
4. Протестировать полный flow: видео → завершение → unlock → redirect → анимация
5. Добавить error handling и loading states
6. Написать integration тесты

---

## Связанные файлы

- `/Users/miso/onai-integrator-login/src/pages/tripwire/TripwireLesson.tsx` - Frontend компонент урока
- `/Users/miso/onai-integrator-login/backend/src/routes/tripwire-lessons.ts` - Backend API
- `/Users/miso/onai-integrator-login/src/hooks/useHonestVideoTracking.ts` - Hook для video tracking
- `/Users/miso/onai-integrator-login/src/components/tripwire/ModuleUnlockAnimation.tsx` - Анимация unlock
- `/Users/miso/onai-integrator-login/backend/src/config/tripwire-db.ts` - Direct DB connection pool
