# 📋 Traffic Dashboard - Полный План Реализации

## 🎯 Цель
Создать профессиональный дашборд для таргетологов с полной аналитикой по воронкам продаж (Однодневник, Трехдневник, Экспресс-курс) и интеграцией с множественными источниками трафика (Facebook, YouTube, TikTok).

---

## 🏗️ ФАЗА 1: Очистка и Реорганизация Структуры

### 1.1 Упрощение Сайдбара (Убрать Дублирование)
**Проблема**: Раздел "Пользователи" дублируется в верхних табах и в сайдбаре

**Решение**:
- Убрать раздел "Пользователи" из верхних табов админ-панели
- Оставить только в сайдбаре как отдельный пункт меню
- Структура сайдбара должна быть:
  ```
  📊 Панель управления (главная страница с Таргет Dashboard)

  АНАЛИТИКА
  └── 📈 Источники продаж
  └── 🔒 Безопасность

  УПРАВЛЕНИЕ
  └── 👥 Пользователи (единственное место)
  └── 🏗️ Конструктор команд
  └── 🔌 API Интеграции
  ```

### 1.2 Удаление Дублирующих Разделов
- Убрать "Пользователи" из вкладок TrafficAdminPanel
- Оставить только: Таргет Dashboard, Панель администратора, Атрибуция, Настройки AI, Генерация планов

---

## 🏗️ ФАЗА 2: Источники Продаж - Интеграция с AmoCRM и БД

### 2.1 Диагностика Текущего Состояния
**Проблема**: Раздел "Источники продаж" показывает пустые метрики

**Задачи**:
1. Проверить подключение к AmoCRM API
2. Проверить наличие данных в таблицах БД:
   - `landing_bd` - лиды с лендингов
   - `traffic_bd` - лиды с трафика
   - `tripwire_bd` - лиды с трипваера
3. Проверить корректность UTM-меток в сделках AmoCRM

### 2.2 Реализация Подтягивания Данных
**Источники данных**:

1. **AmoCRM (основной источник продаж)**
   - Таблица: сделки с UTM-метками
   - Эндпоинт: `/api/amocrm/deals-by-utm`
   - Параметры: `utm_source`, `date_from`, `date_to`

2. **БД - Лиды (дополнительные источники)**
   - `landing_bd`: лиды с лендингов
   - `traffic_bd`: лиды с рекламных кампаний
   - `tripwire_bd`: лиды с трипваера
   - Поля: `utm_source`, `utm_medium`, `utm_campaign`, `created_at`, `status`

**Структура данных для отображения**:
```typescript
interface SourceStats {
  source: string; // utm_source
  leads: number; // Всего лидов
  sales: number; // Продажи (из AmoCRM)
  revenue: number; // Выручка (из AmoCRM)
  conversionRate: number; // % конверсии lead -> sale
  avgCheck: number; // Средний чек
}
```

### 2.3 Создание Нового Компонента
**Файл**: `src/components/traffic/SourcesAnalytics.tsx`

**Функционал**:
- Таблица с UTM sources и их метриками
- Фильтр по периоду (7/14/30 дней, кастомный диапазон)
- Группировка по: источнику, кампании, креативу
- Экспорт в CSV

---

## 🏗️ ФАЗА 3: Упрощение Конструктора Команд

### 3.1 Новая Упрощенная Форма
**Проблема**: Текущий конструктор слишком сложный

**Новая структура формы** (одно окно):

```typescript
interface TeamFormData {
  // Основная информация
  name: string; // Название команды (например: "Kenesary Team")
  email: string; // Email команды
  responsibleName: string; // Имя ответственного
  password: string; // Пароль (с кнопкой "Автогенерация")

  // UTM Sources (множественный выбор)
  utmSources: string[]; // Массив UTM sources для этой команды

  // Цвет команды (для визуализации)
  color: string; // Hex color
}
```

**UI Компоненты**:
1. Input: Название команды
2. Input: Email команды
3. Input: Имя ответственного
4. Input: Пароль + Button "Автогенерация" (генерирует случайный пароль типа "ChangeMe123!")
5. MultiSelect: UTM Sources (можно выбрать несколько)
6. ColorPicker: Цвет команды
7. Buttons: "Создать" / "Отмена"

### 3.2 Автогенерация Пароля
**Функция**:
```typescript
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const length = 12;
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!';
}
```

### 3.3 UTM Sources Management
**Где хранятся UTM sources команды**:
- Таблица: `traffic_teams`
- Поле: `utm_sources` (JSON array)
- Пример: `["facebook_kenesary", "instagram_kenesary", "google_kenesary"]`

**Как определяется принадлежность лида/продажи**:
1. Лид приходит с UTM меткой
2. Система проверяет в какой команде есть этот `utm_source`
3. Присваивает лид/продажу этой команде

---

## 🏗️ ФАЗА 4: API Интеграции - Диагностика

### 4.1 Проверка Актуальности Данных
**Задача**: Проверить действительно ли подтягиваются реальные статусы или это моки

**Проверки**:
1. Facebook Ads API:
   - Эндпоинт: `/api/facebook/ad-accounts/status`
   - Проверить: последний запрос к API, статус токена, дата обновления

2. AmoCRM API:
   - Эндпоинт: `/api/amocrm/connection-status`
   - Проверить: статус токена, последняя синхронизация, количество сделок за сегодня

3. Email (Resend):
   - Эндпоинт: `/api/email/status`
   - Проверить: квота отправки, последнее письмо

4. Telegram Bot:
   - Эндпоинт: `/api/telegram/bot-status`
   - Проверить: статус бота, последнее сообщение

### 4.2 Создание Диагностической Панели
**Компонент**: `src/components/traffic/APIDiagnostics.tsx`

**Отображение для каждого API**:
```typescript
interface APIStatus {
  name: string; // "Facebook Ads"
  status: 'active' | 'error' | 'warning'; // Статус
  lastSync: Date; // Последняя синхронизация
  tokenExpiry: Date | null; // Когда истекает токен
  requestsToday: number; // Запросов сегодня
  rateLimitRemaining: number; // Оставшийся лимит
  errorMessage?: string; // Сообщение об ошибке
}
```

**UI**:
- Зеленый индикатор: все ОК
- Желтый: предупреждение (токен скоро истечет, лимит близок)
- Красный: ошибка (токен истек, API недоступен)
- Кнопка "Обновить токен" для каждого API
- Кнопка "Проверить соединение"

---

## 🏗️ ФАЗА 5: Таргет Dashboard - Множественные Воронки

### 5.1 Архитектура Dashboard
**Проблема**: Сейчас нет возможности переключаться между воронками

**Новая структура**:

```typescript
type FunnelType = 'one-day' | 'three-day' | 'express-course';

interface FunnelDashboard {
  type: FunnelType;
  name: string; // "Однодневник" | "Трехдневник" | "Экспресс-курс"
  metrics: FunnelMetrics;
  campaigns: Campaign[];
}

interface FunnelMetrics {
  // Основные метрики
  spend: number; // Расходы
  revenue: number; // Выручка
  profit: number; // Прибыль
  roas: number; // ROAS
  roi: number; // ROI

  // Воронка
  impressions: number; // Показы
  clicks: number; // Клики
  ctr: number; // CTR
  leads: number; // Лиды
  purchases: number; // Покупки
  conversionRate: number; // CR (lead -> purchase)

  // Стоимость
  cpm: number; // CPM
  cpc: number; // CPC
  cpl: number; // CPL (cost per lead)
  cpa: number; // CPA (cost per acquisition)

  // Средние значения
  avgCheck: number; // Средний чек
  avgLTV: number; // Lifetime value
}
```

### 5.2 UI Компоненты

**1. Tabs для переключения воронок**:
```tsx
<Tabs defaultValue="express-course">
  <TabsList>
    <TabsTrigger value="one-day">
      🚀 Однодневник
    </TabsTrigger>
    <TabsTrigger value="three-day">
      📚 Трехдневник
    </TabsTrigger>
    <TabsTrigger value="express-course">
      ⚡ Экспресс-курс
    </TabsTrigger>
  </TabsList>

  <TabsContent value="express-course">
    <FunnelDashboardView funnel="express-course" />
  </TabsContent>
  {/* ... остальные вкладки */}
</Tabs>
```

**2. Для каждой воронки - отдельный дашборд с**:
- Metrics Grid (ROAS, ROI, CPA, etc.)
- Funnel Pyramid (визуализация воронки)
- Campaigns Table (таблица кампаний)
- Charts (графики по дням)

### 5.3 Источники Данных для Воронок

**Как определить к какой воронке относится кампания**:
```sql
-- Вариант 1: По UTM campaign
utm_campaign LIKE '%one-day%' -> Однодневник
utm_campaign LIKE '%three-day%' -> Трехдневник
utm_campaign LIKE '%express%' -> Экспресс-курс

-- Вариант 2: По названию продукта в AmoCRM
product_name = 'Однодневник' -> one-day
product_name = 'Трехдневник' -> three-day
product_name = 'Экспресс-курс' -> express-course
```

**Эндпоинт**:
```
GET /api/traffic/funnel-analytics?funnel=express-course&period=7d&teamId=123
```

---

## 🏗️ ФАЗА 6: Расширение на YouTube и TikTok

### 6.1 Архитектура Multi-Platform

**Текущее состояние**: Только Facebook Ads

**Новая структура**:

```typescript
type TrafficSource = 'facebook' | 'youtube' | 'tiktok' | 'google';

interface Campaign {
  id: string;
  name: string;
  source: TrafficSource; // Откуда кампания
  funnel: FunnelType; // К какой воронке относится
  status: 'active' | 'paused' | 'completed';
  metrics: FunnelMetrics;
  // ... остальные поля
}
```

### 6.2 Интеграция с YouTube Ads

**API**: YouTube Data API v3 + Google Ads API

**Необходимые данные**:
1. Настройка OAuth для Google
2. Получение Google Ads Account ID
3. Подключение к YouTube Analytics API

**Эндпоинты для создания**:
```
POST /api/youtube/connect-account
GET /api/youtube/campaigns
GET /api/youtube/campaign-metrics?campaignId=xxx
```

**Метрики YouTube**:
- Просмотры видео
- View Rate (%)
- CPV (Cost Per View)
- Клики по ссылкам
- Конверсии

### 6.3 Интеграция с TikTok Ads

**API**: TikTok Marketing API

**Необходимые данные**:
1. TikTok Business Account
2. App ID + Secret для API
3. Access Token

**Эндпоинты для создания**:
```
POST /api/tiktok/connect-account
GET /api/tiktok/campaigns
GET /api/tiktok/campaign-metrics?campaignId=xxx
```

**Метрики TikTok**:
- Просмотры
- Лайки, комментарии, шеры
- Click-through rate
- Conversions
- CPC, CPM

### 6.4 Unified Dashboard для всех источников

**Компонент**: `src/components/traffic/MultiPlatformDashboard.tsx`

**Фильтры**:
```tsx
<Filters>
  {/* Выбор источника */}
  <Select>
    <option value="all">Все источники</option>
    <option value="facebook">Facebook</option>
    <option value="youtube">YouTube</option>
    <option value="tiktok">TikTok</option>
  </Select>

  {/* Выбор воронки */}
  <Select>
    <option value="all">Все воронки</option>
    <option value="one-day">Однодневник</option>
    <option value="three-day">Трехдневник</option>
    <option value="express-course">Экспресс-курс</option>
  </Select>

  {/* Период */}
  <DateRangePicker />
</Filters>
```

---

## 🏗️ ФАЗА 7: Настройки Таргетолога

### 7.1 Раздел "Настройки" для Таргетолога

**Локация**: `/traffic/settings` (доступно таргетологу в его кабинете)

**Что может настроить таргетолог**:

**1. UTM Sources (управление своими метками)**:
```typescript
interface UTMSourceSettings {
  teamId: string;
  sources: {
    name: string; // "Facebook Kenesary Main"
    utm_source: string; // "fb_kenesary_main"
    platform: TrafficSource; // "facebook"
    isActive: boolean;
  }[];
}
```

**UI**:
- Список UTM sources таргетолога
- Кнопка "+ Добавить UTM source"
- Форма:
  - Название (для отображения)
  - UTM source метка
  - Платформа (Facebook/YouTube/TikTok)
  - Активность (вкл/выкл)

**2. Подключение рекламных кабинетов**:

```typescript
interface AdAccountSettings {
  facebook: {
    accountId: string;
    accessToken: string; // Зашифрованный
    status: 'connected' | 'disconnected';
  }[];
  youtube: {
    accountId: string;
    refreshToken: string; // Зашифрованный
    status: 'connected' | 'disconnected';
  }[];
  tiktok: {
    accountId: string;
    accessToken: string; // Зашифрованный
    status: 'connected' | 'disconnected';
  }[];
}
```

**UI**:
- Раздел "Мои рекламные кабинеты"
- Для каждой платформы:
  - Кнопка "Подключить Facebook Ads"
  - Кнопка "Подключить YouTube Ads"
  - Кнопка "Подключить TikTok Ads"
- OAuth flow для подключения
- Список подключенных кабинетов со статусом

---

## 🏗️ ФАЗА 8: Курсы Валют

### 8.1 Автоматическое Обновление Курсов

**Проблема**: Нужно ежедневно обновлять курс USD -> KZT

**Решение**:

**API для получения курсов**:
- Использовать: https://api.exchangerate-api.com/v4/latest/USD
- Или: National Bank of Kazakhstan API

**Структура БД**:
```sql
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  usd_to_kzt DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Cron Job (на бэкенде)**:
```typescript
// Каждый день в 00:01 по Астане
cron.schedule('1 0 * * *', async () => {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const data = await response.json();
  const rate = data.rates.KZT;

  await db.query(`
    INSERT INTO exchange_rates (date, usd_to_kzt)
    VALUES (CURRENT_DATE, $1)
    ON CONFLICT (date) DO UPDATE SET usd_to_kzt = $1
  `, [rate]);
});
```

### 8.2 Учет Курса в Расчетах

**При расчете метрик**:
```typescript
// Получаем курс на дату кампании
const rate = await getExchangeRate(campaignDate);

// Конвертируем spend (если в KZT)
const spendUSD = campaign.spend_kzt / rate;

// Считаем ROAS
const roas = campaign.revenue_usd / spendUSD;
```

**Эндпоинт**:
```
GET /api/exchange-rate?date=2025-12-30
-> { date: "2025-12-30", usd_to_kzt: 485.50 }
```

---

## 🏗️ ФАЗА 9: Календарь и Диапазоны Дат

### 9.1 Календарь как в Facebook Ads

**Компонент**: React DateRangePicker (или react-day-picker)

**Функционал**:
- Выбор одной даты
- Выбор диапазона дат (date range)
- Пресеты:
  - Сегодня
  - Вчера
  - Последние 7 дней
  - Последние 14 дней
  - Последние 30 дней
  - Этот месяц
  - Прошлый месяц
  - Кастомный диапазон

**UI Example**:
```tsx
<DateRangeSelector
  value={dateRange}
  onChange={handleDateChange}
  presets={[
    { label: 'Сегодня', value: 'today' },
    { label: 'Последние 7 дней', value: '7d' },
    { label: 'Последние 30 дней', value: '30d' },
    { label: 'Этот месяц', value: 'this-month' },
  ]}
/>
```

### 9.2 Подтягивание Данных по Датам

**Логика**:
1. Пользователь выбирает диапазон дат
2. Frontend отправляет запрос с параметрами:
   ```
   GET /api/traffic/funnel-analytics?start=2025-12-01&end=2025-12-30
   ```
3. Backend:
   - Получает данные из Facebook/YouTube/TikTok API за этот период
   - Получает сделки из AmoCRM за этот период (по `created_at` или `closed_at`)
   - Получает курсы валют за каждый день периода
   - Группирует по дням/неделям/месяцам

**Группировка данных**:
```typescript
interface DailyMetrics {
  date: string; // "2025-12-01"
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  leads: number;
  purchases: number;
  exchangeRate: number; // Курс на эту дату
}
```

### 9.3 Графики по Дням

**Компонент**: Recharts или Chart.js

**Типы графиков**:
1. **Line Chart**: Revenue, Spend, Profit по дням
2. **Bar Chart**: Leads, Purchases по дням
3. **Area Chart**: ROAS тренд
4. **Combo Chart**: Revenue vs Spend

---

## 🏗️ ФАЗА 10: Best Practice Метрики для Маркетологов

### 10.1 Дополнительные Метрики

**Стандартные метрики** (уже есть):
- CPM, CPC, CTR
- Leads, Purchases
- ROAS, ROI
- Revenue, Profit

**Дополнительные профессиональные метрики**:

**1. Audience Metrics**:
- Frequency (частота показа)
- Reach (охват уникальных пользователей)
- Unique Link Clicks
- Cost per Unique Click

**2. Engagement Metrics**:
- Post Engagement Rate
- Video Watch Time
- Video Completion Rate
- Social Engagement (likes, comments, shares)

**3. Conversion Funnel**:
- Landing Page View Rate
- Add to Cart Rate
- Initiate Checkout Rate
- Purchase Completion Rate
- Cart Abandonment Rate

**4. Lifetime Value**:
- Customer Lifetime Value (LTV)
- Payback Period (через сколько дней окупается клиент)
- Repeat Purchase Rate
- Churn Rate

**5. Attribution Metrics**:
- First Touch Attribution
- Last Touch Attribution
- Multi-Touch Attribution (если несколько касаний)

**6. Quality Metrics**:
- Quality Score (для Google Ads)
- Relevance Score (для Facebook)
- Ad Rank
- Landing Page Experience

### 10.2 Компоненты для Метрик

**Файл**: `src/components/traffic/AdvancedMetricsGrid.tsx`

**Категории метрик**:
```tsx
<MetricsSection title="Performance">
  <MetricCard label="ROAS" value={2.5} trend="up" />
  <MetricCard label="ROI" value={150} suffix="%" trend="up" />
  <MetricCard label="CPA" value={25.50} prefix="$" trend="down" />
</MetricsSection>

<MetricsSection title="Audience">
  <MetricCard label="Reach" value={50000} />
  <MetricCard label="Frequency" value={2.3} />
  <MetricCard label="Unique CTR" value={3.2} suffix="%" />
</MetricsSection>

<MetricsSection title="Conversion Funnel">
  <FunnelMetric stage="Landing Page Views" value={1000} rate={100} />
  <FunnelMetric stage="Add to Cart" value={300} rate={30} />
  <FunnelMetric stage="Purchases" value={100} rate={10} />
</MetricsSection>
```

---

## 🏗️ ФАЗА 11: Структура БД и API

### 11.1 Таблицы БД

**1. traffic_teams** (команды таргетологов):
```sql
CREATE TABLE traffic_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  responsible_name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  utm_sources JSONB DEFAULT '[]', -- ["fb_kenesary", "yt_kenesary"]
  color VARCHAR(7) DEFAULT '#00FF88',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. ad_accounts** (рекламные кабинеты):
```sql
CREATE TABLE ad_accounts (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES traffic_teams(id),
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'youtube', 'tiktok'
  account_id VARCHAR(255) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  status VARCHAR(50) DEFAULT 'connected',
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**3. campaigns** (кампании):
```sql
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES traffic_teams(id),
  ad_account_id INT REFERENCES ad_accounts(id),
  platform VARCHAR(50) NOT NULL,
  campaign_id_external VARCHAR(255) NOT NULL, -- ID в Facebook/YouTube/TikTok
  name VARCHAR(255) NOT NULL,
  funnel_type VARCHAR(50), -- 'one-day', 'three-day', 'express-course'
  status VARCHAR(50) DEFAULT 'active',
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**4. daily_metrics** (метрики по дням):
```sql
CREATE TABLE daily_metrics (
  id SERIAL PRIMARY KEY,
  campaign_id INT REFERENCES campaigns(id),
  date DATE NOT NULL,

  -- Spend
  spend_usd DECIMAL(10, 2) DEFAULT 0,
  spend_kzt DECIMAL(10, 2) DEFAULT 0,
  exchange_rate DECIMAL(10, 4),

  -- Traffic
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0,
  cpc DECIMAL(10, 2) DEFAULT 0,
  cpm DECIMAL(10, 2) DEFAULT 0,

  -- Leads
  leads INT DEFAULT 0,
  cpl DECIMAL(10, 2) DEFAULT 0,

  -- Sales
  purchases INT DEFAULT 0,
  revenue_usd DECIMAL(10, 2) DEFAULT 0,
  cpa DECIMAL(10, 2) DEFAULT 0,

  -- Performance
  roas DECIMAL(10, 2) DEFAULT 0,
  roi DECIMAL(10, 2) DEFAULT 0,

  -- Advanced
  reach INT DEFAULT 0,
  frequency DECIMAL(5, 2) DEFAULT 0,
  engagement_rate DECIMAL(5, 2) DEFAULT 0,

  UNIQUE(campaign_id, date),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 11.2 API Endpoints

**Команды**:
```
GET    /api/teams                    - Список всех команд
POST   /api/teams                    - Создать команду
PUT    /api/teams/:id                - Обновить команду
DELETE /api/teams/:id                - Удалить команду
GET    /api/teams/:id/utm-sources    - UTM sources команды
POST   /api/teams/:id/utm-sources    - Добавить UTM source
```

**Рекламные кабинеты**:
```
GET    /api/ad-accounts              - Список кабинетов
POST   /api/ad-accounts/facebook     - Подключить Facebook
POST   /api/ad-accounts/youtube      - Подключить YouTube
POST   /api/ad-accounts/tiktok       - Подключить TikTok
DELETE /api/ad-accounts/:id          - Отключить кабинет
GET    /api/ad-accounts/:id/status   - Статус подключения
```

**Кампании**:
```
GET    /api/campaigns                - Список всех кампаний
GET    /api/campaigns/:id            - Детали кампании
POST   /api/campaigns/sync           - Синхронизация с платформами
```

**Аналитика**:
```
GET /api/analytics/funnel?funnel=express-course&period=7d
GET /api/analytics/source?utm_source=fb_kenesary&start=2025-12-01&end=2025-12-30
GET /api/analytics/team/:teamId?start=2025-12-01&end=2025-12-30
GET /api/analytics/platform/:platform?start=2025-12-01&end=2025-12-30
GET /api/analytics/daily?campaignId=123&start=2025-12-01&end=2025-12-30
```

**Диагностика**:
```
GET /api/diagnostics/amocrm           - Статус AmoCRM
GET /api/diagnostics/facebook         - Статус Facebook API
GET /api/diagnostics/youtube          - Статус YouTube API
GET /api/diagnostics/tiktok           - Статус TikTok API
POST /api/diagnostics/test-connection - Тест подключения
```

---

## 🏗️ ФАЗА 12: Frontend Компоненты

### 12.1 Новые Компоненты

**1. MultiPlatformSelector.tsx**:
- Выбор платформы (Facebook/YouTube/TikTok)
- Показывает только подключенные платформы
- Иконки платформ

**2. FunnelTabs.tsx**:
- Вкладки: Однодневник, Трехдневник, Экспресс-курс
- Счетчики: количество активных кампаний на каждой воронке

**3. DateRangeCalendar.tsx**:
- Календарь с диапазонами
- Пресеты
- Визуализация выбранного диапазона

**4. AdvancedMetricsGrid.tsx**:
- Сетка с продвинутыми метриками
- Группировка по категориям
- Тренды (вверх/вниз/стабильно)

**5. CampaignTable.tsx**:
- Таблица кампаний с фильтрами
- Сортировка по метрикам
- Экспорт в CSV
- Inline редактирование статуса

**6. AdAccountManager.tsx**:
- Управление рекламными кабинетами
- Подключение новых
- Статусы подключения
- Обновление токенов

**7. UTMSourcesManager.tsx**:
- Управление UTM метками таргетолога
- CRUD операции
- Привязка к платформам

**8. DailyChart.tsx**:
- Графики метрик по дням
- Выбор метрик для отображения
- Зум, тултипы, легенда

### 12.2 Обновление Существующих

**TrafficAdminPanel.tsx**:
- Убрать вкладку "Пользователи" из табов
- Сделать "Таргет Dashboard" главной вкладкой
- Интегрировать новые компоненты

**TrafficCabinetLayout.tsx** (сайдбар):
- Убрать дублирующиеся разделы
- Добавить иконки для платформ
- Добавить счетчики (количество активных кампаний)

**TargetDashboardContent.tsx**:
- Добавить FunnelTabs
- Добавить MultiPlatformSelector
- Добавить DateRangeCalendar
- Интегрировать AdvancedMetricsGrid

---

## 🏗️ ФАЗА 13: Backend Services

### 13.1 Новые Сервисы

**1. FacebookAdsService.ts** (уже есть, нужно расширить):
- Синхронизация кампаний
- Получение метрик за период
- Обновление токенов

**2. YouTubeAdsService.ts** (новый):
- Подключение Google Ads Account
- Синхронизация YouTube кампаний
- Получение метрик видео-рекламы

**3. TikTokAdsService.ts** (новый):
- Подключение TikTok Business Account
- Синхронизация TikTok кампаний
- Получение метрик

**4. ExchangeRateService.ts** (новый):
- Ежедневное обновление курсов
- Получение курса на дату
- История курсов

**5. AnalyticsService.ts** (расширить):
- Агрегация метрик по воронкам
- Агрегация по источникам
- Агрегация по командам
- Сравнение периодов

**6. UTMTrackerService.ts** (новый):
- Определение команды по UTM
- Присвоение лидов командам
- Присвоение продаж командам

### 13.2 Cron Jobs

**1. Daily Sync Job** (каждый час):
```typescript
// Синхронизация метрик с платформ
cron.schedule('0 * * * *', async () => {
  await FacebookAdsService.syncAllCampaigns();
  await YouTubeAdsService.syncAllCampaigns();
  await TikTokAdsService.syncAllCampaigns();
});
```

**2. Exchange Rate Update** (каждый день):
```typescript
cron.schedule('1 0 * * *', async () => {
  await ExchangeRateService.updateDailyRate();
});
```

**3. AmoCRM Sync** (каждые 15 минут):
```typescript
cron.schedule('*/15 * * * *', async () => {
  await AmoCRMService.syncNewDeals();
});
```

---

## 📋 ИТОГОВЫЙ ЧЕКЛИСТ ЗАДАЧ

### ✅ ФАЗА 1: Очистка UI
- [ ] Убрать "Пользователи" из вкладок TrafficAdminPanel
- [ ] Оставить "Пользователи" только в сайдбаре
- [ ] Реорганизовать сайдбар (группировка: Аналитика, Управление)

### ✅ ФАЗА 2: Источники Продаж
- [ ] Диагностика AmoCRM подключения
- [ ] Проверка данных в БД (landing_bd, traffic_bd, tripwire_bd)
- [ ] Создать компонент SourcesAnalytics.tsx
- [ ] Реализовать подтягивание данных из AmoCRM + БД
- [ ] Группировка по UTM sources
- [ ] Отображение метрик: лиды, продажи, конверсия

### ✅ ФАЗА 3: Конструктор Команд
- [ ] Упростить форму (одно окно)
- [ ] Добавить автогенерацию пароля
- [ ] Мульти-селект для UTM sources
- [ ] Color picker для команды
- [ ] Сохранение в БД (таблица traffic_teams)

### ✅ ФАЗА 4: API Диагностика
- [ ] Создать компонент APIDiagnostics.tsx
- [ ] Эндпоинты для проверки статусов API
- [ ] Визуализация статусов (зеленый/желтый/красный)
- [ ] Кнопки "Обновить токен", "Проверить соединение"

### ✅ ФАЗА 5: Таргет Dashboard - Воронки
- [ ] Создать FunnelTabs.tsx (переключение между воронками)
- [ ] Создать FunnelDashboardView.tsx (дашборд для одной воронки)
- [ ] Логика определения воронки по UTM/продукту
- [ ] Эндпоинт `/api/analytics/funnel`
- [ ] Отображение метрик для каждой воронки

### ✅ ФАЗА 6: YouTube и TikTok
- [ ] Создать YouTubeAdsService.ts
- [ ] Создать TikTokAdsService.ts
- [ ] OAuth flow для YouTube
- [ ] OAuth flow для TikTok
- [ ] Синхронизация кампаний
- [ ] Получение метрик

### ✅ ФАЗА 7: Настройки Таргетолога
- [ ] Страница `/traffic/settings`
- [ ] Раздел "Мои UTM sources"
- [ ] CRUD для UTM sources
- [ ] Раздел "Рекламные кабинеты"
- [ ] Подключение Facebook/YouTube/TikTok
- [ ] Управление токенами

### ✅ ФАЗА 8: Курсы Валют
- [ ] Создать таблицу exchange_rates
- [ ] Создать ExchangeRateService.ts
- [ ] Cron job для ежедневного обновления
- [ ] Эндпоинт `/api/exchange-rate?date=xxx`
- [ ] Учет курса в расчетах ROAS/ROI

### ✅ ФАЗА 9: Календарь
- [ ] Создать DateRangeCalendar.tsx
- [ ] Пресеты (7d, 14d, 30d, и т.д.)
- [ ] Кастомный диапазон
- [ ] Эндпоинты с параметрами start/end
- [ ] Группировка метрик по дням

### ✅ ФАЗА 10: Расширенные Метрики
- [ ] Создать AdvancedMetricsGrid.tsx
- [ ] Audience Metrics (Reach, Frequency)
- [ ] Engagement Metrics
- [ ] Conversion Funnel Metrics
- [ ] LTV, Payback Period
- [ ] Attribution Metrics

### ✅ ФАЗА 11: БД и API
- [ ] Создать таблицу traffic_teams
- [ ] Создать таблицу ad_accounts
- [ ] Создать таблицу campaigns
- [ ] Создать таблицу daily_metrics
- [ ] Реализовать все эндпоинты из списка

### ✅ ФАЗА 12: Компоненты
- [ ] MultiPlatformSelector.tsx
- [ ] FunnelTabs.tsx
- [ ] DateRangeCalendar.tsx
- [ ] AdvancedMetricsGrid.tsx
- [ ] CampaignTable.tsx
- [ ] AdAccountManager.tsx
- [ ] UTMSourcesManager.tsx
- [ ] DailyChart.tsx

### ✅ ФАЗА 13: Backend
- [ ] Расширить FacebookAdsService.ts
- [ ] Создать YouTubeAdsService.ts
- [ ] Создать TikTokAdsService.ts
- [ ] Создать ExchangeRateService.ts
- [ ] Расширить AnalyticsService.ts
- [ ] Создать UTMTrackerService.ts
- [ ] Настроить Cron Jobs

---

## 🎯 ПРИОРИТЕТЫ

**High Priority** (сделать сначала):
1. ФАЗА 1: Очистка UI
2. ФАЗА 2: Источники Продаж
3. ФАЗА 3: Конструктор Команд
4. ФАЗА 5: Воронки
5. ФАЗА 8: Курсы Валют
6. ФАЗА 9: Календарь

**Medium Priority** (после основного):
7. ФАЗА 4: API Диагностика
8. ФАЗА 7: Настройки Таргетолога
9. ФАЗА 10: Расширенные Метрики

**Low Priority** (когда основное готово):
10. ФАЗА 6: YouTube и TikTok (можно начать только с YouTube)

---

## 📝 ПРИМЕЧАНИЯ

1. **Не рассчитываем сроки** - просто делаем по плану последовательно
2. **Данные хранятся в БД** - все метрики за все даты доступны для любого периода
3. **API передает данные** - Facebook/YouTube/TikTok API для актуальных метрик
4. **AmoCRM - источник продаж** - все продажи идут оттуда с UTM метками
5. **Курс валют посуточно** - каждый день свой курс для корректных расчетов
