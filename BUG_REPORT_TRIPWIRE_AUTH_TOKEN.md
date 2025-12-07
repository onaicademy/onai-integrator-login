# 🐛 БАГ REPORT: Tripwire Auth Token не передаётся в API

**Дата:** 2025-12-05  
**Приоритет:** 🔴 КРИТИЧЕСКИЙ  
**Статус:** ✅ НАЙДЕН, ЖДЁТ ФИКСА

---

## 📊 СИМПТОМЫ

1. ✅ Login успешен: `rakhat@onaiacademy.kz` → JWT token получен
2. ✅ Токен сохранён: `localStorage.setItem('tripwire_supabase_token', token)`
3. ✅ Redirect на `/admin/tripwire-manager`
4. ❌ API запросы возвращают: **401 "No token provided"**
5. ❌ Принудительный logout → redirect на `/login`

---

## 🔍 ROOT CAUSE

**Production bundle содержит СТАРУЮ версию `apiClient.ts`!**

### Доказательства:

#### ✅ Тест 1: Токен существует в localStorage
```javascript
localStorage.getItem('tripwire_supabase_token')
// Результат: "eyJhbGciOiJIUzI1NiIsImtpZCI6InZZL1VwSjAz..."  ← ТОКЕН ЕСТЬ!
```

#### ✅ Тест 2: Прямой fetch с токеном работает
```javascript
fetch('https://api.onai.academy/api/admin/tripwire/stats', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tripwire_supabase_token')}`
  }
})
// Результат: 200 OK, data: {"total_students": 0, ...}  ← BACKEND РАБОТАЕТ!
```

#### ❌ Тест 3: API через bundled код НЕ передаёт токен
```javascript
api.get('/api/admin/tripwire/stats')
// Результат: 401 Unauthorized, "No token provided"  ← BUNDLED КОД НЕ РАБОТАЕТ!
```

**Консоль показывает Headers БЕЗ Authorization:**
```
📋 Headers: {Content-Type: application/json}
           ↑ НЕТ Authorization: Bearer ...
```

---

## 💡 ПОЧЕМУ ЭТО ПРОИСХОДИТ?

**Старая версия `apiClient.ts` (на production):**
```typescript
// ❌ УСТАРЕВШИЙ КОД (не поддерживает tripwire_supabase_token)
function getAuthToken() {
  return localStorage.getItem('supabase_token'); // Только main platform token!
}
```

**Новая версия `apiClient.ts` (в исходниках):**
```typescript
// ✅ НОВЫЙ КОД (поддерживает tripwire_supabase_token)
function getAuthToken(endpoint) {
  if (endpoint && endpoint.includes('/tripwire')) {
    const tripwireToken = localStorage.getItem('tripwire_supabase_token');
    if (tripwireToken) {
      return tripwireToken;  // ← ЭТО ДОЛЖНО РАБОТАТЬ!
    }
  }
  return localStorage.getItem('supabase_token');
}
```

---

## 🎯 РЕШЕНИЕ

### Option 1: Rebuild + Deploy Frontend (рекомендуется)

```bash
# 1. Rebuild frontend
npm run build

# 2. Deploy на Vercel
vercel deploy --prod

# 3. Hard refresh браузера
# Cmd+Shift+R (macOS) или Ctrl+Shift+R (Windows)
```

**Время:** ~5 минут  
**Риск:** Низкий (только фронт, бэкенд не трогаем)

---

### Option 2: Hotfix - заменить в bundled коде (временно)

**НЕ РЕКОМЕНДУЕТСЯ!** Это костыль, но может помочь для срочного теста.

---

### Option 3: Локальный тест (localhost)

```bash
# 1. Запустить frontend локально
npm run dev

# 2. Открыть http://localhost:5173/tripwire/login
# 3. Протестировать с новым кодом
```

**Время:** ~2 минуты  
**Риск:** Нулевой (тестовая среда)

---

## 📋 CHECKLIST ДЛЯ ФИКСА

### Перед deploy:
- [ ] ✅ Убедиться что `apiClient.ts` содержит логику для `tripwire_supabase_token`
- [ ] ✅ Убедиться что `useTripwireAuth.ts` сохраняет токен в `localStorage.setItem('tripwire_supabase_token', ...)`
- [ ] ✅ Проверить что других изменений для deploy нет

### После deploy:
- [ ] ✅ Hard refresh браузера (Cmd+Shift+R)
- [ ] ✅ Залогиниться как Rakhat
- [ ] ✅ Проверить что Headers содержат `Authorization: Bearer ...`
- [ ] ✅ Проверить что API запросы возвращают 200 OK

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ ПОСЛЕ ФИКСА

**БЫЛО:**
```
📋 Headers: {Content-Type: application/json}
            ↑ НЕТ Authorization!
```

**СТАНЕТ:**
```
📋 Headers: {
  Content-Type: application/json,
  Authorization: Bearer eyJhbGc...  ← ✅ ТОКЕН ДОБАВЛЕН!
}
```

---

## 📊 IMPACT

**Блокирует:**
- ❌ Sales Manager Dashboard (нельзя создать студентов)
- ❌ Tripwire тестирование (нельзя проверить функционал)
- ❌ Production launch (critical blocker)

**Решается:**
- ✅ Rebuild + Deploy frontend (~5 минут)
- ✅ Hard refresh в браузере
- ✅ Повторный логин

---

## 🚀 READY TO FIX?

**Скажи команду:**
- **"REBUILD FRONTEND"** → я запущу build
- **"ТЕСТИРУЮ ЛОКАЛЬНО"** → запущу dev server
- **"САМ ЗАДЕПЛОЮ"** → окей, жду результата

**Что рекомендую:** Локально протестировать (npm run dev) → убедиться что работает → потом деплоить!

