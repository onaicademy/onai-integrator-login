# 🎨 AI Marathon Redesign - Handover Report

**Дата:** 2025-11-23
**Проект:** onAI Academy - AI Marathon Landing Page Redesign
**Backup Commit:** `7b8c745` - "save: backup before redesign to lime green (#b2ff2e) with Figma reference"

---

## 📋 ЗАДАЧА

Полный редизайн лендинга AI Marathon (`/aimarathon`) с заменой цветовой схемы при **сохранении всего функционала**.

---

## 🎯 ГЛАВНЫЕ ЦЕЛИ

### ✅ ВЫПОЛНЕНО:

1. ✅ **Установка MCP-инструментов**
   - Установлен `uv` (Python package manager)
   - Установлен `mcp-proxy` (33 пакета)
   - Настроен `html.to.design` MCP сервер в `.cursor/mcp.json`
   - Добавлен `shadcn` MCP сервер

2. ✅ **Конфигурация MCP**
   - Файл: `c:\Users\smmmc\.cursor\mcp.json`
   - Содержимое:
     ```json
     {
       "mcpServers": {
         "html.to.design": {
           "url": "https://h2d-mcp.divriots.com/b960e44c-eee5-4850-b2d9-7692fbb9187c/mcp"
         },
         "shadcn": {
           "command": "npx",
           "args": ["shadcn@latest", "mcp"]
         }
       }
     }
     ```

3. ✅ **Импорт дизайна из Figma**
   - Использован Figma API с токеном: `FIGMA_TOKEN_HIDDEN`
   - Файл Figma: `hRsVtVQjYfVDCRNvu3QApw`
   - Node ID: `3:12456`
   - Создан скрипт анализа: `analyze_figma.py`

4. ✅ **Анализ дизайна**
   - Извлечены все спецификации из Figma
   - Документированы: цвета, типографика, размеры, структура
   - Результаты сохранены (см. раздел "Спецификация дизайна" ниже)

5. ✅ **Backup Commit**
   - Создан commit: `7b8c745`
   - Сообщение: "save: backup before redesign to lime green (#b2ff2e) with Figma reference"
   - Все изменения сохранены для возможности отката

6. ✅ **Запуск серверов**
   - Backend: http://localhost:3000 ✅
   - Frontend: http://localhost:8080 ✅
   - Страница доступна: http://localhost:8080/aimarathon

---

### ⏳ НЕ ВЫПОЛНЕНО (ТРЕБУЕТСЯ ПРОДОЛЖЕНИЕ):

1. ⏳ **Адаптация HeroSection под Figma-референс**
   - Нужно заменить текущий дизайн на стиль из Figma
   - **ВАЖНО:** Заменить "superwhisper" на логотип onAI с анимацией
   - Сохранить структуру, но адаптировать визуал

2. ⏳ **Глобальная замена цветов**
   - Заменить `#00ff00` (ярко-зелёный) → `#b2ff2e` (лаймовый)
   - Компоненты для обновления:
     - `src/pages/AIMarathon.tsx`
     - `src/components/aimarathon/HeroSection.tsx`
     - `src/components/aimarathon/ProgramSectionOptimized.tsx`
     - `src/components/aimarathon/TrustSection.tsx`
     - `src/components/aimarathon/CasesSection.tsx`
     - `src/components/aimarathon/FinalCTARedesigned.tsx`
     - `src/components/aimarathon/Footer.tsx`
     - `src/components/aimarathon/BookingModal.tsx`
     - `src/components/aimarathon/BackgroundEffects.tsx`
     - `src/components/aimarathon/StickyHeader.tsx`
     - Все дочерние компоненты

3. ⏳ **Обновление Footer**
   - Заменить содержимое на юридические данные:
     - **Компания:** ТОО "ONAI ACADEMY"
     - **Адрес:** Павлодар Г.А., Павлодар, улица Сейфуллина
     - **БИН:** 250240029481
     - **БИК:** CASPKZKA
     - **Счёт:** KZ17722S000044026963
     - **Телефон:** НЕ указывать

4. ⏳ **Оптимизация анимаций**
   - Убрать излишние частицы (уменьшить количество)
   - Оптимизировать floating elements
   - Добавить debounce для scroll-триггеров
   - Убедиться, что нет лагов при прокрутке

5. ⏳ **Финальное тестирование**
   - Проверить все интерактивные элементы
   - Форма бронирования
   - Таймер обратного отсчёта
   - Счётчики (места, записавшиеся)
   - Карусель кейсов
   - Модальное окно
   - Адаптивность (mobile/tablet/desktop)

---

## 📊 СПЕЦИФИКАЦИЯ ДИЗАЙНА ИЗ FIGMA

### 📐 **Размеры:**
- **Контейнер:** 1920px × 1069px
- **Layout:** Centered, max-width responsive

### 🎨 **Цветовая палитра:**

**Из Figma (оригинал):**
- `#FFFFFF` - Белый (основной текст)
- `#1A1A1A` - Тёмно-серый
- `#F0F0F0` - Светло-серый
- `#000000` - Чёрный (фон)

**Для замены:**
- **БЫЛО:** `#00ff00` (ярко-зелёный)
- **СТАЛО:** `#b2ff2e` (лаймовый/салатовый)

**Вспомогательные цвета:**
- `#0a0a0a` - Чёрный (фон)
- `#6b6b6b` - Серый (вспомогательный)

### 📝 **Типографика:**

#### Заголовок H1:
- **Font:** Inter Bold 700
- **Size:** 60px
- **Line Height:** 60px
- **Letter Spacing:** -1.5px
- **Alignment:** CENTER
- **Пример:** "Write 3x faster, without lifting a finger."

#### Заголовок H2:
- **Font:** Inter Medium 500
- **Size:** 30px
- **Line Height:** 36px
- **Letter Spacing:** -0.75px
- **Alignment:** CENTER
- **Пример:** "superwhisper" (заменить на логотип onAI)

#### Подзаголовок:
- **Font:** Inter Regular 400
- **Size:** 18-20px
- **Line Height:** 28-32px
- **Letter Spacing:** 0px
- **Alignment:** CENTER

#### Кнопка:
- **Font:** Inter Medium 500
- **Size:** 15px
- **Line Height:** 22.5px
- **Letter Spacing:** 0px

#### Мелкий текст:
- **Font:** Inter Regular 400
- **Size:** 12-14px
- **Line Height:** 18-21px
- **Letter Spacing:** 0.2-0.3px

### 🔘 **Кнопка (спецификация):**
- **Border Radius:** 9px
- **Padding:** 13px 8px
- **Gap:** 8px
- **Background:** Linear Gradient (#FFFFFF → #F0F0F0)
- **Shadow:** Drop shadow (y:2px, blur:6px, rgba(0,0,0,0.08))

### 🖼️ **Фоновые слои:**
1. **Linear Gradient** - от белого с прозрачностью к transparent
2. **Leather Texture** - Image overlay с opacity 0.4
3. **Radial Gradient** - от прозрачного к чёрному

### 📦 **Структура контента (из Figma):**
1. **Логотип/Название** - "superwhisper" → **ЗАМЕНИТЬ НА onAI Logo**
2. **Подзаголовок** - "AI powered voice to text"
3. **Демо-текст** - Пример работы продукта
4. **Главный слоган** - "Write 3x faster, without lifting a finger."
5. **CTA Кнопка** - "Download for Mac" → **Адаптировать под onAI**
6. **Мелкий текст** - "requires macOS 13+" и др.

---

## 🚫 ЧТО НЕЛЬЗЯ ТРОГАТЬ (ФУНКЦИОНАЛ)

**КРИТИЧЕСКИ ВАЖНО - НЕ ИЗМЕНЯТЬ:**

❌ Структура данных (секции, карточки, кейсы)
❌ Логика счётчиков (`useSpotsCounter`)
❌ Логика таймера (`useAlmatyTimer`)
❌ Валидация формы
❌ Роутинг `/aimarathon`
❌ Хуки и их логика
❌ Обработчики событий (`onClick`, `onSubmit`)
❌ Модальное окно (открытие/закрытие)
❌ Видео-плеер (контролы)
❌ Карусель (логика прокрутки, свайп)

---

## ✅ ЧТО МОЖНО МЕНЯТЬ (ВИЗУАЛ)

✅ Цвета (замена `#00ff00` → `#b2ff2e`)
✅ Шрифты (если нужно под Figma)
✅ Анимации (улучшение, оптимизация)
✅ Spacing/Padding
✅ Размеры элементов
✅ Градиенты, тени, свечения
✅ Логотип onAI (цвет кнопки)
✅ Footer (юридическая информация)

---

## 🎭 ТРЕБОВАНИЯ К СТИЛИСТИКЕ

### Целевая аудитория: 25-45 лет

**НЕ делать:**
- 🚫 Детский дизайн
- 🚫 Кислотные/ляпистые тона
- 🚫 Супер-пёстрое свечение
- 🚫 Перегруженные анимации (лаги)

**Делать:**
- ✅ Строгая стилистика
- ✅ Профессиональный вид
- ✅ Умеренные акценты
- ✅ Сдержанные анимации
- ✅ Оптимизированная производительность

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Текущая структура компонентов:

**Главная страница:**
- `src/pages/AIMarathon.tsx` (122 строки)

**Компоненты секций:**
1. `HeroSection.tsx` (313 строк)
   - Split-screen layout (2 columns XL)
   - LEFT: Контент (badge, заголовки, статистика, цены, CTA)
   - RIGHT: Video player

2. `ProgramSectionOptimized.tsx` (293 строки)
   - 4-column grid (responsive: 1 → 2 → 4)
   - 4 program cards с hover 3D эффектами

3. `TrustSection.tsx` (235 строк)
   - 4-column stats grid
   - Animated counters

4. `CasesSection.tsx` (443 строки)
   - Carousel с 18 кейсами
   - Swipe gesture support

5. `FinalCTARedesigned.tsx` (713 строк)
   - Countdown timer
   - Floating AI logos (ChatGPT, Make, n8n, Claude, etc.)
   - Bomb animation с sparks

6. `Footer.tsx` (106 строк)
   - **ТРЕБУЕТ ОБНОВЛЕНИЯ** с юр.данными

**Вспомогательные:**
- `StickyHeader.tsx` - Фиксированный header
- `BackgroundEffects.tsx` - Фоновые эффекты
- `BookingModal.tsx` - Модальное окно формы
- `WelcomeVideoPlayer.tsx` - Видео-плеер
- `AnimatedArrow.tsx` - Анимированная стрелка

### Логотип onAI с анимацией:

**Код компонента OnAILogo:**
- Файл должен быть создан: `src/components/OnAILogo.tsx`
- Toggle button анимация (как iPhone power button)
- Движение слева направо через 2 секунды
- Смена цвета с белого на `#b2ff2e`
- iPhone-style pulse (две волны пульсации)
- Постоянное свечение после активации

**Спецификация логотипа:**
```typescript
// Цвет toggle кнопки при анимации: #b2ff2e
// Длительность: 1.2 секунды
// Easing: cubic-bezier(0.4, 0.0, 0.2, 1)
// Pulse waves: 2 волны с задержкой 0.15с
// Glow появляется через 0.8с
```

---

## 📂 ФАЙЛЫ ДЛЯ РЕДИЗАЙНА

### Приоритет 1 (Критичные):
1. `src/components/aimarathon/HeroSection.tsx` ⚡ **ГЛАВНЫЙ**
2. `src/pages/AIMarathon.tsx`
3. `src/components/aimarathon/Footer.tsx`

### Приоритет 2 (Цвета):
4. `src/components/aimarathon/ProgramSectionOptimized.tsx`
5. `src/components/aimarathon/TrustSection.tsx`
6. `src/components/aimarathon/CasesSection.tsx`
7. `src/components/aimarathon/FinalCTARedesigned.tsx`

### Приоритет 3 (Вспомогательные):
8. `src/components/aimarathon/BackgroundEffects.tsx`
9. `src/components/aimarathon/BookingModal.tsx`
10. `src/components/aimarathon/StickyHeader.tsx`

---

## 🔍 КАК НАЙТИ ВСЕ ВХОЖДЕНИЯ #00ff00

### Bash команда:
```bash
cd /c/onai-integrator-login
grep -r "#00ff00" src/components/aimarathon/ src/pages/AIMarathon.tsx
```

### Или через Grep tool:
```bash
pattern: #00ff00
path: src/
output_mode: files_with_matches
```

---

## 📝 TODO LIST (ДЕТАЛИЗИРОВАННЫЙ)

### ✅ Выполнено:
- [x] Установить uvx глобально
- [x] Обновить mcp.json с конфигурацией html.to.design
- [x] Импортировать дизайн из Figma через MCP
- [x] Проанализировать дизайн и извлечь спецификацию
- [x] Создать backup commit перед редизайном
- [x] Запустить backend и frontend серверы

### ⏳ Требуется выполнить:
- [ ] **Адаптировать HeroSection под Figma-референс с логотипом onAI**
  - [ ] Создать компонент `OnAILogo.tsx` с анимацией
  - [ ] Заменить текущий hero content на дизайн из Figma
  - [ ] Интегрировать логотип onAI вместо "superwhisper"
  - [ ] Адаптировать текст под onAI Academy
  - [ ] Сохранить функционал (счётчики, модалки, видео)

- [ ] **Заменить цвета #00ff00 → #b2ff2e во всех компонентах**
  - [ ] AIMarathon.tsx - progress bar
  - [ ] HeroSection.tsx - badge, price, particles, shadows
  - [ ] ProgramSectionOptimized.tsx - Day 1 card, gradients
  - [ ] TrustSection.tsx - иконки, underline
  - [ ] CasesSection.tsx - earnings amount, active indicator
  - [ ] FinalCTARedesigned.tsx - button, timer, bomb icon, glows
  - [ ] Footer.tsx - акценты (если есть)
  - [ ] BookingModal.tsx - форма акценты
  - [ ] BackgroundEffects.tsx - grid pattern
  - [ ] StickyHeader.tsx - spots counter, button

- [ ] **Обновить Footer с юридическими данными**
  - [ ] Добавить секцию "Юридическая информация"
  - [ ] Компания: ТОО "ONAI ACADEMY"
  - [ ] Адрес: Павлодар Г.А., Павлодар, улица Сейфуллина
  - [ ] БИН: 250240029481
  - [ ] БИК: CASPKZKA
  - [ ] Счёт: KZ17722S000044026963
  - [ ] Убедиться, что телефон НЕ указан

- [ ] **Оптимизировать анимации (избежать лагов)**
  - [ ] Уменьшить количество floating particles (с 30 до 15-20)
  - [ ] Добавить `will-change` для анимированных элементов
  - [ ] Использовать `transform` вместо `top/left` для позиционирования
  - [ ] Добавить debounce для scroll events
  - [ ] Проверить FPS при прокрутке (должно быть 60fps)

- [ ] **Протестировать на localhost:8080/aimarathon**
  - [ ] Открыть форму бронирования
  - [ ] Проверить работу таймера
  - [ ] Проверить счётчики (обновляются ли)
  - [ ] Протестировать карусель кейсов
  - [ ] Проверить видео-плеер
  - [ ] Mobile (320px, 375px, 414px)
  - [ ] Tablet (768px, 1024px)
  - [ ] Desktop (1920px, 2560px)

---

## 🛠️ КОМАНДЫ ДЛЯ РАЗРАБОТКИ

### Запуск серверов:
```bash
# Backend
cd /c/onai-integrator-login/backend
npm start
# Запускается на http://localhost:3000

# Frontend (в новом терминале)
cd /c/onai-integrator-login
npm run dev
# Запускается на http://localhost:8080
```

### Git команды:
```bash
# Откат к backup версии (если нужно)
git reset --hard 7b8c745

# Просмотр изменений
git status
git diff

# Создание нового коммита
git add .
git commit -m "feat: redesign AI Marathon to lime green (#b2ff2e)"
```

### Анализ Figma (если нужно повторно):
```bash
cd /c/onai-integrator-login
python analyze_figma.py
```

---

## 🎨 ДИЗАЙН-ТОКЕНЫ (ДЛЯ КОПИРОВАНИЯ)

### Цвета:
```css
/* Primary - НОВЫЙ */
--primary-green: #b2ff2e;
--primary-green-20: rgba(178, 255, 46, 0.2);
--primary-green-40: rgba(178, 255, 46, 0.4);
--primary-green-60: rgba(178, 255, 46, 0.6);

/* Старый (заменить) */
--old-green: #00ff00; /* ← НАЙТИ И ЗАМЕНИТЬ */

/* Background */
--bg-black: #000000;
--bg-dark: #0a0a0a;
--bg-card: #0F0F0F;

/* Text */
--text-white: #FFFFFF;
--text-gray: #6b6b6b;
--text-light: #F0F0F0;

/* Accents */
--accent-purple: #9945FF;
--accent-amber: #F59E0B;
--accent-cyan: #14F195;
```

### Shadows (с новым цветом):
```css
/* Text Glow */
text-shadow: 0 0 26px rgba(178, 255, 46, 0.19);

/* Box Glow */
box-shadow: 0 0 20px rgba(178, 255, 46, 0.2),
            inset 0 0 10px rgba(0, 0, 0, 0.1);

/* Button Shadow */
box-shadow: 0 0 32px rgba(178, 255, 46, 0.32);

/* Drop Shadow */
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
```

### Градиенты:
```css
/* Background Gradient */
background: radial-gradient(circle, #b2ff2e 0%, transparent 70%);

/* Border Gradient */
border-image: linear-gradient(180deg, #b2ff2e 0%, transparent 100%);

/* Card Gradient */
background: linear-gradient(135deg,
  rgba(178, 255, 46, 0.1) 0%,
  rgba(178, 255, 46, 0.05) 100%
);
```

---

## 📌 ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. Логотип onAI:
- **ОБЯЗАТЕЛЬНО** использовать компонент с анимацией
- Размещать **на всю ширину** hero section (как в Figma было "superwhisper")
- Анимация должна работать автоматически через 2 секунды после загрузки
- Цвет активной кнопки: `#b2ff2e`

### 2. Таймер:
- Текущая логика: `useAlmatyTimer` - с 8:00 вечера текущего дня до 8:00 вечера следующего
- **НЕ ТРОГАТЬ** логику - только визуал (цвета)

### 3. Производительность:
- После редизайна проверить через Chrome DevTools Performance
- Целевой FPS: 60fps при прокрутке
- Lazy load тяжёлых компонентов (если нужно)

### 4. Адаптивность:
- Обязательно протестировать на всех breakpoints:
  - Mobile: 320px, 375px, 414px
  - Tablet: 768px, 1024px
  - Desktop: 1280px, 1920px, 2560px

### 5. Footer:
- Структура:
  ```
  [Logo]         [Информация]       [Юридические данные]
  [Описание]     - Публичная оферта - ТОО "ONAI ACADEMY"
                 - Политика          - БИН, БИК, Счёт
                 - FAQ               - Адрес
  ```

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- **Localhost:** http://localhost:8080/aimarathon
- **Backend API:** http://localhost:3000
- **Figma File:** https://www.figma.com/design/hRsVtVQjYfVDCRNvu3QApw/Untitled?node-id=3-12456
- **Lobe Icons (референс):** https://github.com/lobehub/lobe-icons
- **Backup Commit:** `7b8c745`

---

## 📧 ВОПРОСЫ ПРИ ПРОДОЛЖЕНИИ

Если возникнут вопросы, проверь:

1. **Где найти спеку дизайна?** → Запусти `python analyze_figma.py`
2. **Как откатиться?** → `git reset --hard 7b8c745`
3. **Где логотип onAI?** → Нужно создать `src/components/OnAILogo.tsx` (код в предыдущих сообщениях)
4. **Какой цвет использовать?** → `#b2ff2e` (вместо `#00ff00`)
5. **Где юр.данные Footer?** → См. раздел "TODO LIST" выше

---

## ✅ ЧЕКЛИСТ ПЕРЕД ФИНАЛОМ

Перед завершением редизайна проверь:

- [ ] Все `#00ff00` заменены на `#b2ff2e`
- [ ] Логотип onAI с анимацией работает
- [ ] Footer обновлён с юр.данными (без телефона)
- [ ] Анимации не лагают (60fps)
- [ ] Форма бронирования работает
- [ ] Таймер показывает правильное время
- [ ] Счётчики обновляются
- [ ] Карусель кейсов листается
- [ ] Видео-плеер воспроизводится
- [ ] Адаптивность на mobile/tablet/desktop
- [ ] Нет console errors
- [ ] Lighthouse Performance > 80

---

## 🎉 ФИНАЛЬНЫЙ КОММИТ

После завершения всех задач создай коммит:

```bash
git add .
git commit -m "feat: complete AI Marathon redesign with lime green (#b2ff2e) and Figma reference

- Replaced all #00ff00 with #b2ff2e across all components
- Adapted HeroSection with onAI animated logo
- Updated Footer with legal information (TОО ONAI ACADEMY)
- Optimized animations for 60fps performance
- Maintained all functionality (timers, counters, modals)
- Tested on mobile, tablet, and desktop

Backup commit: 7b8c745"
```

---

**Удачи с редизайном! 🚀**

_Все инструменты настроены, серверы запущены, спецификация извлечена. Можно приступать к работе._
