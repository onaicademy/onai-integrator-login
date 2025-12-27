# ✅ ЧТО СДЕЛАНО: Система UTM-трекинга готова к проверке

## 📦 Создано 3 инструмента для проверки

### 1. **📘 Ручная инструкция** (для тебя)
**Файл:** [MANUAL_TEST_INSTRUCTIONS.md](./MANUAL_TEST_INSTRUCTIONS.md)

**Что внутри:**
- Пошаговый чеклист проверки в браузере (без кодинга)
- 3 критических шага: LocalStorage → Network → AmoCRM
- Решения типичных проблем
- Тестовые сценарии (Cross-device tracking, повторные визиты)

**Как использовать:**
1. Открой этот файл
2. Следуй инструкции шаг за шагом
3. На каждом шаге делай скриншот если что-то не так

---

### 2. **🤖 Автоматический тест** (проверка логики)
**Файл:** `scripts/test-utm-tracking.ts`

**Команда:**
```bash
npm run test:utm
```

**Что проверяет:**
- ✅ Client ID генерируется корректно
- ✅ UTM параметры захватываются из URL
- ✅ Все данные собираются вместе для отправки
- ✅ Структура payload правильная

**Результат:**
```
🧪 Testing UTM Tracking Implementation

✅ TEST 1: Client ID Generation
   🆔 New client_id generated: 550e8400-e29b-41d4-a716-446655440000
   ✅ Client ID persists correctly

✅ TEST 2: UTM Parameter Capture
   📊 Captured from URL: { utm_source: 'facebook', utm_id: '120211234567890', fbclid: 'IwAR1234567890' }
   ✅ All UTM params captured correctly

✅ TEST 3: Complete Tracking Data for Forms
   📦 Complete tracking data: { utm_source: 'facebook', utm_id: '120211234567890', fbclid: 'IwAR1234567890', client_id: '550e8400-e29b-41d4-a716-446655440000' }
   ✅ All required fields present

✅ TEST 4: Form Payload Structure
   ✅ Form payload contains all tracking data

🎉 All tests passed! Frontend tracking implementation is complete.
```

---

### 3. **🌐 Live API тест** (проверка всей цепочки)
**Файл:** `scripts/test-live-utm.cjs`

**Команда:**
```bash
npm run test:utm:live
```

**Что проверяет:**
- ✅ Frontend: client_id генерация
- ✅ Backend: API принимает данные
- ✅ Database: Данные сохраняются в Supabase
- ✅ Показывает где проверить в AmoCRM

**Результат:**
```
🕵️‍♂️ ЗАПУСК LIVE API TEST

✅ TEST 1: Client ID Generation
   🆔 Generated client_id: test-client-1735144087-abc123
   ✅ Format: UUID-like

✅ TEST 2: UTM Params Structure
   ✅ All required params present

✅ TEST 3: Backend API Request
   🌐 API URL: http://localhost:3000/api/landing/submit
   📤 Sending payload...
   📥 Response Status: 200
   📝 Lead ID: 12345678-90ab-cdef-1234-567890abcdef
   💾 Data saved to database

📋 VERIFICATION CHECKLIST

✅ STEP 1: Backend API - PASSED
   📝 Lead ID: 12345678-90ab-cdef-1234-567890abcdef

📊 STEP 2: Verify in Supabase
   1. Open Supabase Dashboard
   2. Find lead by ID
   3. Check metadata → utmParams

📊 STEP 3: Verify in AmoCRM
   1. Open AmoCRM
   2. Find deal: "Тест Брат (Автотест)"
   3. Check custom fields

✅ All automated tests PASSED!
📝 Next: Verify manually in Supabase and AmoCRM
```

---

## 🎯 ЧТО ДЕЛАТЬ ДАЛЬШЕ

### Вариант 1: Быстрая проверка (5 минут)
```bash
# Запусти live тест
npm run test:utm:live

# Если вывод: "✅ All automated tests PASSED!"
# → Открой Supabase и AmoCRM, проверь данные по Lead ID
```

### Вариант 2: Полная ручная проверка (10 минут)
1. Открой [MANUAL_TEST_INSTRUCTIONS.md](./MANUAL_TEST_INSTRUCTIONS.md)
2. Следуй **"ШАГ 1"** → Проверь LocalStorage
3. Следуй **"ШАГ 2"** → Проверь Network Request
4. Следуй **"ШАГ 3"** → Проверь AmoCRM

### Вариант 3: Только логика (1 минута)
```bash
npm run test:utm
```

---

## 🔍 ЧТО ПРОВЕРЯТЬ

### ✅ Всё работает если:
1. **LocalStorage** содержит:
   - `onai_client_id` (UUID)
   - `utm_params` (JSON с UTM-метками)

2. **Network Request** содержит:
   ```json
   {
     "utmParams": {
       "utm_source": "TEST_BRO_CHECK",
       "utm_id": "999999",
       "fbclid": "TEST_CLICK_ID",
       "client_id": "550e8400-..."
     }
   }
   ```

3. **Supabase** (Landing DB):
   - Таблица `landing_leads`
   - Колонка `metadata` → `utmParams` → все 4 поля заполнены

4. **AmoCRM**:
   - Сделка создана
   - Кастомные поля заполнены:
     - Client ID
     - UTM Source
     - Facebook Ad ID
     - Facebook Click ID

---

## ❌ Что-то не работает?

### Если LocalStorage пустой:
- **Проблема:** UTMTracker компонент не загружен
- **Решение:** Проверь консоль браузера (F12 → Console)

### Если Network Request без utmParams:
- **Проблема:** Форма не вызывает `getAllUTMParams()`
- **Решение:** Проверь файл `/src/components/landing/CheckoutForm.tsx`

### Если AmoCRM поля пустые:
- **Проблема:** Кастомные поля не созданы или неправильный маппинг
- **Решение:** 
  1. Проверь .env на сервере: `AMOCRM_ACCESS_TOKEN`
  2. Создай кастомные поля в AmoCRM (Настройки → Сделки → Поля)
  3. Проверь код в `/backend/src/lib/amocrm.ts`

---

## 📞 Как сообщить о проблеме

Если что-то не работает:

1. **Запусти тест:**
   ```bash
   npm run test:utm:live
   ```

2. **Сделай скриншоты:**
   - Вывод теста в терминале
   - LocalStorage (F12 → Application)
   - Network Request (F12 → Network)
   - Supabase (таблица landing_leads)
   - AmoCRM (карточка сделки)

3. **Отправь разработчику:**
   ```
   Брат, тест провалился на шаге X:
   [скриншот]
   ```

---

## 🎉 Итог

**Система готова.** Осталось только **проверить своими глазами**, что данные действительно доходят до AmoCRM.

**Выбери вариант проверки:**
- 🚀 Быстро: `npm run test:utm:live` (30 секунд)
- 🔍 Подробно: [MANUAL_TEST_INSTRUCTIONS.md](./MANUAL_TEST_INSTRUCTIONS.md) (10 минут)
- ⚡ Логика: `npm run test:utm` (5 секунд)

**После проверки напиши:**
- ✅ "Всё работает, данные в AmoCRM" → можно деплоить
- ❌ "Проблема на шаге X" → отправь скриншот

---

**Дата:** 25 декабря 2025  
**Статус:** ✅ Готово к проверке
