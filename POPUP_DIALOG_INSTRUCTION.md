# 🔧 Инструкция: Исправление поп-апов "Добавить урок" и "Добавить модуль"

**Дата:** 16 ноября 2025  
**Проблема:** Кнопка "Добавить урок" не открывает диалоговое окно  
**Статус:** 🔴 Требует исправления

---

## 📋 Проблемы

### 1. **Кнопка "Добавить урок" не открывается**
- **Файл:** `src/pages/Module.tsx`
- **Строка:** 405-424
- **Компонент диалога:** `src/components/admin/LessonEditDialog.tsx`

### 2. **Кнопка "Добавить модуль" не открывается (возможно)**
- **Файл:** `src/pages/Course.tsx`
- **Компонент диалога:** `src/components/admin/ModuleEditDialog.tsx`

### 3. **Кнопка "Назад к курсу" не работает** ✅ ИСПРАВЛЕНО
- **Файл:** `src/pages/Module.tsx`
- **Строка:** 325-341
- **Решение:** Добавлено логирование и fallback навигация на `/courses` если `courseId` отсутствует
- **Логи для проверки:**
  ```
  🔍 Module.tsx - courseId (id): 1
  🔙 Навигация назад к курсу, courseId: 1
  ```

---

## 🔍 Используемые технологии

### UI Framework
```bash
# shadcn/ui компоненты
- Dialog (from @radix-ui/react-dialog)
- Button (from @radix-ui/react-button)
- Input, Textarea, Label, Tabs
```

### Импорты в LessonEditDialog.tsx:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
```

---

## 📂 Структура файлов

```
src/
├── pages/
│   ├── Module.tsx          ← Кнопка "Добавить урок"
│   ├── Course.tsx          ← Кнопка "Добавить модуль"
│   └── Lesson.tsx
├── components/
│   ├── admin/
│   │   ├── LessonEditDialog.tsx    ← Диалог для урока
│   │   └── ModuleEditDialog.tsx    ← Диалог для модуля
│   └── ui/
│       ├── dialog.tsx              ← shadcn/ui Dialog
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── label.tsx
│       └── tabs.tsx
└── utils/
    └── apiClient.ts
```

---

## 🐛 Возможные причины проблемы

### 1. **Dialog не установлен или неправильно настроен**

Проверьте файл `src/components/ui/dialog.tsx`:

```bash
# Команда для проверки существования
ls src/components/ui/dialog.tsx
```

Если файл НЕ существует, нужно установить:

```bash
npx shadcn@latest add dialog
```

### 2. **z-index конфликт**

В `Module.tsx` есть элементы с `z-10`, `z-50`, но Dialog может быть под ними.

**Проверьте в `src/components/ui/dialog.tsx`:**
```tsx
// Должно быть примерно так:
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[9999] bg-black/80",  // ← Высокий z-index
      className
    )}
    {...props}
  />
))

const DialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[10000]",  // ← Выше overlay
        "translate-x-[-50%] translate-y-[-50%]",
        className
      )}
      {...props}
    />
  </DialogPortal>
))
```

### 3. **State не обновляется**

В `Module.tsx` на строке 47-50:
```typescript
const [lessonDialog, setLessonDialog] = useState<{ open: boolean; lesson: any | null }>({ 
  open: false, 
  lesson: null 
});
```

И на строке 89-94:
```typescript
const handleAddLesson = () => {
  console.log('🎯 Открытие диалога создания урока...');
  console.log('🎯 lessonDialog before:', lessonDialog);
  setLessonDialog({ open: true, lesson: null });
  console.log('🎯 setLessonDialog вызван с open: true');
};
```

**Проверьте консоль браузера (F12):**
- Должны быть логи `🎯 Открытие диалога...`
- Должен быть `🔥 КНОПКА НАЖАТА!`

Если НЕТ логов → кнопка вообще не нажимается (проблема с pointer-events или z-index)

### 4. **Кнопка перекрыта другим элементом**

В `Module.tsx` на строке 256-314 есть "Shooting Stars / Comets" с `pointer-events-none`, но проверьте что ВСЕ декоративные элементы имеют `pointer-events-none`.

### 5. **isAdmin = false**

На строке 405 в `Module.tsx`:
```typescript
{isAdmin && (
  <Button onClick={handleAddLesson} ...>
    Добавить урок
  </Button>
)}
```

Если `isAdmin === false`, кнопка НЕ рендерится!

**Проверьте консоль:**
- Должен быть лог: `🔍 Module.tsx - isAdmin: true` (если вы админ)

---

## ✅ Решение: Пошаговая проверка

### Шаг 1: Проверить что Dialog установлен

**Проверьте существование файлов:**
```bash
ls src/components/ui/dialog.tsx
ls src/components/ui/button.tsx
ls src/components/ui/input.tsx
ls src/components/ui/tabs.tsx
```

**Если НЕТ файла `dialog.tsx`:**
```bash
npx shadcn@latest add dialog
```

### Шаг 2: Проверить z-index в Dialog

**Откройте:** `src/components/ui/dialog.tsx`

**Убедитесь что есть высокие z-index:**
```tsx
// DialogOverlay
className="... z-[9999] ..."

// DialogContent
className="... z-[10000] ..."
```

**Если z-index низкий, измените:**
```tsx
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[9999] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[10000] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

### Шаг 3: Проверить консоль браузера

**Откройте страницу модуля:** `http://localhost:8080/course/1/module/2`

**Откройте консоль:** `F12` → Console

**Нажмите кнопку "Добавить урок"**

**Что должно быть:**
```
🔍 Module.tsx - userRole: admin
🔍 Module.tsx - isAdmin: true
🔥 КНОПКА НАЖАТА!
🎯 Открытие диалога создания урока...
🎯 lessonDialog before: {open: false, lesson: null}
🎯 setLessonDialog вызван с open: true
🔄 lessonDialog изменился: {open: true, lesson: null}
🔍 LessonEditDialog - open: true
🔍 LessonEditDialog - lesson: null
🔍 LessonEditDialog - moduleId: 2
```

**Если НЕТ логов:**
- Либо `isAdmin === false` (кнопка не рендерится)
- Либо кнопка перекрыта другим элементом

### Шаг 4: Проверить isAdmin

**В консоли выполните:**
```javascript
// Получить текущее состояние auth
const authContext = document.querySelector('[data-radix-context]');
console.log('Auth context:', authContext);
```

**Проверьте localStorage:**
```javascript
// Проверить токен
const token = localStorage.getItem('supabase.auth.token');
console.log('Token:', token);

// Проверить user
const user = JSON.parse(localStorage.getItem('supabase.auth.user') || '{}');
console.log('User:', user);
console.log('User role:', user?.user_metadata?.role || user?.app_metadata?.role);
```

**Если роль НЕ 'admin':**
- Нужно обновить роль пользователя в базе данных
- Или войти под админским аккаунтом

### Шаг 5: Исправить если кнопка перекрыта

**Если логи НЕ появляются при клике, добавьте в `Module.tsx`:**

```tsx
{isAdmin && (
  <div className="relative z-[100]">  {/* ← Обернуть в div с высоким z-index */}
    <Button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔥 КНОПКА НАЖАТА!');
        handleAddLesson();
      }}
      type="button"
      className="relative z-[101] bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">Добавить урок</span>
      <span className="sm:hidden">Урок</span>
    </Button>
  </div>
)}
```

### Шаг 6: Тест открытия диалога вручную

**В консоли браузера выполните:**
```javascript
// Симуляция открытия диалога
const openDialog = () => {
  // Найти React компонент
  const moduleContainer = document.querySelector('body');
  
  // Создать кастомное событие
  window.dispatchEvent(new CustomEvent('openLessonDialog'));
};

openDialog();
```

Если диалог НЕ открывается даже так → проблема в самом компоненте `LessonEditDialog`.

### Шаг 7: Проверить DialogContent в LessonEditDialog

**Откройте:** `src/components/admin/LessonEditDialog.tsx`

**Строка 201-202:**
```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-border/30">
```

**Убедитесь что:**
1. `open` prop передаётся корректно
2. `onOpenChange={onClose}` есть (для закрытия)

**Попробуйте hardcode:**
```tsx
<Dialog open={true} onOpenChange={onClose}>  {/* ← Hardcode для теста */}
```

Если диалог ПОЯВИЛСЯ → проблема в `open` prop из родителя.

---

## 🔧 Быстрое исправление (Quick Fix)

### Вариант 1: Обновить z-index в dialog.tsx

**Файл:** `src/components/ui/dialog.tsx`

**Найти:**
```tsx
className="fixed inset-0 z-50 ..."
```

**Заменить на:**
```tsx
className="fixed inset-0 z-[9999] ..."
```

**И:**
```tsx
className="fixed left-[50%] top-[50%] z-50 ..."
```

**Заменить на:**
```tsx
className="fixed left-[50%] top-[50%] z-[10000] ..."
```

### Вариант 2: Добавить inline z-index в DialogContent

**Файл:** `src/components/admin/LessonEditDialog.tsx`

**Строка 202, заменить:**
```tsx
<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-border/30">
```

**На:**
```tsx
<DialogContent 
  className="max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-border/30"
  style={{ zIndex: 10000 }}  {/* ← Inline style */}
>
```

### Вариант 3: Создать wrapper с Portal

**Файл:** `src/components/admin/LessonEditDialog.tsx`

**Обернуть весь Dialog:**
```tsx
import { createPortal } from 'react-dom';

export function LessonEditDialog({ open, onClose, onSave, lesson, moduleId }: LessonEditDialogProps) {
  // ... existing code ...
  
  if (!open) return null;  // Не рендерить если закрыт
  
  return createPortal(
    <Dialog open={open} onOpenChange={onClose}>
      {/* ... existing DialogContent ... */}
    </Dialog>,
    document.body  // Рендерить в body напрямую
  );
}
```

---

## 📞 API Endpoints (для справки)

### Создание урока:
```
POST /api/lessons
Body: {
  title: string,
  description?: string,
  duration_minutes?: number,
  module_id: number
}

Response: {
  lesson: {
    id: number,
    title: string,
    ...
  }
}
```

### Загрузка видео:
```
POST /api/videos/upload/:lessonId
Body: FormData { video: File }

Response: {
  video: {
    id: number,
    video_url: string,
    ...
  }
}
```

### Загрузка материала:
```
POST /api/materials/upload
Body: FormData { 
  file: File,
  lessonId: string
}

Response: {
  material: {
    id: string,
    filename: string,
    file_url: string,
    file_size_bytes: number
  }
}
```

---

## 🎯 Чек-лист для проверки

- [ ] Файл `src/components/ui/dialog.tsx` существует
- [ ] z-index в Dialog >= 9999
- [ ] В консоли есть лог `🔍 Module.tsx - isAdmin: true`
- [ ] При клике на кнопку есть лог `🔥 КНОПКА НАЖАТА!`
- [ ] Есть лог `🔍 LessonEditDialog - open: true`
- [ ] Диалог визуально появляется (серый overlay + белое окно)
- [ ] Можно ввести текст в поля
- [ ] Кнопка "Создать урок" активна
- [ ] После создания появляется alert "✅ Урок создан!"
- [ ] Вкладки "Видео" и "Материалы" активируются

---

## 🚨 Если ничего не помогло

### Полная переустановка Dialog:

```bash
# Удалить старый
rm src/components/ui/dialog.tsx

# Установить заново
npx shadcn@latest add dialog

# Перезапустить frontend
npm run dev
```

### Проверить package.json:

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",  // ← Должна быть эта версия
    "framer-motion": "^11.x.x",
    "react": "^18.x.x",
    "react-dom": "^18.x.x"
  }
}
```

Если версия `@radix-ui/react-dialog` старая:
```bash
npm install @radix-ui/react-dialog@latest
```

---

## 📝 Примечания

1. **LessonEditDialog работает в 2 режима:**
   - **Создание:** Когда `lesson === null`, сначала создаёт урок через API, потом разрешает загружать видео/материалы
   - **Редактирование:** Когда `lesson` передан, сразу можно редактировать всё

2. **Кнопка "Создать урок" disabled после создания:**
   - Это норма! После создания урока кнопка становится `disabled: !!savedLessonId`
   - Для загрузки видео/материалов нужно перейти на вкладки "Видео" и "Материалы"

3. **Backend может не существовать:**
   - Все API endpoints в `LessonEditDialog` отправляют запросы, но Backend может быть не готов
   - Проверьте что Backend запущен: `http://localhost:3000/api/lessons`

---

## ✅ Исправления уже сделаны

### 1. Кнопка "Назад к курсу"

**Файл:** `src/pages/Module.tsx` (строка 325-341)

**Что исправлено:**
- Добавлено логирование `courseId` при клике
- Добавлен fallback: если `courseId` отсутствует → переход на `/courses`
- Улучшена отладка с console.log

**Как проверить:**
1. Открыть: `http://localhost:8080/course/1/module/2`
2. Нажать "Назад к курсу"
3. Должно перенаправить на: `http://localhost:8080/course/1`
4. В консоли должен быть лог: `🔙 Навигация назад к курсу, courseId: 1`

**Если не работает:**
- Проверить консоль на наличие ошибок
- Проверить что URL содержит корректный `courseId`
- Убедиться что React Router правильно извлекает параметры

---

---

## ✅ ОБНОВЛЕНИЕ (17 ноября 2025)

### Все исправления из инструкции ПРИМЕНЕНЫ:

1. ✅ **z-index в dialog.tsx** - уже установлен `z-[9999]` и `z-[10000]`
2. ✅ **z-index в LessonEditDialog** - уже установлен `style={{ zIndex: 10001 }}`
3. ✅ **z-index в ModuleEditDialog** - уже установлен `style={{ zIndex: 10001 }}`
4. ✅ **Кнопка "Добавить урок"** - уже обёрнута в `<div className="relative z-[100]">` со `style={{ zIndex: 101 }}`
5. ✅ **Кнопка "Добавить модуль"** - уже обёрнута в `<div className="relative z-[100]">` со `style={{ zIndex: 101 }}`
6. ✅ **Логирование с эмодзи 🔥** - добавлено во все компоненты
7. ✅ **useEffect логи** - добавлены в `LessonEditDialog` и `ModuleEditDialog`
8. ✅ **Навигация "Назад к курсу"** - исправлена с логами
9. ✅ **Навигация "Назад к модулю"** - исправлена с логами

### Дополнительно добавлено:

10. ✅ **Кнопки удаления модулей** - красная кнопка с иконкой корзины (появляется при hover)
11. ✅ **Кнопки удаления уроков** - красная кнопка с иконкой корзины (рядом с "Начать")
12. ✅ **Детальный отчёт** - создан `DELETE_BUTTONS_REPORT.md` для технического специалиста

### Как проверить что всё работает:

**1. Открыть консоль (F12) и перейти на страницу модуля:**
```
http://localhost:8080/course/1/module/2
```

**2. Нажать "Добавить урок" - должны появиться логи:**
```
=======================================
🔥 handleAddLesson вызвана
🔥 moduleId: 2
🔥 lessonDialog before: {open: false, lesson: null}
=======================================
✅ setLessonDialog вызван с open: true
=======================================
🔥 LessonEditDialog render
🔥 open: true
🔥 lesson: null
🔥 moduleId: 2
=======================================
```

**3. Диалог должен открыться поверх всего содержимого!**

---

**Приоритет:** ✅ Выполнено  
**Статус:** ✅ Всё исправлено (навигация ✅, поп-апы ✅, удаление ✅)  
**Ответственный:** Backend разработчик (для подключения API endpoints)

