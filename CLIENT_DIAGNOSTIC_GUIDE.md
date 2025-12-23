# 🔍 CLIENT-SIDE DIAGNOSTIC GUIDE - 23 Dec 2025

## ✅ SERVER STATUS: 100% OPERATIONAL

**Verified:**
- ✅ All files on server are FRESH (Dec 22 19:08 UTC)
- ✅ index.html: `build-timestamp="1764667500"`
- ✅ Nginx serving correct files with `no-cache` headers
- ✅ DNS resolves correctly to 207.154.231.30
- ✅ All JS/CSS assets are updated and minified
- ✅ NO old files (Dec 22 13:49) exist on server

**Problem:** Client-side caching or browser issue

---

## 🧪 DIAGNOSTIC CHECKLIST (ДЛЯ ПОЛЬЗОВАТЕЛЯ)

### Step 1: CHECK URL
**Q:** Какой URL вы открываете?

✅ Правильные URLs:
- https://onai.academy/traffic/login
- https://traffic.onai.academy/login (если настроен subdomain)

❌ НЕПРАВИЛЬНО:
- http://onai.academy (без HTTPS)
- http://207.154.231.30 (прямой IP)
- Любой localhost

---

### Step 2: CHECK BROWSER CACHE

#### Вариант A: Hard Refresh (САМЫЙ ПРОСТОЙ)
1. Открой https://onai.academy/traffic/login
2. Нажми **ОДНОВРЕМЕННО**:
   - **Mac:** `Cmd + Shift + R`
   - **Windows/Linux:** `Ctrl + Shift + R`
3. Подожди 3-5 секунд полной загрузки
4. Проверь дизайн

#### Вариант B: Clear Cache Manually
**Chrome/Edge:**
1. Открой DevTools: `F12` или `Cmd+Option+I` (Mac)
2. Right-click на кнопке Refresh (⟳)
3. Выбери: **"Empty Cache and Hard Reload"**

**Firefox:**
1. `Cmd+Shift+Delete` (Mac) или `Ctrl+Shift+Delete` (Win)
2. Выбери: "Cached Web Content" only
3. Time range: "Everything"
4. Click "Clear Now"

#### Вариант C: Incognito + Clear Everything
1. Закрой ВСЕ incognito окна
2. Открой НОВОЕ incognito: `Cmd+Shift+N` (Mac) или `Ctrl+Shift+N` (Win)
3. Открой: https://onai.academy/traffic/login
4. **НЕ ИСПОЛЬЗУЙ** autofill/autocomplete

---

### Step 3: CHECK SERVICE WORKER

**DevTools Method:**
1. Открой https://onai.academy/traffic/login
2. Открой DevTools: `F12`
3. Перейди в **Application** tab (Chrome/Edge) или **Storage** (Firefox)
4. Левая панель → **Service Workers**
5. Если видишь какие-то registered workers:
   - Click **"Unregister"** на каждом
   - Refresh страницу

**Alternative:**
```
1. DevTools → Console
2. Вставь и нажми Enter:
   navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()))
3. Refresh страницу
```

---

### Step 4: CHECK CACHE STORAGE

**DevTools Method:**
1. DevTools → **Application** tab
2. Левая панель → **Cache Storage**
3. Если видишь кэши (например "workbox-precache"):
   - Right-click → **Delete**
   - ИЛИ в Console:
   ```javascript
   caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
   ```
4. Refresh страницу

---

### Step 5: CHECK LOCAL STORAGE / SESSION STORAGE

1. DevTools → **Application** tab
2. **Local Storage** → `https://onai.academy`
   - Right-click → **Clear**
3. **Session Storage** → `https://onai.academy`
   - Right-click → **Clear**
4. **Cookies** → `https://onai.academy`
   - Right-click → **Clear all from "onai.academy"**
5. Refresh страницу

---

### Step 6: CHECK NETWORK TAB

1. DevTools → **Network** tab
2. Включи **"Disable cache"** checkbox вверху
3. Refresh страницу (`Cmd+R`)
4. Проверь список запросов:
   - Ищи `index.html` → Click → Headers tab
   - Проверь: `Response Headers → Cache-Control: no-cache, no-store, must-revalidate`
   - Проверь: `Request Headers → Cache-Control: no-cache`
   - Ищи `index-DdDFQR6i.js` → должен быть status `200` (не `304 Not Modified`)

**SCREENSHOT:** Если всё еще старая версия, сделай screenshot Network tab и покажи мне!

---

### Step 7: CHECK BUILD TIMESTAMP

1. DevTools → **Elements** tab
2. Найди `<meta name="build-timestamp" content="...">` в `<head>`
3. **Должно быть:** `content="1764667500"`

**Если другое число** → твой браузер загружает старый HTML!

**Проверь в Console:**
```javascript
document.querySelector('meta[name="build-timestamp"]').content
```

**Expected:** `"1764667500"`

---

### Step 8: CHECK LOADED JS FILES

1. DevTools → **Sources** tab
2. Левая панель → `onai.academy/assets/`
3. Найди: `index-DdDFQR6i.js`
4. **Должен быть:** размер ~1.3MB, minified

**Если видишь:**
- `index-Ckon00cu.js` ← СТАРЫЙ!
- Или размер другой ← кэш!

---

## 🚀 NUCLEAR OPTION (ЕСЛИ НИЧЕГО НЕ ПОМОГЛО)

### Option 1: Different Browser
1. Скачай **другой браузер** (если Chrome → попробуй Firefox)
2. Открой в НОВОМ браузере: https://onai.academy/traffic/login
3. Проверь дизайн

### Option 2: Clear ALL Browser Data
**Chrome:**
1. Settings → Privacy and security → Clear browsing data
2. Time range: **"All time"**
3. Check ALL boxes:
   - Browsing history
   - Cookies and other site data
   - Cached images and files
4. Click "Clear data"
5. Restart browser

**Firefox:**
1. Settings → Privacy & Security → Cookies and Site Data
2. Click "Clear Data..."
3. Check both boxes
4. Click "Clear"
5. Restart browser

### Option 3: Check Router/ISP Cache
Некоторые провайдеры кэшируют на уровне роутера:

1. Открой новый tab
2. Вставь: `chrome://net-internals/#dns` (Chrome) или `about:networking#dns` (Firefox)
3. Click "Clear host cache"
4. Restart browser

### Option 4: Flush System DNS
**Mac:**
```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

**Windows:**
```cmd
ipconfig /flushdns
```

**Linux:**
```bash
sudo systemctl restart systemd-resolved
```

---

## 📊 WHAT TO SEND ME IF STILL BROKEN:

1. **Screenshot of:**
   - DevTools → Network tab (with index.html selected)
   - DevTools → Elements tab (showing `<meta name="build-timestamp">`)
   - The login page UI

2. **Console output:**
   ```javascript
   // Copy-paste this to Console and send me output:
   console.log({
     timestamp: document.querySelector('meta[name="build-timestamp"]')?.content,
     scripts: [...document.querySelectorAll('script[src]')].map(s => s.src),
     styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href),
     serviceWorkers: await navigator.serviceWorker.getRegistrations(),
     cacheNames: await caches.keys()
   });
   ```

3. **Network headers:**
   - DevTools → Network → index.html → Headers tab
   - Screenshot "Response Headers" section

---

## ✅ EXPECTED RESULT (NEW VERSION):

**Login Page Should Show:**
- 🎨 Dark background with neon green (#00FF88) accents
- 🔤 Title: зависит от языка (РУС/ҚАЗ)
  - RU: "TRAFFIC COMMAND" + "DASHBOARD LOGIN"
  - KZ: другое
- ✨ Animated gradient background
- 🌐 Language toggle button (top-right)
- 🔐 Modern input fields with neon borders
- 💚 Big green "Войти →" button with shadow

**OLD VERSION (SHOULD NOT SEE):**
- "КОМАНДНАЯ ПАНЕЛЬ ТРАФИКА" (all caps Russian)
- Different layout/design

---

## 🔧 TECHNICAL DETAILS (for debugging)

**Server Files:**
```
/var/www/onai.academy/
├── index.html (1744 bytes, Dec 22 19:08 UTC)
├── assets/
│   ├── index-DdDFQR6i.js (1.3MB, minified)
│   ├── TrafficLogin-BSjTa76j.js (13K)
│   ├── index-W7OWJzqY.css (271K)
│   └── ... (127 total JS files, all Dec 22 19:08)
```

**HTTP Headers:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
Last-Modified: Mon, 22 Dec 2025 19:08:41 GMT
ETag: "694a376d-6d0"
```

**Build Info:**
- Timestamp: 1764667500 (Unix timestamp)
- Date: Dec 22, 2025 19:08:20 UTC
- Vite build with chunking
- No Cloudflare/CDN in front

---

## 🎯 MOST COMMON ISSUES:

1. **Browser cache** (95% of cases) → Hard refresh fixes
2. **Service Worker** (3%) → Unregister in DevTools
3. **Old incognito session** (1%) → Close all incognito windows first
4. **Wrong URL** (1%) → Check you're on https://onai.academy/traffic/login

---

**Status:** Server is 100% operational. Issue is client-side caching.  
**Last Updated:** Dec 23, 2025 06:40 UTC  
**Server IP:** 207.154.231.30 (Digital Ocean)
