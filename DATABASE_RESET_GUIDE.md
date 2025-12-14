# 🔄 SUPABASE DATABASE RESET SYSTEM

Система для безопасной очистки и сброса базы данных Supabase.

---

## 📋 СОЗДАННЫЕ ФАЙЛЫ

### Scripts:
- `scripts/backup-schema.ts` - Создание backup схемы БД
- `scripts/reset-database.ts` - Полная очистка БД

### Migrations:
- `supabase/migrations/0001_init_FIXED.sql` - Начальная миграция (обновление существующей БД)

### Утилиты:
- `check-current-schema.sql` - Проверка текущей структуры БД

---

## 🚀 КОМАНДЫ NPM

```bash
# Создать backup схемы БД
npm run db:backup

# Показать предупреждение (требует --confirm)
npm run db:reset

# Полностью очистить БД (с подтверждением)
npm run db:reset:confirm

# Очистить БД и применить начальные миграции
npm run db:reset:full
```

---

## 📖 ИСПОЛЬЗОВАНИЕ

### 1️⃣ Создать Backup

```bash
npm run db:backup
```

**Результат:**
- `backups/schema-backup-YYYY-MM-DD.json` - JSON dump всей структуры
- `backups/schema-backup-YYYY-MM-DD.sql` - SQL скрипт для восстановления

**Что сохраняется:**
- ✅ Все таблицы и их структура
- ✅ RLS политики
- ✅ Функции и триггеры
- ✅ Индексы
- ✅ Storage buckets конфигурация

---

### 2️⃣ Полная Очистка БД

```bash
npm run db:reset:confirm
```

**⚠️ ВНИМАНИЕ: Необратимая операция!**

**Что удаляется:**
- 🗑️ Все таблицы в public schema
- 🗑️ Все RLS политики
- 🗑️ Все триггеры и функции
- 🗑️ Все данные в Storage buckets
- 🗑️ Все индексы

**Процесс:**
1. Автоматически создаётся backup
2. Удаляются триггеры
3. Удаляются функции
4. Удаляются таблицы с CASCADE
5. Очищаются Storage buckets
6. Сбрасываются миграции

---

### 3️⃣ Полный Сброс с Миграциями

```bash
npm run db:reset:full
```

Делает всё то же самое + автоматически применяет начальные миграции:
```bash
npx supabase db push
```

---

## 🔧 РУЧНОЙ РЕЖИМ

### Backup через TypeScript:

```bash
ts-node scripts/backup-schema.ts
```

### Reset через TypeScript:

```bash
# С подтверждением
ts-node scripts/reset-database.ts --confirm

# С применением миграций
ts-node scripts/reset-database.ts --confirm --apply-migrations
```

---

## 📊 ПРОВЕРКА СТРУКТУРЫ БД

Перед сбросом можно проверить текущую структуру:

```bash
# В Supabase SQL Editor выполни:
cat check-current-schema.sql
```

Или используй этот SQL:

```sql
SELECT 
  table_name,
  string_agg(column_name || ':' || data_type, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

---

## ⚙️ REQUIREMENTS

### Environment Variables (.env):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Dependencies:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.78.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "dotenv": "^17.2.3",
    "typescript": "^5.8.3"
  }
}
```

---

## 🛡️ БЕЗОПАСНОСТЬ

### ✅ Защита от случайного удаления:

1. **Флаг --confirm** обязателен
2. **Автоматический backup** перед удалением
3. **Подробное логирование** всех операций
4. **Service Role Key** требуется (не работает с обычным anon key)

### ❌ Что НЕ делает скрипт:

- ❌ Не удаляет Supabase Auth пользователей
- ❌ Не удаляет Edge Functions
- ❌ Не изменяет настройки проекта Supabase
- ❌ Не удаляет Storage buckets (только очищает файлы)

---

## 📝 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: Локальная разработка

```bash
# Сохраняем текущую БД
npm run db:backup

# Экспериментируем с чистой БД
npm run db:reset:full

# Если что-то пошло не так - восстанавливаем из backup
# (вручную через Supabase SQL Editor)
```

### Пример 2: Подготовка к продакшену

```bash
# Создаём чистую структуру
npm run db:reset:full

# Заливаем production data
psql -h db.xxx.supabase.co -U postgres -f production-data.sql
```

### Пример 3: Тестирование миграций

```bash
# Очищаем БД
npm run db:reset:confirm

# Применяем миграции по одной
npx supabase db push --file supabase/migrations/001_xxx.sql
npx supabase db push --file supabase/migrations/002_xxx.sql
```

---

## 🐛 TROUBLESHOOTING

### Ошибка: "SUPABASE_SERVICE_ROLE_KEY not found"

**Решение:**
1. Открой https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Скопируй `service_role` ключ (секретный!)
3. Добавь в `.env`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

### Ошибка: "Permission denied"

**Причина:** Используется anon key вместо service_role key

**Решение:** Убедись что в `.env` указан **service_role** ключ, а не **anon** ключ

### Ошибка: "Cannot drop table ... because other objects depend on it"

**Причина:** Есть зависимости между таблицами

**Решение:** Скрипт использует `DROP ... CASCADE`, это должно решить проблему автоматически

---

## 📦 BACKUP СТРУКТУРА

### JSON Backup содержит:

```json
{
  "timestamp": "2025-11-18T12:00:00.000Z",
  "supabase_url": "https://xxx.supabase.co",
  "tables": [...],
  "rls_policies": [...],
  "functions": [...],
  "triggers": [...],
  "storage_buckets": [...],
  "indexes": [...]
}
```

### SQL Backup содержит:

```sql
-- TABLES
CREATE TABLE users (...);
CREATE TABLE courses (...);

-- INDEXES
CREATE INDEX idx_xxx ON table(column);

-- RLS POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_name" ON users FOR SELECT USING (...);
```

---

## ⚡ BEST PRACTICES

1. **Всегда делай backup** перед reset
2. **Используй на development**, не на production
3. **Проверяй .env** перед запуском
4. **Сохраняй backup** в безопасное место
5. **Тестируй миграции** на локальной копии БД

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Backup Guide](https://www.postgresql.org/docs/current/backup.html)

---

**✅ СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ!**

Для начала работы:
```bash
npm install
npm run db:backup
```
