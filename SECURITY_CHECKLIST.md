# 🔒 SECURITY CHECKLIST - ПЕРЕД PRODUCTION DEPLOY

## ✅ ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА ПЕРЕД ДЕПЛОЕМ

### 1. 🧹 УДАЛЕНИЕ DEBUG ЛОГОВ

- [ ] Frontend собран через `npm run build` (не `build:dev`)
- [ ] Backend запущен с `NODE_ENV=production`
- [ ] Открыть DevTools → Console → **должна быть пустая**
- [ ] Проверить Network tab → Headers не содержат sensitive data

### 2. 🔐 ENVIRONMENT VARIABLES

- [ ] `.env` файлы НЕ закоммичены в Git
- [ ] Проверить: `git log -p | grep -i "supabase_url"`
- [ ] Все secrets добавлены в hosting platform (Vercel/Railway)
- [ ] Production использует ОТДЕЛЬНЫЕ ключи от Development

### 3. 🛡️ SECURITY HEADERS

- [ ] HTTPS включен (force redirect from HTTP)
- [ ] CSP headers настроены
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security включен

### 4. 🔑 AUTHENTICATION & AUTHORIZATION

- [ ] JWT tokens не логируются
- [ ] Passwords никогда не логируются (даже хэши)
- [ ] Rate limiting включен на login endpoints
- [ ] CORS настроен только на production домены

### 5. 📊 DATABASE

- [ ] RLS (Row Level Security) включен на всех таблицах
- [ ] Service Role Key используется только в backend
- [ ] Anon Key имеет минимальные permissions
- [ ] Sensitive data encrypted at rest

### 6. 🚨 ERROR HANDLING

- [ ] Errors не показывают stack traces в production
- [ ] Generic error messages для пользователей
- [ ] Detailed errors только в server logs
- [ ] Error tracking setup (e.g., Sentry)

### 7. 📦 DEPENDENCIES

- [ ] `npm audit` выполнен и критические уязвимости исправлены
- [ ] Зависимости обновлены до последних стабильных версий
- [ ] `.nvmrc` или `package.json engines` указывает Node версию

### 8. 🧪 TESTING

- [ ] Production build протестирован локально (`npm run preview:production`)
- [ ] Critical user flows работают
- [ ] Payment flow протестирован (если есть)
- [ ] Email notifications работают

### 9. 📝 DOCUMENTATION

- [ ] README.md обновлен
- [ ] API documentation актуальна
- [ ] Environment variables documented в `.env.example`
- [ ] Deployment instructions написаны

### 10. 🔄 ROLLBACK PLAN

- [ ] Git tag создан для текущей версии
- [ ] Backup базы данных сделан
- [ ] Rollback procedure documented
- [ ] Monitoring setup (uptime, errors, performance)

---

## 🚀 КОМАНДЫ ДЛЯ ПРОВЕРКИ

### Frontend Build Check:
```bash
# 1. Собрать production build
npm run build

# 2. Запустить preview
npm run preview:production

# 3. Открыть DevTools и проверить:
# - Console пустая? ✅
# - Network не показывает tokens в headers? ✅
# - Source maps отсутствуют? ✅
```

### Backend Security Check:
```bash
# 1. Проверить что .env не в Git
git log --all --full-history -- "*/.env"

# 2. Проверить на hardcoded secrets
grep -r "sk-" --include="*.ts" --include="*.js" backend/src/
grep -r "eyJhbG" --include="*.ts" --include="*.js" backend/src/

# 3. Проверить npm audit
npm audit --production
```

### Environment Variables Check:
```bash
# Проверить что все env vars установлены
node -e "console.log(process.env.NODE_ENV)"
# Должно вывести: production

# Проверить frontend env vars (в браузере):
# Открыть DevTools → Console:
# console.log(import.meta.env.MODE)
# Должно вывести: production
```

---

## 🆘 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### Secrets утекли в Git:
1. ⚡ **НЕМЕДЛЕННО** rotate все API keys
2. Force push с удалением history (ОПАСНО!):
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Уведомить команду

### Production сломался:
1. 🔄 Rollback на предыдущий working tag
2. 📊 Проверить logs на hosting platform
3. 🐛 Debug локально с production build
4. 🔧 Fix и redeploy

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

**СОЗДАНО:** 2025-12-07  
**ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ:** 2025-12-07  
**СТАТУС:** 🔒 MANDATORY

