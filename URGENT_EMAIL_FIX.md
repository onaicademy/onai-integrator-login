# 🚨 СРОЧНЫЙ ФИКС: EMAIL ТЕПЕРЬ ОПЦИОНАЛЕН

## ❌ ПРОБЛЕМА:
Лиды НЕ сохранялись, потому что на лендинге `/expresscourse` НЕТ поля email, но код требовал email как обязательное поле!

**Ошибка:**
```
❌ Error submitting lead: Error: Email обязателен для заполнения
```

---

## ✅ ЧТО ИСПРАВЛЕНО:

### **1. Backend (`backend/src/routes/landing.ts`):**

#### БЫЛО:
```typescript
// ❌ Email был обязателен
if (!email || !email.trim()) {
  return res.status(400).json({
    success: false,
    error: 'Email обязателен для заполнения'
  });
}
```

#### СТАЛО:
```typescript
// ✅ Email опционален
// Валидация только если email указан
if (email && email.trim()) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Неверный формат email адреса'
    });
  }
}
```

#### БЫЛО (AmoCRM):
```typescript
// ❌ Всегда добавляли email
custom_fields_values: [
  { field_code: 'EMAIL', values: [{ value: lead.email }] },
  { field_code: 'PHONE', values: [{ value: lead.phone }] }
]
```

#### СТАЛО:
```typescript
// ✅ Email добавляется только если он есть
const customFieldsValues = [
  { field_code: 'PHONE', values: [{ value: lead.phone }] }
];

if (lead.email && lead.email.trim()) {
  customFieldsValues.push({
    field_code: 'EMAIL',
    values: [{ value: lead.email }]
  });
}
```

---

### **2. Frontend (`src/components/landing/CheckoutForm.tsx`):**

#### БЫЛО:
```typescript
// ❌ Email обязателен
if (!formData.email.trim()) {
  alert('❌ Пожалуйста, укажите ваш email');
  return;
}

// ❌ required атрибут
<input
  type="email"
  required  // ← Обязательное поле
  placeholder="your@email.com"
/>
<label>EMAIL *</label>  {/* ← Звездочка */}
```

#### СТАЛО:
```typescript
// ✅ Email опционален
// Валидация только если email указан
if (formData.email.trim()) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email.trim())) {
    alert('❌ Пожалуйста, введите корректный email адрес');
    return;
  }
}

// ✅ БЕЗ required атрибута
<input
  type="email"
  placeholder="your@email.com (не обязательно)"
/>
<label>EMAIL <span className="text-gray-600">(опционально)</span></label>
```

---

## 🔥 СРОЧНЫЙ ДЕПЛОЙ:

### **1. Коммит изменений:**
```bash
cd c:\onai-integrator-login\onai-integrator-login
git add backend/src/routes/landing.ts src/components/landing/CheckoutForm.tsx
git commit -m "🚨 URGENT FIX: Make email optional in landing form (only name + phone required)"
```

### **2. Деплой Backend (Digital Ocean):**
```bash
# На сервере:
cd /root/onai-integrator-login/onai-integrator-login
git pull
cd backend
pm2 restart onai-backend
pm2 logs onai-backend --lines 50
```

**Проверка:**
```bash
# Должно быть:
✅ Server running on port 3000
✅ Sentry initialized
```

### **3. Деплой Frontend (Digital Ocean):**
```bash
# Локально:
npm run build
```

**Затем на сервере:**
```bash
cd /root/onai-integrator-login/onai-integrator-login
git pull
npm run build
# Nginx автоматически подхватит новые файлы из dist/
```

---

## ✅ ПРОВЕРКА:

### **1. Проверь форму на сайте:**
```
1. Зайди на https://onai.academy/integrator/expresscourse
2. Кликни "КУПИТЬ СЕЙЧАС"
3. Заполни только ИМЯ и ТЕЛЕФОН (без email)
4. Кликни любую кнопку оплаты
5. Должно появиться: "СПАСИБО ЗА ЗАЯВКУ!"
```

### **2. Проверь лид в AmoCRM:**
```
1. Зайди в AmoCRM
2. Воронка "onAI Agency Integration"
3. Статус "Не разобранное"
4. Должен быть новый лид с именем и телефоном (email пустой - ОК!)
```

### **3. Проверь Telegram уведомление:**
```
В Telegram бот должен прислать:
📋 Новый лид с лендинга!

👤 Имя: [Имя]
📱 Телефон: [Телефон]
📧 Email: (не указан)
🌐 Источник: expresscourse
```

---

## 📊 ИТОГ:

- ✅ Email теперь **ОПЦИОНАЛЕН** (не обязателен)
- ✅ Форма работает с **только именем и телефоном**
- ✅ AmoCRM создаёт контакт **без email**
- ✅ Backend принимает лиды **без email**
- ✅ Frontend НЕ требует email для отправки

**ЛИДЫ ТЕПЕРЬ ДОЛЖНЫ СОХРАНЯТЬСЯ!** 🚀

---

**Создано:** 2025-12-14  
**Критичность:** 🚨 СРОЧНО  
**Статус:** ✅ ГОТОВО К ДЕПЛОЮ
