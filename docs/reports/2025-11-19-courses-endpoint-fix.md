# 🔧 ОТЧЁТ: Исправление endpoint courses

**Дата:** 2025-11-19  
**Время:** ~09:10  
**Статус:** ✅ ИСПРАВЛЕНО В КОДЕ, ⚠️ ТРЕБУЕТСЯ ПЕРЕЗАПУСК BACKEND

---

## 🔧 ВЫПОЛНЕННЫЕ ИЗМЕНЕНИЯ

### Файл: `backend/src/routes/courses.ts`

**ПРОБЛЕМА:**
- `GET /api/courses/1` возвращает 404 "Курс не найден"
- Та же проблема, что была с modules — неправильный синтаксис Supabase для сортировки foreign tables
- Фильтрация архивных модулей/уроков в запросе может ломать весь запрос

**ИСПРАВЛЕНО:**

**БЫЛО (строки 43-61):**
```typescript
const { data: course, error } = await supabase
  .from('courses')
  .select(`
    *,
    modules!modules_course_id_fkey(
      *,
      lessons!lessons_module_id_fkey(
        *,
        video_content (*),
        lesson_materials (*)
      )
    )
  `)
  .eq('id', parseInt(id))
  .eq('modules.is_archived', false) // ❌ Может ломать запрос
  .eq('modules.lessons.is_archived', false) // ❌ Может ломать запрос
  .order('modules.order_index', { foreignTable: 'modules', ascending: true }) // ❌ ОШИБКА
  .order('modules.lessons.order_index', { foreignTable: 'modules.lessons', ascending: true }) // ❌ ОШИБКА
  .single();
```

**СТАЛО (строки 43-95):**
```typescript
const { data: course, error } = await supabase
  .from('courses')
  .select(`
    *,
    modules!modules_course_id_fkey(
      *,
      lessons!lessons_module_id_fkey(
        *,
        video_content (*),
        lesson_materials (*)
      )
    )
  `)
  .eq('id', parseInt(id))
  .single(); // ✅ Убрана фильтрация и сортировка из запроса

if (error) {
  console.error('Get course error:', error);
  return res.status(404).json({ error: 'Курс не найден' });
}

if (!course) {
  return res.status(404).json({ error: 'Курс не найден' });
}

// ✅ Фильтруем архивные модули и уроки в коде
if (course.modules && Array.isArray(course.modules)) {
  // Фильтруем архивные модули
  course.modules = course.modules.filter((module: any) => !module.is_archived);
  
  // Сортируем модули по order_index
  course.modules = course.modules.sort((a: any, b: any) => {
    const orderA = a.order_index ?? a.id ?? 0;
    const orderB = b.order_index ?? b.id ?? 0;
    return orderA - orderB;
  });
  
  // Фильтруем и сортируем уроки внутри каждого модуля
  course.modules.forEach((module: any) => {
    if (module.lessons && Array.isArray(module.lessons)) {
      // Фильтруем архивные уроки
      module.lessons = module.lessons.filter((lesson: any) => !lesson.is_archived);
      // Сортируем по order_index
      module.lessons = module.lessons.sort((a: any, b: any) => {
        const orderA = a.order_index ?? a.id ?? 0;
        const orderB = b.order_index ?? b.id ?? 0;
        return orderA - orderB;
      });
    }
  });
  
  console.log('✅ Модули отсортированы по order_index:', course.modules.map((m: any) => ({ id: m.id, order_index: m.order_index, title: m.title })));
}
```

**Изменения:**
1. ✅ Убрана фильтрация архивных из Supabase запроса (`.eq('modules.is_archived', false)`)
2. ✅ Убрана сортировка из Supabase запроса (`.order('modules.order_index', ...)`)
3. ✅ Добавлена фильтрация архивных в коде после получения данных
4. ✅ Добавлена сортировка в коде после получения данных
5. ✅ Используется тот же подход, что и в `GET /api/modules/:id`

---

## 📊 РЕЗУЛЬТАТЫ

### 1. ✅ Сборка
- **Команда:** `cd C:\onai-integrator-login\backend && npm run build`
- **Результат:** ✅ Успешно, без ошибок
- **Статус:** TypeScript компиляция прошла успешно

### 2. ⚠️ Тест endpoint
- **Команда:** `curl http://localhost:3000/api/courses/1`
- **Результат:** ❌ Все еще ошибка (backend не перезапущен)
- **Ошибка:** `{"error":"Курс не найден"}`
- **Причина:** Backend использует старый код из памяти

---

## 🔧 РЕШЕНИЕ

### Требуется перезапуск backend:

1. **Остановить текущий процесс:**
   - В терминале, где запущен backend, нажмите `Ctrl+C`

2. **Запустить заново:**
   ```cmd
   cd C:\onai-integrator-login\backend
   npm start
   ```

3. **Проверить endpoints:**
   ```cmd
   curl http://localhost:3000/api/courses/1
   curl http://localhost:3000/api/modules/2
   ```

**Ожидаемый результат:**
```json
{
  "course": {
    "id": 1,
    "name": "Интегратор 2.0",
    "modules": [
      // отсортированные по order_index, без архивных
    ]
  }
}
```

---

## 📝 ИТОГОВЫЙ КОД

### Файл: `backend/src/routes/courses.ts` (строки 43-97)

```typescript
const { data: course, error } = await supabase
  .from('courses')
  .select(`
    *,
    modules!modules_course_id_fkey(
      *,
      lessons!lessons_module_id_fkey(
        *,
        video_content (*),
        lesson_materials (*)
      )
    )
  `)
  .eq('id', parseInt(id))
  .single();

if (error) {
  console.error('Get course error:', error);
  return res.status(404).json({ error: 'Курс не найден' });
}

if (!course) {
  return res.status(404).json({ error: 'Курс не найден' });
}

// ✅ Фильтруем архивные модули и уроки
if (course.modules && Array.isArray(course.modules)) {
  // Фильтруем архивные модули
  course.modules = course.modules.filter((module: any) => !module.is_archived);
  
  // Сортируем модули по order_index
  course.modules = course.modules.sort((a: any, b: any) => {
    const orderA = a.order_index ?? a.id ?? 0;
    const orderB = b.order_index ?? b.id ?? 0;
    return orderA - orderB;
  });
  
  // Фильтруем и сортируем уроки внутри каждого модуля
  course.modules.forEach((module: any) => {
    if (module.lessons && Array.isArray(module.lessons)) {
      // Фильтруем архивные уроки
      module.lessons = module.lessons.filter((lesson: any) => !lesson.is_archived);
      // Сортируем по order_index
      module.lessons = module.lessons.sort((a: any, b: any) => {
        const orderA = a.order_index ?? a.id ?? 0;
        const orderB = b.order_index ?? b.id ?? 0;
        return orderA - orderB;
      });
    }
  });
  
  console.log('✅ Модули отсортированы по order_index:', course.modules.map((m: any) => ({ id: m.id, order_index: m.order_index, title: m.title })));
}

res.json({ course });
```

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- `backend/src/routes/courses.ts` — исправленный код
- `backend/dist/routes/courses.js` — скомпилированный код
- `backend/src/routes/modules.ts` — аналогичное исправление (строки 18-45)

---

## ✅ ИТОГ

### Исправлено:
1. ✅ Убрана проблемная сортировка из Supabase запроса
2. ✅ Убрана проблемная фильтрация из Supabase запроса
3. ✅ Добавлена фильтрация и сортировка в коде
4. ✅ Используется тот же подход, что и в modules endpoint

### Требуется:
- ⏳ Перезапуск backend для применения изменений

---

**Отчёт создан:** 2025-11-19  
**Автор:** Cursor AI Assistant  
**Статус:** ✅ Код исправлен, ⚠️ Требуется перезапуск backend


