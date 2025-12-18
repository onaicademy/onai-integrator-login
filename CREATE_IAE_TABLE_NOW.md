# 🚨 СРОЧНО СОЗДАТЬ ТАБЛИЦУ IAE_AGENT_REPORTS

**КРИТИЧЕСКИ ВАЖНО!** Без этой таблицы отчеты не сохраняются в БД!

---

## 🔥 БЫСТРЫЙ СПОСОБ (2 минуты):

### 1. Открой Supabase Dashboard:
```
https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/editor
```

### 2. SQL Editor → New Query

### 3. Вставь и запусти этот SQL:

```sql
-- IAE Agent Reports Table
CREATE TABLE IF NOT EXISTS iae_agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  overall_health_score INT,
  amocrm_status JSONB,
  facebook_ads_status JSONB,
  database_status JSONB,
  data_quality JSONB,
  anomalies JSONB[],
  metrics_summary JSONB,
  ai_insights TEXT,
  ai_recommendations TEXT[],
  ai_risks TEXT[],
  telegram_sent BOOLEAN DEFAULT FALSE,
  telegram_sent_at TIMESTAMPTZ,
  telegram_chat_ids INT[],
  telegram_message_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_iae_reports_date ON iae_agent_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_iae_reports_type ON iae_agent_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_iae_reports_status ON iae_agent_reports(status);
CREATE INDEX IF NOT EXISTS idx_iae_reports_created ON iae_agent_reports(created_at DESC);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_iae_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS iae_reports_updated_at ON iae_agent_reports;
CREATE TRIGGER iae_reports_updated_at
  BEFORE UPDATE ON iae_agent_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_iae_updated_at();

-- Verify
SELECT 'Table created successfully!' as result;
```

### 4. Нажми "RUN" (или Ctrl+Enter)

### 5. Проверь что таблица создалась:
```sql
SELECT * FROM iae_agent_reports LIMIT 1;
```

---

## ✅ ПОСЛЕ СОЗДАНИЯ:

### Перезапусти backend:
```bash
ssh root@207.154.231.30
pm2 restart onai-backend
```

### Проверь что сохранение работает:
```bash
curl -X POST https://api.onai.academy/api/iae-agent/trigger \
  -H "Content-Type: application/json" \
  -d '{"sendToTelegram":false}'

# Должно вернуть success с reportId (UUID, не temp-)
```

---

## 🔍 АЛЬТЕРНАТИВА (если Dashboard не работает):

### Через psql (если установлен):
```bash
PGPASSWORD="RM8O6L2XN9XG7HI9" psql \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -p 5432 \
  -U postgres.pjmvxecykysfrzppdcto \
  -d postgres \
  -f backend/database/iae_agent_reports.sql
```

---

## 📊 ЧТО ДАСТ СОЗДАНИЕ ТАБЛИЦЫ:

✅ Все отчеты сохраняются в БД  
✅ История отчетов доступна  
✅ Можно запросить отчеты за любой период  
✅ API `/api/iae-agent/reports` заработает  
✅ Статистика по Health Score за неделю/месяц  
✅ Поиск критических проблем в истории  

---

## 🚨 ПОЧЕМУ ЭТО КРИТИЧНО:

Без таблицы:
- ❌ Отчеты НЕ сохраняются (только отправка в Telegram)
- ❌ Нет истории (не можем посмотреть что было вчера/неделю назад)
- ❌ Нет аналитики по трендам Health Score
- ❌ API endpoints `/api/iae-agent/reports` возвращают ошибку

С таблицей:
- ✅ Каждый отчет сохраняется с полной информацией
- ✅ История за любой период
- ✅ Аналитика трендов
- ✅ ROI calculations по периодам

---

## ⏰ ВРЕМЯ:

**Создание таблицы:** 2 минуты  
**Проверка работы:** 1 минута  
**TOTAL:** 3 минуты

**СДЕЛАЙ СЕЙЧАС, БРАТАН! ЭТО РЕАЛЬНО КРИТИЧНО!** 🔥
