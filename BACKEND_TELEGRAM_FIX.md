# 🐛 BACKEND FIX: Telegram Reminder Not Saving

## ❌ ПРОБЛЕМА:

```
Пользователь:
- Открывает задачу
- Включает checkbox "Telegram напоминание" ✅
- Видит "✅ Сохранено"
- Закрывает modal
- Открывает задачу снова
- ❌ Checkbox НЕ СОХРАНЁН!
```

## 🔍 ROOT CAUSE:

**Backend НЕ сохранял `telegram_reminder` и `reminder_before` в БД!**

```typescript:81:92:backend/src/routes/goals.ts
// ❌ СТАРЫЙ КОД:
router.put('/:id', async (req: Request, res: Response) => {
  const { title, description, status, due_date, priority, category } = req.body;
  // ❌ НЕТ telegram_reminder и reminder_before!

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (due_date !== undefined) updateData.due_date = due_date;
  if (priority !== undefined) updateData.priority = priority;
  if (category !== undefined) updateData.category = category;
  // ❌ НЕТ telegram_reminder и reminder_before!
}
```

### Почему это происходило:

```
1. Frontend отправляет: { telegram_reminder: true, reminder_before: 30 }
2. Backend извлекает ТОЛЬКО: { title, description, status, due_date, priority, category }
3. telegram_reminder и reminder_before ИГНОРИРУЮТСЯ! ❌
4. Supabase .update() не получает эти поля
5. БД не обновляется
```

## ✅ РЕШЕНИЕ:

```typescript:81:94:backend/src/routes/goals.ts
// ✅ ИСПРАВЛЕНО:
router.put('/:id', async (req: Request, res: Response) => {
  const { 
    title, description, status, due_date, priority, category,
    telegram_reminder, reminder_before  // ✅ ДОБАВЛЕНО!
  } = req.body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (due_date !== undefined) updateData.due_date = due_date;
  if (priority !== undefined) updateData.priority = priority;
  if (category !== undefined) updateData.category = category;
  if (telegram_reminder !== undefined) updateData.telegram_reminder = telegram_reminder;  // ✅
  if (reminder_before !== undefined) updateData.reminder_before = reminder_before;  // ✅
}
```

## 🧪 ТЕСТ:

1. **Создать задачу** → Открыть edit modal
2. **Включить "Telegram напоминание"** → Видим ✅ Сохранено
3. **Выбрать "Напомнить за: 60 минут"** → Видим ✅ Сохранено
4. **Закрыть modal** → Открыть снова
5. **✅ ПРОВЕРИТЬ: Checkbox должен быть ВКЛЮЧЁН, reminder_before = 60 минут**

## 📊 АРХИТЕКТУРА:

```
┌─────────────────┐
│  TaskEditModal  │
│  (Frontend)     │
└────────┬────────┘
         │ PUT /api/goals/:id
         │ { telegram_reminder: true, reminder_before: 60 }
         ▼
┌─────────────────┐
│  goals.ts       │
│  (Backend)      │  ✅ ТЕПЕРЬ ИЗВЛЕКАЕТ telegram_reminder
└────────┬────────┘
         │ .update({ telegram_reminder: true, reminder_before: 60 })
         ▼
┌─────────────────┐
│  Supabase       │
│  goals table    │  ✅ СОХРАНЯЕТ В БД
└─────────────────┘
```

## 🎯 ИТОГ:

**ДО:**
- Frontend отправлял данные ✅
- Backend игнорировал их ❌
- БД не обновлялась ❌

**ПОСЛЕ:**
- Frontend отправляет данные ✅
- Backend извлекает и передаёт в Supabase ✅
- БД обновляется ✅

---

**Дата:** 2025-11-24  
**Исправлено в:** backend/src/routes/goals.ts (строки 84, 92-93)




