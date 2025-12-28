# 🚀 Настройка Автоматического Деплоя через GitHub Actions

## 📋 Обзор

У вас настроены **4 отдельных workflow** для контейнерного деплоя:

| Workflow | Триггер | Деплой на сервер | Домен |
|----------|---------|------------------|-------|
| 📊 Traffic Dashboard | `src/pages/traffic/**` | `/var/www/traffic.onai.academy/` | https://traffic.onai.academy |
| 🎓 Main Platform | `src/pages/Course*.tsx`, основные страницы | `/var/www/onai.academy/` | https://onai.academy |
| 🎯 Tripwire | `src/pages/tripwire/**` | `/var/www/tripwire.onai.academy/` | https://tripwire.onai.academy |
| 🔧 Backend API | `backend/**` | `/var/www/onai-integrator-login-main/backend/` | https://api.onai.academy |

## ✅ Шаг 1: Настройка GitHub Secrets

Перейдите в **GitHub Repository → Settings → Secrets and variables → Actions** и добавьте следующие секреты:

### 🔑 SSH Access
```
DO_SSH_KEY
```
Приватный SSH ключ для доступа к серверу `207.154.231.30`

**Как получить:**
```bash
# На вашем локальном компьютере
cat ~/.ssh/id_rsa
# Скопируйте весь вывод (включая -----BEGIN/END-----)
```

### 🗄️ Supabase Credentials

#### Main Platform (onai.academy)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

#### Traffic Dashboard (traffic.onai.academy)
```
VITE_TRAFFIC_SUPABASE_URL
VITE_TRAFFIC_SUPABASE_ANON_KEY
```

#### Tripwire
```
VITE_TRIPWIRE_SUPABASE_URL
VITE_TRIPWIRE_SUPABASE_ANON_KEY
VITE_LANDING_SUPABASE_URL
VITE_LANDING_SUPABASE_ANON_KEY
```

**Где найти в Supabase:**
1. Откройте проект в Supabase Dashboard
2. Settings → API
3. Скопируйте:
   - `Project URL` → `VITE_*_SUPABASE_URL`
   - `anon public` key → `VITE_*_SUPABASE_ANON_KEY`

---

## 🎯 Шаг 2: Как работают деплои

### Автоматический деплой
При каждом `git push` в `main` запускается соответствующий workflow, если изменились файлы:

```bash
# Пример: изменили Traffic Dashboard
git add src/pages/traffic/Dashboard.tsx
git commit -m "feat: Update traffic dashboard"
git push origin main
# → Автоматически запустится workflow "📊 Deploy Traffic Dashboard"
```

### Ручной деплой
Можно запустить любой workflow вручную:

1. Перейдите в **GitHub → Actions**
2. Выберите нужный workflow (например, "📊 Deploy Traffic Dashboard")
3. Нажмите **Run workflow** → **Run workflow**

---

## 🔍 Шаг 3: Проверка деплоя

### В GitHub Actions
1. Откройте **GitHub → Actions**
2. Увидите список запущенных workflows
3. Кликните на workflow → посмотрите логи

### На сервере
```bash
# Проверить дату последнего деплоя
ssh root@207.154.231.30 "stat /var/www/traffic.onai.academy/index.html | grep Modify"

# Проверить PM2 backend
ssh root@207.154.231.30 "pm2 list"

# Логи backend
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"
```

### HTTP проверка
```bash
# Traffic Dashboard
curl -I https://traffic.onai.academy

# Main Platform
curl -I https://onai.academy

# Backend API
curl https://api.onai.academy/api/health
```

---

## ⚠️ Частые проблемы и решения

### Проблема 1: "Permission denied (publickey)"
**Причина:** Неправильный SSH ключ в `DO_SSH_KEY`

**Решение:**
1. Убедитесь что скопировали **приватный** ключ (не публичный `.pub`)
2. Включая строки `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`
3. Проверьте что ключ добавлен на сервер:
```bash
ssh root@207.154.231.30 "cat ~/.ssh/authorized_keys"
```

### Проблема 2: Деплой прошёл, но изменений не видно
**Причина:** Браузерный кэш

**Решение:**
1. Hard reload в браузере: `Ctrl+Shift+R` (Windows/Linux) или `Cmd+Shift+R` (Mac)
2. Проверьте дату модификации файла на сервере (см. выше)

### Проблема 3: Backend не запускается после деплоя
**Причина:** Нет файла `env.env` на сервере

**Решение:**
```bash
# Загрузить env.env на сервер
scp backend/env.env root@207.154.231.30:/var/www/onai-integrator-login-main/backend/

# Перезапустить PM2
ssh root@207.154.231.30 "pm2 restart onai-backend --update-env"
```

### Проблема 4: Build падает с ошибкой TypeScript
**Причина:** Ошибки типов в коде

**Решение:**
1. Проверьте локально: `npm run build`
2. Исправьте ошибки TypeScript
3. Закоммитьте и запушьте исправления

---

## 🔧 Расширенная настройка

### Добавить уведомления в Telegram
Добавьте в конец любого workflow:

```yaml
- name: 📢 Notify Telegram
  if: always()
  run: |
    STATUS="${{ job.status }}"
    MESSAGE="🚀 Деплой завершён: $STATUS"
    curl -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
      -d chat_id="${{ secrets.TELEGRAM_CHAT_ID }}" \
      -d text="$MESSAGE"
```

Добавьте секреты:
- `TELEGRAM_BOT_TOKEN` - токен бота
- `TELEGRAM_CHAT_ID` - ID чата

### Rollback (откат деплоя)
```bash
# На сервере создаётся backup перед каждым деплоем в /tmp/

# Список backup'ов
ssh root@207.154.231.30 "ls -lh /tmp/*-backup-*.tar.gz"

# Откатиться на предыдущую версию
ssh root@207.154.231.30 << 'ENDSSH'
cd /var/www/traffic.onai.academy
rm -rf assets/* index.html
tar -xzf /tmp/traffic-backup-XXXXXXXX-XXXXXX.tar.gz
chown -R www-data:www-data .
systemctl reload nginx
ENDSSH
```

---

## 📊 Мониторинг

### GitHub Actions Dashboard
- Перейдите в **Actions** в репозитории
- Видны все запуски, статусы, логи

### Uptime Robot (опционально)
Настройте мониторинг доступности:
1. Зарегистрируйтесь на uptimerobot.com
2. Добавьте мониторы для:
   - https://onai.academy
   - https://traffic.onai.academy
   - https://api.onai.academy/api/health
3. Настройте уведомления на email/Telegram

---

## 🎓 Полезные команды

```bash
# Посмотреть последние 10 деплоев в GitHub Actions
gh run list --limit 10

# Посмотреть логи конкретного деплоя
gh run view <RUN_ID> --log

# Запустить деплой вручную через CLI
gh workflow run "deploy-traffic-dashboard.yml"

# Проверить статус всех workflows
gh run list --workflow=all --limit 5
```

---

## ✅ Чек-лист первого деплоя

- [ ] Добавлены все GitHub Secrets (см. Шаг 1)
- [ ] SSH ключ работает: `ssh root@207.154.231.30 "echo OK"`
- [ ] На сервере есть все директории:
  - `/var/www/onai.academy/`
  - `/var/www/traffic.onai.academy/`
  - `/var/www/tripwire.onai.academy/` (если нужно)
  - `/var/www/onai-integrator-login-main/backend/`
- [ ] Nginx настроен для всех доменов
- [ ] PM2 запущен для backend: `pm2 list`
- [ ] Файл `env.env` на сервере в backend директории
- [ ] Тестовый деплой прошёл успешно (вручную запустите workflow)

---

🎉 **Готово!** Теперь каждый push в `main` автоматически деплоит изменения на production.

Если нужна помощь, проверьте логи в GitHub Actions или на сервере через `pm2 logs`.
