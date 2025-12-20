# 🚀 ФИНАЛЬНЫЙ ДЕПЛОЙ - ПОШАГОВАЯ ИНСТРУКЦИЯ

**Дата:** 20 декабря 2024, 15:38  
**Сервер:** 137.184.27.189

---

## 📦 **ЧТО ГОТОВО:**

### **1. Frontend архив:**
```
/tmp/traffic-final-deploy-20251220_153811.tar.gz (13MB)
```

**Содержит:**
- ✅ Исправленный OnboardingTour (без ошибок)
- ✅ Полные числа вместо K/M
- ✅ Полный перевод на казахский
- ✅ VAMUS RM integration (Main Products)
- ✅ Табы Express / Main Products

### **2. Backend:**
```
backend/dist/routes/traffic-main-products.js (8.4KB)
```

**Новый endpoint:**
- ✅ `/api/traffic/main-products-sales`
- ✅ Подключение к VAMUS RM воронке
- ✅ Извлечение UTM меток

---

## 🔧 **ВАРИАНТ 1: АВТОМАТИЧЕСКИЙ ДЕПЛОЙ (если SSH работает)**

```bash
# Настрой SSH ключ:
cat ~/.ssh/id_ed25519.pub

# На сервере:
ssh root@137.184.27.189
echo "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit

# Запусти деплой:
/tmp/deploy-script.sh
```

---

## 📋 **ВАРИАНТ 2: РУЧНОЙ ДЕПЛОЙ (РЕКОМЕНДУЕТСЯ)**

### **ШАГ 1: Загрузить архивы на сервер**

**С вашей машины (через любой способ - WinSCP, Filezilla, etc.):**

1. **Frontend архив:**
   - Локальный путь: `/tmp/traffic-final-deploy-20251220_153811.tar.gz`
   - На сервер: `/tmp/frontend.tar.gz`

2. **Backend архив (создаем):**
   ```bash
   cd /Users/miso/onai-integrator-login/backend
   tar -czf /tmp/backend-deploy.tar.gz dist/
   ```
   - Локальный путь: `/tmp/backend-deploy.tar.gz`
   - На сервер: `/tmp/backend.tar.gz`

---

### **ШАГ 2: Подключись к серверу**

```bash
ssh root@137.184.27.189
```

---

### **ШАГ 3: Backup текущих файлов**

```bash
cd /var/www/onai-integrator-login-main

# Backup frontend
if [ -d "dist" ]; then
    mv dist dist.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Frontend backed up"
fi

# Backup backend
if [ -d "backend/dist" ]; then
    mv backend/dist backend/dist.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backend backed up"
fi
```

---

### **ШАГ 4: Deploy Frontend**

```bash
cd /var/www/onai-integrator-login-main

# Распаковать
tar -xzf /tmp/frontend.tar.gz

# Проверить
ls -lh dist/ | head -5

# Очистить tmp
rm /tmp/frontend.tar.gz

echo "✅ Frontend deployed"
```

---

### **ШАГ 5: Deploy Backend**

```bash
cd /var/www/onai-integrator-login-main/backend

# Распаковать
tar -xzf /tmp/backend.tar.gz

# Проверить новый route
ls -lh dist/routes/traffic-main-products.js

# Очистить tmp
rm /tmp/backend.tar.gz

echo "✅ Backend deployed"
```

---

### **ШАГ 6: Restart Services**

```bash
# Reload Nginx
nginx -s reload
echo "✅ Nginx reloaded"

# Restart Backend
pm2 restart onai-backend
echo "✅ Backend restarted"

# Проверить статус
pm2 status
pm2 logs onai-backend --lines 20 --nostream
```

---

### **ШАГ 7: Проверить что всё работает**

```bash
# 1. Проверить Nginx
curl -I https://traffic.onai.academy

# 2. Проверить Backend
curl http://localhost:3000/api/traffic/main-products-sales

# 3. Проверить логи
pm2 logs onai-backend --lines 50 --nostream

# 4. Проверить ошибки
tail -50 /var/log/nginx/error.log
```

---

## ✅ **CHECKLIST ПОСЛЕ ДЕПЛОЯ:**

### **На сервере:**
- [ ] Frontend распакован в `/var/www/onai-integrator-login-main/dist/`
- [ ] Backend распакован в `/var/www/onai-integrator-login-main/backend/dist/`
- [ ] Nginx перезагружен
- [ ] PM2 перезапущен
- [ ] Нет ошибок в логах

### **В браузере:**
1. [ ] Открыть https://traffic.onai.academy
2. [ ] **HARD REFRESH:** `Cmd+Shift+R` (Mac) или `Ctrl+Shift+R` (Windows)
3. [ ] Залогиниться (kenesary@onai.academy)
4. [ ] Проверить:
   - [ ] Onboarding работает (кнопка "Далее" не ломается)
   - [ ] Числа показываются полностью (₸1,234,567)
   - [ ] Переключение языка работает
   - [ ] **Есть табы:** "⚡ ExpressCourse" и "🚀 Основные продукты"
   - [ ] Tab "Основные продукты" открывается
   - [ ] API работает (проверить Network в DevTools)

---

## 🐛 **ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:**

### **1. Onboarding ломается:**
```bash
# Проверь что новый файл загружен
ssh root@137.184.27.189
ls -lh /var/www/onai-integrator-login-main/dist/assets/OnboardingTour*.js
```

### **2. Числа всё ещё "1K":**
```bash
# Браузерный кэш! Очисти кэш:
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

### **3. Табы не появились:**
```bash
# Проверь что новый dashboard загружен
ssh root@137.184.27.189
ls -lh /var/www/onai-integrator-login-main/dist/assets/TrafficTargetologistDashboard*.js
```

### **4. API Main Products не работает:**
```bash
# Проверь backend логи
ssh root@137.184.27.189
pm2 logs onai-backend --lines 100

# Проверь что route подключен
grep "traffic-main-products" /var/www/onai-integrator-login-main/backend/dist/server.js
```

---

## 🔄 **ROLLBACK (если всё сломалось):**

```bash
ssh root@137.184.27.189
cd /var/www/onai-integrator-login-main

# Вернуть frontend
rm -rf dist
mv dist.backup.LATEST dist

# Вернуть backend
rm -rf backend/dist
mv backend/dist.backup.LATEST backend/dist

# Restart
nginx -s reload
pm2 restart onai-backend
```

---

## 📊 **ЧТО ИЗМЕНИЛОСЬ:**

### **Frontend (3 файла):**
1. `OnboardingTour.tsx` - исправлен баг `moveNext`, адаптивность
2. `TrafficCommandDashboard.tsx` - числа полностью, переводы
3. `TrafficTargetologistDashboard.tsx` - табы Express/Main
4. `MainProductsAnalytics.tsx` - **НОВЫЙ** компонент

### **Backend (2 файла):**
1. `traffic-main-products.ts` - **НОВЫЙ** route для VAMUS RM
2. `server.ts` - подключен новый route

### **Translations:**
1. `translations.ts` - 45+ новых ключей (RU + KZ)

---

## 📝 **NOTES:**

1. **Кэш критичен!** После деплоя обязательно очисти кэш браузера
2. **PM2 логи** - смотри на ошибки в первые 30 секунд после restart
3. **Nginx config** - не требует изменений
4. **ENV файлы** - не меняются (AmoCRM токен уже есть)

---

## 🎯 **EXPECTED RESULT:**

После деплоя должно быть:

✅ **Traffic Dashboard:**
- Работает без JS ошибок
- Onboarding не ломается
- Числа полные (₸1,234,567)
- Язык переключается
- Табы Express / Main Products

✅ **Backend:**
- Endpoint `/api/traffic/main-products-sales` отвечает
- PM2 без ошибок
- Логи чистые

✅ **VAMUS RM:**
- API подключен
- Готов получать продажи
- Будет показывать статистику

---

**Братан, архивы готовы и ждут деплоя! 🚀**

Следуй инструкции и всё будет работать идеально!

---

**Created:** 20 декабря 2024, 15:38  
**Archives:**
- Frontend: `/tmp/traffic-final-deploy-20251220_153811.tar.gz`
- Backend: `создай командой выше`
