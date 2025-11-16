# 🚀 DEPLOY FRONTEND НА VERCEL

**Platform:** Vercel  
**Domain:** https://onai.academy  
**API URL:** https://api.onai.academy  
**Repo:** github.com/onaiacademy/onai-integrator-login

---

## 📋 **МЕТОД 1: ЧЕРЕЗ VERCEL CLI (РЕКОМЕНДУЕТСЯ)**

### **1. Установка Vercel CLI (если еще не установлен):**
```bash
npm install -g vercel
```

### **2. Логин в Vercel (делается 1 раз):**
```bash
vercel login
```

Откроется браузер для авторизации.

### **3. Деплой на Production:**
```bash
cd C:\onai-integrator-login
vercel --prod
```

**Vercel автоматически:**
- ✅ Соберет проект (`npm run build`)
- ✅ Оптимизирует статику
- ✅ Загрузит на CDN
- ✅ Настроит домен
- ✅ Выдаст URL деплоя

---

## 📋 **МЕТОД 2: ЧЕРЕЗ GIT PUSH (AUTO-DEPLOY)**

### **Если настроен auto-deploy в Vercel:**

```bash
cd C:\onai-integrator-login
git add -A
git commit -m "feat: Update frontend"
git push origin main
```

**Vercel автоматически задеплоит после push!**

### **Проверка статуса:**
1. Открой https://vercel.com/dashboard
2. Найди проект `onai-integrator-login`
3. Посмотри статус последнего деплоя

---

## 📋 **МЕТОД 3: ЧЕРЕЗ VERCEL API**

### **С использованием Vercel API Token:**

```bash
curl -X POST "https://api.vercel.com/v1/deployments" \
  -H "Authorization: Bearer ТВОЙ_VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "onai-integrator-login",
    "gitSource": {
      "type": "github",
      "repo": "onaiacademy/onai-integrator-login",
      "ref": "main"
    }
  }'
```

**Получить токен:**
1. https://vercel.com/account/tokens
2. Create Token
3. Скопируй токен

---

## 🔧 **ENVIRONMENT VARIABLES В VERCEL:**

### **Необходимые переменные:**

```env
VITE_API_URL=https://api.onai.academy
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SITE_URL=https://onai.academy
```

### **Как добавить в Vercel:**

**Через Dashboard:**
1. Открой https://vercel.com/dashboard
2. Выбери проект `onai-integrator-login`
3. Settings → Environment Variables
4. Add New Variable

**Через CLI:**
```bash
vercel env add VITE_API_URL production
# Введи: https://api.onai.academy

vercel env add VITE_SUPABASE_URL production
# Введи: https://arqhkacellqbhjhbebfh.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Введи: eyJhbGc...

vercel env add VITE_SITE_URL production
# Введи: https://onai.academy
```

---

## ✅ **ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ:**

### **1. Открой сайт:**
```
https://onai.academy
```

### **2. Проверь Network (F12):**
- Открой DevTools (F12)
- Вкладка Network
- Проверь что запросы идут к `https://api.onai.academy`

**Должно быть:**
```
GET https://api.onai.academy/api/courses
GET https://api.onai.academy/api/dashboard
```

**НЕ должно быть:**
```
GET http://localhost:3000/api/courses  ❌
```

### **3. Проверь Console (F12):**
- Не должно быть ошибок типа:
  - `Failed to fetch`
  - `CORS error`
  - `404 Not Found`

### **4. Тестирование функциональности:**
- [ ] Авторизация работает
- [ ] Dashboard загружается
- [ ] Курсы отображаются
- [ ] AI Chat работает
- [ ] Profile загружается
- [ ] Goals API работает
- [ ] Missions API работает

---

## 🔍 **ПРОВЕРКА VERCEL ДЕПЛОЯ:**

### **Через Dashboard:**
1. https://vercel.com/dashboard
2. Найди `onai-integrator-login`
3. Проверь:
   - ✅ Status: Ready
   - ✅ Build Time: ~2-3 минуты
   - ✅ Deployment URL активен
   - ✅ Production Domain: onai.academy

### **Через CLI:**
```bash
# Список последних деплоев
vercel ls

# Информация о проекте
vercel inspect
```

---

## 🆘 **В СЛУЧАЕ ОШИБОК:**

### **1. Build Failed**

**Проверка:**
```bash
cd C:\onai-integrator-login
npm run build
```

**Возможные причины:**
- TypeScript ошибки
- Missing dependencies
- Lint errors

**Решение:**
```bash
# Исправить ошибки локально
npm run build

# Закоммитить и запушить
git add -A
git commit -m "fix: Build errors"
git push origin main

# Переделать деплой
vercel --prod
```

---

### **2. Environment Variables Missing**

**Симптомы:**
- API запросы идут на localhost
- Supabase ошибки
- Белый экран

**Решение:**
```bash
# Проверить env в Vercel
vercel env ls

# Добавить недостающие
vercel env add VITE_API_URL production
```

---

### **3. CORS Errors**

**Симптомы:**
```
Access to fetch at 'https://api.onai.academy/api/courses' 
from origin 'https://onai.academy' has been blocked by CORS policy
```

**Решение:**
- Проверить Backend CORS настройки
- Убедиться что `https://onai.academy` в whitelist

**Backend код (должен быть):**
```typescript
app.use(cors({
  origin: ['https://onai.academy', 'http://localhost:5173'],
  credentials: true
}));
```

---

### **4. 404 Not Found**

**Симптомы:**
- Страницы показывают 404
- React Router не работает

**Решение:**

**Создай `vercel.json` в корне:**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Закоммить и задеплоить:**
```bash
git add vercel.json
git commit -m "fix: Add vercel.json for SPA routing"
git push origin main
vercel --prod
```

---

### **5. Deployment Timeout**

**Симптомы:**
- Build занимает > 10 минут
- Deployment Failed

**Решение:**
```bash
# Очистить node_modules
rm -rf node_modules package-lock.json

# Установить заново
npm install

# Проверить build локально
npm run build

# Коммит и push
git add package-lock.json
git commit -m "fix: Update dependencies"
git push origin main
```

---

## 📊 **VERCEL КОМАНДЫ:**

### **Основные команды:**
```bash
# Деплой на preview (тестовый)
vercel

# Деплой на production
vercel --prod

# Список деплоев
vercel ls

# Информация о проекте
vercel inspect

# Логи последнего деплоя
vercel logs

# Удалить деплой
vercel rm <deployment-url>

# Список environment variables
vercel env ls

# Добавить env variable
vercel env add VARIABLE_NAME production

# Удалить env variable
vercel env rm VARIABLE_NAME production

# Информация о домене
vercel domains ls

# Добавить домен
vercel domains add onai.academy
```

---

## 🔧 **НАСТРОЙКА VERCEL (первый раз):**

### **1. Подключение GitHub репозитория:**

**Через Vercel Dashboard:**
1. https://vercel.com/new
2. Import Git Repository
3. Выбери `onaiacademy/onai-integrator-login`
4. Configure Project:
   - Framework Preset: **Vite**
   - Root Directory: **/** (корень)
   - Build Command: **npm run build**
   - Output Directory: **dist**

### **2. Настройка домена:**

1. Settings → Domains
2. Add Domain: `onai.academy`
3. Vercel покажет DNS записи
4. Добавь в регистраторе домена:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (или IP от Vercel)
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### **3. Настройка Environment Variables:**

**Production:**
```
VITE_API_URL=https://api.onai.academy
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SITE_URL=https://onai.academy
```

**Preview/Development:**
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SITE_URL=http://localhost:5173
```

---

## 🚀 **БЫСТРЫЕ КОМАНДЫ:**

### **Деплой в одну строку:**
```bash
cd C:\onai-integrator-login && vercel --prod
```

### **Деплой с проверкой:**
```bash
cd C:\onai-integrator-login && vercel --prod && sleep 10 && curl -I https://onai.academy
```

### **Full workflow (build + push + deploy):**
```bash
cd C:\onai-integrator-login && npm run build && git add -A && git commit -m "feat: Update frontend" && git push origin main
```

---

## 📊 **MONITORING:**

### **Vercel Analytics:**
1. https://vercel.com/dashboard
2. Выбери проект
3. Analytics → Overview

**Метрики:**
- Page Views
- Unique Visitors
- Top Pages
- Top Referrers

### **Performance:**
- Lighthouse Score
- Core Web Vitals
- Load Time
- First Contentful Paint

---

## 📝 **CHECKLIST ПОСЛЕ ДЕПЛОЯ:**

- [ ] Vercel Build Status: Success
- [ ] Deployment Status: Ready
- [ ] Site loads: https://onai.academy
- [ ] API requests go to https://api.onai.academy
- [ ] Login works
- [ ] Dashboard loads
- [ ] Courses load
- [ ] AI Chat works
- [ ] No console errors
- [ ] No 404 errors
- [ ] Mobile responsive
- [ ] HTTPS enabled

---

## 🔗 **ПОЛЕЗНЫЕ ССЫЛКИ:**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **Vercel CLI Docs:** https://vercel.com/docs/cli
- **GitHub Repo:** https://github.com/onaiacademy/onai-integrator-login
- **Production Site:** https://onai.academy
- **API Endpoint:** https://api.onai.academy

---

**Создано:** 16 ноября 2025  
**Обновлено:** 16 ноября 2025  
**Статус:** ✅ Актуально

