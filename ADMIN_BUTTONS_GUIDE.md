# 📋 Руководство по кнопкам администратора

## 🎯 Обзор

Добавлены две кнопки для администраторов платформы:
1. **"Добавить модуль"** - на странице курса
2. **"Добавить урок"** - на странице модуля

Кнопки видны **ТОЛЬКО администраторам** (пользователям с `role === 'admin'`).

---

## 📍 Расположение кнопок

### 1. Кнопка "Добавить модуль"
- **Файл:** `src/pages/Course.tsx`
- **Местоположение:** Справа от заголовка "Модули курса"
- **URL:** `/course/:id`

### 2. Кнопка "Добавить урок"
- **Файл:** `src/pages/Module.tsx`
- **Местоположение:** Справа от заголовка "Уроки модуля"
- **URL:** `/course/:id/module/:moduleId`

---

## 🔧 Как это работает

### Архитектура

```
src/
├── pages/
│   ├── Course.tsx          # Страница курса с кнопкой "Добавить модуль"
│   └── Module.tsx          # Страница модуля с кнопкой "Добавить урок"
├── components/
│   └── admin/
│       ├── ModuleEditDialog.tsx   # Диалог создания/редактирования модуля
│       └── LessonEditDialog.tsx   # Диалог создания/редактирования урока
└── hooks/
    └── useAuth.tsx         # Хук для получения данных о пользователе
```

---

## 📝 Пример кода: Course.tsx (Кнопка "Добавить модуль")

```typescript
// 1. Импорты
import { useAuth } from "@/hooks/useAuth";
import { ModuleEditDialog } from "@/components/admin/ModuleEditDialog";
import { Plus } from "lucide-react";

// 2. Получение данных о пользователе
const { user } = useAuth();
const isAdmin = user?.role === 'admin';

// 3. Состояние для диалога
const [moduleDialog, setModuleDialog] = useState<{ 
  open: boolean; 
  module: any | null 
}>({ 
  open: false, 
  module: null 
});

// 4. Обработчики
const handleAddModule = () => {
  setModuleDialog({ open: true, module: null });
};

const handleSaveModule = async (data: { title: string; description?: string }) => {
  try {
    // TODO: API запрос для сохранения модуля
    console.log('Saving module:', data);
    alert('Модуль успешно сохранён!');
    setModuleDialog({ open: false, module: null });
  } catch (error) {
    console.error('Error saving module:', error);
    alert('Ошибка при сохранении модуля');
  }
};

// 5. Рендер кнопки (условный)
{isAdmin && (
  <Button
    onClick={handleAddModule}
    className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2"
  >
    <Plus className="w-4 h-4" />
    <span className="hidden sm:inline">Добавить модуль</span>
    <span className="sm:hidden">Модуль</span>
  </Button>
)}

// 6. Диалоговое окно
{isAdmin && (
  <ModuleEditDialog
    open={moduleDialog.open}
    onClose={() => setModuleDialog({ open: false, module: null })}
    onSave={handleSaveModule}
    module={moduleDialog.module}
    courseId={Number(id) || 1}
  />
)}
```

---

## 📝 Пример кода: Module.tsx (Кнопка "Добавить урок")

```typescript
// 1. Импорты
import { useAuth } from "@/hooks/useAuth";
import { LessonEditDialog } from "@/components/admin/LessonEditDialog";
import { Plus } from "lucide-react";

// 2. Получение данных о пользователе
const { user } = useAuth();
const isAdmin = user?.role === 'admin';

// 3. Состояние для диалога
const [lessonDialog, setLessonDialog] = useState<{ 
  open: boolean; 
  lesson: any | null 
}>({ 
  open: false, 
  lesson: null 
});

// 4. Обработчики
const handleAddLesson = () => {
  setLessonDialog({ open: true, lesson: null });
};

const handleSaveLesson = async (data: { 
  title: string; 
  description?: string; 
  duration_minutes?: number 
}) => {
  try {
    // TODO: API запрос для сохранения урока
    console.log('Saving lesson:', data);
    alert('Урок успешно сохранён!');
    setLessonDialog({ open: false, lesson: null });
  } catch (error) {
    console.error('Error saving lesson:', error);
    alert('Ошибка при сохранении урока');
  }
};

// 5. Рендер кнопки (условный)
{isAdmin && (
  <Button
    onClick={handleAddLesson}
    className="bg-neon text-black hover:bg-neon/80 font-semibold text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2"
  >
    <Plus className="w-4 h-4" />
    <span className="hidden sm:inline">Добавить урок</span>
    <span className="sm:hidden">Урок</span>
  </Button>
)}

// 6. Диалоговое окно
{isAdmin && (
  <LessonEditDialog
    open={lessonDialog.open}
    onClose={() => setLessonDialog({ open: false, lesson: null })}
    onSave={handleSaveLesson}
    lesson={lessonDialog.lesson}
    moduleId={Number(moduleId) || 1}
  />
)}
```

---

## 🔌 Подключение к API

### Что нужно сделать:

1. **Создать API endpoints в бэкенде:**

```typescript
// backend/routes/modules.ts
router.post('/api/courses/:courseId/modules', async (req, res) => {
  // Создание нового модуля
  const { title, description } = req.body;
  const { courseId } = req.params;
  
  // Сохранить в базу данных
  // Вернуть созданный модуль
});

// backend/routes/lessons.ts
router.post('/api/modules/:moduleId/lessons', async (req, res) => {
  // Создание нового урока
  const { title, description, duration_minutes } = req.body;
  const { moduleId } = req.params;
  
  // Сохранить в базу данных
  // Вернуть созданный урок
});
```

2. **Заменить TODO в `handleSaveModule`:**

```typescript
const handleSaveModule = async (data: { title: string; description?: string }) => {
  try {
    const response = await fetch(`/api/courses/${id}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}` // если требуется
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed to save module');
    
    const newModule = await response.json();
    console.log('Module saved:', newModule);
    
    // Обновить список модулей
    // refetch() или обновить state
    
    setModuleDialog({ open: false, module: null });
  } catch (error) {
    console.error('Error saving module:', error);
    alert('Ошибка при сохранении модуля');
  }
};
```

3. **Заменить TODO в `handleSaveLesson`:**

```typescript
const handleSaveLesson = async (data: { 
  title: string; 
  description?: string; 
  duration_minutes?: number 
}) => {
  try {
    const response = await fetch(`/api/modules/${moduleId}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}` // если требуется
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed to save lesson');
    
    const newLesson = await response.json();
    console.log('Lesson saved:', newLesson);
    
    // Обновить список уроков
    // refetch() или обновить state
    
    setLessonDialog({ open: false, lesson: null });
  } catch (error) {
    console.error('Error saving lesson:', error);
    alert('Ошибка при сохранении урока');
  }
};
```

---

## 🔐 Безопасность

### Frontend (текущая реализация):
```typescript
const { user } = useAuth();
const isAdmin = user?.role === 'admin';

// Кнопка видна только если isAdmin === true
{isAdmin && <Button onClick={handleAddModule}>...</Button>}
```

### Backend (обязательно добавить):
```typescript
// middleware/checkAdmin.ts
export const checkAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Использование:
router.post('/api/courses/:courseId/modules', checkAdmin, async (req, res) => {
  // Только администраторы могут создавать модули
});
```

---

## 🎨 Дизайн кнопок

### Кнопка "Добавить модуль" (зелёная):
```css
bg-[#00ff00]           /* Зелёный фон */
text-black             /* Чёрный текст */
hover:bg-[#00cc00]     /* Темнее при hover */
font-semibold          /* Жирный шрифт */
rounded-xl             /* Скруглённые углы */
```

### Кнопка "Добавить урок" (neon):
```css
bg-neon                /* Неоновый зелёный */
text-black             /* Чёрный текст */
hover:bg-neon/80       /* Прозрачнее при hover */
font-semibold          /* Жирный шрифт */
rounded-xl             /* Скруглённые углы */
```

---

## 🐛 Отладка

Если кнопка не появляется:

1. **Проверить роль пользователя в консоли:**
```javascript
console.log('User:', user);
console.log('isAdmin:', isAdmin);
```

2. **Проверить условный рендеринг:**
```typescript
// Временно убрать условие для теста
<Button onClick={handleAddModule}>Добавить модуль</Button>
// Если кнопка появилась - проблема в isAdmin
```

3. **Проверить импорты:**
```typescript
import { useAuth } from "@/hooks/useAuth"; // Правильный путь?
```

4. **Очистить кэш браузера:**
- `Ctrl + Shift + R` (hard reload)
- Или `Ctrl + Shift + Delete` → Clear cache

---

## 📊 Структура данных

### ModuleEditDialog Props:
```typescript
interface ModuleEditDialogProps {
  open: boolean;                    // Открыт ли диалог
  onClose: () => void;              // Закрыть диалог
  onSave: (data: {                  // Сохранить данные
    title: string;
    description?: string;
  }) => Promise<void>;
  module?: {                        // Редактируемый модуль (null = создание)
    id: number;
    title: string;
    description?: string;
  } | null;
  courseId: number;                 // ID курса
}
```

### LessonEditDialog Props:
```typescript
interface LessonEditDialogProps {
  open: boolean;                    // Открыт ли диалог
  onClose: () => void;              // Закрыть диалог
  onSave: (data: {                  // Сохранить данные
    title: string;
    description?: string;
    duration_minutes?: number;
  }) => Promise<void>;
  lesson?: {                        // Редактируемый урок (null = создание)
    id: number;
    title: string;
    description?: string;
    duration_minutes?: number;
  } | null;
  moduleId: number;                 // ID модуля
}
```

---

## ✅ Чек-лист для интеграции

- [x] Добавлены кнопки в UI
- [x] Добавлены диалоговые окна
- [x] Проверка роли администратора
- [x] Обработчики событий
- [ ] Подключить к реальному API
- [ ] Добавить backend endpoints
- [ ] Добавить проверку прав на backend
- [ ] Обновление списка после создания
- [ ] Валидация данных
- [ ] Обработка ошибок
- [ ] Уведомления (toast) вместо alert

---

## 📞 Поддержка

Если возникнут вопросы:
1. Проверьте консоль браузера на наличие ошибок
2. Проверьте логи: `console.log('🔍 Course - User:', user);`
3. Убедитесь что `user.role === 'admin'`
4. Проверьте что импорты правильные

---

**Дата создания:** 16 ноября 2025  
**Версия:** 1.0  
**Автор:** AI Assistant




