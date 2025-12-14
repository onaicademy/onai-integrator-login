# 🚨 MANUAL MIGRATION REQUIRED

## Проблема
Таблица `landing_leads` должна быть создана в базе `xikaiavwqinamgolmtcy.supabase.co`, но автоматическое применение миграции не работает через REST API.

## Решение: Применить миграцию через Supabase Dashboard

### Шаг 1: Открой Supabase Dashboard
1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy
2. Залогинься если нужно

### Шаг 2: Открой SQL Editor
1. В левом меню выбери **SQL Editor**
2. Нажми **New Query**

### Шаг 3: Скопируй и выполни SQL
Скопируй весь код ниже и вставь в SQL Editor, потом нажми **RUN**:

\`\`\`sql
-- Create landing_leads table
CREATE TABLE IF NOT EXISTS public.landing_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'twland',
  amocrm_lead_id TEXT,
  amocrm_synced BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS landing_leads_email_idx ON public.landing_leads(email);
CREATE INDEX IF NOT EXISTS landing_leads_created_at_idx ON public.landing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS landing_leads_amocrm_synced_idx ON public.landing_leads(amocrm_synced);

-- Enable RLS
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landing_leads' AND policyname = 'Service role has full access to landing_leads') THEN
    CREATE POLICY "Service role has full access to landing_leads"
      ON public.landing_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landing_leads' AND policyname = 'Allow anon to insert landing_leads') THEN
    CREATE POLICY "Allow anon to insert landing_leads"
      ON public.landing_leads FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.update_landing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_landing_leads_updated_at ON public.landing_leads;
CREATE TRIGGER update_landing_leads_updated_at
  BEFORE UPDATE ON public.landing_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_landing_leads_updated_at();
\`\`\`

### Шаг 4: Проверь
После выполнения должно появиться сообщение: **Success. No rows returned**

### Шаг 5: Проверь таблицу
1. В левом меню выбери **Table Editor**
2. Найди таблицу `landing_leads`
3. Должна появиться с колонками: id, email, name, phone, source, amocrm_lead_id, amocrm_synced, metadata, created_at, updated_at

## После этого:
```bash
# Перезапусти backend
cd /Users/miso/onai-integrator-login/backend
npm run dev

# Протестируй
curl -X POST http://localhost:3000/api/landing/submit \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","phone":"+77001234567"}'
```

Должно вернуть: `{"success":true,"leadId":"...","amocrmLeadId":null}`
