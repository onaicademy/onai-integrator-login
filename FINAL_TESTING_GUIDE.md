# 🎯 ФИНАЛЬНАЯ ИНСТРУКЦИЯ ПО ТЕСТИРОВАНИЮ

## ✅ ЧТО ГОТОВО:

### 1. Backend ✅
- ✅ Запущен на **http://localhost:3000**
- ✅ Telegram webhook routes активны
- ✅ Reminder scheduler работает (каждую минуту)

### 2. Frontend ✅  
- ✅ Запущен на **http://localhost:8080**
- ✅ Drag & Drop с instant feedback
- ✅ Модал редактирования задачи
- ✅ Приоритеты задач (5 уровней)
- ✅ Telegram интеграция

---

## 🧪 КАК ТЕСТИРОВАТЬ:

### ЭТАП 1: ТЕСТ МОДАЛА РЕДАКТИРОВАНИЯ

1. Открой **http://localhost:8080/neurohub**
2. Нажми кнопку **"Канбан"**
3. **Кликни на любую задачу** (не на кнопки, а на саму карточку!)
4. Должен открыться модал с:
   - ✏️ Редактированием названия
   - 📝 Описанием (опционально)
   - 🎨 **5 уровней приоритета**:
     - ⚪ Без приоритета
     - 🔵 Несрочное (синий)
     - 🟡 Важно (жёлтый)
     - 🟠 Очень важно (оранжевый)
     - 🔴 Критично (красный)
   - 📅 Дата + время
   - 📱 Telegram напоминание
   - ⏰ Время напоминания (15/30/60/120 минут)
5. **Изменения сохраняются автоматически через 1 секунду!**

**Что проверить:**
- [ ] Модал открывается по клику на задачу
- [ ] Можно изменить название
- [ ] Можно выбрать приоритет (меняется цвет)
- [ ] Можно выбрать дату/время
- [ ] Auto-save работает (вверху появляется "💾 Сохранение...")
- [ ] Кнопка "Удалить" удаляет задачу
- [ ] Изменения отображаются в Kanban после закрытия

---

### ЭТАП 2: ТЕСТ DRAG & DROP

1. В открытом Kanban создай новую задачу
2. **Перетащи задачу из "Запланировано" в "В работе"**
3. Задача должна **МГНОВЕННО** переместиться (без задержки 2 сек!)
4. В консоли должен быть лог: `✅ [GoalsAPI] Цель обновлена`

**Что проверить:**
- [ ] Drag & drop работает плавно
- [ ] Задача перемещается мгновенно
- [ ] Если ошибка API - задача вернётся обратно (rollback)
- [ ] Toast уведомление показывает статус ("⚡ В работе!")

---

### ЭТАП 3: ТЕСТ TELEGRAM (требует настройки)

**⚠️ ВНИМАНИЕ:** Для полного теста Telegram нужно:
1. Получить Bot Token от [@BotFather](https://t.me/BotFather)
2. Добавить в `backend/.env`:
   ```env
   TELEGRAM_MENTOR_BOT_TOKEN=твой_токен
   TELEGRAM_ADMIN_BOT_TOKEN=твой_токен
   ```
3. Настроить webhook (см. `TELEGRAM_SETUP_GUIDE.md`)

**Быстрый тест (без полной настройки):**
1. Создай задачу в Kanban
2. Поставь галочку **"📱 Telegram напоминание"**
3. Должен открыться Telegram бот (если Bot Token настроен)
4. Нажми START в боте
5. Проверь в БД:
   ```sql
   SELECT telegram_user_id, telegram_connected FROM users WHERE email = 'твой@email';
   ```

---

### ЭТАП 4: МИГРАЦИИ БД

**ОБЯЗАТЕЛЬНО ВЫПОЛНИ** эти миграции в Supabase SQL Editor:

#### Миграция 1: Telegram fields
```sql
-- Файл: supabase/migrations/20251124_add_telegram_fields.sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_verification_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON public.users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_verification_token ON public.users(telegram_verification_token);
```

#### Миграция 2: Task priority and description
```sql
-- Файл: supabase/migrations/20251124_add_task_priority.sql
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS reminder_before INTEGER DEFAULT 30 CHECK (reminder_before > 0);

CREATE INDEX IF NOT EXISTS idx_goals_priority ON public.goals(priority);

COMMENT ON COLUMN public.goals.priority IS 'Task priority: none, low, medium, high, urgent';
COMMENT ON COLUMN public.goals.description IS 'Detailed task description';
COMMENT ON COLUMN public.goals.reminder_before IS 'Minutes before due_date to send reminder';
```

---

## 📊 CHECKLIST ГОТОВНОСТИ

### Backend ✅
- [x] Backend запущен на :3000
- [x] Telegram routes зарегистрированы
- [x] Scheduler запущен (runs every minute)
- [ ] Bot Token настроен в .env
- [ ] Webhook настроен через ngrok

### Frontend ✅
- [x] Frontend запущен на :8080
- [x] Drag & drop с optimistic update
- [x] Модал редактирования интегрирован
- [x] Приоритеты задач реализованы
- [x] Telegram кнопка работает

### Database ⚠️
- [ ] Миграция 1 (Telegram fields) выполнена
- [ ] Миграция 2 (Priority fields) выполнена
- [ ] Проверено в Supabase Table Editor

---

## 🎨 СКРИНШОТЫ ОЖИДАЕМЫХ РЕЗУЛЬТАТОВ

### Модал редактирования:
```
┌───────────────────────────────────┐
│ 📝 Редактирование задачи       💾 │
│                                   │
│ Название задачи: [_____________]  │
│                                   │
│ Описание: [___________________]   │
│           [___________________]   │
│                                   │
│ Приоритет:                        │
│ ⚪ Без   🔵 Несрочное  🟡 Важно    │
│ 🟠 Очень важно  🔴 Критично       │
│                                   │
│ Дедлайн: [📅 25 ноября]  [🕐 12:00]│
│                                   │
│ ☐ 📱 Telegram напоминание         │
│     Напомнить за: [30 минут ▼]    │
│                                   │
│ [🗑️ Удалить]      [✖ Закрыть]    │
└───────────────────────────────────┘
```

### Kanban с приоритетами:
```
📝 Запланировано  ⚡ В работе  🎉 Завершено
┌──────────────┐ ┌──────────┐ ┌──────────┐
│ 🔴 Срочная   │ │          │ │ ✅ Готово│
│ задача       │ │          │ │          │
│ 📅 12:00     │ │          │ │          │
├──────────────┤ └──────────┘ └──────────┘
│ 🟡 Важное    │
│ дело         │
│ 📅 14:00     │
└──────────────┘
```

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ (опционально)

Если всё работает, можно добавить:

1. **Tooltip инструкция** - при наведении на Telegram кнопку
2. **Supabase Storage** - загрузка файлов к задачам
3. **Inline Keyboard** в Telegram - быстрые действия
4. **Voice reminders** - голосовые сообщения
5. **Telegram Mini App** - просмотр задач в боте

---

## 📝 ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# Проверить backend логи
Get-Content "c:\Users\smmmc\.cursor\projects\c-onai-integrator-login\terminals\6.txt" -Tail 50

# Проверить frontend логи  
Get-Content "c:\Users\smmmc\.cursor\projects\c-onai-integrator-login\terminals\8.txt" -Tail 50

# Перезапустить backend
cd backend
npm run dev

# Перезапустить frontend
npm run dev

# Проверить порты
netstat -ano | findstr :3000
netstat -ano | findstr :8080
```

---

**🎉 ВСЁ ГОТОВО К ТЕСТИРОВАНИЮ!**

**Открой http://localhost:8080/neurohub и протестируй:**
1. ✅ Кликни на задачу → модал должен открыться
2. ✅ Измени приоритет → цвет должен поменяться  
3. ✅ Drag & drop задачу → должна переместиться мгновенно

**ВАЖНО:** Не забудь выполнить миграции БД в Supabase!






