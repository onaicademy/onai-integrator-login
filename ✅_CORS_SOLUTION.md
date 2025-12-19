# ✅ CORS РЕШЕНИЕ - NGINX PROXY

**Дата:** 19 декабря 2025, 00:20 UTC  
**Статус:** 🟢 **ГОТОВО К ТЕСТИРОВАНИЮ**

---

## 🎯 ПРОБЛЕМА

```
CORS policy: No 'Access-Control-Allow-Origin' header
Access from 'https://traffic.onai.academy' blocked
```

**Попытки исправления:**
1. ❌ Добавление traffic.onai.academy в backend CORS whitelist - крашит backend
2. ❌ Git force push - конфликты
3. ✅ **NGINX PROXY** - уже настроен!

---

## ✅ РЕШЕНИЕ

### Nginx уже настроен правильно!

**File:** `/etc/nginx/sites-enabled/traffic.onai.academy`

```nginx
# API proxy (УЖЕ ЕСТЬ!)
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    # ... other headers
}
```

**Что это значит:**
- `https://traffic.onai.academy/api/*` → `http://localhost:3000/api/*`
- Запросы идут через тот же домен (traffic.onai.academy)
- **CORS НЕ НУЖЕН!** (same-origin)

---

## 🔧 ЧТО НУЖНО ИЗМЕНИТЬ

### 1. Создать config файл

**File:** `src/config/traffic-api.ts`

```typescript
// Определяем environment
const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
const isLocalhost = window.location.hostname === 'localhost';

// API_URL для Traffic Dashboard
export const TRAFFIC_API_URL = isTrafficDomain
  ? '' // ✅ Relative path (nginx proxy)
  : isLocalhost
    ? 'http://localhost:3000'
    : 'https://api.onai.academy';
```

### 2. Обновить Traffic Dashboard файлы

Заменить во ВСЕХ файлах:

```typescript
// ❌ СТАРЫЙ КОД:
const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

// ✅ НОВЫЙ КОД:
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';
```

**Файлы для обновления:**
- src/pages/traffic/TrafficLogin.tsx
- src/pages/traffic/TrafficAdminPanel.tsx
- src/pages/traffic/TrafficSecurityPanel.tsx
- src/pages/traffic/TrafficTeamConstructor.tsx
- src/pages/traffic/TrafficSettings.tsx
- src/pages/traffic/TrafficTargetologistDashboard.tsx
- src/components/traffic/WeeklyKPIWidget.tsx
- src/components/traffic/OnboardingTour.tsx

---

## 📦 DEPLOY PLAN

### 1. Commit changes
```bash
git add src/config/traffic-api.ts
git add src/pages/traffic/*.tsx
git add src/components/traffic/*.tsx
git commit -m "fix(cors): use nginx proxy for Traffic API"
git push origin main
```

### 2. Build frontend
```bash
npm run build
```

### 3. Deploy frontend
```bash
rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/traffic.onai.academy"
ssh root@207.154.231.30 "systemctl reload nginx"
```

### 4. Test
```
https://traffic.onai.academy/login
```

**Expected:**
- ✅ Login form loads
- ✅ Login request goes to `/api/traffic-auth/login` (same domain)
- ✅ NO CORS errors
- ✅ Login succeeds

---

## 🎯 ПОЧЕМУ ЭТО РАБОТАЕТ

### Before (CORS проблема):
```
Frontend: https://traffic.onai.academy
API Request: https://api.onai.academy/api/...
Result: ❌ CORS blocked (different origin)
```

### After (Nginx proxy):
```
Frontend: https://traffic.onai.academy
API Request: https://traffic.onai.academy/api/... 
Nginx: Proxy → http://localhost:3000/api/...
Result: ✅ Same origin, NO CORS needed!
```

---

## ✅ ПРЕИМУЩЕСТВА

1. **No backend changes** - backend не нужно трогать вообще!
2. **No CORS config** - nginx решает всё
3. **Safe** - backend не крашится
4. **Fast** - прямой proxy, нет дополнительных HTTP запросов
5. **Secure** - запросы идут через HTTPS на том же домене

---

## 🧪 TESTING CHECKLIST

После деплоя:

- [ ] Открыть https://traffic.onai.academy/login
- [ ] F12 → Console: нет CORS errors
- [ ] F12 → Network: `/api/traffic-auth/login` request status 200
- [ ] Login работает
- [ ] Redirect на dashboard
- [ ] Dashboard загружает данные (teams API works)

---

**STATUS:** 🟢 Ready to deploy (после обновления всех imports)

**NEXT:** Обновить imports во всех Traffic Dashboard файлах → deploy → test! 🚀
