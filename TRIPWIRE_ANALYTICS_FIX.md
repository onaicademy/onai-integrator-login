# ✅ ИСПРАВЛЕНИЕ: Аналитика ТОЛЬКО для Tripwire студентов

**Дата:** 1 декабря 2025
**Статус:** ✅ Выполнено и протестировано

---

## 🎯 ПРОБЛЕМА

Аналитика в админке Tripwire считала **ВСЕХ студентов платформы**, а не только тех, кто записан на курс Tripwire.

**ДО исправления:**
- `GET /api/tripwire/admin/stats` → считал всех `users` с `role='student'`
- `GET /api/tripwire/admin/students` → показывал всех студентов платформы

---

## ✅ РЕШЕНИЕ

Обновлен файл: **`backend/src/routes/tripwire/admin.ts`**

### 📊 Что изменилось:

#### 1. **GET /api/tripwire/admin/stats**

**БЫЛО:**
```typescript
const { count: totalStudents } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'student'); // ❌ Все студенты платформы
```

**СТАЛО:**
```typescript
const { data: tripwireProfiles } = await supabase
  .from('tripwire_user_profile')
  .select('user_id, modules_completed, total_modules');
  
const totalStudents = tripwireProfiles?.length || 0; // ✅ Только Tripwire
```

**Изменения:**
- ✅ **total_students** - берём из `tripwire_user_profile`
- ✅ **active_students** - фильтруем только Tripwire `user_id`
- ✅ **completed_students** - используем `modules_completed >= total_modules`
- ✅ **transcriptions** - фильтруем по `lesson_id` Tripwire модуля (ID=1)

---

#### 2. **GET /api/tripwire/admin/students**

**БЫЛО:**
```typescript
const { data: students } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'student'); // ❌ Все студенты
```

**СТАЛО:**
```typescript
const { data: tripwireProfiles } = await supabase
  .from('tripwire_user_profile')
  .select('user_id, modules_completed, total_modules, completion_percentage');

const userIds = tripwireProfiles.map(p => p.user_id);

const { data: users } = await supabase
  .from('users')
  .select('id, email, full_name, created_at')
  .in('id', userIds); // ✅ Только Tripwire студенты
```

**Изменения:**
- ✅ Получаем ТОЛЬКО студентов из `tripwire_user_profile`
- ✅ Показываем `completed_modules / total_modules`
- ✅ Показываем `progress_percent` из профиля Tripwire

---

## 🧪 ТЕСТИРОВАНИЕ

### Команда для теста:
```bash
cd backend && npm run build
# Backend уже запущен с nodemon

node test-tripwire-api.js
```

### Результаты:
```
✅ GET /api/tripwire/admin/stats
   Студентов Tripwire: 1  # ✅ Было: 50+ (все студенты платформы)
   Активных: 0
   Завершили: 0
   Completion Rate: 0.00%

✅ GET /api/tripwire/admin/students
   Найдено студентов: 1   # ✅ Было: 50+ (все студенты)
   Пример: saint@onaiacademy.kz - 0/3 модулей

🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!
```

---

## 📚 СТРУКТУРА TRIPWIRE В БД

### Таблицы:
- **`tripwire_user_profile`** - профили студентов Tripwire
  - `user_id` (UUID) - связь с `users.id`
  - `modules_completed` - завершено модулей
  - `total_modules` - всего модулей (обычно 3)
  - `completion_percentage` - процент завершения

- **`tripwire_progress`** - прогресс по урокам
  - `tripwire_user_id` (string)
  - `lesson_id` (integer)
  - `is_completed` (boolean)

### Курс Tripwire:
- **Курс ID:** 4 ("Полный тестовый курс")
- **Модуль ID:** 1
- **Уроки:** 29, 31

---

## 🚀 ДЕПЛОЙ

### Команда для деплоя на production:
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && \
  git pull origin main && \
  cd backend && \
  npm install --production && \
  npm run build && \
  pm2 restart onai-backend && \
  pm2 logs onai-backend --lines 20"
```

---

## 📝 ЗАМЕТКИ

### TODO (если понадобится в будущем):
- [ ] Добавить поле `last_activity_at` в `public.users` для точного трекинга активности
- [ ] Добавить поле `project` в `usage_costs` для фильтрации затрат по Tripwire
- [ ] Рассмотреть кеширование статистики для оптимизации производительности

### Исправленные проблемы:
- ❌ Ошибка `column users.last_sign_in_at does not exist` - исправлено (используем `created_at`)

---

## 📊 IMPACT

**ДО:**
- Аналитика показывала всех студентов платформы (~50+ человек)
- Невозможно было отследить реальный прогресс Tripwire курса

**ПОСЛЕ:**
- Аналитика показывает ТОЛЬКО Tripwire студентов (1 человек)
- Точная статистика по завершению модулей
- Корректный расчет completion rate для Tripwire

---

✅ **Задача выполнена!** API теперь корректно считает статистику только для студентов Tripwire курса.

