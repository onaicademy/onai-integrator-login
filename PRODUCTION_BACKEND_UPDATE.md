# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Backend не обновлён на production

## ❌ ОШИБКА НА PRODUCTION:

```
Error: Could not find the table 'public.tripwire_progress' in the schema cache
```

**Причина**: Backend на production сервере использует **СТАРЫЙ КОД**, который обращается к Supabase REST API вместо Direct DB (pg.Pool).

---

## ✅ РЕШЕНИЕ:

### 1. SSH на production сервер

```bash
ssh your-server-user@your-server-ip
# или
ssh your-production-server
```

### 2. Перейти в директорию backend

```bash
cd /path/to/onai-integrator-login/backend
# Пример:
# cd /var/www/onai-integrator-login/backend
# или
# cd ~/onai-integrator-login/backend
```

### 3. Проверить текущий commit

```bash
git log --oneline -1
# Должен быть: 2f1f125 или a0a1ba5
```

### 4. Pull новых изменений

```bash
git fetch origin
git pull origin main
```

### 5. Установить зависимости (если нужно)

```bash
npm install
```

### 6. Перезапустить PM2

```bash
pm2 restart all
# или
pm2 restart backend
# или
pm2 restart 0  # если это ID процесса
```

### 7. Проверить логи

```bash
pm2 logs
# Ищем:
# "✅ Tripwire Direct PostgreSQL: Connected successfully"
```

---

## 🔍 ПРОВЕРКА ПОСЛЕ ОБНОВЛЕНИЯ:

### Тест API endpoint:

```bash
# Проверка что backend работает
curl https://api.onai.academy/api/tripwire/stats

# Должен вернуть JSON с данными
```

### Тест завершения урока:

1. Открой: https://onai.academy/tripwire/lesson/67
2. Перемотай >80%
3. Нажми "ЗАВЕРШИТЬ УРОК"
4. **Должно работать** без ошибки 500

---

## 📋 КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ В BACKEND:

### `/backend/src/routes/tripwire-lessons.ts`
```typescript
// ❌ СТАРЫЙ КОД (на production сейчас):
const { data, error } = await adminSupabase
  .from('tripwire_progress')  // ← Ошибка schema cache!
  .select('video_progress_percent')

// ✅ НОВЫЙ КОД (должен быть):
const result = await client.query(`
  SELECT video_progress_percent 
  FROM student_progress 
  WHERE user_id = $1 AND lesson_id = $2
`, [user_id, lesson_id]);
```

### `/backend/src/routes/tripwire.ts`
```typescript
// ✅ НОВЫЙ КОД:
const { tripwirePool } = require('../config/tripwire-db');

await tripwirePool.query(`
  UPDATE module_unlocks 
  SET animation_shown = true 
  WHERE user_id = $1 AND module_id = $2
`, [userId, moduleId]);
```

---

## 🚨 ВАЖНО:

После обновления backend, **Vercel frontend автоматически заработает** с правильным backend API.

---

## 📊 ЧТО ПРОВЕРИТЬ:

- [ ] SSH на сервер
- [ ] `git pull origin main`
- [ ] `npm install`
- [ ] `pm2 restart all`
- [ ] `pm2 logs` (проверить что нет ошибок)
- [ ] Тест завершения урока на https://onai.academy

---

## 🔧 АЛЬТЕРНАТИВА (если нет SSH доступа):

Если нет прямого SSH доступа, можно:

1. **GitHub Actions** - настроить auto-deploy
2. **Vercel CLI** для backend (если backend на Vercel)
3. **Docker** - пересобрать и перезапустить контейнер

---

## ✅ ПОСЛЕ ОБНОВЛЕНИЯ:

Все должно работать:
- ✅ Кнопка "ЗАВЕРШИТЬ УРОК"
- ✅ Анимации unlock
- ✅ Навигация между модулями
- ✅ localStorage кэш
- ✅ Groq API (Whisper, Vision, Chat)
























