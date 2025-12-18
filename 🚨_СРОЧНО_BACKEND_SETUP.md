# 🚨 СРОЧНО: НАСТРОЙКА BACKEND НА PRODUCTION

**Проблема:** Backend API возвращает 404 для уроков Tripwire  
**Причина:** Переменные `TRIPWIRE_SUPABASE_URL` и `TRIPWIRE_SERVICE_ROLE_KEY` **НЕ УСТАНОВЛЕНЫ** на production сервере

---

## ⚡ БЫСТРОЕ РЕШЕНИЕ (2 МИНУТЫ)

### Вариант 1: SSH на сервер (РЕКОМЕНДУЕТСЯ)

```bash
# 1. SSH на сервер
ssh root@207.154.231.30

# 2. Перейти в директорию backend
cd /var/www/onai-integrator-login-main/backend

# 3. Добавить переменные в env.env
cat >> env.env << 'EOF'

# ==============================================
# 🚀 SUPABASE TRIPWIRE (Новая база)
# ==============================================
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzIyMzkyNCwiZXhwIjoyMDQ4Nzk5OTI0fQ.sb_secret_-OprjOC5loX5qB_0zGgy3g_TeCRi-o2
EOF

# 4. Перезапустить backend
pm2 restart onai-backend

# 5. Проверить логи (должно быть "✅ Tripwire Admin Supabase client initialized")
pm2 logs onai-backend --lines 50

# 6. Проверить что API работает
curl http://localhost:3000/api/tripwire/lessons/67
# Должен вернуть JSON урока, а не {"error":"Lesson not found"}
```

---

### Вариант 2: Через GitHub Secrets (Долго, но автоматизировано)

1. Зайти на https://github.com/onaicademy/onai-integrator-login/settings/secrets/actions
2. Создать secrets:
   - `TRIPWIRE_SUPABASE_URL` = `https://pjmvxecykysfrzppdcto.supabase.co`
   - `TRIPWIRE_SERVICE_ROLE_KEY` = `eyJhbGci...` (полный ключ)
3. Обновить `.github/workflows/deploy-backend.yml`:

```yaml
- name: Deploy to DigitalOcean via SSH
  uses: appleboy/ssh-action@v1.0.3
  env:
    TRIPWIRE_URL: ${{ secrets.TRIPWIRE_SUPABASE_URL }}
    TRIPWIRE_KEY: ${{ secrets.TRIPWIRE_SERVICE_ROLE_KEY }}
  with:
    script: |
      cd /var/www/onai-integrator-login-main/backend
      
      # Добавляем переменные в env.env
      echo "TRIPWIRE_SUPABASE_URL=$TRIPWIRE_URL" >> env.env
      echo "TRIPWIRE_SERVICE_ROLE_KEY=$TRIPWIRE_KEY" >> env.env
      
      git pull origin main
      npm install --production
      pm2 restart onai-backend
```

---

## 🔍 КАК ПРОВЕРИТЬ ЧТО ИСПРАВЛЕНИЕ РАБОТАЕТ

### 1. API Endpoint тест:
```bash
curl https://api.onai.academy/api/tripwire/lessons/67
```

**Ожидаемый результат:**
```json
{
  "lesson": {
    "id": 67,
    "title": "Введение в нейросети",
    "module_id": 16,
    "bunny_video_id": "9d9fe01c-e060-4182-b382-65ddc52b67ed",
    ...
  }
}
```

**НЕ должно быть:** `{"error":"Lesson not found"}`

---

### 2. Supabase логи:

Зайти в Supabase Dashboard:  
https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto

**Logs → API Logs:**

**БЫЛО (401 Unauthorized):**
```
GET | 401 | 207.154.231.30 | /rest/v1/lessons?id=eq.67&is_archived=eq.false
```

**ДОЛЖНО СТАТЬ (200 OK):**
```
GET | 200 | 207.154.231.30 | /rest/v1/lessons?id=eq.67&is_archived=eq.false
```

---

### 3. Browser test:

1. Зайти на https://onai.academy/integrator
2. Нажать "→ НАЧАТЬ МОДУЛЬ" на первом модуле
3. Проверить, что урок загружается (не "Урок не найден")
4. Проверить console logs:
   ```
   ✅ TripwireLesson: Loaded IDs: {...}
   📥 [HonestTracking] Loading progress for: {lessonId: 67, userId: ...}
   ```
5. Видео должно загрузиться и воспроизводиться

---

## 📊 ТЕКУЩИЙ СТАТУС

### ✅ Frontend исправления (ГОТОВО):
- ✅ БАГ #7: tripwire_user_id теперь загружается
- ✅ БАГ #4: moduleProgress state восстановлен
- ✅ Код задеплоен: commit `20ce5ba` + `6568e37`

### ⚠️ Backend проблема (ТРЕБУЕТ ДЕЙСТВИЙ):
- ❌ API возвращает 404 для уроков
- ❌ Причина: Переменные TRIPWIRE не установлены на сервере
- 🔧 Решение: Добавить переменные в `env.env` на сервере (см. выше)

---

## 🚀 ПОСЛЕ НАСТРОЙКИ ПЕРЕМЕННЫХ

После добавления переменных на сервер:

1. **Перезапустить backend:**
   ```bash
   pm2 restart onai-backend
   ```

2. **Проверить логи:**
   ```bash
   pm2 logs onai-backend --lines 50
   ```
   
   Должно быть:
   ```
   ✅ Tripwire Admin Supabase client initialized
      URL: https://pjmvxecykysfrzppdcto.supabase.co
      Authorization: Bearer ***...
   ```

3. **Тест API:**
   ```bash
   curl https://api.onai.academy/api/tripwire/lessons/67
   ```
   
   Должен вернуть JSON урока (не 404).

4. **Тест в браузере:**
   - Зайти на https://onai.academy/integrator
   - Проверить, что модули загружаются
   - Зайти на урок - проверить, что видео работает

---

## 📞 ПОДДЕРЖКА

**Если проблема остается после добавления переменных:**

1. Проверьте логи PM2:
   ```bash
   pm2 logs onai-backend --err --lines 100
   ```

2. Проверьте что backend запущен:
   ```bash
   pm2 list
   # Должен быть процесс "onai-backend" со статусом "online"
   ```

3. Проверьте что переменные загружены:
   ```bash
   cd /var/www/onai-integrator-login-main/backend
   cat env.env | grep TRIPWIRE
   ```

4. Перезапустите backend принудительно:
   ```bash
   pm2 delete onai-backend
   pm2 start ecosystem.config.js
   ```

---

**Автор:** AI Диагност (Cursor)  
**Дата:** 14 декабря 2025, 07:30 UTC  
**Приоритет:** 🔴 КРИТИЧНЫЙ










