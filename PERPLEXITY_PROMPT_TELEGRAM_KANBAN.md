# 🔍 PERPLEXITY SEARCH PROMPT: Telegram Bot + Kanban Integration

## 🎯 ЦЕЛЬ ПОИСКА
Найти best practices, готовые решения и код примеры для интеграции Telegram бота с Kanban системой задач на React + Node.js + Supabase PostgreSQL.

---

## 📋 ТРЕБОВАНИЯ К РЕШЕНИЮ

### 1. **Архитектура Telegram Bot Integration**
Найти примеры как реализовать:
- Deep linking (`https://t.me/bot_username?start=UNIQUE_TOKEN`) для привязки Telegram user ID к database user ID
- Webhook handler для команды `/start` с токеном верификации
- Хранение `telegram_user_id` и `telegram_chat_id` в таблице users (PostgreSQL/Supabase)
- Проверка статуса подключения (connected/disconnected) если пользователь заблокировал бота
- Механизм повторного подключения с новым уникальным токеном при отключении

**Технологии**: Node.js, Express, Supabase (PostgreSQL), node-telegram-bot-api или telegraf

---

### 2. **Drag & Drop Оптимизация для React Kanban**
Найти:
- Решение проблемы "ghost element отлетает назад, а через 2 сек перемещается"
- Smooth animations как в AmoCRM или Trello для drag&drop между колонками
- Оптимизация `@dnd-kit/core` с `SortableContext` и `useDroppable`
- Instant feedback при drop (без задержки на API запрос)
- Optimistic UI updates для Kanban

**Проблема**: При drag&drop задача визуально возвращается в исходную колонку, затем через 2 секунды перемещается после API response.
**Нужно**: Мгновенное визуальное перемещение + rollback только при ошибке API.

---

### 3. **Система Напоминаний через Telegram**
Найти примеры:
- Scheduler (node-cron, bull queue, pg-boss) для отправки Telegram уведомлений за N минут до deadline
- Хранение настроек напоминания: `reminder_before` (15, 30, 60 минут)
- Отправка персонализированных сообщений через Telegram Bot API только конкретному пользователю
- Обработка случаев когда бот заблокирован пользователем (error handling)

**Database schema** (наша текущая):
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  due_date TIMESTAMPTZ,
  telegram_reminder BOOLEAN,
  reminder_before INTEGER -- минуты до напоминания
);
```

---

### 4. **Модальное Окно Редактирования Задачи**
Найти UI/UX примеры:
- Клик на Kanban карточку → модальное окно с детальной информацией
- Inline редактирование: заголовок, описание, дата/время
- Приоритеты задачи: "Важно", "Очень важно", "На завтра", "Несрочное" (с цветовой индикацией)
- Сохранение изменений в реальном времени (debounced auto-save)
- File uploads через Supabase Storage

**Tech stack**: React, shadcn/ui Dialog, Supabase Storage

---

### 5. **UI/UX: Tooltip Инструкция для Telegram**
Найти примеры:
- Красивый tooltip (не обычный browser title) с пошаговой инструкцией
- Показывается при hover на desktop / tap на mobile
- Содержит: как работает бот, какие напоминания доступны, как отключить
- Библиотеки: Radix UI Tooltip, React Tooltip, Floating UI

---

## 🔍 КЛЮЧЕВЫЕ ВОПРОСЫ ДЛЯ ПОИСКА

1. **"React Kanban drag and drop smooth animation @dnd-kit instant feedback"**
2. **"Telegram bot deep link user verification Node.js Express webhook"**
3. **"Supabase PostgreSQL store telegram user id chat id"**
4. **"Node-cron scheduler telegram reminders before deadline"**
5. **"React Kanban task modal edit priority tags inline editing"**
6. **"Telegram bot detect user blocked bot error handling"**
7. **"Optimistic UI updates React drag and drop rollback on error"**
8. **"Radix UI Tooltip step by step instructions React"**

---

## 📦 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

1. **GitHub репозитории** с готовыми примерами Telegram bot + task management
2. **Stack Overflow** решения проблемы drag&drop лага
3. **Документация** по Telegram Bot API deep linking и webhook
4. **Code snippets** для:
   - Telegram webhook handler (`/start` command с токеном)
   - Оптимизированный drag&drop с instant visual feedback
   - Scheduler для напоминаний
   - Модальное окно редактирования задачи

---

## 💡 ДОПОЛНИТЕЛЬНЫЕ КРЕАТИВНЫЕ ИДЕИ

- **Telegram Mini App** внутри бота для просмотра задач без перехода на сайт
- **Voice reminders** через Telegram (голосовое сообщение вместо текста)
- **Smart reminders**: AI предлагает оптимальное время напоминания на основе истории выполнения
- **Telegram Inline Keyboard** для быстрых действий: "Отложить на 15 мин", "Выполнено", "Отменить"
- **Progress tracking**: бот отправляет еженедельную статистику выполненных задач

---

## 🛠️ ТЕКУЩИЙ TECH STACK
- **Frontend**: React 18, TypeScript, Vite, shadcn/ui, @dnd-kit/core, Framer Motion
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Telegram Bot**: `onaimentor_bot` (username)

---

## ⚠️ ПРИОРИТЕТЫ
1. **HIGH**: Telegram webhook + user verification + сохранение telegram_user_id
2. **HIGH**: Drag&drop smooth animation (убрать лаг)
3. **MEDIUM**: Модальное окно редактирования задачи
4. **MEDIUM**: Scheduler для Telegram напоминаний
5. **LOW**: Tooltip инструкция

---

**Формат ответа**: Пожалуйста, предоставь ссылки на:
- Актуальные GitHub репозитории (2023-2024)
- Stack Overflow ответы с высоким рейтингом
- Официальную документацию
- Готовые code snippets которые можно адаптировать

**Язык ответа**: Русский или English (code всегда на английском)

