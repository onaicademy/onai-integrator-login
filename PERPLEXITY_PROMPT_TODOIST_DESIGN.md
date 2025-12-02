# 🎨 PERPLEXITY PROMPT: Todoist-Style Task Modal Design

## 🎯 ЦЕЛЬ ЗАПРОСА
Найти best practices дизайна модального окна редактирования задачи в стиле Todoist. Нужны:
- Современный UI/UX дизайн карточки задачи
- Красивые иконки и визуальные элементы для приоритетов
- Интерактивные компоненты (date/time picker, priority selector)
- Code examples для React + Tailwind CSS + Framer Motion

---

## 📋 ЗАПРОС ДЛЯ PERPLEXITY:

**Search Query:**
```
Todoist task modal UI design: priority levels icons, date time picker implementation, React Tailwind CSS components with smooth animations. Find best examples from GitHub repositories and design systems like Radix UI, shadcn/ui. Include SVG icons for priorities (flag icons, color-coded). Modern minimalist design patterns.
```

---

## 🔍 ЧТО ИСКАТЬ:

### 1. **Priority Selector Design**
Найти примеры как Todoist и аналоги (TickTick, Things 3, Any.do) реализуют выбор приоритета:
- **Визуальные элементы**: флаги, цветные точки, звёзды, иконки
- **Цветовая схема**: 
  - P1/Urgent: Red (#FF3B30 / #D1453B)
  - P2/High: Orange (#FF9500 / #EB8909)
  - P3/Medium: Yellow (#FFD60A / #F9C513)
  - P4/Low: Blue (#007AFF / #4073DB)
  - None: Gray (#8E8E93)
- **Интерактивность**: hover states, active states, transitions
- **Code examples**: React компоненты с Tailwind

### 2. **Date & Time Picker**
Найти готовые решения:
- **Библиотеки**: react-day-picker, date-fns, day.js
- **Кастомные компоненты**: inline calendar, dropdown time selector
- **UX паттерны**: 
  - "Today", "Tomorrow", "Next week" shortcuts
  - Natural language input ("завтра в 15:00")
  - Scrollable time picker (как в iOS)
- **Accessibility**: keyboard navigation, ARIA labels

### 3. **Modal Layout & Structure**
Todoist-стайл структура:
```
┌─────────────────────────────────────┐
│ [✓] Task Title ___________________  │ <- Inline editable
│                                     │
│ 📝 Description (optional)           │ <- Expandable textarea
│ ___________________________________│
│                                     │
│ 📅 Due date    🕐 Time             │ <- Inline pickers
│ [Today ▼]     [14:00 ▼]            │
│                                     │
│ 🚩 Priority    🔔 Reminder          │
│ [🔴 P1]        [30 min before ▼]   │
│                                     │
│ 🏷️ Labels      📂 Project           │
│ [+ Add]        [Work ▼]             │
│                                     │
│ ─────────────────────────────────  │
│ [Delete]              [Save]  [✕]  │
└─────────────────────────────────────┘
```

### 4. **Animation & Transitions**
Framer Motion patterns:
- **Modal entrance**: scale + fade in
- **Priority change**: color morph transition
- **Date picker**: slide down animation
- **Auto-save indicator**: pulse animation
- **Delete confirmation**: shake + fade out

### 5. **SVG Icons for Priorities**
Найти красивые иконки:
- **Flag icons**: outline + filled states
- **Color coding**: gradient или solid
- **Размеры**: 16px, 20px, 24px
- **Формат**: inline SVG или компоненты Lucide React

---

## 📊 ПРИМЕРЫ РЕПОЗИТОРИЕВ ДЛЯ ПОИСКА:

1. **Todoist клоны на GitHub:**
   - `todoist-clone react typescript`
   - `task-manager-app react tailwind`
   - `productivity-app todoist-inspired`

2. **Design Systems:**
   - Radix UI Primitives (Dialog, Popover, Select)
   - shadcn/ui components
   - Headless UI by Tailwind Labs
   - Mantine UI DateTimePicker

3. **Icon Libraries:**
   - Lucide React (flag, clock, bell icons)
   - Heroicons
   - Phosphor Icons
   - Tabler Icons

---

## 💡 КОНКРЕТНЫЕ ВОПРОСЫ:

1. **Как Todoist реализует флаги приоритетов?**
   - Какие SVG paths используются для иконок флагов?
   - Как анимируется смена приоритета?

2. **Лучший Time Picker для React?**
   - Scrollable picker (как в мобильных приложениях)
   - Dropdown с интервалами (15/30/60 минут)
   - Input с валидацией формата

3. **Popover positioning для Calendar:**
   - Как избежать overflow за пределы viewport?
   - Как сделать calendar кликабельным (не закрывается при клике внутри)?

4. **Auto-save UX:**
   - Debounce delay (500ms vs 1000ms vs 2000ms)?
   - Визуальный индикатор сохранения?
   - Как обрабатывать ошибки сохранения?

---

## 🎨 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

**Perplexity должен вернуть:**
1. ✅ Ссылки на GitHub репозитории с Todoist-style UI
2. ✅ Code snippets для Priority Selector (React + Tailwind)
3. ✅ SVG code для иконок флагов (4 приоритета)
4. ✅ Решение для Time Picker (библиотека или custom)
5. ✅ Framer Motion animation patterns
6. ✅ Accessibility best practices

---

## 📝 ДОПОЛНИТЕЛЬНЫЕ KEYWORD SEARCHES:

```
"todoist priority flags svg"
"react task modal component github"
"tailwind time picker custom"
"radix ui popover calendar positioning"
"framer motion dialog animation"
"inline editable input react"
"natural language date picker"
"scrollable time picker react"
"flag icon svg paths red orange blue"
"auto-save debounce react hook"
```

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ РЕЗУЛЬТАТЫ:

1. **Copy SVG icons** → встроить в TaskEditModal
2. **Adapt Priority Selector** → улучшить визуальный дизайн
3. **Implement Time Picker** → заменить стандартный input
4. **Fix Popover** → корректный positioning
5. **Add animations** → Framer Motion transitions

---

**🎯 ЦЕЛЬ: Создать красивый, функциональный модал задачи в стиле Todoist с:**
- 🎨 Современным дизайном
- 🚩 Красивыми флагами приоритетов
- 📅 Удобным выбором даты/времени
- ⚡ Плавными анимациями
- ✅ Auto-save функционалом






