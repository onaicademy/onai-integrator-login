# 🚨 MANUAL VERCEL CACHE PURGE INSTRUCTIONS

**Reason:** Vercel CDN может кэшировать старую версию до 10 минут. Для немедленного восстановления нужен ручной purge.

---

## 🔥 ВАРИАНТ 1: Purge Data Cache (Fastest)

1. **Открой:** https://vercel.com/onaicademy/onai-integrator-login/settings/data-cache

2. **Найди секцию:** "Data Cache"

3. **Нажми:** `Purge Everything` (красная кнопка)

4. **Ждем:** 30-60 секунд

5. **Проверка:** Открой https://onai.academy/admin/tripwire-manager в инкогнито

---

## 🔄 ВАРИАНТ 2: Redeploy (Alternative)

1. **Открой:** https://vercel.com/onaicademy/onai-integrator-login/deployments

2. **Найди:** Последний deployment (должен быть `main` branch)

3. **Три точки (⋮)** → `Redeploy`

4. **ВАЖНО:** Сними галочку `Use existing Build Cache`

5. **Confirm** → Ждем ~2 минуты

---

## ✅ ПРОВЕРКА ВОССТАНОВЛЕНИЯ

После purge или redeploy:

```bash
# Открой инкогнито окно браузера
# Перейди на:
https://onai.academy/admin/tripwire-manager

# Ожидаемый результат:
✅ Страница загружается без ошибок
✅ Видны все компоненты (Stats, Chart, Users)
✅ SafeDateFilter с кнопками-пресетами
✅ Кнопка "ДОБАВИТЬ УЧЕНИКА" работает
```

---

## 🎯 ЕСЛИ ВСЕ ЕЩЕ НЕ РАБОТАЕТ

### Проверка 1: Vercel Build Status

```
https://vercel.com/onaicademy/onai-integrator-login/deployments
```

Убедись, что последний деплой:
- ✅ Status: `Ready` (зеленый)
- ✅ Branch: `main`
- ✅ Commit: `ARCHITECT APPROVED: Safe Date Filter`

### Проверка 2: Browser Console

```javascript
// В DevTools Console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Проверка 3: Network Tab

```
F12 → Network → Hard Refresh (Cmd+Shift+R)
Проверь что загружаются файлы:
- index-[NEW_HASH].js (не index-DfVgfPPT.js)
```

---

## 📞 ЕСЛИ НИЧЕГО НЕ ПОМОГЛО

Напиши в чат:
```
❌ Manual purge не помог
Скриншот: [приложи скриншот ошибки]
Browser: [Chrome/Safari/Firefox]
Vercel Deployment URL: [последний URL]
```

Я проверю Vercel логи и найду проблему.

---

**Prepared by:** AI Assistant  
**For:** Production Emergency Recovery  
**Date:** 03.12.2025 14:15 (Almaty)  
**Status:** 🔥 URGENT - Manual intervention required

