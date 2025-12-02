# 🚀 DEPLOYMENT GUIDE - ONAI ACADEMY

**Проект:** onAI Academy - Интегратор 2.0  
**Дата создания:** 16 ноября 2025  
**Статус:** ✅ Production Ready

---

## 📋 **QUICK START**

### **Backend Deploy (DigitalOcean):**

**Windows (двойной клик):**
```
deploy-backend.bat
```

**Windows (PowerShell):**
```powershell
.\deploy-backend.ps1
```

**Linux/Mac:**
```bash
bash deploy-backend.sh
```

**Вручную:**
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend"
```

---

### **Frontend Deploy (Vercel):**

**Автоматический (через Git):**
```bash
git push origin main
# Vercel auto-deploy включен!
```

**Через Vercel CLI:**
```bash
vercel --prod
```

---

## 📁 **ФАЙЛЫ ДЕПЛОЯ**

### **Backend:**
- `DEPLOY_BACKEND.md` - Полная документация по Backend деплою
- `deploy-backend.bat` - Скрипт для Windows (двойной клик)
- `deploy-backend.ps1` - PowerShell скрипт для Windows
- `deploy-backend.sh` - Bash скрипт для Linux/Mac

### **Frontend:**
- `DEPLOY_FRONTEND.md` - Полная документация по Frontend деплою

### **Другое:**
- `DEPLOY_README.md` - Этот файл (Quick Start Guide)
- `API_URL_FIX_REPORT.md` - Отчёт по исправлению API URLs

---

## 🌐 **PRODUCTION ENDPOINTS**

### **Frontend:**
- **URL:** https://onai.academy
- **Platform:** Vercel
- **Auto-deploy:** ✅ Включен (при push в main)

### **Backend API:**
- **URL:** https://api.onai.academy
- **Server:** DigitalOcean (207.154.231.30)
- **Process Manager:** PM2
- **Web Server:** Nginx

### **Database:**
- **Platform:** Supabase (PostgreSQL)
- **URL:** https://arqhkacellqbhjhbebfh.supabase.co

### **File Storage:**
- **Videos:** Cloudflare R2
- **Materials:** Supabase Storage

---

## 🔧 **ENVIRONMENT VARIABLES**

### **Backend (.env):**
```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[ключ]

R2_ACCOUNT_ID=[id]
R2_ACCESS_KEY_ID=[ключ]
R2_SECRET_ACCESS_KEY=[ключ]
R2_BUCKET_NAME=onai-academy-videos
R2_PUBLIC_URL=[url]
```

### **Frontend (Vercel):**
```env
VITE_API_URL=https://api.onai.academy
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=[ключ]
VITE_SITE_URL=https://onai.academy
```

---

## 📊 **DEPLOYMENT WORKFLOW**

### **Стандартный workflow:**

```
1. Разработка на localhost
   ├── Backend: http://localhost:3000
   └── Frontend: http://localhost:5173

2. Тестирование локально
   ├── npm run dev (frontend)
   └── npm run dev (backend)

3. Коммит изменений
   ├── git add -A
   ├── git commit -m "feat: ..."
   └── git push origin main

4. Deploy Backend (вручную)
   └── deploy-backend.bat (или другой скрипт)

5. Deploy Frontend (автоматически)
   └── Vercel auto-deploy при push

6. Проверка Production
   ├── https://onai.academy
   └── https://api.onai.academy/api/health
```

---

## ✅ **CHECKLIST ПЕРЕД ДЕПЛОЕМ**

### **Backend:**
- [ ] Код протестирован локально
- [ ] TypeScript компилируется без ошибок (`npm run build`)
- [ ] .env файл на сервере актуален
- [ ] База данных Supabase актуальна
- [ ] R2 Storage настроен
- [ ] Последние изменения на GitHub (`git push`)

### **Frontend:**
- [ ] Код протестирован локально
- [ ] Vite build успешен (`npm run build`)
- [ ] Environment variables в Vercel актуальны
- [ ] VITE_API_URL указывает на https://api.onai.academy
- [ ] Последние изменения на GitHub (`git push`)

---

## 🆘 **TROUBLESHOOTING**

### **Backend не запускается:**

**1. Проверь логи PM2:**
```bash
ssh root@207.154.231.30
pm2 logs onai-backend --lines 50
```

**2. Проверь что процесс запущен:**
```bash
pm2 status
```

**3. Перезапусти вручную:**
```bash
pm2 restart onai-backend
```

**4. Если не помогает - пересобери:**
```bash
cd /var/www/onai-integrator-login-main/backend
npm run build
pm2 restart onai-backend
```

---

### **Frontend показывает ошибки API:**

**1. Проверь Network в DevTools (F12):**
- Запросы должны идти на `https://api.onai.academy`
- НЕ на `http://localhost:3000`

**2. Проверь Environment Variables в Vercel:**
```
Settings → Environment Variables
VITE_API_URL должен быть: https://api.onai.academy
```

**3. Переделай деплой:**
```bash
vercel --prod
```

---

### **502 Bad Gateway:**

**Причина:** Nginx не может подключиться к Backend

**Решение:**
```bash
# Проверь что Backend на порту 3000
ssh root@207.154.231.30
curl http://localhost:3000/api/health

# Если не отвечает - перезапусти
pm2 restart onai-backend

# Перезапусти Nginx
systemctl restart nginx
```

---

### **CORS Errors:**

**Причина:** Backend не разрешает запросы с Frontend домена

**Решение:**

**Проверь в `backend/src/server.ts`:**
```typescript
app.use(cors({
  origin: [
    'https://onai.academy',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

**Переделай деплой Backend:**
```
deploy-backend.bat
```

---

## 📞 **БЫСТРЫЕ КОМАНДЫ**

### **Backend:**
```bash
# Деплой
deploy-backend.bat

# Логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"

# Статус
ssh root@207.154.231.30 "pm2 status"

# Перезапуск
ssh root@207.154.231.30 "pm2 restart onai-backend"

# Health Check
curl https://api.onai.academy/api/health
```

### **Frontend:**
```bash
# Auto-deploy (просто push)
git push origin main

# Вручную через Vercel
vercel --prod

# Проверка
curl -I https://onai.academy
```

---

## 🔗 **ПОЛЕЗНЫЕ ССЫЛКИ**

### **Production:**
- **Frontend:** https://onai.academy
- **Backend API:** https://api.onai.academy
- **Health Check:** https://api.onai.academy/api/health

### **Dashboards:**
- **Vercel:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh
- **Cloudflare:** https://dash.cloudflare.com
- **GitHub:** https://github.com/onaiacademy/onai-integrator-login

### **Документация:**
- **Full Backend Guide:** `DEPLOY_BACKEND.md`
- **Full Frontend Guide:** `DEPLOY_FRONTEND.md`
- **API Fix Report:** `API_URL_FIX_REPORT.md`
- **Localhost vs GitHub:** `LOCALHOST_VS_GITHUB_COMPARISON.md`

---

## 📊 **МОНИТОРИНГ**

### **Backend Monitoring:**
```bash
# Real-time logs
ssh root@207.154.231.30 "pm2 logs onai-backend"

# CPU/Memory usage
ssh root@207.154.231.30 "pm2 monit"

# Process info
ssh root@207.154.231.30 "pm2 info onai-backend"
```

### **Frontend Monitoring:**
- **Vercel Analytics:** https://vercel.com/dashboard → Analytics
- **Browser DevTools:** F12 → Network, Console

### **Database Monitoring:**
- **Supabase Dashboard:** https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh

---

## 🎯 **PRODUCTION READINESS**

### **Backend:** ✅
- [x] TypeScript compiled
- [x] PM2 process manager
- [x] Nginx reverse proxy
- [x] HTTPS enabled (SSL)
- [x] Environment variables set
- [x] Health check endpoint
- [x] Error handling
- [x] Logging configured

### **Frontend:** ✅
- [x] Vite optimized build
- [x] Vercel CDN
- [x] HTTPS enabled
- [x] Environment variables
- [x] API URL configured
- [x] Error boundaries
- [x] SEO optimized

### **Database:** ✅
- [x] Supabase PostgreSQL
- [x] Row Level Security (RLS)
- [x] Backups enabled
- [x] Connection pooling
- [x] Migrations applied

### **Storage:** ✅
- [x] Cloudflare R2 (videos)
- [x] Supabase Storage (materials)
- [x] Signed URLs for security
- [x] CDN enabled

---

## 🚀 **NEXT STEPS**

### **После деплоя:**
1. Протестируй все основные функции
2. Проверь логи на ошибки
3. Мониторь производительность
4. Настрой alerts (опционально)

### **Регулярное обслуживание:**
- Проверяй логи раз в день
- Обновляй зависимости раз в неделю
- Делай бэкапы базы раз в неделю
- Мониторь uptime

---

**Документация актуальна на:** 16 ноября 2025  
**Статус:** ✅ Production Ready  
**Версия:** 1.0.0

