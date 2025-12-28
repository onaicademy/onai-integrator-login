# 🚀 Быстрый старт: Автодеплой через GitHub Actions

## ✅ Всё готово!

Автодеплой настроен и работает! Вот что у вас есть:

### 📦 Workflows (GitHub Actions)

| Продукт | Файл | Триггер |
|---------|------|---------|
| 📊 Traffic Dashboard | [deploy-traffic-dashboard.yml](workflows/deploy-traffic-dashboard.yml) | `src/pages/traffic/**` |
| 🎓 Main Platform | [deploy-main-platform.yml](workflows/deploy-main-platform.yml) | `src/pages/Course*.tsx`, основные страницы |
| 🎯 Tripwire | [deploy-tripwire.yml](workflows/deploy-tripwire.yml) | `src/pages/tripwire/**` |
| 🔧 Backend API | [deploy-backend.yml](workflows/deploy-backend.yml) | `backend/**` |

### 🔑 Секреты (все добавлены)

✅ Main Supabase:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

✅ Tripwire Supabase:
- `VITE_TRIPWIRE_SUPABASE_URL`
- `VITE_TRIPWIRE_SUPABASE_ANON_KEY`

✅ Landing Supabase:
- `VITE_LANDING_SUPABASE_URL`
- `VITE_LANDING_SUPABASE_ANON_KEY`

✅ SSH Access:
- `DO_SSH_KEY`

---

## 🎯 Как использовать

### Автоматический деплой (рекомендуется)

Просто пушьте в `main` - всё деплоится автоматически!

```bash
# Пример: обновили Traffic Dashboard
git add src/pages/traffic/Dashboard.tsx
git commit -m "feat(traffic): Update dashboard layout"
git push origin main

# → Автоматически задеплоится на traffic.onai.academy 🚀
```

### Ручной деплой

1. Откройте **GitHub → Actions**
2. Выберите нужный workflow
3. Нажмите **Run workflow** → **Run workflow**

---

## 🔍 Проверка деплоя

### В GitHub Actions

```bash
# Через gh CLI
gh run list --limit 5

# Посмотреть логи
gh run view <RUN_ID> --log
```

### На сервере

```bash
# Проверить дату последнего деплоя Traffic Dashboard
ssh root@207.154.231.30 "stat /var/www/traffic.onai.academy/index.html | grep Modify"

# Проверить PM2 backend
ssh root@207.154.231.30 "pm2 list"
```

### HTTP проверка

```bash
curl -I https://traffic.onai.academy
curl -I https://onai.academy
curl https://api.onai.academy/api/health
```

---

## 📊 Архитектура деплоя

```
GitHub Push → GitHub Actions → Build → SSH → DigitalOcean Server
                                  ↓
                          tar.gz архив через SCP
                                  ↓
                     /var/www/{домен}/ (распаковка)
                                  ↓
                          Nginx reload → Live! 🎉
```

### Директории на сервере

| Домен | Директория |
|-------|-----------|
| `traffic.onai.academy` | `/var/www/traffic.onai.academy/` |
| `onai.academy` | `/var/www/onai.academy/` |
| `tripwire.onai.academy` | `/var/www/tripwire.onai.academy/` |
| `api.onai.academy` (backend) | `/var/www/onai-integrator-login-main/backend/` |

---

## ⚠️ Что делать если деплой упал?

### 1. Посмотрите логи в GitHub Actions

```bash
gh run list --limit 5
gh run view <FAILED_RUN_ID> --log
```

### 2. Проверьте SSH доступ

```bash
ssh root@207.154.231.30 "echo OK"
```

### 3. Проверьте секреты

```bash
gh secret list
```

### 4. Откат на предыдущую версию

```bash
# Список backup'ов
ssh root@207.154.231.30 "ls -lh /tmp/*-backup-*.tar.gz"

# Откат Traffic Dashboard
ssh root@207.154.231.30 << 'ENDSSH'
cd /var/www/traffic.onai.academy
rm -rf assets/* index.html
tar -xzf /tmp/traffic-backup-XXXXXXXX-XXXXXX.tar.gz
chown -R www-data:www-data .
systemctl reload nginx
ENDSSH
```

---

## 📚 Полная документация

Подробная инструкция: [DEPLOY_SETUP.md](DEPLOY_SETUP.md)

---

## 🎉 Готово!

Теперь каждый push автоматически деплоит изменения на production.

**Контейнерный деплой** означает что каждый продукт деплоится отдельно:
- Изменили Traffic Dashboard → деплоится только Traffic
- Изменили Main Platform → деплоится только Main
- Изменили Backend → деплоится только Backend

Всё изолированно и безопасно! 🚀
