# 🚀 DEPLOYMENT WORKFLOW - ПОЛНОЕ ПОНИМАНИЕ

**Дата создания:** 2025-11-18  
**Версия:** 1.0  
**Статус:** ✅ Актуально

---

## КРИТИЧНО: Наша система имеет 3 окружения:

### 1️⃣ LOCALHOST (твой компьютер):

```
Frontend: http://localhost:5173 (Vite dev server)
Backend: http://localhost:3000 (Node.js + Express)
База: Supabase (облако, общая для всех окружений)
Видео: Bunny CDN (облако, общее)
```

### 2️⃣ DIGITAL OCEAN (backend production):

```
Сервер: 207.154.231.30
Пользователь: root
Путь: /var/www/onai-integrator-login-main/backend
Backend URL: https://api.onai.academy
Process Manager: PM2
Node.js: v18+
```

### 3️⃣ VERCEL (frontend production):

```
Frontend URL: https://onai.academy
Auto-deploy: При push в main ветку (GitHub integration)
Environment Variables: Настроены в Vercel Dashboard
Build: npm run build
Output: dist/
```

---

## 📦 ПОЛНЫЙ ЦИКЛ ДЕПЛОЯ:

### ЭТАП 1: Разработка на localhost

```bash
# 1. Проверь что на правильной ветке
git branch  # Должно быть: dev или feature/название

# 2. Делай изменения в коде
# ... пиши код ...

# 3. Тестируй локально
npm run dev  # Frontend
cd backend && npm run dev  # Backend (в другом терминале)

# 4. Проверь что всё работает
# - Открой http://localhost:5173
# - Проверь функционал
# - Посмотри консоль на ошибки
```

### ЭТАП 2: Commit и push в dev

```bash
# 1. Проверь изменённые файлы
git status

# 2. Добавь файлы (НЕ добавляй .env!)
git add .

# 3. Проверь что .env не добавлен
git status | grep .env  # Должно быть пусто!

# 4. Commit с правильным форматом
git commit -m "feat: краткое описание изменений"

# 5. Push в dev ветку
git push origin dev

# 6. СТОП! НЕ деплой на production ещё!
```

### ЭТАП 3: Деплой backend на Digital Ocean

```bash
# ⚠️ ВЫПОЛНЯЕТСЯ ТОЛЬКО ПО ЯВНОМУ ЗАПРОСУ ПОЛЬЗОВАТЕЛЯ!

# 1. SSH на сервер
ssh root@207.154.231.30

# 2. Перейди в директорию проекта
cd /var/www/onai-integrator-login-main/backend

# 3. Проверь текущую ветку
git branch  # Должно быть: main

# 4. Backup текущего .env (на всякий случай)
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)

# 5. Pull изменений из GitHub
git pull origin main

# 6. ВАЖНО: Проверь что .env не перезаписан!
cat .env | grep OPENAI_API_KEY
# Если ключ пустой или неправильный - восстанови из backup!

# 7. Установи новые зависимости (если были изменения)
npm install

# 8. Собери TypeScript (если нужно)
npm run build

# 9. Перезапусти PM2 с обновлением .env
pm2 reload onai-backend --update-env

# 10. Проверь статус
pm2 status

# 11. Проверь логи на ошибки
pm2 logs onai-backend --lines 50

# 12. Проверь health endpoint
curl http://localhost:3000/api/health

# 13. Если ошибки - откати изменения:
git reset --hard HEAD~1
pm2 restart onai-backend

# 14. Выход с сервера
exit
```

### ЭТАП 4: Деплой frontend на Vercel

```bash
# ⚠️ Vercel деплоит АВТОМАТИЧЕСКИ при push в main!

# 1. Merge dev → main (через GitHub PR или локально)
git checkout main
git merge dev

# 2. Push в main
git push origin main

# 3. Vercel автоматически:
   - Обнаруживает новый commit
   - Запускает build: npm run build
   - Деплоит в production
   - URL: https://onai.academy

# 4. Проверь статус деплоя:
   - Зайди на https://vercel.com/dashboard
   - Найди проект: onai-academy
   - Смотри логи деплоя

# 5. Если деплой failed:
   - Посмотри логи ошибок
   - Исправь проблему
   - Сделай новый commit и push
```

### ЭТАП 5: Проверка production

```bash
# 1. Проверь backend
curl https://api.onai.academy/api/health

# 2. Проверь frontend
# Открой https://onai.academy в браузере

# 3. Протестируй ключевые функции:
   - [ ] Регистрация/логин работает
   - [ ] Курсы загружаются
   - [ ] Видео играет
   - [ ] AI чат отвечает
   - [ ] Консоль без критичных ошибок

# 4. Проверь логи PM2 через 5 минут:
ssh root@207.154.231.30 'pm2 logs onai-backend --lines 100'

# 5. Если всё ОК → деплой успешен! ✅
# 6. Если проблемы → откатывай изменения! ❌
```

---

## 🔄 ОТКАТ ИЗМЕНЕНИЙ (если что-то пошло не так):

### Откат backend (Digital Ocean):

```bash
ssh root@207.154.231.30

cd /var/www/onai-integrator-login-main/backend

# Вариант 1: Откат на предыдущий commit
git reset --hard HEAD~1
pm2 restart onai-backend

# Вариант 2: Откат на конкретный commit
git log --oneline -10  # Найди хороший commit
git reset --hard <commit-hash>
pm2 restart onai-backend

# Вариант 3: Восстановление .env из backup
ls .env.backup-*  # Найди последний backup
cp .env.backup-YYYYMMDD-HHMMSS .env
pm2 reload onai-backend --update-env
```

### Откат frontend (Vercel):

```bash
# Через Vercel Dashboard:
1. Зайди на https://vercel.com/dashboard
2. Найди проект: onai-academy
3. Deployments → Найди последний рабочий деплой
4. Кнопка "Promote to Production"

# Через Git:
git revert HEAD
git push origin main
# Vercel автоматически задеплоит revert
```

---

## 🔐 СИНХРОНИЗАЦИЯ .env МЕЖДУ ОКРУЖЕНИЯМИ:

### ВАЖНО: .env файлы РАЗНЫЕ в каждом окружении!

```
# Localhost .env:
- Может содержать dev ключи
- Для локальной разработки
- Не коммитится в Git

# Digital Ocean .env:
- Production ключи
- Синхронизируется ВРУЧНУЮ
- Не перезаписывается при git pull

# Vercel .env:
- Настраивается в Dashboard
- Формат: VITE_ИМЯ_ПЕРЕМЕННОЙ
- Обновляется через UI
```

### Как обновить .env на production:

```bash
# 1. НЕ делай git add .env!
# 2. Подключись к серверу
ssh root@207.154.231.30

# 3. Обнови .env вручную через nano
cd /var/www/onai-integrator-login-main/backend
nano .env
# Внеси изменения, сохрани (Ctrl+O, Enter, Ctrl+X)

# 4. Перезапусти PM2 с --update-env
pm2 reload onai-backend --update-env

# 5. Проверь что переменные загрузились
curl http://localhost:3000/api/debug/env
```

---

## 📊 МОНИТОРИНГ ПОСЛЕ ДЕПЛОЯ:

```bash
# Первые 5 минут после деплоя:
# (на Windows используй PowerShell)
while ($true) {
    ssh root@207.154.231.30 "pm2 status && pm2 logs onai-backend --lines 5"
    Start-Sleep -Seconds 10
}

# Проверка метрик:
ssh root@207.154.231.30 'pm2 monit'

# Проверка использования ресурсов:
ssh root@207.154.231.30 'htop'

# Проверка логов Nginx (если есть):
ssh root@207.154.231.30 'tail -f /var/log/nginx/error.log'
```

---

## ✅ ЧЕКЛИСТ ПЕРЕД КАЖДЫМ ДЕПЛОЕМ:

### Localhost:

- [ ] Все тесты пройдены
- [ ] Консоль без критичных ошибок
- [ ] Git статус чистый (нет uncommitted файлов)
- [ ] .env не добавлен в git
- [ ] Commit message правильный формат

### Backend деплой:

- [ ] SSH доступ к серверу работает
- [ ] Backup .env сделан
- [ ] Git pull успешен
- [ ] .env не перезаписан
- [ ] npm install прошёл без ошибок
- [ ] PM2 reload успешен
- [ ] Health endpoint отвечает 200
- [ ] Логи без критичных ошибок

### Frontend деплой:

- [ ] Vercel build успешен
- [ ] Production URL открывается
- [ ] UI отображается корректно
- [ ] API запросы работают
- [ ] Консоль без критичных ошибок

### Post-deploy:

- [ ] Production работает 5+ минут
- [ ] Нет memory leaks
- [ ] Нет critical errors в логах
- [ ] Users могут пользоваться

---

## 🚨 КРИТИЧНЫЕ ПРАВИЛА:

1. ⚠️ **НЕ деплой в production без тестирования на localhost**
2. ⚠️ **ВСЕГДА делай backup .env перед git pull**
3. ⚠️ **НИКОГДА не коммить .env файлы**
4. ⚠️ **ВСЕГДА проверяй логи после деплоя**
5. ⚠️ **ВСЕГДА имей план отката изменений**
6. ⚠️ **Production деплой ТОЛЬКО по явному запросу**
7. ⚠️ **ВСЕГДА создавай MD отчёт после деплоя**

---

## 🔧 БЫСТРЫЕ КОМАНДЫ:

### Проверка статуса:

```bash
# Backend статус
ssh root@207.154.231.30 'pm2 status'

# Backend логи
ssh root@207.154.231.30 'pm2 logs onai-backend --lines 50'

# Git статус
git status
git log --oneline -5

# Проверка портов (Windows)
netstat -ano | findstr "LISTENING" | findstr ":3000 :5173 :8080"
```

### Быстрый deploy backend (одна команда):

```bash
# На localhost:
git add . && \
git commit -m "update" && \
git push origin dev && \
ssh root@207.154.231.30 'cd /var/www/onai-integrator-login-main/backend && git pull && pm2 reload onai-backend --update-env'
```

---

## 📝 ФОРМАТ COMMIT MESSAGES:

- `feat:` - новая функция
- `fix:` - исправление бага
- `docs:` - документация
- `style:` - форматирование
- `refactor:` - рефакторинг кода
- `test:` - тесты
- `chore:` - настройки, зависимости

**Примеры:**
```bash
git commit -m "feat: добавил функцию удаления модулей"
git commit -m "fix: исправил баг с кнопками удаления"
git commit -m "docs: обновил deployment workflow"
```

---

## 🎯 КОНТРОЛЬНЫЕ ВОПРОСЫ ДЛЯ ПРОВЕРКИ ПОНИМАНИЯ:

1. **Объясни мне полный цикл деплоя от localhost до production**
   - ✅ Localhost разработка → Git commit → Push в dev → Тестирование → Merge в main → Deploy backend (SSH) → Deploy frontend (Vercel auto) → Проверка production

2. **Что делать если после деплоя backend упал?**
   - ✅ SSH на сервер → Проверить логи PM2 → Откатить через `git reset --hard HEAD~1` → Перезапустить PM2 → Проверить health endpoint

3. **Как обновить OpenAI ключ на production без потери данных?**
   - ✅ SSH на сервер → Backup .env → Редактировать .env через nano → `pm2 reload onai-backend --update-env` → Проверить через `/api/debug/env`

4. **Какие команды нужны для отката изменений?**
   - ✅ Backend: `git reset --hard HEAD~1` + `pm2 restart onai-backend`
   - ✅ Frontend: Vercel Dashboard → Promote previous deployment ИЛИ `git revert HEAD` + push

5. **Зачем нужен backup .env перед git pull?**
   - ✅ Потому что git pull может перезаписать .env файл, и мы потеряем production ключи. Backup позволяет восстановить.

---

**Документ актуален на:** 2025-11-18  
**Последнее обновление:** 2025-11-18  
**Статус:** ✅ Полностью понято и задокументировано

