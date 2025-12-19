# Perplexity Search Prompt: Interactive Platform Onboarding Best Practices

## 🎯 Цель поиска

Найти готовые библиотеки и best practices для создания интерактивного onboarding (обучения) новых пользователей в веб-платформе.

---

## 📝 ПРОМПТ ДЛЯ PERPLEXITY:

```
Find the best JavaScript/React libraries and best practices for creating interactive product tours and onboarding experiences in 2024-2025.

Requirements:
1. Must support React 18+
2. Should highlight UI elements with overlay/spotlight effect
3. Step-by-step guided tours with tooltips
4. Must be able to prevent users from skipping the tour (first-time mandatory)
5. Should support custom styling (dark theme, neon colors)
6. Track progress in database
7. Different tours for different user roles
8. Must work with dynamically loaded content
9. Mobile responsive

Compare these solutions:
- Driver.js
- Shepherd.js
- React Joyride
- Intro.js
- Reactour
- Product Fruits
- Userflow
- Appcues

For each solution provide:
- Pros and cons
- Bundle size
- Customization options
- Pricing (if paid)
- GitHub stars
- Last update date
- Integration complexity with React

Also search for:
- "product tour library React 2024"
- "interactive onboarding tutorial JavaScript"
- "user onboarding spotlight library"
- "guided tour React component"
- "first-time user experience library"
```

---

## 🎨 Наши требования к Onboarding

### Визуальный стиль
- **Тёмная тема**: `#030303` фон
- **Акцентный цвет**: `#00FF88` (neon green)
- **Премиум дизайн**: glass-morphism, subtle gradients
- **Анимации**: плавные, но не отвлекающие

### Функционал

#### При первом входе таргетолога:
1. **Welcome Modal** - приветствие с именем пользователя
2. **Интерактивный тур** - подсветка элементов по очереди:
   - Шаг 1: Общий вид дашборда
   - Шаг 2: Кнопка переключения языка (РУС/КАЗ)
   - Шаг 3: Кнопка "Мои результаты" (главная функция!)
   - Шаг 4: Метрики (Доход, Затраты, ROAS, CPA)
   - Шаг 5: Таблица команд
   - Шаг 6: AI рекомендации
   - Шаг 7: Настройки (подключение FB кабинета)
   - Шаг 8: Детальная аналитика
   - Финал: Важное напоминание про UTM-метки

3. **Проваливание в Настройки**:
   - Показать как подключить рекламный кабинет
   - Показать как выбрать кампании для отслеживания
   - Показать UTM шаблоны

### Технические требования

```typescript
// Желаемое API
interface OnboardingStep {
  element: string;           // CSS selector
  title: string;             // Заголовок
  description: string;       // HTML описание
  side: 'top' | 'right' | 'bottom' | 'left';
  action?: () => void;       // Callback при показе шага
  waitFor?: string;          // Ждать появления элемента
  scrollTo?: boolean;        // Скроллить к элементу
}

interface OnboardingConfig {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;       // undefined = нельзя пропустить
  overlay: {
    color: string;           // Цвет затемнения
    opacity: number;         // Прозрачность
  };
  spotlight: {
    padding: number;         // Отступ от элемента
    borderRadius: number;    // Скругление
    animation: boolean;      // Пульсация
  };
}
```

### Что уже используется

У нас уже установлен **Driver.js** - он работает хорошо, но хотим сравнить альтернативы и узнать best practices.

---

## 🔍 Дополнительные вопросы для Perplexity

1. **How to create mandatory onboarding that cannot be skipped?**
   - Best UX practices
   - Database schema for tracking completion
   - Edge cases (user closes browser mid-tour)

2. **Multi-page onboarding tours**
   - How to continue tour across page navigation?
   - State persistence between pages
   - Redirect user to specific page for demo

3. **Analytics for onboarding**
   - Track completion rate
   - Identify drop-off points
   - A/B testing different tour flows

4. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - WCAG 2.1 compliance

---

## 📊 Ожидаемый результат

Найти:
1. ✅ Лучшую библиотеку для нашего случая (или подтвердить driver.js)
2. ✅ Примеры кода для мультистраничного тура
3. ✅ Best practices для дизайна onboarding в SaaS
4. ✅ Примеры компаний с отличным onboarding (для вдохновения)

---

## 🔗 Полезные ссылки для поиска

- https://github.com/kamranahmedse/driver.js
- https://github.com/shipshapecode/shepherd
- https://github.com/gilbarbara/react-joyride
- https://github.com/usablica/intro.js
- https://www.nngroup.com/articles/onboarding-patterns/
- https://www.productboard.com/blog/user-onboarding-best-practices/

---

## 💡 Альтернативный промпт (короткий)

```
What are the best React libraries for creating interactive product tours with element highlighting, step-by-step guides, and progress tracking in 2024? Compare driver.js, shepherd.js, react-joyride, and intro.js. Include code examples for mandatory first-time user onboarding that cannot be skipped.
```
