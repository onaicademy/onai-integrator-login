# 🎯 TODO ДЛЯ AI CODE ASSISTANT

**Проект:** Traffic Dashboard - onAI Academy  
**Дата:** 19 декабря 2025

---

## 📌 CONTEXT

Ты работаешь над **Traffic Dashboard** - системой управления таргетологами.

**База данных уже готова** (миграции будут применены отдельно).  
Твоя задача - доделать функционал во frontend/backend коде.

**Локальный запуск:**
```bash
# Terminal 1: Backend
cd /Users/miso/onai-integrator-login/backend && npm run dev

# Terminal 2: Frontend  
cd /Users/miso/onai-integrator-login && npm run dev
```

**Документация:**
- Полный HANDOFF: `TRAFFIC_DASHBOARD_HANDOFF.md`
- Миграции: `TRIPWIRE_MIGRATIONS_APPLY.md` (не твоя задача, применит другой чел)

---

## ✅ ЧТО УЖЕ РАБОТАЕТ

- ✅ Логин (`/traffic/login`)
- ✅ Админ-панель (`/traffic/admin`)
- ✅ Team Constructor с email отправкой
- ✅ Settings с UTM sources
- ✅ Backend API для всех операций
- ✅ Graceful fallbacks если таблицы пустые

---

## 🔴 CRITICAL TASKS (DO FIRST)

### 1. Security Panel - Улучшить UI для пустого состояния

**Файл:** `src/pages/traffic/TrafficSecurityPanel.tsx`

**Проблема:**  
Когда нет логов, показывается пустая таблица - это выглядит не очень.

**Задача:**
- Добавить красивый Empty State:
  - Иконка 🔒
  - Текст "Логов пока нет" или "Все входы будут отображаться здесь"
  - Подзаголовок с объяснением что такое Security Panel
- Стиль: черный фон + #00FF88 акценты

**Пример кода:**
```tsx
{sessions.length === 0 ? (
  <div className="text-center py-20">
    <div className="text-6xl mb-4">🔒</div>
    <h3 className="text-xl text-white mb-2">Логи входов пока отсутствуют</h3>
    <p className="text-gray-400">Все входы в систему будут отображаться здесь</p>
  </div>
) : (
  <table>...</table>
)}
```

---

### 2. UTM Sources Panel - Подключить реальные данные

**Файл:** `src/pages/traffic/UTMSourcesPanel.tsx`

**Проблема:**  
Сейчас показывает placeholder данные или пустое состояние.

**Задача:**
- Добавить API endpoint в backend: `GET /api/traffic-utm/stats`
- Endpoint должен возвращать:
  ```typescript
  {
    topSources: Array<{
      source: string;
      salesCount: number;
      totalRevenue: number;
      campaigns: string[];
    }>,
    topCampaigns: Array<{
      campaign: string;
      source: string;
      salesCount: number;
      totalRevenue: number;
    }>,
    withoutUTM: {
      count: number;
      totalRevenue: number;
    }
  }
  ```
- Frontend: подключить этот API и отобразить данные
- Добавить loading state и error handling

**Backend файл:** `backend/src/routes/traffic-utm-stats.ts` (создать)

**SQL queries для backend:**
```sql
-- Top sources
SELECT * FROM top_utm_sources LIMIT 10;

-- Top campaigns  
SELECT * FROM top_utm_campaigns LIMIT 10;

-- Without UTM
SELECT COUNT(*), SUM(sale_amount) FROM sales_without_utm;
```

---

### 3. Admin Panel - Добавить реальную статистику

**Файл:** `src/pages/traffic/TrafficAdminPanel.tsx`

**Проблема:**  
В Dashboard показываются захардкоженные цифры (Users: 12, Teams: 4, etc).

**Задача:**
- Создать API endpoint: `GET /api/traffic-admin/stats`
- Endpoint должен возвращать:
  ```typescript
  {
    usersCount: number;
    teamsCount: number;
    activePlans: number;
    todaySales: number;
    weekSales: number;
    monthSales: number;
  }
  ```
- Frontend: заменить hardcoded числа на данные из API
- Добавить loading skeleton для карточек статистики

**Backend файл:** `backend/src/routes/traffic-admin.ts` (дополнить)

**SQL queries:**
```sql
-- Count users
SELECT COUNT(*) FROM traffic_users WHERE role != 'admin';

-- Count teams
SELECT COUNT(*) FROM traffic_teams;

-- Today sales
SELECT COUNT(*), SUM(sale_amount) 
FROM all_sales_tracking 
WHERE DATE(sale_date) = CURRENT_DATE;

-- Week sales
SELECT COUNT(*), SUM(sale_amount)
FROM all_sales_tracking
WHERE sale_date >= NOW() - INTERVAL '7 days';
```

---

## 🟡 MEDIUM PRIORITY TASKS

### 4. Targetologist Dashboard - Добавить графики продаж

**Файл:** `src/pages/traffic/TrafficTargetologistDashboard.tsx`

**Задача:**
- Добавить график продаж за последние 30 дней
- Использовать recharts или chart.js
- Показывать:
  - Количество продаж по дням
  - Выручка по дням
  - Средний чек
- Фильтр по дате (7 дней / 30 дней / 90 дней)

**Пример с recharts:**
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<LineChart data={salesData}>
  <XAxis dataKey="date" stroke="#9ca3af" />
  <YAxis stroke="#9ca3af" />
  <Line type="monotone" dataKey="revenue" stroke="#00FF88" />
  <Tooltip 
    contentStyle={{ 
      backgroundColor: '#0a0a0a', 
      border: '1px solid #1f2937' 
    }} 
  />
</LineChart>
```

**Backend endpoint:** `GET /api/traffic-dashboard/sales-chart?period=30`

---

### 5. Settings - Добавить Facebook Ads интеграцию

**Файл:** `src/pages/traffic/TrafficSettings.tsx`

**Задача:**
- Добавить секцию "Facebook Integration"
- Поля:
  - FB Access Token (input type="password")
  - FB Ad Account ID (auto-fill из токена)
  - Кнопка "Connect Facebook"
  - Кнопка "Sync Campaigns" (подтянуть кампании из FB)
- Сохранять токен в `targetologist_settings.fb_access_token`
- НЕ показывать токен в plaintext после сохранения

**Backend endpoint:** `POST /api/traffic-settings/fb-connect`

**Security:**
- Токен должен храниться в encrypted виде
- Использовать `crypto` для шифрования

---

### 6. Team Constructor - Массовое создание пользователей

**Файл:** `src/pages/traffic/TrafficTeamConstructor.tsx`

**Задача:**
- Добавить кнопку "Bulk Create"
- Modal с textarea для CSV:
  ```
  email,role,team_name
  user1@example.com,targetologist,Kenesary
  user2@example.com,targetologist,Arystan
  ```
- Парсинг CSV и создание всех пользователей
- Progress bar во время создания
- Сводка результатов (Created: 5, Failed: 1)
- Отправка email всем созданным пользователям

**Backend endpoint:** `POST /api/traffic-constructor/bulk-create`

---

## 🟢 LOW PRIORITY (NICE TO HAVE)

### 7. Добавить Dark Mode Toggle

**Файл:** `src/components/traffic/TrafficCabinetLayout.tsx`

**Задача:**
- Добавить переключатель Light/Dark mode в sidebar
- Сохранять выбор в localStorage
- Применять CSS classes для light theme
- По умолчанию - dark mode

---

### 8. Notifications System

**Файлы:** Создать новые

**Задача:**
- Toast notifications для всех операций
- Использовать react-hot-toast или sonner
- Показывать:
  - ✅ Успех: "Пользователь создан"
  - ❌ Ошибка: "Не удалось сохранить настройки"
  - ℹ️ Info: "Данные синхронизируются..."
- Стиль: черный + #00FF88

**Пример:**
```tsx
import toast from 'react-hot-toast';

toast.success('Пользователь создан!', {
  style: {
    background: '#0a0a0a',
    color: '#00FF88',
    border: '1px solid #00FF88',
  },
});
```

---

### 9. Export Reports

**Файл:** `src/pages/traffic/UTMSourcesPanel.tsx`

**Задача:**
- Кнопка "Export CSV"
- Экспорт таблицы продаж в CSV файл
- Формат: `sales_report_YYYY-MM-DD.csv`
- Включить: date, source, campaign, amount, targetologist

**Библиотека:** `papaparse` или нативный code

---

### 10. Search & Filters

**Файлы:** Все таблицы (Users, Sessions, Sales)

**Задача:**
- Добавить input для поиска над каждой таблицей
- Real-time фильтрация по:
  - Users: email, team_name
  - Sessions: email, ip_address
  - Sales: lead_name, utm_source
- Dropdown фильтр по команде
- Date range picker для Sales

---

## 🔧 REFACTORING TASKS

### 11. Вынести API calls в отдельные сервисы

**Проблема:**  
API calls разбросаны по компонентам - плохо для maintenance.

**Задача:**
- Создать `src/services/trafficApi.ts`
- Перенести все API calls туда
- Использовать axios instance с auth headers

**Пример структуры:**
```typescript
// src/services/trafficApi.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('traffic_token')}`,
  },
});

export const trafficApi = {
  // Users
  getUsers: () => api.get('/traffic-constructor/users'),
  createUser: (data) => api.post('/traffic-constructor/users', data),
  
  // Teams
  getTeams: () => api.get('/traffic-constructor/teams'),
  
  // Settings
  getSettings: (userId) => api.get(`/traffic-settings/${userId}`),
  updateSettings: (userId, data) => api.put(`/traffic-settings/${userId}`, data),
};
```

---

### 12. Добавить TypeScript types для всех API responses

**Задача:**
- Создать `src/types/traffic.ts`
- Определить интерфейсы для:
  - User
  - Team
  - Session
  - Sale
  - Settings
  - API responses

**Пример:**
```typescript
// src/types/traffic.ts
export interface TrafficUser {
  id: string;
  email: string;
  role: 'admin' | 'targetologist';
  team_id: string;
  team_name: string;
  created_at: string;
}

export interface TrafficTeam {
  id: string;
  name: string;
  company: string;
  direction: string;
  color: string;
  emoji: string;
}

// ... etc
```

---

### 13. Error Boundaries

**Задача:**
- Добавить React Error Boundary для Traffic routes
- Красивая страница ошибки вместо белого экрана
- Кнопка "Reload" и "Go to Dashboard"

**Файл:** `src/components/traffic/TrafficErrorBoundary.tsx`

---

## 🧪 TESTING TASKS

### 14. Unit Tests для API routes

**Задача:**
- Установить `jest` и `supertest`
- Написать тесты для всех backend routes
- Coverage минимум 80%

**Пример:**
```typescript
// backend/tests/traffic-auth.test.ts
describe('POST /api/traffic-auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/traffic-auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

---

### 15. E2E Tests для критичных flows

**Задача:**
- Установить `playwright`
- Написать E2E тесты:
  - Login flow
  - Create user flow
  - Save settings flow

---

## 📝 DOCUMENTATION TASKS

### 16. API Documentation

**Задача:**
- Создать `backend/docs/API.md`
- Документировать все endpoints:
  - Method
  - Path
  - Request body
  - Response body
  - Status codes
  - Auth required

**Формат:** Markdown или Swagger/OpenAPI

---

### 17. Component Storybook

**Задача:**
- Установить Storybook
- Создать stories для основных компонентов:
  - TrafficCabinetLayout
  - QuickActions
  - StatCard
  - UserTable

---

## 🎨 UI/UX IMPROVEMENTS

### 18. Loading Skeletons

**Задача:**
- Заменить все "Loading..." текст на красивые skeleton loaders
- Использовать `react-loading-skeleton` или custom CSS

---

### 19. Animations & Transitions

**Задача:**
- Добавить плавные переходы между страницами
- Анимация появления модалов
- Hover effects на кнопки и карточки
- Использовать `framer-motion`

---

### 20. Responsive Design

**Задача:**
- Проверить все страницы на мобильных (375px, 768px, 1024px)
- Адаптировать таблицы (horizontal scroll или cards на мобильных)
- Burger menu для sidebar на мобильных

---

## 🚀 PERFORMANCE TASKS

### 21. React Query для кеширования

**Задача:**
- Установить `@tanstack/react-query`
- Обернуть все API calls в `useQuery` / `useMutation`
- Настроить stale time и cache time
- Добавить optimistic updates

---

### 22. Code Splitting

**Задача:**
- Использовать `React.lazy()` для всех Traffic routes
- Separate chunks для admin и targetologist pages
- Preload critical chunks

---

## 🔒 SECURITY TASKS

### 23. Input Validation

**Задача:**
- Добавить валидацию на все формы (frontend)
- Использовать `zod` или `yup`
- Валидация email, password strength, etc

---

### 24. Rate Limiting

**Задача:**
- Добавить rate limiting в backend
- Использовать `express-rate-limit`
- Лимиты:
  - Login: 5 попыток / 15 минут
  - API calls: 100 запросов / минута

---

## 📊 ANALYTICS TASKS

### 25. Google Analytics / Mixpanel

**Задача:**
- Добавить трекинг событий:
  - Page views
  - User created
  - Settings saved
  - Login attempts
  - Exports

---

## 🎯 PRIORITY SUMMARY

**Делай в таком порядке:**

1. 🔴 **Critical** (1-3) - сначала эти
2. 🟡 **Medium** (4-6) - потом эти
3. 🟢 **Low** (7-10) - если есть время
4. 🔧 **Refactoring** (11-13) - параллельно с feature работой
5. 🧪 **Testing** (14-15) - когда основной функционал готов
6. 📝 **Docs** (16-17) - перед production
7. 🎨 **UI/UX** (18-20) - полировка
8. 🚀 **Performance** (21-22) - оптимизация
9. 🔒 **Security** (23-24) - обязательно перед production
10. 📊 **Analytics** (25) - после деплоя

---

## 💡 GENERAL GUIDELINES

### Code Style
- TypeScript строгий режим
- ESLint + Prettier
- Именование: camelCase для переменных, PascalCase для компонентов
- Комментарии на русском для бизнес-логики

### Commits
```bash
feat: добавлен график продаж
fix: исправлена отправка email
refactor: вынесены API calls в сервис
docs: обновлена документация API
test: добавлены тесты для auth
```

### PR Description Template
```markdown
## Что сделано
- Добавлен график продаж в Dashboard
- Исправлена ошибка с пустым состоянием

## Как тестировать
1. Открыть /traffic/dashboard
2. Проверить что график отображается
3. Проверить что нет ошибок в console

## Screenshots
[прикрепить скрины]
```

---

## 🆘 ЕСЛИ ЧТО-ТО НЕПОНЯТНО

1. Читай `TRAFFIC_DASHBOARD_HANDOFF.md` - там ВСЯ информация
2. Смотри существующий код - там много примеров
3. Проверяй API через `curl` перед интеграцией во frontend
4. Тестируй в браузере после каждого изменения

---

## ✅ CHECKLIST ПЕРЕД ЗАВЕРШЕНИЕМ ЗАДАЧИ

Для каждой задачи проверь:

- [ ] Код работает без ошибок
- [ ] Нет warnings в console
- [ ] Нет TypeScript ошибок
- [ ] API calls обрабатывают ошибки (try/catch)
- [ ] Loading states добавлены
- [ ] Empty states добавлены (если applicable)
- [ ] Стиль соответствует дизайну (черный + #00FF88)
- [ ] Responsive (проверить на 375px, 768px, 1024px)
- [ ] Backend restart после изменений routes
- [ ] Frontend hot reload сработал

---

## 🎉 ФИНАЛ

Когда все задачи выполнены:

1. Сделай полное тестирование всего функционала
2. Проверь что все API endpoints работают
3. Проверь что нет критичных ошибок в console
4. Сделай финальный commit: `feat: traffic dashboard complete`
5. Создай файл `TRAFFIC_DASHBOARD_COMPLETED.md` с чеклистом того что сделано

**Удачи!** 🚀

---

**Created:** 2025-12-19  
**Last Updated:** 2025-12-19  
**Version:** 1.0

