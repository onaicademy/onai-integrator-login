# 🧪 TRIPWIRE TESTING PLAN - ПОЛНОЕ ТЕСТИРОВАНИЕ

**Дата:** 2025-12-05  
**Цель:** Протестировать Tripwire Direct DB v2 на баги и ошибки  
**Время:** ~30-40 минут

---

## 📋 PRE-REQUIREMENTS (ОБЯЗАТЕЛЬНО!)

### ☑️ Checklist перед тестированием:

- [ ] ✅ Миграция применена в Supabase Dashboard
- [ ] ✅ `TRIPWIRE_DATABASE_URL` добавлен в `.env`
- [ ] ✅ Routes обновлены (импорт V2)
- [ ] ✅ `npm install pg` выполнен
- [ ] ✅ Backend перезапущен

**Без этого тесты НЕ БУДУТ работать!**

---

## 🎯 ПЛАН ТЕСТИРОВАНИЯ (10 ТЕСТОВ)

### БЛОК 1: СОЗДАНИЕ СТУДЕНТА (Тесты 1-3)
- ✅ Тест 1.1: Создание студента через API
- ✅ Тест 1.2: Проверка всех 9 таблиц в БД
- ✅ Тест 1.3: Проверка Module 16 открыт

### БЛОК 2: ТРЕКИНГ ВИДЕО (Тесты 4-5)
- ✅ Тест 2.1: Обновление прогресса видео (50%)
- ✅ Тест 2.2: Достижение 80% правила

### БЛОК 3: ЗАВЕРШЕНИЕ УРОКА (Тесты 6-7)
- ✅ Тест 3.1: Завершение Lesson 67 (Module 16)
- ✅ Тест 3.2: Автооткрытие Module 17

### БЛОК 4: ПОЛНЫЙ FLOW (Тест 8)
- ✅ Тест 4.1: Прохождение всех 3 модулей
- ✅ Тест 4.2: Получение сертификата

### БЛОК 5: SALES DASHBOARD (Тесты 9-10)
- ✅ Тест 5.1: Статистика Sales Manager
- ✅ Тест 5.2: Leaderboard

---

## 🧪 БЛОК 1: СОЗДАНИЕ СТУДЕНТА

### Тест 1.1: Создание студента через API

**Команда:**
```bash
curl -X POST http://localhost:8080/api/tripwire/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "test-tripwire-1@example.com",
    "full_name": "Test Tripwire Student",
    "password": "test123456",
    "granted_by": "SALES_MANAGER_UUID",
    "manager_name": "Test Manager"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "user_id": "uuid-here",
  "email": "test-tripwire-1@example.com",
  "message": "Tripwire user created successfully (Direct DB v2)"
}
```

**🔍 Что проверяем:**
- ✅ HTTP 201 Created
- ✅ Возвращается `user_id`
- ✅ `success: true`

**❌ Возможные ошибки:**
- "Missing TRIPWIRE_DATABASE_URL" → добавь в `.env`
- "Failed to create auth user" → проверь `TRIPWIRE_SERVICE_ROLE_KEY`
- "Connection timeout" → проверь что backend запущен

---

### Тест 1.2: Проверка всех 9 таблиц в БД

**Замени `USER_ID` на полученный из Теста 1.1**

**Команда (через Supabase SQL Editor):**
```sql
-- Сохрани user_id для следующих тестов
\set test_user_id 'USER_ID_FROM_TEST_1_1'

-- 1. public.users
SELECT * FROM public.users WHERE id = :test_user_id;

-- 2. tripwire_users
SELECT * FROM public.tripwire_users WHERE user_id = :test_user_id;

-- 3. tripwire_user_profile
SELECT * FROM public.tripwire_user_profile WHERE user_id = :test_user_id;

-- 4. module_unlocks (должен быть Module 16)
SELECT * FROM public.module_unlocks WHERE user_id = :test_user_id;

-- 5. student_progress (должен быть Lesson 67)
SELECT * FROM public.student_progress WHERE user_id = :test_user_id;

-- 6. video_tracking (должен быть Lesson 67 с 0%)
SELECT * FROM public.video_tracking WHERE user_id = :test_user_id;

-- 7. user_achievements (должно быть 4 achievement)
SELECT * FROM public.user_achievements WHERE user_id = :test_user_id;

-- 8. user_statistics
SELECT * FROM public.user_statistics WHERE user_id = :test_user_id;

-- 9. sales_activity_log
SELECT * FROM public.sales_activity_log WHERE target_user_id = :test_user_id;
```

**Ожидаемые результаты:**

| Таблица | Количество записей | Ключевые поля |
|---------|-------------------|---------------|
| `users` | 1 | `role = 'student'` |
| `tripwire_users` | 1 | `status = 'active'`, `modules_completed = 0` |
| `tripwire_user_profile` | 1 | `total_modules = 3`, `modules_completed = 0` |
| `module_unlocks` | 1 | `module_id = 16` |
| `student_progress` | 1 | `lesson_id = 67`, `status = 'not_started'` |
| `video_tracking` | 1 | `lesson_id = 67`, `watch_percentage = 0` |
| `user_achievements` | 4 | `is_completed = false` для всех |
| `user_statistics` | 1 | `lessons_completed = 0` |
| `sales_activity_log` | 1 | `action_type = 'user_created'` |

**❌ Если чего-то нет:**
- Транзакция упала → проверь backend логи
- Проверь: `npm logs backend` или `pm2 logs backend`

---

### Тест 1.3: Проверка Module 16 открыт

**Команда:**
```sql
-- Проверяем что ТОЛЬКО Module 16 открыт
SELECT 
  module_id,
  unlocked_at
FROM public.module_unlocks 
WHERE user_id = :test_user_id
ORDER BY module_id;
```

**Ожидаемый результат:**
```
module_id | unlocked_at
----------|-------------
16        | 2025-12-05 ...
```

**🔍 Что проверяем:**
- ✅ ТОЛЬКО Module 16 (не 17, не 18)
- ✅ `unlocked_at` заполнен

**✅ БЛОК 1 ПРОЙДЕН!**

---

## 🎥 БЛОК 2: ТРЕКИНГ ВИДЕО

### Тест 2.1: Обновление прогресса видео (50%)

**Команда:**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/67/video-tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID_FROM_TEST_1_1",
    "watched_segments": [
      {"start": 0, "end": 150},
      {"start": 150, "end": 300}
    ],
    "video_duration": 600,
    "current_position": 300
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "watch_percentage": 50,
  "is_qualified": false,
  "total_watched_seconds": 300
}
```

**🔍 Что проверяем:**
- ✅ `watch_percentage = 50`
- ✅ `is_qualified = false` (ещё нет 80%)
- ✅ Segments объединились корректно

**Проверка в БД:**
```sql
SELECT 
  watch_percentage,
  is_qualified_for_completion,
  total_watched_seconds,
  watched_segments
FROM public.video_tracking 
WHERE user_id = :test_user_id AND lesson_id = 67;
```

**Ожидаемый результат:**
```
watch_percentage | is_qualified_for_completion | total_watched_seconds
-----------------|----------------------------|----------------------
50               | false                      | 300
```

---

### Тест 2.2: Достижение 80% правила

**Команда:**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/67/video-tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID_FROM_TEST_1_1",
    "watched_segments": [
      {"start": 0, "end": 150},
      {"start": 150, "end": 300},
      {"start": 300, "end": 500}
    ],
    "video_duration": 600,
    "current_position": 500
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "watch_percentage": 83,
  "is_qualified": true,
  "total_watched_seconds": 500
}
```

**🔍 Что проверяем:**
- ✅ `watch_percentage >= 80`
- ✅ `is_qualified = true` ← **ВАЖНО!**

**Проверка в БД:**
```sql
SELECT 
  watch_percentage,
  is_qualified_for_completion
FROM public.video_tracking 
WHERE user_id = :test_user_id AND lesson_id = 67;
```

**Ожидаемый результат:**
```
watch_percentage | is_qualified_for_completion
-----------------|----------------------------
83               | true
```

**✅ БЛОК 2 ПРОЙДЕН!**

---

## ✅ БЛОК 3: ЗАВЕРШЕНИЕ УРОКА

### Тест 3.1: Завершение Lesson 67 (Module 16)

**Команда:**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/67/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID_FROM_TEST_1_1",
    "module_id": 16
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "modules_completed": 1,
  "next_module_unlocked": true,
  "certificate_issued": false
}
```

**🔍 Что проверяем:**
- ✅ `modules_completed = 1`
- ✅ `next_module_unlocked = true` ← **Module 17 должен открыться!**
- ✅ `certificate_issued = false` (ещё рано)

**Проверка в БД:**
```sql
-- 1. student_progress должен быть 'completed'
SELECT status, completed_at 
FROM public.student_progress 
WHERE user_id = :test_user_id AND lesson_id = 67;

-- Ожидаем: status = 'completed', completed_at IS NOT NULL

-- 2. tripwire_users.modules_completed = 1
SELECT modules_completed 
FROM public.tripwire_users 
WHERE user_id = :test_user_id;

-- Ожидаем: modules_completed = 1

-- 3. achievement 'first_module_complete' завершён
SELECT is_completed, completed_at 
FROM public.user_achievements 
WHERE user_id = :test_user_id AND achievement_id = 'first_module_complete';

-- Ожидаем: is_completed = true, completed_at IS NOT NULL
```

---

### Тест 3.2: Автооткрытие Module 17

**Команда:**
```sql
-- Проверяем что Module 17 открылся автоматически
SELECT module_id, unlocked_at 
FROM public.module_unlocks 
WHERE user_id = :test_user_id
ORDER BY module_id;
```

**Ожидаемый результат:**
```
module_id | unlocked_at
----------|-------------
16        | 2025-12-05 ...
17        | 2025-12-05 ...  ← НОВАЯ ЗАПИСЬ!
```

**Проверяем student_progress для Lesson 68:**
```sql
SELECT lesson_id, module_id, status 
FROM public.student_progress 
WHERE user_id = :test_user_id AND lesson_id = 68;
```

**Ожидаемый результат:**
```
lesson_id | module_id | status
----------|-----------|-------------
68        | 17        | not_started
```

**Проверяем video_tracking для Lesson 68:**
```sql
SELECT lesson_id, watch_percentage 
FROM public.video_tracking 
WHERE user_id = :test_user_id AND lesson_id = 68;
```

**Ожидаемый результат:**
```
lesson_id | watch_percentage
----------|------------------
68        | 0
```

**✅ БЛОК 3 ПРОЙДЕН!**

---

## 🏆 БЛОК 4: ПОЛНЫЙ FLOW (3 МОДУЛЯ)

### Тест 4.1: Прохождение Module 17

**Шаг 1: Досмотреть видео Lesson 68 до 80%+**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/68/video-tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "watched_segments": [{"start": 0, "end": 500}],
    "video_duration": 600,
    "current_position": 500
  }'
```

**Шаг 2: Завершить Lesson 68**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/68/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "module_id": 17
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "modules_completed": 2,
  "next_module_unlocked": true,
  "certificate_issued": false
}
```

**Проверка: Module 18 открылся?**
```sql
SELECT module_id FROM public.module_unlocks 
WHERE user_id = :test_user_id
ORDER BY module_id;
```

**Ожидаем: 16, 17, 18 ✅**

---

### Тест 4.2: Завершение Module 18 → Сертификат

**Шаг 1: Досмотреть видео Lesson 69 до 80%+**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/69/video-tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "watched_segments": [{"start": 0, "end": 500}],
    "video_duration": 600,
    "current_position": 500
  }'
```

**Шаг 2: Завершить Lesson 69 (ФИНАЛЬНЫЙ УРОК)**
```bash
curl -X POST http://localhost:8080/api/tripwire/lessons/69/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "module_id": 18
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "modules_completed": 3,
  "next_module_unlocked": false,
  "certificate_issued": true  ← 🎓 СЕРТИФИКАТ ВЫДАН!
}
```

**🔍 Проверка сертификата в БД:**
```sql
-- 1. tripwire_user_profile
SELECT 
  modules_completed,
  completion_percentage,
  certificate_issued,
  certificate_url
FROM public.tripwire_user_profile 
WHERE user_id = :test_user_id;
```

**Ожидаемый результат:**
```
modules_completed | completion_percentage | certificate_issued | certificate_url
------------------|-----------------------|--------------------|-----------------
3                 | 100                   | true               | https://onai.academy/certificates/tripwire/USER_ID
```

**2. tripwire_users.status**
```sql
SELECT status, modules_completed 
FROM public.tripwire_users 
WHERE user_id = :test_user_id;
```

**Ожидаемый результат:**
```
status    | modules_completed
----------|------------------
completed | 3
```

**3. Achievement 'tripwire_graduate'**
```sql
SELECT is_completed, completed_at 
FROM public.user_achievements 
WHERE user_id = :test_user_id AND achievement_id = 'tripwire_graduate';
```

**Ожидаемый результат:**
```
is_completed | completed_at
-------------|-------------
true         | 2025-12-05 ...
```

**✅ БЛОК 4 ПРОЙДЕН! 🎉**

---

## 📊 БЛОК 5: SALES DASHBOARD

### Тест 5.1: Статистика Sales Manager

**Команда:**
```bash
curl "http://localhost:8080/api/tripwire/sales/stats?managerId=SALES_MANAGER_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "total_students": 1,
  "active_students": 0,
  "completed_students": 1,
  "total_revenue": 5000,
  "avg_completion_rate": 100,
  "students_this_month": 1,
  "revenue_this_month": 5000
}
```

**🔍 Что проверяем:**
- ✅ `total_students = 1`
- ✅ `completed_students = 1`
- ✅ `total_revenue = 5000`
- ✅ `avg_completion_rate = 100`

---

### Тест 5.2: Leaderboard

**Команда:**
```bash
curl "http://localhost:8080/api/tripwire/sales/leaderboard?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
```json
[
  {
    "manager_id": "SALES_MANAGER_UUID",
    "manager_name": "Test Manager",
    "email": "manager@example.com",
    "total_students": 1,
    "active_students": 0,
    "completed_students": 1,
    "total_revenue": 5000,
    "avg_completion_rate": 100
  }
]
```

**✅ БЛОК 5 ПРОЙДЕН!**

---

## 🚨 БАГИ И EDGE CASES

### Баг #1: Попытка завершить урок без 80% просмотра

**Команда:**
```bash
# Создаём нового студента
# Пропускаем video tracking
# Сразу пытаемся завершить урок

curl -X POST http://localhost:8080/api/tripwire/lessons/67/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "NEW_USER_ID",
    "module_id": 16
  }'
```

**Ожидаемый результат: ОШИБКА**
```json
{
  "error": "Video not watched enough (need 80%+ to complete lesson)",
  "code": "INSUFFICIENT_WATCH_TIME"
}
```

**✅ Баг НЕ пройдёт!**

---

### Баг #2: Duplicate студент (один email дважды)

**Команда:**
```bash
# Пытаемся создать студента с тем же email
curl -X POST http://localhost:8080/api/tripwire/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "test-tripwire-1@example.com",
    "full_name": "Duplicate",
    "password": "test123",
    "granted_by": "MANAGER_UUID",
    "manager_name": "Manager"
  }'
```

**Ожидаемый результат: ОШИБКА**
```json
{
  "error": "Failed to create auth user: User already registered"
}
```

**✅ Duplicate защищён!**

---

### Баг #3: Перемотка видео (skip) не учитывается

**Команда:**
```bash
# Отправляем segments с пропусками
curl -X POST http://localhost:8080/api/tripwire/lessons/67/video-tracking \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "watched_segments": [
      {"start": 0, "end": 10},
      {"start": 500, "end": 600}
    ],
    "video_duration": 600,
    "current_position": 600
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "watch_percentage": 18,  // (10 + 100) / 600 * 100
  "is_qualified": true,     // current_position >= 80% (перемотнул)
  "total_watched_seconds": 110
}
```

**🔍 Честный трекинг:**
- Реально просмотрено: 110 секунд (18%)
- Но перемотнул на 100% → `is_qualified = true`
- **Можно завершить урок!** ✅

---

## 📊 ФИНАЛЬНЫЙ CHECKLIST

### ✅ Что должно работать:

- [ ] Создание студента → 9 таблиц заполняются
- [ ] Module 16 открыт по умолчанию
- [ ] Трекинг видео работает (segments merge)
- [ ] 80% правило работает
- [ ] Завершение урока открывает следующий модуль
- [ ] Module 17 открывается автоматически
- [ ] Module 18 открывается автоматически
- [ ] Сертификат выдаётся после Module 18
- [ ] Статистика Sales Manager работает (RPC)
- [ ] Leaderboard работает (RPC)
- [ ] Duplicate email защищён
- [ ] Нельзя завершить урок без 80%

---

## 🐛 ИЗВЕСТНЫЕ БАГИ (если найдём)

### Баг #1: [Название]
- **Описание:**
- **Как воспроизвести:**
- **Ожидаемое поведение:**
- **Фактическое поведение:**
- **Приоритет:** Критический / Высокий / Средний / Низкий
- **Статус:** Не исправлен / В работе / Исправлен

---

## 🎉 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ

**После выполнения всех тестов заполни:**

- **Всего тестов:** 10
- **Пройдено:** __/10
- **Провалено:** __/10
- **Баги найдены:** __
- **Критичные баги:** __

**Готово к production?** ✅ ДА / ❌ НЕТ

---

**НАЧИНАЕМ ТЕСТИРОВАНИЕ!** 🚀

**Следующий шаг:** Применить миграцию через `APPLY_MIGRATION_INSTRUCTIONS.md`
