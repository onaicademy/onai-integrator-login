# ⚡ БЫСТРАЯ СПРАВКА: Исправление дубликатов в AmoCRM

## 🎯 ЧТО БЫЛО СДЕЛАНО

**Проблема:** Дубликаты лидов в AmoCRM от одного пользователя (профтест, экспресс-курс)

**Причина:** Race condition - два запроса одновременно → два лида

**Решение:** 
1. ✅ Distributed Lock (мьютекс через Redis) - гарантирует один лид на пользователя
2. ✅ Детальное логирование - видно каждый шаг создания лида
3. ✅ Admin API - мониторинг блокировок в реальном времени

## 🚀 ЧТОБЫ ЗАДЕПЛОИТЬ

```bash
# 1. На сервере - проверить что Redis запущен
redis-cli ping
# Ответ: PONG

# 2. Git pull
cd /path/to/onai-integrator-login/backend
git pull origin main

# 3. Включить Redis в env.env
grep "REDIS_ENABLED" env.env
# Должно быть: REDIS_ENABLED=true

# Если false - исправить:
sed -i 's/REDIS_ENABLED=false/REDIS_ENABLED=true/' env.env

# 4. Restart backend
pm2 restart onai-backend

# 5. Проверить что работает
curl http://localhost:3000/api/admin/amocrm-locks/status | jq
# Ожидаем: "locks_enabled": true

# 6. Проверить логи
pm2 logs onai-backend --lines 50
# Должны видеть: 🔒 Lock ACQUIRED, 🔓 Lock RELEASED
```

## ✅ КАК ПРОВЕРИТЬ ЧТО РАБОТАЕТ

### Проверка 1: Статус системы
```bash
curl http://localhost:3000/api/admin/amocrm-locks/status
```
Ожидаем:
```json
{
  "system": {
    "redis_connected": true,
    "locks_enabled": true
  },
  "message": "✅ Lock system operational"
}
```

### Проверка 2: Отправить дубликат
```bash
# Отправить профтест
curl -X POST http://localhost:3000/api/landing/proftest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@onai.academy",
    "phone": "+77771112233",
    "source": "proftest_main",
    "proftestAnswers": []
  }'

# Подождать 2 сек

# Отправить еще раз с ТЕМИ ЖЕ данными
curl -X POST http://localhost:3000/api/landing/proftest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@onai.academy",
    "phone": "+77771112233",
    "source": "proftest_main",
    "proftestAnswers": []
  }'
```

**Ожидаемое поведение:**
- Первый запрос → создает НОВЫЙ лид
- Второй запрос → ОБНОВЛЯЕТ существующий лид (НЕ создает дубликат!)

**Проверить в AmoCRM:** Должен быть ОДИН лид с email `test@onai.academy`

### Проверка 3: Логи
```bash
pm2 logs onai-backend --lines 100 | grep "test@onai.academy"
```

Должны видеть:
```
🔒 Lock ACQUIRED: amocrm:lead:test@onai.academy:...
🔍 [DEDUP] Starting duplicate check
✅ Found ACTIVE lead: ID 12345
🔄 [DEDUP] Will UPDATE existing lead
🔓 Lock RELEASED
```

## 📊 МОНИТОРИНГ

### Посмотреть активные блокировки:
```bash
curl http://localhost:3000/api/admin/amocrm-locks
```

### Очистить застрявшие блокировки (если нужно):
```bash
curl -X DELETE http://localhost:3000/api/admin/amocrm-locks
```

## ⚠️ ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Redis not connected:
```bash
# Проверить что Redis запущен
sudo systemctl status redis

# Запустить если не запущен
sudo systemctl start redis
sudo systemctl enable redis

# Restart backend
pm2 restart onai-backend
```

### Дубликаты все еще создаются:
```bash
# 1. Проверить что Redis включен
curl http://localhost:3000/api/admin/amocrm-locks/status
# locks_enabled ДОЛЖЕН быть true!

# 2. Проверить логи - должны быть блокировки
pm2 logs onai-backend | grep "LOCK"
# Должны видеть: 🔒 Lock ACQUIRED

# 3. Если блокировок нет:
# Проверить что env.env обновлен
grep "REDIS_ENABLED" /path/to/backend/env.env
# Должно быть: REDIS_ENABLED=true

# Если false - исправить и restart
pm2 restart onai-backend
```

## 📝 ФАЙЛЫ КОТОРЫЕ ИЗМЕНИЛИСЬ

**Новые файлы:**
- `backend/src/lib/amocrmLock.ts` - Distributed Lock система
- `backend/src/routes/amocrm-locks-admin.ts` - Admin API

**Измененные файлы:**
- `backend/src/lib/amocrm.ts` - Добавлен lock + логирование
- `backend/src/server.ts` - Подключен admin роут
- `backend/env.env` - `REDIS_ENABLED=true`

## ✅ ИТОГО

**ДО:**
- ❌ Дубликаты лидов в AmoCRM
- ❌ Непонятно что происходит
- ❌ Race condition не защищен

**ПОСЛЕ:**
- ✅ ОДИН лид на пользователя - гарантировано
- ✅ Детальные логи - все видно
- ✅ Admin мониторинг - контроль в реальном времени
- ✅ Защита от race condition через distributed lock

**ПРОСТО ЗАДЕПЛОЙ И ПРОВЕРЬ! 🚀**

---

Детальная документация: `✅_FIX_AMOCRM_DUPLICATES.md`
