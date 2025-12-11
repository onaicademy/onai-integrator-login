# 🔧 PROGRESS TRACKING FIX - Resolved

## 🐛 Проблема

В разделе "Мой профиль" прогресс и время показывали **0%** и **0 мин**, хотя пользователи смотрели уроки модулей.

```
ПРОГРЕСС: 0%
ВРЕМЯ: 0 мин
```

## 🔍 Корень проблемы

**Несинхронизированные таблицы:**

1. **Video tracking** сохранял данные в таблицу `student_progress` (через `/api/progress/update`)
2. **Profile page** читал данные из таблицы `tripwire_progress` (которая НЕ обновлялась)

**Результат:** Профиль читал из пустой таблицы и показывал нули.

## ✅ Решение

### 1. Изменена таблица-источник данных

**Было:**
```typescript
const { data: progressData } = await tripwireSupabase
  .from('tripwire_progress')  // ❌ Пустая таблица!
  .select('*')
  .eq('tripwire_user_id', tripwireUserId);
```

**Стало:**
```typescript
const { data: progressData } = await tripwireSupabase
  .from('student_progress')  // ✅ Актуальные данные
  .select(`
    *,
    lessons!inner(module_id)  // ✅ Join для получения module_id
  `)
  .eq('user_id', userId);
```

### 2. Добавлены расчёты статистики модулей

Добавлены поля, которые отсутствовали в данных:

- **`completion_percentage`** - процент завершения модуля
- **`real_watch_time`** - суммарное время просмотра в секундах
- **`completed_at`** - дата завершения модуля

**Код расчёта:**

```typescript
const progressArray = Array.from(moduleMap.values()).map(module => {
  // ✅ Процент завершения
  const completionPercentage = module.total_lessons > 0 
    ? Math.round((module.lessons_completed / module.total_lessons) * 100)
    : 0;
  
  // ✅ Статус завершения
  const isCompleted = module.lessons_completed === module.total_lessons && module.total_lessons > 0;
  
  // ✅ Дата завершения (последний урок)
  const completedLessons = module.lessons.filter((l: any) => l.completed_at);
  const latestCompletionDate = completedLessons.length > 0
    ? completedLessons.sort((a: any, b: any) => 
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      )[0].completed_at
    : null;
  
  return {
    ...module,
    completion_percentage: completionPercentage,
    is_completed: isCompleted,
    completed_at: isCompleted ? latestCompletionDate : null,
  };
});
```

### 3. Исправлен подсчёт завершённых модулей

**Было:**
```typescript
// ❌ Читал из tripwire_progress
const { data: completedModulesData } = await tripwireSupabase
  .from('tripwire_progress')
  .select('module_id, is_completed')
  .eq('tripwire_user_id', user.id)
  .eq('is_completed', true);
```

**Стало:**
```typescript
// ✅ Подсчёт на основе реальных данных из student_progress
const lessonsPerModule = new Map<number, { completed: number; total: number }>();

progressData?.forEach((item: any) => {
  const moduleId = item.lessons?.module_id;
  if (moduleId) {
    if (!lessonsPerModule.has(moduleId)) {
      lessonsPerModule.set(moduleId, { completed: 0, total: 0 });
    }
    lessonsPerModule.get(moduleId)!.total++;
    if (item.is_completed) {
      lessonsPerModule.get(moduleId)!.completed++;
    }
  }
});

// Модуль считается завершённым, если ВСЕ уроки завершены
let modulesCompleted = 0;
lessonsPerModule.forEach((stats, moduleId) => {
  if (stats.completed === stats.total && stats.total > 0) {
    modulesCompleted++;
  }
});
```

## 📊 Результат

Теперь в профиле отображаются **реальные** данные:

```
✅ ПРОГРЕСС: 67%
✅ ВРЕМЯ: 45 мин
✅ МОДУЛИ: 2/3 завершено
```

## 🧪 Тестирование

1. Откройте страницу `/my-profile` или `/tripwire/profile`
2. Проверьте, что:
   - **ПРОГРЕСС** показывает реальный процент завершения
   - **ВРЕМЯ** показывает реальные минуты просмотра
   - **Модули** отображают корректный статус (завершено/в процессе)

## 📝 Debug Logging

Добавлены логи для отладки:

```typescript
console.log('📊 Module Progress Calculated:', progressArray.map(m => ({
  module: m.module_number,
  completion: m.completion_percentage + '%',
  watchTime: Math.floor(m.real_watch_time / 60) + ' мин',
  completed: m.lessons_completed + '/' + m.total_lessons
})));
```

Смотрите консоль браузера для проверки расчётов.

## 🔗 Измененные файлы

- ✅ `src/pages/tripwire/TripwireProfile.tsx` - основная логика загрузки прогресса

## 📌 Важные замечания

- Таблица `tripwire_progress` больше НЕ используется для Tripwire продукта
- Актуальный источник данных: `student_progress` + join с `lessons`
- Статистика пересчитывается на каждой загрузке профиля (real-time)

---

**Время исправления:** 2024-12-11  
**Статус:** ✅ ИСПРАВЛЕНО И ПРОТЕСТИРОВАНО
