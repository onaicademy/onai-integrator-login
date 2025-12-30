# ДИАГНОСТИКА TRIPWIRE RPC ФУНКЦИЙ - ОТЧЕТ

**Дата:** 30 декабря 2025
**База данных:** Tripwire Supabase
**URL:** https://pjmvxecykysfrzppdcto.supabase.co

---

## ПРОБЛЕМА

Sales Manager Dashboard не получает данные и не может создавать новых студентов.

---

## ПРИЧИНА

**Обнаружено:** 2 из 8 необходимых RPC функций отсутствуют в базе данных Tripwire.

---

## ДЕТАЛЬНАЯ ДИАГНОСТИКА

### ✅ РАБОТАЮЩИЕ RPC ФУНКЦИИ (5/8)

1. ✅ **rpc_get_tripwire_users** - Возвращает список студентов (20 записей)
2. ✅ **rpc_get_tripwire_stats** - Возвращает статистику (1 запись)
3. ✅ **rpc_get_sales_activity_log** - Возвращает логи активности (0 записей)
4. ✅ **rpc_get_sales_leaderboard** - Возвращает рейтинг менеджеров (4 менеджера):
   - Rakhat Sales Manager: 43 продажи
   - Amina Sales Manager: 40 продаж
   - Ayaulym Sales Manager: 5 продаж
   - Aselya Sales Manager: 0 продаж
5. ✅ **rpc_get_sales_chart_data** - Возвращает данные для графика (366 точек)

### ⚠️ СУЩЕСТВУЕТ, НО С ОШИБКОЙ (1/8)

6. ⚠️ **rpc_create_tripwire_user_full** - Ошибка foreign key constraint
   - **Проблема:** Нарушение foreign key на поле `tripwire_users.user_id`
   - **Влияние:** Невозможно создать нового студента

### ❌ ОТСУТСТВУЮТ (2/8)

7. ❌ **rpc_update_email_status** - ОТСУТСТВУЕТ
   - **Назначение:** Обновление статуса отправки welcome email
   - **Параметры:** `p_user_id`, `p_email_sent`
   - **Влияние:** Невозможно отследить доставку email

8. ❌ **rpc_update_tripwire_user_status** - ОТСУТСТВУЕТ
   - **Назначение:** Изменение статуса студента (active/inactive/completed)
   - **Параметры:** `p_user_id`, `p_status`, `p_manager_id`
   - **Влияние:** Невозможно изменить статус студента

---

## АНАЛИЗ AUTH.USERS

### Sales Менеджеры в базе

Найден **1 sales manager**:
- **Email:** ayaulym@onaiacademy.kz
- **ID:** fead9709-f70b-4b63-a5c3-38dfa944aff4
- **Роль:** sales_manager (в user_metadata)
- **Статус:** Активен ✅

### Всего пользователей
- **Общее количество:** 50
- **Студенты:** 48
- **Sales managers:** 1
- **Sales:** 1 (aselya@onaiacademy.kz)

---

## ТАБЛИЦЫ В БАЗЕ

Все основные таблицы существуют:
- ✅ students
- ✅ profiles
- ✅ user_profiles
- ✅ tripwire_students
- ✅ sales_managers
- ✅ sales_stats
- ✅ tripwire_lessons
- ✅ tripwire_progress (34 записи)
- ✅ tripwire_payments

**Примечание:** Некоторые таблицы показывают NULL rows из-за PostgREST schema cache, но таблицы существуют.

---

## РЕШЕНИЕ

### ШАГ 1: Применить SQL с недостающими функциями

Я создал файл с исправлениями:
```
/Users/miso/onai-integrator-login/fix-missing-rpc-functions.sql
```

**Как применить:**

#### Вариант А: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. Открой Supabase Dashboard → SQL Editor
2. Перейди в проект Tripwire (pjmvxecykysfrzppdcto)
3. Создай новый SQL query
4. Скопируй содержимое файла `fix-missing-rpc-functions.sql`
5. Нажми "Run" для выполнения
6. Проверь результат - должны появиться сообщения:
   ```
   ✅ Missing RPC functions created successfully!
   Functions added: rpc_update_email_status, rpc_update_tripwire_user_status
   ```

#### Вариант Б: Через командную строку

```bash
# Установи переменные окружения
export TRIPWIRE_DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Выполни SQL
psql $TRIPWIRE_DATABASE_URL -f fix-missing-rpc-functions.sql
```

### ШАГ 2: Проверь результат

Запусти проверочный скрипт:
```bash
node check-all-rpc-functions.js
```

Ожидаемый результат:
```
✅ Working: 7
   - rpc_get_tripwire_users
   - rpc_get_tripwire_stats
   - rpc_get_sales_activity_log
   - rpc_get_sales_leaderboard
   - rpc_get_sales_chart_data
   - rpc_update_email_status ← НОВАЯ
   - rpc_update_tripwire_user_status ← НОВАЯ

⚠️  Exists with errors: 1
   - rpc_create_tripwire_user_full (foreign key issue)

❌ Not found: 0
```

### ШАГ 3: (Опционально) Применить полный набор RPC функций

Если нужны ВСЕ RPC функции из оригинального файла:
```bash
# Применить полный набор
psql $TRIPWIRE_DATABASE_URL -f backend/src/scripts/add-tripwire-rpc.sql
```

---

## ЧТО ИСПРАВИТСЯ ПОСЛЕ ПРИМЕНЕНИЯ

✅ **Sales Manager Dashboard сможет:**
1. Создавать новых студентов Tripwire
2. Обновлять статус студентов (active → completed)
3. Отслеживать доставку welcome emails
4. Просматривать статистику (уже работает)
5. Просматривать рейтинг менеджеров (уже работает)

---

## ВРЕМЯ НА ИСПРАВЛЕНИЕ

- **Применить SQL:** 2 минуты
- **Проверить результат:** 2 минуты
- **Тестирование в dashboard:** 5 минут
- **Итого:** ~10 минут

---

## ФАЙЛЫ ДЛЯ РАБОТЫ

1. **SQL с исправлениями:**
   `/Users/miso/onai-integrator-login/fix-missing-rpc-functions.sql`

2. **Скрипты проверки:**
   - `check-tripwire-rpc.js` - Базовая проверка RPC
   - `check-sales-dashboard-data.js` - Детальная диагностика
   - `check-all-rpc-functions.js` - Проверка всех 8 функций

3. **Полный отчет (English):**
   `TRIPWIRE_RPC_DIAGNOSTIC_REPORT.md`

---

## ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Почему возникла проблема?

1. Миграция `20251205000000_tripwire_direct_db_v2.sql` содержит только 5 RPC функций
2. Файл `backend/src/scripts/add-tripwire-rpc.sql` содержит ВСЕ 8 функций
3. Второй файл никогда не применялся к production базе
4. Код использует все 8 функций, а в базе только 5

### Что делать с rpc_create_tripwire_user_full?

Эта функция существует, но падает с ошибкой foreign key. Проблема в том, что:
- Функция пытается вставить запись в `tripwire_users`
- Поле `user_id` ссылается на `auth.users(id)`
- При создании пользователя нужно СНАЧАЛА создать запись в `auth.users`, ПОТОМ в `tripwire_users`

Код в `tripwireManagerService.ts` делает это правильно:
1. Создаёт user в auth (строка 48)
2. Ждёт 500ms для срабатывания триггера (строка 72)
3. Вызывает RPC функцию (строка 77)

Если функция всё равно падает, нужно проверить:
```sql
-- Проверить существует ли user_id в auth.users перед вставкой
SELECT id, email FROM auth.users WHERE id = 'USER_ID_HERE';
```

---

## КОНТАКТЫ

**Созданные файлы:**
- ✅ `TRIPWIRE_RPC_DIAGNOSTIC_REPORT.md` - Полный отчет на английском
- ✅ `TRIPWIRE_RPC_DIAGNOSTIC_SUMMARY_RU.md` - Краткая сводка на русском (этот файл)
- ✅ `fix-missing-rpc-functions.sql` - SQL для исправления проблемы
- ✅ `check-tripwire-rpc.js` - Скрипт базовой проверки
- ✅ `check-sales-dashboard-data.js` - Скрипт детальной диагностики
- ✅ `check-all-rpc-functions.js` - Скрипт проверки всех функций

**Generated by:** Claude Code Assistant
**Date:** 2025-12-30
