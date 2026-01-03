# 🚀 Quick Start: UTM Tracking Selection Feature

## ⚡ 3-минутный запуск

### Шаг 1: Выполнить SQL миграцию (30 сек)

**Вариант A: Через Supabase Dashboard**
1. Открыть: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/editor
2. Кликнуть **SQL Editor**
3. Вставить и выполнить:

```sql
ALTER TABLE traffic_targetologist_settings
ADD COLUMN IF NOT EXISTS tracking_by TEXT DEFAULT 'utm_source';

UPDATE traffic_targetologist_settings
SET tracking_by = 'utm_source'
WHERE tracking_by IS NULL;
```

**Вариант B: Использовать готовый файл**
```bash
# Содержимое файла
cat sql/migrations/009_add_tracking_by_column.sql

# Скопировать содержимое и выполнить в SQL Editor
```

---

### Шаг 2: Проверить миграцию (30 сек)

```bash
cd backend
set -a && source .env && set +a
npx tsx scripts/test-team-constructor.ts
```

**Ожидаемый результат:**
```
✅ tracking_by column exists in traffic_targetologist_settings
```

Если видите ошибку `column does not exist` - вернитесь к Шагу 1.

---

### Шаг 3: Создать тестового пользователя Kenesary (2 мин)

#### Через UI (Рекомендуется)

1. Запустить frontend (если не запущен):
   ```bash
   npm run dev
   ```

2. Открыть браузер: http://localhost:5173/traffic/team-constructor

3. Залогиниться как admin (если требуется)

4. Создать команду **Kenesary** (если не существует):
   - Name: `Kenesary`
   - Direction: `Express Course`
   - Color: `#FF6B35`
   - Emoji: `🎯`

5. Создать пользователя:
   - Email: `kenesary@onai.academy`
   - Full Name: `Kenesary Targetologist`
   - Team: `Kenesary`
   - Password: `qwerty123` (или сгенерировать)
   - **Tracking by:** Выбрать **UTM Source** ← ВАЖНО
   - UTM Source: `fb_kenesary`
   - UTM Medium: `cpc`
   - Role: `Targetologist`

6. Нажать **"Создать пользователя"**

7. Проверить:
   - В списке должен появиться новый пользователь
   - Иконка: 🎯 (указывает на tracking by utm_source)
   - Надпись: `Трекинг: utm_source=fb_kenesary | medium=cpc`

#### Через Test Script (Альтернатива)

```bash
cd backend
set -a && source .env && set +a
npx tsx scripts/test-team-constructor.ts
```

---

### Шаг 4: Проверить работу (опционально)

1. Залогиниться как `kenesary@onai.academy` / `qwerty123`

2. Перейти в Traffic Dashboard: `/traffic/dashboard`

3. Проверить:
   - UTM метки должны быть предзаполнены: `fb_kenesary`
   - В настройках должно быть: `tracking_by: utm_source`

---

## 🎯 Как использовать

### Создание таргетолога с tracking по UTM Source (Рекомендуется для команд)

```
Team: Kenesary
UTM Source: fb_kenesary
UTM Medium: cpc
Tracking by: UTM Source ✅
```

→ Все продажи и лиды с `utm_source=fb_kenesary` будут привязаны к этому пользователю

---

### Создание аналитика с tracking по UTM Medium (Для анализа типов трафика)

```
Team: Analytics
UTM Source: fb_main
UTM Medium: social
Tracking by: UTM Medium ✅
```

→ Все продажи и лиды с `utm_medium=social` будут привязаны к этому пользователю

---

## 🔍 Troubleshooting

### ❌ Ошибка: "column tracking_by does not exist"

**Решение:** Выполните SQL миграцию (Шаг 1)

---

### ❌ Ошибка: "No token provided" при API запросах

**Решение:**
1. Залогиниться как admin в UI
2. Или использовать test script (он использует service role key)

---

### ❌ Backend не запускается

**Решение:**
```bash
cd backend
set -a && source .env && set +a
npm run dev
```

Проверить порт:
```bash
lsof -i :3000
```

---

### ❌ UI не показывает новые поля

**Решение:**
1. Убедиться что frontend пересобран: `npm run build` (если production)
2. Очистить кэш браузера: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
3. Проверить консоль браузера на ошибки

---

## 📊 Проверка через БД

```sql
-- Проверить что колонка создана
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'traffic_targetologist_settings'
  AND column_name = 'tracking_by';

-- Проверить пользователя Kenesary
SELECT
  u.email,
  u.team_name,
  u.utm_source,
  s.utm_medium,
  s.tracking_by
FROM traffic_users u
LEFT JOIN traffic_targetologist_settings s ON u.id = s.user_id
WHERE u.email = 'kenesary@onai.academy';
```

**Ожидаемый результат:**
```
email                  | team_name | utm_source   | utm_medium | tracking_by
-----------------------|-----------|--------------|-----------|--------------
kenesary@onai.academy  | Kenesary  | fb_kenesary  | cpc       | utm_source
```

---

## ✅ Success Criteria

- [x] SQL миграция выполнена без ошибок
- [x] Test script проходит успешно
- [x] UI показывает radio buttons для выбора tracking метода
- [x] При создании пользователя tracking_by сохраняется в БД
- [x] В списке пользователей отображается корректная иконка (🎯 или 📡)
- [x] Пользователь может залогиниться и видеть свои UTM метки

---

## 📚 Дополнительно

- Полный отчет: `TRACKING_BY_IMPLEMENTATION_REPORT.md`
- Test scripts: `backend/scripts/test-team-constructor.ts`
- SQL migrations: `sql/migrations/009_add_tracking_by_column.sql`

---

**Время выполнения:** ~3-5 минут
**Сложность:** ⭐⭐ (Easy)
**Статус:** ✅ Готов к запуску
