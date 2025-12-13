# 🚀 DEPLOYMENT CHEATSHEET

## ⚡ БЫСТРЫЙ ДЕПЛОЙ

```bash
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "cd /var/www/onai-integrator-login-main && ./deploy-production.sh"
```

---

## 📋 ПРОВЕРКА СТАТУСА

```bash
# Статус backend
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 "pm2 status onai-backend"

# Последние 20 логов
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "pm2 logs onai-backend --lines 20 --nostream"

# Только ошибки
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "pm2 logs onai-backend --err --lines 20 --nostream"
```

---

## 🔧 БЫСТРЫЕ ФИКСЫ

### Перезапустить backend:
```bash
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 "pm2 restart onai-backend"
```

### Переустановить nodemon:
```bash
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "cd /var/www/onai-integrator-login-main/backend && npm install nodemon --save-dev && pm2 restart onai-backend"
```

### Emergency rollback:
```bash
ssh -i ~/.ssh/github_actions_key root@207.154.231.30 \
  "cd /var/www/onai-integrator-login-main && git reset --hard <commit-hash> && ./deploy-production.sh"
```

---

## 🧪 ТЕСТЫ

### Проверить API:
```bash
curl https://api.onai.academy/api/health
```

### Проверить ProfTest:
```bash
curl -X POST https://api.onai.academy/api/landing/proftest \
  -H "Origin: https://onai.academy" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"+77777777777","source":"test","proftestAnswers":[],"utmParams":{}}'
```

---

## 📞 ВАЖНЫЕ КОМАНДЫ

| Команда | Описание |
|---------|----------|
| `./deploy-production.sh` | Полный деплой |
| `pm2 restart onai-backend` | Перезапуск |
| `pm2 logs onai-backend` | Живые логи |
| `pm2 status onai-backend` | Статус |
| `git reset --hard origin/main` | Откат к последнему коммиту |

---

## 🔗 ПОЛНАЯ ДОКУМЕНТАЦИЯ

- **Проблема:** `DEPLOYMENT_ISSUE_REPORT.md`
- **Инструкции:** `DEPLOYMENT_README.md`
- **Этот файл:** Быстрая шпаргалка
