# 🧪 E2E TESTING SCRIPT - Traffic Dashboard

**Дата:** 22 декабря 2025 19:50 MSK  
**Tester:** User (miso)  
**Environment:** Localhost

---

## 🎯 ЦЕЛЬ ТЕСТИРОВАНИЯ:

Проверить **полный flow** Traffic Dashboard:
1. Login → Dashboard → Settings → Analytics
2. Auto-load кабинетов
3. Выбор кабинетов и кампаний
4. Сохранение в БД
5. Отображение аналитики

---

## ✅ PREREQUISITE:

```bash
# 1. Backend запущен
cd /Users/miso/onai-integrator-login/backend
npm run dev
# ✅ Должен быть на http://localhost:3000

# 2. Frontend запущен
cd /Users/miso/onai-integrator-login
npm run dev
# ✅ Должен быть на http://localhost:8080

# 3. Mock Mode включен
backend/env.env: MOCK_MODE=true ✅

# 4. Test user exists
kenesary@onai.academy / changeme123 ✅
```

---

## 📋 TEST CASE 1: EMPTY STATE → SETTINGS → ANALYTICS

### **Step 1: Login** ⏱️ 30 сек

```bash
URL: http://localhost:8080/#/traffic/login

Actions:
1. Открыть URL в браузере
2. Ввести email: kenesary@onai.academy
3. Ввести password: changeme123
4. Нажать "Войти"

Expected:
✅ Redirect на: http://localhost:8080/#/traffic/dashboard
✅ Показывается Dashboard с приветствием
✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 2: Navigate to Analytics** ⏱️ 10 сек

```bash
URL: http://localhost:8080/#/traffic/detailed-analytics

Actions:
1. Нажать на кнопку "Детальная аналитика РК" в Dashboard
   ИЛИ
2. Перейти по URL напрямую

Expected:
✅ Показывается страница Analytics
✅ Empty State: "Нет данных по кампаниям"
✅ Причина: "Facebook Ad Account не подключен или не выбраны кампании"
✅ Инструкции:
   1. Перейдите в раздел Настройки
   2. Нажмите кнопку "Загрузить доступные кабинеты"
   3. Выберите рекламные кабинеты (checkboxes)
   4. Разверните кабинеты и выберите кампании
   5. Нажмите "Сохранить настройки"
   6. Вернитесь сюда - данные появятся автоматически
✅ Кнопка: "Перейти в настройки" (зеленая)
✅ Кнопка: "В Dashboard" (outline)
✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 3: Navigate to Settings** ⏱️ 10 сек

```bash
URL: http://localhost:8080/#/traffic/settings

Actions:
1. Нажать кнопку "Перейти в настройки" из Empty State
   ИЛИ
2. Нажать "Settings" в header

Expected:
✅ Redirect на: http://localhost:8080/#/traffic/settings
✅ Показывается страница Settings
✅ Header: "Настройки" + email пользователя
✅ Section: "Рекламные кабинеты Facebook"
✅ Кнопка: "Загрузить доступные кабинеты" (зеленая, справа)

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 4: Auto-Load Ad Accounts** ⏱️ 15 сек

```bash
Actions:
1. НИЧЕГО НЕ ДЕЛАТЬ - просто ждать 2-3 секунды

Expected (AUTO-LOAD):
✅ Автоматически загружаются 2 mock кабинета:
   1. OnAI Academy - Main Account (act_123456789)
   2. OnAI Academy - Test Account (act_987654321)
✅ Каждый кабинет показывает:
   - Checkbox (пустой)
   - Название
   - ID: act_XXX • USD
   - Кнопка "Кампании" справа (disabled пока не выбран)
✅ Нет ошибок в консоли
✅ Console log: "✅ Loaded X accounts from Facebook"

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________

Screenshot: ☐ Attached
```

---

### **Step 5: Select Ad Accounts** ⏱️ 10 сек

```bash
Actions:
1. Нажать checkbox у "OnAI Academy - Main Account"

Expected:
✅ Checkbox становится checked ✅
✅ Border кабинета становится зеленым (border-[#00FF88])
✅ Background становится зеленоватым (bg-[#00FF88]/10)
✅ Появляется иконка CheckCircle2 рядом с названием
✅ Кнопка "Кампании" становится активной
✅ Статистика внизу: "Кабинетов выбрано: 1"

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 6: Expand Campaigns** ⏱️ 20 сек

```bash
Actions:
1. Нажать кнопку "Кампании" у выбранного кабинета

Expected:
✅ Кнопка меняется с ChevronRight на ChevronDown
✅ Под кабинетом появляется loading: "Загрузка кампаний..."
✅ Через 1-2 секунды загружаются 3 mock кампании:
   1. Lead Generation - Winter 2025 (ACTIVE • LEAD_GENERATION)
   2. Brand Awareness - Q4 (ACTIVE • BRAND_AWARENESS)
   3. Conversions - AI Course (ACTIVE • CONVERSIONS)
✅ Каждая кампания показывает:
   - Checkbox (пустой)
   - Название
   - Status • Objective
✅ Кампании с отступом слева (ml-8)
✅ Console log: "✅ Loaded 3 campaigns for act_123456789"
✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________

Screenshot: ☐ Attached
```

---

### **Step 7: Select Campaigns** ⏱️ 15 сек

```bash
Actions:
1. Нажать checkbox у "Lead Generation - Winter 2025"
2. Нажать checkbox у "Brand Awareness - Q4"

Expected:
✅ Оба checkbox становятся checked ✅
✅ Border кампаний становится зеленым
✅ Background становится зеленоватым
✅ Иконка CheckCircle2 рядом с названием
✅ Статистика внизу: "Кампаний выбрано: 2"

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 8: Save Settings** ⏱️ 10 сек

```bash
Actions:
1. Scroll вниз
2. Нажать кнопку "Сохранить настройки" (зеленая, внизу)

Expected:
✅ Кнопка показывает loading: "Сохранение..." + spinner
✅ Через 1-2 секунды:
   ✅ Toast (зеленый): "✅ Настройки сохранены!"
   ✅ Кнопка возвращается: "Сохранить настройки"
✅ Console log: PUT /api/traffic-settings/{userId} 200 OK
✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________

Screenshot: ☐ Attached
```

---

### **Step 9: Navigate to Analytics** ⏱️ 10 сек

```bash
Actions:
1. Нажать кнопку "Dashboard" в header
2. Нажать "Детальная аналитика РК"

Expected:
✅ Redirect на: http://localhost:8080/#/traffic/detailed-analytics
✅ Показывается loading: "Загрузка аналитики..."
✅ Console log: "🔍 Fetching analytics for user: {userId}"
✅ Console log: "✅ Found 2 selected campaigns"
✅ Console log: "✅ Loaded analytics for 2 campaigns"

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 10: Verify Analytics Data** ⏱️ 30 сек

```bash
Expected (Data Display):
✅ Показываются 2 кампании:
   1. Lead Generation - Winter 2025
   2. Brand Awareness - Q4

✅ Для каждой кампании показываются метрики:
   - Spend: $450.00 / $320.00
   - Impressions: 15,000 / 12,000
   - Clicks: 225 / 180
   - CTR: 1.50% / 1.50%
   - CPC: $2.00 / $1.78
   - CPM: $30.00 / $26.67
   - Conversions: 15 / 8
   - Revenue: $1,500 / $800
   - ROAS: 3.33x / 2.50x

✅ UI:
   - Gradient карточки для каждой кампании
   - Зеленые акценты (#00FF88)
   - Иконки для метрик
   - Кнопка "Expand" для ad sets
   - Кнопка "AI Analysis"

✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________

Screenshot: ☐ Attached
```

---

## 📋 TEST CASE 2: RELOAD SETTINGS (PERSISTENCE)

### **Step 11: Reload Settings Page** ⏱️ 10 сек

```bash
Actions:
1. Перейти на: http://localhost:8080/#/traffic/settings
2. Нажать F5 (hard refresh)

Expected:
✅ Auto-load: Загружаются кабинеты автоматически
✅ Pre-selection: "OnAI Academy - Main Account" ВЫБРАН (зеленый border)
✅ Expand: Кампании НЕ развернуты (collapsed)
✅ Статистика: "Кабинетов выбрано: 1"
✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

### **Step 12: Re-expand Campaigns** ⏱️ 10 сек

```bash
Actions:
1. Нажать "Кампании" у выбранного кабинета

Expected:
✅ Загружаются 3 кампании
✅ 2 кампании ВЫБРАНЫ (зеленый border):
   - Lead Generation - Winter 2025 ✅
   - Brand Awareness - Q4 ✅
✅ 1 кампания НЕ выбрана:
   - Conversions - AI Course
✅ Статистика: "Кампаний выбрано: 2"

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________

Screenshot: ☐ Attached
```

---

### **Step 13: Refresh Ad Accounts** ⏱️ 10 сек

```bash
Actions:
1. Нажать кнопку "Загрузить доступные кабинеты"

Expected:
✅ Loading на кнопке: spinner
✅ Через 1-2 секунды:
   ✅ Toast: "✅ Обновлено: 2 кабинета"
   ✅ Список кабинетов остался тем же
   ✅ Выбор сохранился ("OnAI Academy - Main Account" все еще выбран)
✅ Нет ошибок в консоли

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________
```

---

## 📋 TEST CASE 3: CONSOLE ERRORS CHECK

### **Step 14: Check Console** ⏱️ 5 мин

```bash
Actions:
1. Открыть DevTools (F12)
2. Перейти на вкладку Console
3. Очистить консоль (Clear)
4. Повторить flow:
   - Login
   - Dashboard
   - Analytics (empty)
   - Settings
   - Select accounts
   - Expand campaigns
   - Select campaigns
   - Save
   - Analytics (with data)

Expected:
✅ НЕТ ОШИБОК:
   - ❌ ReferenceError
   - ❌ TypeError
   - ❌ 500 Internal Server Error
   - ❌ 401 Unauthorized
   - ❌ setSelectedAccounts is not defined

✅ ТОЛЬКО INFO/DEBUG logs:
   - ✅ Console logs: 🔍, ✅, ⚠️
   - ✅ Network logs: 200 OK
   - ✅ Loading states

Actual:
☐ PASS
☐ FAIL (опиши причину): _________________

Console Errors (if any):
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 📊 SUMMARY

### **Results:**

```
Test Case 1: EMPTY STATE → SETTINGS → ANALYTICS
Step 1:  ☐ PASS  ☐ FAIL
Step 2:  ☐ PASS  ☐ FAIL
Step 3:  ☐ PASS  ☐ FAIL
Step 4:  ☐ PASS  ☐ FAIL
Step 5:  ☐ PASS  ☐ FAIL
Step 6:  ☐ PASS  ☐ FAIL
Step 7:  ☐ PASS  ☐ FAIL
Step 8:  ☐ PASS  ☐ FAIL
Step 9:  ☐ PASS  ☐ FAIL
Step 10: ☐ PASS  ☐ FAIL

Test Case 2: RELOAD SETTINGS
Step 11: ☐ PASS  ☐ FAIL
Step 12: ☐ PASS  ☐ FAIL
Step 13: ☐ PASS  ☐ FAIL

Test Case 3: CONSOLE ERRORS
Step 14: ☐ PASS  ☐ FAIL

OVERALL: ☐ ALL PASS  ☐ SOME FAIL
```

### **Issues Found:**

```
Issue 1: _____________________________________________
Severity: ☐ CRITICAL  ☐ HIGH  ☐ MEDIUM  ☐ LOW
Steps to reproduce: __________________________________
Expected: ____________________________________________
Actual: ______________________________________________

Issue 2: _____________________________________________
(Continue if needed...)
```

---

## ✅ SIGN-OFF:

```
Tester: _______________
Date: _________________
Time spent: ___________
Result: ☐ APPROVED  ☐ REJECTED

Ready for Production Deploy: ☐ YES  ☐ NO

Notes:
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

---

**После прохождения всех тестов:**
☐ Deploy to production
☐ Smoke test on production
☐ Notify architect

---

**Created by:** AI Assistant (Senior QA Engineer Mode)  
**Date:** 22 December 2025 19:50 MSK
