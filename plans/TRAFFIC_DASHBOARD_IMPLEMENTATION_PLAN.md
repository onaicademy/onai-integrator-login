# Traffic Dashboard - План реализации

## 📋 Требования пользователя (подтверждено)

1. **UTM-метки существующих команд** - ✅ Сохранить UTM-метки перед удалением
2. **Facebook Ads** - ✅ Есть Facebook App ID и Secret для OAuth
3. **AmoCRM** - ✅ Все поля (lead_id, amount, utm_*, contact_*)
4. **Отчеты** - ✅ Daily (ежедневные)
5. **Уведомления** - ✅ Email и Telegram
6. **ROI Calculation** - ✅ (Revenue - Spend) / Spend * 100
7. **Currency** - ✅ Обе валюты (KZT и USD)
8. **Timezone** - ✅ Asia/Almaty

---

## 🚀 Phase 1: Критические исправления (СРОЧНО)

### 1.1 Fix AuthManager Import

**Проблема:** `AuthManager` не импортирован в `TrafficTeamConstructor.tsx`

**Решение:**
```typescript
// Добавить импорт в начало файла
import { AuthManager } from '@/lib/auth';
```

**Файл:** `src/pages/traffic/TrafficTeamConstructor.tsx`

---

### 1.2 Очистка существующих команд с сохранением UTM-меток

**Проблема:** 4 команды (Arystan, Kenesary, Muha, Traf4) нужно удалить, но сохранить UTM-метки

**Решение:** Создать SQL скрипт для миграции UTM-меток

```sql
-- Шаг 1: Создать временную таблицу для сохранения UTM-меток
CREATE TEMP TABLE temp_utm_backup AS
SELECT 
  id,
  name,
  company,
  direction,
  fb_ad_account_id,
  color,
  emoji,
  created_at,
  updated_at
FROM traffic_teams;

-- Шаг 2: Удалить все команды
DELETE FROM traffic_teams;

-- Шаг 3: Удалить пользователей этих команд
DELETE FROM traffic_users
WHERE team_name IN ('Arystan', 'Kenesary', 'Muha', 'Traf4');

-- Шаг 4: Удалить настройки пользователей
DELETE FROM traffic_targetologist_settings
WHERE user_id IN (
  SELECT id FROM traffic_users
  WHERE team_name IN ('Arystan', 'Kenesary', 'Muha', 'Traf4')
);

-- Шаг 5: Сбросить sequence для автоинкремента
ALTER SEQUENCE traffic_teams_id_seq RESTART WITH 1;
```

**Файл:** `sql/CLEAR_OLD_TEAMS_WITH_UTM_BACKUP.sql`

---

### 1.3 Создать отсутствующие таблицы

**Проблема:** Таблицы `sales_activity_log`, `lead_tracking` отсутствуют

**Решение:** Создать SQL миграцию

```sql
-- sales_activity_log - Лог активности продаж
CREATE TABLE IF NOT EXISTS sales_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES all_sales_tracking(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'attributed', 'deleted')),
  team_name TEXT,
  user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_sales_activity_log_sale_id ON sales_activity_log(sale_id);
CREATE INDEX idx_sales_activity_log_team_name ON sales_activity_log(team_name);
CREATE INDEX idx_sales_activity_log_created_at ON sales_activity_log(created_at DESC);

-- lead_tracking - Трекинг лидов по UTM
CREATE TABLE IF NOT EXISTS lead_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES landing_leads(id) ON DELETE CASCADE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  team_name TEXT,
  attributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_lead_tracking_lead_id ON lead_tracking(lead_id);
CREATE INDEX idx_lead_tracking_utm_source ON lead_tracking(utm_source);
CREATE INDEX idx_lead_tracking_team_name ON lead_tracking(team_name);
CREATE INDEX idx_lead_tracking_created_at ON lead_tracking(created_at DESC);

-- RLS Policies
ALTER TABLE sales_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all activity logs" ON sales_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE lead_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all lead tracking" ON lead_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Файл:** `sql/CREATE_MISSING_TABLES.sql`

---

### 1.4 Fix JWT Token Issue

**Проблема:** JWT token malformed при создании команд

**Исследование:**
- Проверить формат токена в localStorage
- Проверить middleware `authenticateToken` в backend
- Проверить как токен передается в Authorization header

**Возможные решения:**
1. Проверить, что токен сохраняется в правильном формате
2. Проверить, что токен передается с префиксом `Bearer `
3. Проверить, что токен не истек
4. Добавить логирование для отладки

**Файлы:**
- `backend/src/middleware/auth.ts`
- `src/lib/auth.ts`
- `src/pages/traffic/TrafficTeamConstructor.tsx`

---

## 🔄 Phase 2: UTM-атрибуция и AmoCRM

### 2.1 Sales Aggregator

**Цель:** Агрегировать данные из `express_course_sales` и `main_product_sales` в `all_sales_tracking`

**Backend Endpoint:**
```typescript
// POST /api/traffic-admin/sales/aggregate
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Логика:**
1. Получить все записи из `express_course_sales`
2. Получить все записи из `main_product_sales`
3. Объединить данные в `all_sales_tracking`
4. Добавить UTM-метки из `landing_leads` по `amocrm_contact_id`
5. Рассчитать конверсию в USD по курсу из `exchange_rates`

**Файл:** `backend/src/routes/traffic-sales-aggregator.ts`

---

### 2.2 UTM Attribution Engine

**Цель:** Сопоставить `utm_source` с командами

**Формат UTM:**
- `fb_teamname` → команда `teamname`
- Пример: `fb_kenesary` → команда `Kenesary`

**Логика:**
1. Извлечь `utm_source` из `all_sales_tracking`
2. Проверить формат: начинается с `fb_`
3. Извлечь имя команды: `utm_source.substring(3)`
4. Найти команду в `traffic_teams` по имени
5. Обновить поле `team` в `traffic_stats`

**Backend Endpoint:**
```typescript
// POST /api/traffic-admin/attribution/run
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Файл:** `backend/src/routes/traffic-attribution.ts`

---

### 2.3 Traffic Stats Calculator

**Цель:** Рассчитать метрики для `traffic_stats`

**Формулы:**
- **Revenue** = Sum(amount) из `all_sales_tracking`
- **Spend** = Sum(spend_usd) из Facebook Ads API
- **ROI** = (Revenue - Spend) / Spend * 100
- **CPA** = Spend / Sales
- **ROAS** = Revenue / Spend

**Логика:**
1. Агрегировать данные по дням и командам
2. Рассчитать все метрики
3. Обновить `traffic_stats`
4. Использовать timezone Asia/Almaty

**Backend Endpoint:**
```typescript
// POST /api/traffic-admin/stats/calculate
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Файл:** `backend/src/routes/traffic-stats-calculator.ts`

---

## 📱 Phase 3: Facebook Ads Integration

### 3.1 Facebook OAuth Handler

**Цель:** OAuth flow для подключения аккаунта

**Backend Endpoints:**
```typescript
// GET /api/traffic-admin/facebook/oauth-url
Response: {
  "oauthUrl": "https://www.facebook.com/v18.0/dialog/oauth?..."
}

// GET /api/traffic-admin/facebook/callback?code=...
Response: {
  "accessToken": "EAABwz...",
  "expiresIn": 5184000
}

// POST /api/traffic-admin/facebook/disconnect
Response: {
  "success": true
}
```

**Логика:**
1. Генерировать OAuth URL с Facebook App ID
2. Обрабатывать callback с authorization code
3. Обменивать code на access token
4. Сохранить токен в `traffic_targetologist_settings.fb_access_token`
5. Хранить `expires_at` для автоматического обновления

**Файл:** `backend/src/routes/traffic-facebook-oauth.ts`

---

### 3.2 Ad Account Fetcher

**Цель:** Получить список рекламных аккаунтов

**Backend Endpoint:**
```typescript
// GET /api/traffic-admin/facebook/ad-accounts
Response: {
  "accounts": [
    {
      "id": "act_123456789",
      "name": "My Ad Account",
      "account_status": "ACTIVE",
      "currency": "USD"
    }
  ]
}
```

**Логика:**
1. Использовать Facebook Marketing API
2. Получить все ad accounts пользователя
3. Отфильтровать только активные
4. Вернуть список

**Файл:** `backend/src/routes/traffic-facebook-accounts.ts`

---

### 3.3 Campaign Stats Sync

**Цель:** Синхронизировать статистику кампаний

**Backend Endpoint:**
```typescript
// POST /api/traffic-admin/facebook/sync-stats
Body: {
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "adAccountIds": ["act_123456789"]
}
Response: {
  "synced": 150,
  "failed": 0
}
```

**Логика:**
1. Получить статистику кампаний за период
2. Агрегировать по дням и кампаниям
3. Записать в `traffic_stats`
4. Атрибутовать по UTM source

**Поля из Facebook API:**
- `impressions`
- `clicks`
- `spend`
- `campaign_id`
- `campaign_name`
- `ad_account_id`

**Файл:** `backend/src/routes/traffic-facebook-sync.ts`

---

## 📊 Phase 4: UI Components

### 4.1 Main Dashboard

**Цель:** Агрегированная аналитика по всем командам

**Компонент:** `src/pages/traffic/TrafficMainDashboard.tsx`

**Структура:**
```tsx
<div className="dashboard-container">
  {/* Overview Cards */}
  <div className="overview-cards">
    <MetricCard title="Total Revenue" value="$125,000" currency="USD" />
    <MetricCard title="Total Spend" value="$45,000" currency="USD" />
    <MetricCard title="Total ROI" value="178%" />
    <MetricCard title="Total Sales" value="178" />
  </div>

  {/* Team Comparison */}
  <div className="team-comparison">
    <TeamTable teams={teams} />
  </div>

  {/* Sales Funnel */}
  <div className="sales-funnel">
    <FunnelChart data={funnelData} />
  </div>

  {/* ROI Analysis */}
  <div className="roi-analysis">
    <ROIHeatmap data={roiData} />
  </div>

  {/* Time Series Charts */}
  <div className="time-series">
    <LineChart data={revenueOverTime} title="Revenue Over Time" />
    <LineChart data={spendOverTime} title="Spend Over Time" />
    <LineChart data={roiOverTime} title="ROI Over Time" />
  </div>
</div>
```

**Файл:** `src/pages/traffic/TrafficMainDashboard.tsx`

---

### 4.2 Settings Panel

**Цель:** Управление настройками таргетолога

**Компонент:** `src/pages/traffic/TrafficSettings.tsx`

**Структура:**
```tsx
<div className="settings-container">
  {/* Facebook Integration */}
  <Section title="Facebook Integration">
    <ConnectFacebookButton />
    <AdAccountsList accounts={adAccounts} />
    <TrackedCampaigns campaigns={campaigns} />
  </Section>

  {/* UTM Settings */}
  <Section title="UTM Settings">
    <Input label="UTM Source" value={utmSource} />
    <Input label="UTM Medium" value={utmMedium} />
    <UTMTemplates templates={utmTemplates} />
  </Section>

  {/* Notifications */}
  <Section title="Notifications">
    <Input label="Email" value={email} />
    <Input label="Telegram Chat ID" value={telegram} />
    <Select label="Report Frequency" value={frequency} />
  </Section>

  {/* Team Management */}
  <Section title="Team Management">
    <Input label="Team Name" value={teamName} />
    <ColorPicker value={color} />
    <EmojiPicker value={emoji} />
  </Section>
</div>
```

**Файл:** `src/pages/traffic/TrafficSettings.tsx`

---

### 4.3 Collapsible Site Bar

**Цель:** Сворачиваемый site bar с Admin Panel в меню

**Компонент:** `src/components/traffic/TrafficSidebar.tsx`

**Структура:**
```tsx
<div className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
  {/* Toggle Button */}
  <button onClick={toggleSidebar}>
    {isCollapsed ? <MenuIcon /> : <XIcon />}
  </button>

  {/* Logo */}
  {isCollapsed ? <SmallLogo /> : <FullLogo />}

  {/* Navigation */}
  <nav>
    <NavItem icon={DashboardIcon} label="Dashboard" to="/traffic/dashboard" />
    <NavItem icon={AnalyticsIcon} label="Analytics" to="/traffic/analytics" />
    <NavItem icon={SettingsIcon} label="Settings" to="/traffic/settings" />
  </nav>

  {/* Admin Panel Link (только для admin) */}
  {user?.role === 'admin' && (
    <nav className="admin-nav">
      <NavItem icon={AdminIcon} label="Admin Panel" to="/traffic/admin" />
      <NavItem icon={TeamIcon} label="Team Constructor" to="/traffic/team-constructor" />
    </nav>
  )}

  {/* Logout */}
  <button onClick={handleLogout}>
    <LogoutIcon />
    {isCollapsed || <span>Logout</span>}
  </button>
</div>
```

**Файл:** `src/components/traffic/TrafficSidebar.tsx`

---

## 🔒 Phase 5: Безопасность

### 5.1 Refresh Token Rotation

**Цель:** Автоматическое обновление токенов

**Логика:**
1. Проверить `expires_at` токена перед каждым запросом
2. Если токен истекает в течение 5 минут, обновить его
3. Использовать `refresh_token` для получения нового `access_token`
4. Обновить токены в localStorage

**Файл:** `src/lib/auth.ts`

---

### 5.2 RBAC (Role-Based Access Control)

**Цель:** Контроль доступа на основе ролей

**Роли:**
- `admin` - полный доступ ко всем функциям
- `targetologist` - доступ только к своей команде

**Middleware:**
```typescript
function requireRole(role: 'admin' | 'targetologist') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

**Файл:** `backend/src/middleware/rbac.ts`

---

### 5.3 Rate Limiting

**Цель:** Защита от DDoS и abuse

**Лимиты:**
- 100 запросов в минуту для аутентифицированных пользователей
- 10 запросов в минуту для неаутентифицированных

**Файл:** `backend/src/middleware/rateLimiter.ts`

---

### 5.4 CORS Headers

**Цель:** Настроить CORS для production

**Headers:**
```typescript
app.use(cors({
  origin: ['https://traffic.onai.academy', 'https://onai.academy'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Файл:** `backend/src/server.ts`

---

### 5.5 Input Validation

**Цель:** Валидация входных данных

**Библиотека:** `zod`

**Пример:**
```typescript
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  direction: z.enum(['flagman', 'express', 'tripwire', 'new_direction']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  emoji: z.string().emoji()
});
```

**Файл:** `backend/src/middleware/validation.ts`

---

### 5.6 Audit Logging

**Цель:** Логировать все действия пользователей

**Таблица:** `audit_log`

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Файл:** `sql/CREATE_AUDIT_LOG.sql`

---

## 📋 Порядок реализации

### Приоритет 1 (СРОЧНО):
1. ✅ Fix AuthManager Import
2. ✅ Очистка существующих команд
3. ✅ Создать отсутствующие таблицы
4. ✅ Fix JWT Token Issue

### Приоритет 2 (ВАЖНО):
5. Sales Aggregator
6. UTM Attribution Engine
7. Traffic Stats Calculator

### Приоритет 3 (ЖЕЛАТЕЛЬНО):
8. Facebook OAuth Handler
9. Ad Account Fetcher
10. Campaign Stats Sync

### Приоритет 4 (ПОЛЕЗНО):
11. Main Dashboard
12. Settings Panel
13. Collapsible Site Bar

### Приоритет 5 (ОПЦИОНАЛЬНО):
14. Refresh Token Rotation
15. RBAC
16. Rate Limiting
17. CORS Headers
18. Input Validation
19. Audit Logging

---

## 🎨 Дизайн-система

### Цветовая палитра:
```css
--primary: #00FF88;
--secondary: #3B82F6;
--accent: #F59E0B;
--danger: #EF4444;
--success: #10B981;
--background: #000000;
--surface: rgba(0, 0, 0, 0.4);
--surface-hover: rgba(0, 0, 0, 0.6);
--border: rgba(0, 255, 136, 0.1);
--text-primary: #FFFFFF;
--text-secondary: #9CA3AF;
```

### Шрифты:
```css
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Компоненты:
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
}

.button-primary {
  background: var(--primary);
  color: #000000;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.button-primary:hover {
  background: rgba(0, 255, 136, 0.9);
}

.input {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 136, 0.2);
  color: #FFFFFF;
  border-radius: 0.375rem;
}
```

---

## ✅ Checklist для каждой задачи

### Frontend:
- [ ] Создать компонент
- [ ] Добавить стили
- [ ] Добавить типы TypeScript
- [ ] Добавить обработку ошибок
- [ ] Добавить loading states
- [ ] Добавить тесты

### Backend:
- [ ] Создать endpoint
- [ ] Добавить валидацию
- [ ] Добавить обработку ошибок
- [ ] Добавить логирование
- [ ] Добавить тесты
- [ ] Обновить документацию API

### Database:
- [ ] Создать SQL миграцию
- [ ] Добавить индексы
- [ ] Добавить RLS policies
- [ ] Тестировать на development
- [ ] Применить на production
- [ ] Верифицировать данные

---

## 🚀 Deployment

### Development:
```bash
# Frontend
npm run dev

# Backend
npm run dev

# Database
npm run db:migrate
npm run db:seed
```

### Production:
```bash
# Build frontend
npm run build

# Build backend
npm run build:backend

# Deploy
./scripts/deploy-traffic-dashboard.sh
```

---

## 📞 Поддержка

### Логи:
- Frontend: Browser Console
- Backend: `pm2 logs onai-backend`
- Database: Supabase Dashboard

### Мониторинг:
- Uptime: UptimeRobot
- Errors: Sentry
- Performance: Lighthouse

---

## 📝 Notes

1. **Timezone:** Все даты в Asia/Almaty (UTC+5)
2. **Currency:** Отображать в обеих валютах (KZT и USD)
3. **ROI Formula:** (Revenue - Spend) / Spend * 100
4. **Reports:** Ежедневные (daily)
5. **Notifications:** Email и Telegram
6. **UTM Format:** `fb_teamname` → команда `teamname`
7. **Facebook:** Есть App ID и Secret
8. **AmoCRM:** Все поля (lead_id, amount, utm_*, contact_*)

---

## 🎯 Следующие шаги

1. Согласовать этот план с пользователем
2. Начать с Phase 1 (критические исправления)
3. Продолжить с Phase 2 (UTM-атрибуция)
4. Завершить с Phase 3-5 (Facebook, UI, Security)
