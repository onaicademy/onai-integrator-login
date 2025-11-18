# 📊 Технический отчёт: Редизайн платформы onAI Academy

**Дата:** 16 ноября 2025  
**Версия:** 2.0  
**Исполнитель:** AI Assistant

---

## 📋 Оглавление

1. [Обзор выполненных работ](#обзор-выполненных-работ)
2. [Единая дизайн-концепция](#единая-дизайн-концепция)
3. [Редизайн страниц](#редизайн-страниц)
4. [Админ-функционал](#админ-функционал)
5. [Что нужно подключить](#что-нужно-подключить)

---

## 🎯 Обзор выполненных работ

### Что было сделано:

✅ **Редизайн 3 основных страниц:**
- Страница курса (`/course/:id`)
- Страница модуля (`/course/:id/module/:moduleId`)
- Страница урока (`/course/:id/module/:moduleId/lesson/:lessonId`)

✅ **Добавлен админ-функционал:**
- Кнопка "Добавить модуль" на странице курса
- Кнопка "Добавить урок" на странице модуля
- Диалоговые окна для создания модулей и уроков

✅ **Создана единая дизайн-система:**
- Чёрный фон с анимированной нейросетью
- Зелёные акценты (#00ff00)
- Тёмные карточки (#0a0a0f, #1a1a24)
- Пролетающие кометы

---

## 🎨 Единая дизайн-концепция

### Цветовая палитра:

```css
/* Основные цвета */
Чёрный фон: #000000
Тёмные карточки: #0a0a0f, #1a1a24
Зелёный акцент: #00ff00
Зелёный тёмный: #00cc00
Серый текст: #9ca3af (gray-400)
Белый текст: #ffffff
Бордеры: #374151 (gray-800)
```

### Фоновые эффекты (одинаковые на всех страницах):

#### 1. **Сетка Grid**
```tsx
<div 
  className="absolute inset-0 opacity-10"
  style={{
    backgroundImage: `
      linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px'
  }}
/>
```

#### 2. **Плавающие узлы нейросети** (30 штук)
- Размер: 2-6px
- Цвет: #00ff00
- Анимация: плавное движение, пульсация, изменение прозрачности
- Свечение: box-shadow с размытием

#### 3. **Линии связей** (15 штук)
- SVG линии с градиентом
- Анимация pathLength от 0 до 1
- Цвет: #00ff00 с opacity 0.3

#### 4. **Летящие частицы** (20 штук)
- Размер: 1px
- Движение вверх с горизонтальным смещением
- Исчезают при достижении верха

#### 5. **Пролетающие кометы** (5 штук)
- Размер головки: 4-7px
- Длина хвоста: 120-200px
- Burst эффект: 5 комет за 1 секунду, затем пауза 7 секунд
- Цвет: белый с голубоватым оттенком

### Компоненты интерфейса:

#### Карточки:
```tsx
className="bg-[#0a0a0f] border border-gray-800 rounded-2xl p-5 sm:p-6"
```

#### Кнопки (зелёные):
```tsx
className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold rounded-xl"
```

#### Кнопки (прозрачные):
```tsx
className="bg-transparent border-2 border-[#00ff00]/40 text-[#00ff00] hover:bg-[#00ff00]/10"
```

#### Прогресс-бары:
```tsx
<div className="h-2 bg-gray-800 rounded-full overflow-hidden">
  <motion.div
    className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00]"
    initial={{ width: 0 }}
    animate={{ width: "60%" }}
    transition={{ duration: 1, ease: "easeOut" }}
  />
</div>
```

---

## 📄 Редизайн страниц

### 1. Страница курса: `src/pages/Course.tsx`

**URL:** `/course/:id`

#### Что изменилось:

**Шапка курса:**
- ✅ Градиентный фон: `from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]`
- ✅ Badge с пульсирующей точкой: "Самый полный курс..."
- ✅ Огромный заголовок с пульсирующим свечением на "2.0"
- ✅ Кнопка "onAI Куратор" (прозрачная с зелёной рамкой)

**Модули:**
- ✅ Горизонтальный layout (иконка слева + контент + кнопка справа)
- ✅ Карточки в один столбик: `space-y-3`
- ✅ Заголовок + описание + метаданные (уроки, длительность, прогресс)
- ✅ Анимированный прогресс-бар с зелёным градиентом

**Sidebar:**
- ✅ Выровнен с заголовком модулей: `lg:pt-[60px]`
- ✅ Зелёные карточки: договор-оферта, расписание, кураторы

**Админ-функционал:**
```tsx
{isAdmin && (
  <Button onClick={handleAddModule}>
    <Plus className="w-4 h-4" />
    Добавить модуль
  </Button>
)}
```

---

### 2. Страница модуля: `src/pages/Module.tsx`

**URL:** `/course/:id/module/:moduleId`

#### Что изменилось:

**Шапка модуля:**
- ✅ Градиентный фон с анимированным паттерном
- ✅ Номер модуля зелёным цветом
- ✅ Заголовок + описание
- ✅ Прогресс-бар с анимацией

**Уроки:**
- ✅ Горизонтальные карточки с номером слева
- ✅ Три статуса: 
  - `completed` (зелёный значок, зелёный badge)
  - `active` (пульсирующий значок, зелёное свечение)
  - `locked` (серый, отключён)
- ✅ Hover эффект для доступных уроков
- ✅ Кнопки "Начать" / "Повторить"

**Материалы модуля:**
- ✅ Карточка внизу с кнопкой "Скачать материалы"
- ✅ Disabled пока не завершены все уроки

**Админ-функционал:**
```tsx
{isAdmin && (
  <Button onClick={handleAddLesson}>
    <Plus className="w-4 h-4" />
    Добавить урок
  </Button>
)}
```

---

### 3. Страница урока: `src/pages/Lesson.tsx`

**URL:** `/course/:id/module/:moduleId/lesson/:lessonId`

#### Что изменилось:

**Заголовок урока:**
- ✅ Хлебные крошки: "Модуль X • Урок Y"
- ✅ Badge "Завершено" если урок пройден
- ✅ Заголовок + описание

**Видео-плеер:**
- ✅ Iframe с YouTube (aspect-video)
- ✅ Зелёная рамка с тенью
- ✅ 2 кнопки снизу:
  - "Завершить урок" (зелёная, disabled после завершения)
  - "Следующий урок" (прозрачная с рамкой)

**Sidebar:**

1. **Карточка с информацией:**
   - Иконка Play
   - Длительность
   - Прогресс модуля

2. **Материалы урока:**
   - Список файлов/ссылок
   - Иконки (PDF, Link, Download)
   - Hover эффект

3. **Совет:**
   - Зелёный градиентный фон
   - Иконка 💡
   - Текст подсказки

---

## 🔧 Админ-функционал

### Где находятся кнопки:

| Страница | Кнопка | Расположение | Файл |
|----------|--------|--------------|------|
| **Курс** | "Добавить модуль" | Справа от "Модули курса" | `src/pages/Course.tsx:472-481` |
| **Модуль** | "Добавить урок" | Справа от "Уроки модуля" | `src/pages/Module.tsx:340-349` |

### Как работают кнопки:

#### 1. Страница курса (Course.tsx)

**Получение роли пользователя:**
```typescript
const { user, userRole } = useAuth();
const isAdmin = userRole === 'admin';
```

**State для диалога:**
```typescript
const [moduleDialog, setModuleDialog] = useState<{ 
  open: boolean; 
  module: any | null 
}>({ 
  open: false, 
  module: null 
});
```

**Обработчики:**
```typescript
// Открыть диалог
const handleAddModule = () => {
  setModuleDialog({ open: true, module: null });
};

// Сохранить модуль
const handleSaveModule = async (data: { 
  title: string; 
  description?: string 
}) => {
  try {
    // TODO: API запрос
    console.log('Saving module:', data);
    alert('Модуль успешно сохранён!');
    setModuleDialog({ open: false, module: null });
  } catch (error) {
    console.error('Error saving module:', error);
    alert('Ошибка при сохранении модуля');
  }
};
```

**Рендер кнопки:**
```typescript
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
```

**Диалоговое окно:**
```typescript
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

#### 2. Страница модуля (Module.tsx)

**Аналогичная структура:**

```typescript
// Получение роли
const { userRole } = useAuth();
const isAdmin = userRole === 'admin';

// State
const [lessonDialog, setLessonDialog] = useState<{ 
  open: boolean; 
  lesson: any | null 
}>({ 
  open: false, 
  lesson: null 
});

// Обработчики
const handleAddLesson = () => {
  setLessonDialog({ open: true, lesson: null });
};

const handleSaveLesson = async (data: { 
  title: string; 
  description?: string; 
  duration_minutes?: number 
}) => {
  try {
    // TODO: API запрос
    console.log('Saving lesson:', data);
    alert('Урок успешно сохранён!');
    setLessonDialog({ open: false, lesson: null });
  } catch (error) {
    console.error('Error saving lesson:', error);
    alert('Ошибка при сохранении урока');
  }
};

// Рендер
{isAdmin && (
  <Button onClick={handleAddLesson}>
    <Plus className="w-4 h-4" />
    Добавить урок
  </Button>
)}

// Диалог
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

### Компоненты диалогов:

#### ModuleEditDialog
**Файл:** `src/components/admin/ModuleEditDialog.tsx`

**Props:**
```typescript
interface ModuleEditDialogProps {
  open: boolean;                 // Открыт ли диалог
  onClose: () => void;           // Закрыть диалог
  onSave: (data: {               // Сохранить данные
    title: string;
    description?: string;
  }) => Promise<void>;
  module?: {                     // Редактируемый модуль (null = создание)
    id: number;
    title: string;
    description?: string;
  } | null;
  courseId: number;              // ID курса
}
```

**Поля формы:**
- Title (обязательное)
- Description (опциональное)

#### LessonEditDialog
**Файл:** `src/components/admin/LessonEditDialog.tsx`

**Props:**
```typescript
interface LessonEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    duration_minutes?: number;
  }) => Promise<void>;
  lesson?: {
    id: number;
    title: string;
    description?: string;
    duration_minutes?: number;
  } | null;
  moduleId: number;
}
```

**Поля формы:**
- Title (обязательное)
- Description (опциональное)
- Duration in minutes (опциональное)

---

## 🔌 Что нужно подключить

### 1. Backend API Endpoints

#### POST `/api/courses/:courseId/modules`
**Создание нового модуля**

**Request body:**
```json
{
  "title": "Название модуля",
  "description": "Описание модуля"
}
```

**Response:**
```json
{
  "id": 11,
  "course_id": 1,
  "title": "Название модуля",
  "description": "Описание модуля",
  "order": 11,
  "created_at": "2025-11-16T12:00:00Z"
}
```

**Где подключить:** `src/pages/Course.tsx` → функция `handleSaveModule` (строка 147-156)

#### POST `/api/modules/:moduleId/lessons`
**Создание нового урока**

**Request body:**
```json
{
  "title": "Название урока",
  "description": "Описание урока",
  "duration_minutes": 15
}
```

**Response:**
```json
{
  "id": 6,
  "module_id": 2,
  "title": "Название урока",
  "description": "Описание урока",
  "duration_minutes": 15,
  "order": 6,
  "created_at": "2025-11-16T12:00:00Z"
}
```

**Где подключить:** `src/pages/Module.tsx` → функция `handleSaveLesson` (строка 60-69)

### 2. Frontend: Заменить TODO

#### Course.tsx (строка 147-156):
```typescript
const handleSaveModule = async (data: { title: string; description?: string }) => {
  try {
    const response = await fetch(`/api/courses/${id}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed to save module');
    
    const newModule = await response.json();
    console.log('Module created:', newModule);
    
    // Обновить список модулей (refetch или обновить state)
    
    setModuleDialog({ open: false, module: null });
  } catch (error) {
    console.error('Error saving module:', error);
    alert('Ошибка при сохранении модуля');
  }
};
```

#### Module.tsx (строка 60-69):
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
        'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed to save lesson');
    
    const newLesson = await response.json();
    console.log('Lesson created:', newLesson);
    
    // Обновить список уроков (refetch или обновить state)
    
    setLessonDialog({ open: false, lesson: null });
  } catch (error) {
    console.error('Error saving lesson:', error);
    alert('Ошибка при сохранении урока');
  }
};
```

### 3. Backend: Проверка прав администратора

**Middleware:**
```typescript
// backend/middleware/checkAdmin.ts
export const checkAdmin = (req, res, next) => {
  const user = req.user; // Из JWT токена
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin role required.' 
    });
  }
  
  next();
};
```

**Использование:**
```typescript
// backend/routes/modules.ts
import { checkAdmin } from '../middleware/checkAdmin';

router.post(
  '/api/courses/:courseId/modules', 
  checkAdmin,  // ← Проверка прав
  async (req, res) => {
    // Создание модуля
  }
);

// backend/routes/lessons.ts
router.post(
  '/api/modules/:moduleId/lessons', 
  checkAdmin,  // ← Проверка прав
  async (req, res) => {
    // Создание урока
  }
);
```

### 4. Обновление UI после создания

Есть два подхода:

**Вариант A: Refetch данных**
```typescript
// Используя React Query
const { data: modules, refetch } = useQuery('modules', fetchModules);

const handleSaveModule = async (data) => {
  await fetch(...);
  await refetch(); // ← Обновить данные
  setModuleDialog({ open: false, module: null });
};
```

**Вариант B: Обновить state вручную**
```typescript
const [modules, setModules] = useState([...]);

const handleSaveModule = async (data) => {
  const response = await fetch(...);
  const newModule = await response.json();
  
  setModules([...modules, newModule]); // ← Добавить в список
  setModuleDialog({ open: false, module: null });
};
```

---

## 📐 Структура файлов

```
src/
├── pages/
│   ├── Course.tsx          ← Редизайн ✅ + Кнопка "Добавить модуль" ✅
│   ├── Module.tsx          ← Редизайн ✅ + Кнопка "Добавить урок" ✅
│   └── Lesson.tsx          ← Редизайн ✅
├── components/
│   ├── admin/
│   │   ├── ModuleEditDialog.tsx   ← Диалог создания модуля ✅
│   │   └── LessonEditDialog.tsx   ← Диалог создания урока ✅
│   └── course/
│       └── ModuleCard.tsx         ← Карточка модуля (новый дизайн) ✅
├── hooks/
│   └── useAuth.tsx         ← Хук для получения роли пользователя ✅
└── contexts/
    └── AuthContext.tsx     ← Контекст с userRole ✅
```

---

## 🎨 Дизайн-токены

### Цвета:
```typescript
// Используются во всех страницах
const colors = {
  background: '#000000',
  cardDark: '#0a0a0f',
  cardLight: '#1a1a24',
  primary: '#00ff00',
  primaryDark: '#00cc00',
  textWhite: '#ffffff',
  textGray: '#9ca3af',
  border: '#374151',
  borderLight: 'rgba(0, 255, 0, 0.2)',
};
```

### Тени:
```typescript
// Зелёные тени для акцентов
shadow-lg shadow-[#00ff00]/10   // Лёгкая тень
shadow-lg shadow-[#00ff00]/30   // Средняя тень
```

### Скругления:
```typescript
rounded-xl    // 0.75rem (12px)
rounded-2xl   // 1rem (16px)
rounded-3xl   // 1.5rem (24px)
rounded-full  // 9999px
```

### Анимации:
```typescript
// Все компоненты используют framer-motion
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.2 }}
```

---

## ✅ Чек-лист для технического специалиста

### Frontend:
- [x] Редизайн Course.tsx
- [x] Редизайн Module.tsx
- [x] Редизайн Lesson.tsx
- [x] Кнопка "Добавить модуль"
- [x] Кнопка "Добавить урок"
- [x] Диалоговые окна
- [x] Проверка роли администратора
- [ ] **Подключить API в `handleSaveModule`**
- [ ] **Подключить API в `handleSaveLesson`**
- [ ] **Обновление списка после создания**

### Backend:
- [ ] **Создать endpoint POST `/api/courses/:courseId/modules`**
- [ ] **Создать endpoint POST `/api/modules/:moduleId/lessons`**
- [ ] **Добавить middleware `checkAdmin`**
- [ ] **Валидация данных (title обязательно)**
- [ ] **Обработка ошибок**

### База данных:
- [ ] **Таблица `modules` (если нет)**
- [ ] **Таблица `lessons` (если нет)**
- [ ] **Поле `order` для сортировки**

---

## 🐛 Отладка

Если кнопка не появляется:

1. **Проверить роль в консоли:**
```javascript
console.log('userRole:', userRole);
console.log('isAdmin:', isAdmin);
```

2. **Проверить AuthContext:**
```javascript
// В src/contexts/AuthContext.tsx должно быть:
console.log('👤 Роль пользователя:', role);
```

3. **Проверить базу данных:**
```sql
SELECT email, role FROM users WHERE email = 'saint@onaiacademy.kz';
-- Должно быть: role = 'admin'
```

4. **Очистить кэш:**
- `Ctrl + Shift + R` (hard reload)

---

## 📞 Контакты

Если возникнут вопросы:
- Все файлы готовы к работе
- TODO отмечены комментариями в коде
- Примеры API запросов есть в этом документе

---

**Статус:** ✅ Frontend готов, Backend нужно подключить  
**Приоритет:** Высокий  
**Срок:** Согласовать с командой




