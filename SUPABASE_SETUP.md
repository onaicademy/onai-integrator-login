# 🎯 Supabase Integration - Complete Setup Guide

## ✅ Что уже настроено

### 1. ✅ CLI установлен
```bash
npm install supabase --save-dev
```

### 2. ✅ Файлы конфигурации созданы
- `supabase/config.toml` - конфигурация CLI
- `supabase/schema.sql` - схема БД с таблицами и RLS
- `supabase/README.md` - документация по миграциям

### 3. ✅ Клиент Supabase настроен
- `src/lib/supabase.ts` - клиент для работы с API
- Типизация в `src/vite-env.d.ts`

### 4. ✅ Переменные окружения
- `.env` файл с URL и ANON_KEY
- `.gitignore` настроен для защиты `.env`

### 5. ✅ Тестовый вызов добавлен
- В `src/pages/Index.tsx` есть тестовый запрос к таблице `users`

---

## 🚀 Следующий шаг: Применить миграцию

### ⚠️ ВАЖНО: Нужны права на Supabase проект!

Для применения миграции у вас должен быть доступ к управлению базой данных Supabase.

### Вариант 1: Через Dashboard (самый простой) ⭐ РЕКОМЕНДУЕТСЯ

1. Откройте https://supabase.com/dashboard
2. Войдите в аккаунт
3. Выберите проект **"onai-academy"** (или создайте новый)
4. Перейдите в **SQL Editor** → **New query**
5. Скопируйте весь код из `supabase/schema.sql`
6. Нажмите **Run**

### Вариант 2: Через CLI (требует авторизации)

```bash
# 1. Авторизуйтесь в Supabase CLI
npx supabase login

# 2. Свяжите проект с локальным CLI
npx supabase link --project-ref <YOUR_PROJECT_REF>

# 3. Примените миграцию
npm run db:push
```

### Вариант 3: Через psql (если есть прямой доступ к БД)

```bash
psql -h db.onai-academy.supabase.co -U postgres -d postgres -f supabase/schema.sql
```

---

## 🔍 Проверка работы

После применения миграции:

1. Откройте http://localhost:8080
2. Откройте DevTools Console (F12)
3. Проверьте вывод:
   ```
   Testing Supabase connection...
   URL: https://onai-academy.supabase.co
   Key: Loaded
   Supabase users data: []  (пусто, если таблица новая)
   Supabase error: null     (нет ошибок)
   ```

---

## 📊 Что создаст миграция

### Таблицы:
- ✅ `users` - пользователи (email, full_name, avatar_url, role)
- ✅ `courses` - курсы обучения
- ✅ `modules` - модули курсов
- ✅ `lessons` - уроки модулей
- ✅ `progress` - прогресс пользователей
- ✅ `achievements` - достижения
- ✅ `user_achievements` - связь пользователи-достижения

### Безопасность:
- ✅ Row Level Security (RLS) включен на всех таблицах
- ✅ Политики доступа настроены
- ✅ Пользователи видят только свои данные

---

## 💡 Использование в коде

```typescript
import { supabase } from "@/lib/supabase";

// Получить список курсов
const { data: courses, error } = await supabase
  .from('courses')
  .select('*');

// Добавить прогресс пользователя
const { data, error } = await supabase
  .from('progress')
  .insert({ 
    user_id: userId,
    lesson_id: lessonId,
    is_completed: true,
    xp_earned: 100
  });

// Получить достижения пользователя
const { data: achievements } = await supabase
  .from('user_achievements')
  .select(`
    *,
    achievements (*)
  `)
  .eq('user_id', userId);
```

---

## 📝 Полезные ссылки

- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Docs: https://supabase.com/docs
- SQL Editor: https://supabase.com/dashboard/project/_/sql
- API Reference: https://supabase.com/docs/reference/javascript

---

**Все готово к применению миграции!** 🎉

