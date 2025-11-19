# 📚 ДОКУМЕНТАЦИЯ: РОУТИНГ, ПОРЯДОК И ПРАВА ДОСТУПА

**Дата:** 2025-11-19  
**Версия:** 2.0  
**Статус:** ✅ АКТУАЛЬНО

---

## 🎯 ОБЗОР

Документация описывает:
- Структуру роутинга модулей и уроков
- Использование `order_index` для сортировки
- Права доступа (админ vs студент)
- Структуру данных в Supabase
- API endpoints

---

## 🗺️ РОУТИНГ

### Frontend Routes (React Router v6)

```typescript
// App.tsx
<Route path="/course/:id" element={<Course />} />
<Route path="/course/:id/module/:moduleId" element={<Module />} />
<Route path="/course/:id/module/:moduleId/lesson/:lessonId" element={<Lesson />} />
```

### Параметры маршрутов

- `:id` - ID курса из таблицы `courses` (integer)
- `:moduleId` - ID модуля из таблицы `modules` (integer)
- `:lessonId` - ID урока из таблицы `lessons` (integer)

**⚠️ ВАЖНО:** Используются **реальные ID из Supabase**, а не индексы массива или порядковые номера!

### Навигация

```typescript
// Переход к модулю
navigate(`/course/${courseId}/module/${moduleId}`);

// Переход к уроку
navigate(`/course/${courseId}/module/${moduleId}/lesson/${lessonId}`);
```

---

## 📊 СТРУКТУРА ДАННЫХ В SUPABASE

### Таблица `courses`

```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица `modules`

```sql
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,  -- ✅ Для сортировки!
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Поля:**
- `id` - уникальный идентификатор модуля (используется в роутинге)
- `course_id` - связь с курсом
- `title` - название модуля
- `description` - описание модуля
- `order_index` - порядковый номер для сортировки (0, 1, 2, ...)
- `created_at`, `updated_at` - временные метки

### Таблица `lessons`

```sql
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,  -- ✅ Для сортировки!
  video_url VARCHAR(500),
  video_duration INTEGER,  -- в секундах
  duration_minutes INTEGER,  -- в минутах
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Поля:**
- `id` - уникальный идентификатор урока (используется в роутинге)
- `module_id` - связь с модулем
- `title` - название урока
- `description` - описание урока
- `order_index` - порядковый номер для сортировки (0, 1, 2, ...)
- `video_url` - URL видео
- `video_duration` - длительность видео в секундах
- `duration_minutes` - длительность в минутах
- `created_at`, `updated_at` - временные метки

---

## 🔄 ПОРЯДОК МОДУЛЕЙ И УРОКОВ

### Сортировка по `order_index`

**Backend API:**
```typescript
// GET /api/modules/:courseId
.order('order_index', { ascending: true })

// GET /api/lessons?module_id=X
.order('order_index', { ascending: true })
```

**Frontend:**
```typescript
// Дополнительная сортировка на клиенте (на случай если API не отсортировал)
const sortedModules = [...modules].sort((a, b) => {
  const orderA = a.order_index ?? a.id ?? 0;
  const orderB = b.order_index ?? b.id ?? 0;
  return orderA - orderB;
});
```

### Drag & Drop - изменение порядка

**Frontend (Course.tsx):**
```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  // 1. Оптимистичное обновление UI
  const reorderedModules = arrayMove(apiModules, oldIndex, newIndex).map(
    (module, idx) => ({
      ...module,
      order_index: idx,
    })
  );
  setApiModules(reorderedModules);

  // 2. Отправка на сервер
  await api.put('/api/modules/reorder', {
    modules: reorderedModules.map((m, idx) => ({
      id: m.id,
      order_index: idx,
    })),
  });
};
```

**Backend (modules.ts):**
```typescript
// PUT /api/modules/reorder
router.put('/reorder', async (req: Request, res: Response) => {
  const { modules } = req.body; // [{ id: 1, order_index: 0 }, ...]
  
  await Promise.all(
    modules.map(async (module) => {
      await supabase
        .from('modules')
        .update({ order_index: module.order_index })
        .eq('id', module.id);
    })
  );
});
```

**Аналогично для уроков:** `/api/lessons/reorder`

---

## 🔐 ПРАВА ДОСТУПА

### Проверка роли пользователя

```typescript
const { userRole } = useAuth();
const isAdmin = userRole === 'admin';
```

### Админ-функции (только для `isAdmin === true`)

#### Course.tsx:
- ✅ Кнопка "Добавить модуль" - `{isAdmin && <Button>...}`
- ✅ Кнопка удаления модуля - `{isAdmin && <Button>...}`
- ✅ Drag & Drop для модулей - `{isAdmin && <DndContext>...}`
- ✅ Диалог редактирования модуля - `{isAdmin && <ModuleEditDialog>...}`

#### Module.tsx:
- ✅ Кнопка "Добавить урок" - `{isAdmin && <Button>...}`
- ✅ Кнопка редактирования урока - `{isAdmin && <Button>...}`
- ✅ Кнопка удаления урока - `{isAdmin && <Button>...}`
- ✅ Drag & Drop для уроков - `{isAdmin && <DndContext>...}`
- ✅ Диалог редактирования урока - `{isAdmin && <LessonEditDialog>...}`

### Студент (не админ)

- ✅ Может просматривать курсы, модули и уроки
- ✅ Может открывать уроки и смотреть видео
- ❌ НЕ может создавать/редактировать/удалять модули и уроки
- ❌ НЕ может изменять порядок (drag & drop)

---

## 📡 API ENDPOINTS

### Модули

```
GET    /api/modules/:courseId          - получить все модули курса (сортировка по order_index)
GET    /api/modules/:moduleId          - получить модуль по ID
POST   /api/modules                    - создать модуль
PUT    /api/modules/:moduleId          - обновить модуль
DELETE /api/modules/:moduleId          - удалить модуль
PUT    /api/modules/reorder            - изменить порядок модулей
```

### Уроки

```
GET    /api/lessons?module_id=X        - получить все уроки модуля (сортировка по order_index)
GET    /api/lessons/:lessonId          - получить урок по ID
POST   /api/lessons                    - создать урок
PUT    /api/lessons/:lessonId          - обновить урок
DELETE /api/lessons/:lessonId          - удалить урок
PUT    /api/lessons/reorder            - изменить порядок уроков
```

### Курсы

```
GET    /api/courses                    - получить все курсы
GET    /api/courses/:courseId          - получить курс с модулями
```

---

## 🚫 УДАЛЕННЫЕ МОК-ДАННЫЕ

### Course.tsx

**Было:**
```typescript
const modules = [
  { id: 1, title: "Введение в профессию", ... },
  { id: 2, title: "Создание GPT бота и CRM", ... },
  // ... 10 модулей
];
```

**Стало:**
```typescript
// ✅ Мок-данные удалены - используем только данные из Supabase API
```

**Использование:**
```typescript
// ❌ БЫЛО:
{(apiModules.length > 0 ? apiModules : modules).map(...)}

// ✅ СТАЛО:
{apiModules.length > 0 ? (
  apiModules.map(...)
) : (
  <div>Модули не найдены</div>
)}
```

### Module.tsx

**Было:**
```typescript
const moduleData = {
  "2": {
    id: 2,
    title: "Создание GPT-бота и CRM",
    lessons: [...]
  }
};
const module = moduleData[moduleId] || moduleData["2"];
```

**Стало:**
```typescript
// ✅ Мок-данные удалены - используем только данные из Supabase API
const [module, setModule] = useState<any>(null);

useEffect(() => {
  if (moduleId) {
    loadModuleFromAPI();
  }
}, [moduleId]);
```

---

## ✅ ПРОВЕРКИ И ВАЛИДАЦИЯ

### Проверка ID перед навигацией

```typescript
const handleModuleClick = (moduleId: number) => {
  if (!id) {
    console.error('❌ Cannot navigate: id is undefined');
    return;
  }
  navigate(`/course/${id}/module/${moduleId}`);
};
```

### Проверка загрузки данных

```typescript
// Course.tsx
if (loading) {
  return <div>Загрузка курса...</div>;
}

if (error) {
  return <div>Ошибка: {error}</div>;
}

if (!course) {
  return <div>Курс не найден</div>;
}
```

### Обработка пустых списков

```typescript
{apiModules.length > 0 ? (
  apiModules.map(...)
) : (
  <div className="text-center py-12">
    <p className="text-gray-400 mb-4">Модули не найдены</p>
    {isAdmin && (
      <Button onClick={handleAddModule}>
        Добавить первый модуль
      </Button>
    )}
  </div>
)}
```

---

## 🔄 ОБНОВЛЕНИЕ ДАННЫХ

### После создания/редактирования/удаления

```typescript
// После создания модуля
await loadModulesFromAPI();

// После удаления модуля
await loadModulesFromAPI();

// После изменения порядка
await loadModulesFromAPI(); // Откат при ошибке
```

### После drag & drop

```typescript
// 1. Оптимистичное обновление UI
setApiModules(reorderedModules);

// 2. Отправка на сервер
try {
  await api.put('/api/modules/reorder', { modules });
  toast.success('Порядок обновлён');
} catch (error) {
  // 3. Откат при ошибке
  await loadModulesFromAPI();
  toast.error('Не удалось изменить порядок');
}
```

---

## 📝 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Загрузка модулей курса

```typescript
const loadModulesFromAPI = async () => {
  try {
    const response = await api.get(`/api/courses/${id}`);
    if (response?.course?.modules) {
      // Сортировка по order_index
      const sortedModules = [...response.course.modules].sort((a, b) => {
        const orderA = a.order_index ?? a.id ?? 0;
        const orderB = b.order_index ?? b.id ?? 0;
        return orderA - orderB;
      });
      setApiModules(sortedModules);
    } else {
      setApiModules([]);
    }
  } catch (error) {
    setError(error?.message);
    setApiModules([]);
  }
};
```

### Создание модуля (только админ)

```typescript
const handleSaveModule = async (data: { title: string; description?: string }) => {
  if (!isAdmin) {
    toast.error('Доступ запрещён');
    return;
  }

  try {
    const response = await api.post('/api/modules', {
      ...data,
      course_id: parseInt(id)
    });
    
    await loadModulesFromAPI(); // Обновляем список
    toast.success('Модуль создан');
  } catch (error) {
    toast.error('Ошибка создания модуля');
  }
};
```

---

## 🎯 КЛЮЧЕВЫЕ ПРИНЦИПЫ

1. **✅ Только реальные данные из Supabase** - никаких мок-данных
2. **✅ Сортировка по `order_index`** - всегда используем это поле
3. **✅ Использование реальных ID** - `moduleId` и `lessonId` из БД, не индексы
4. **✅ Проверка прав доступа** - все админ-функции защищены `isAdmin`
5. **✅ Обработка ошибок** - loading, error, empty states
6. **✅ Обновление после изменений** - всегда перезагружаем данные из API

---

**Дата создания:** 2025-11-19  
**Последнее обновление:** 2025-11-19

