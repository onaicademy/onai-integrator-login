# 🚀 Landing Page Database Setup

## 📋 Новая База Данных Supabase

**Project URL:** `https://xikaiavwqinamgolmtcy.supabase.co`

---

## 🔐 API Keys (Добавить в `.env` файлы)

### Backend `.env` (ВСЕ ключи)

```bash
# ============================================
# LANDING PAGE DATABASE (New Supabase Project)
# ============================================

LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co

# ⚠️ BACKEND ONLY - Service Role (NEVER expose to frontend!)
LANDING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA

# ✅ Frontend-safe Anon Key
LANDING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ
```

### Frontend `.env` (ТОЛЬКО Anon Key)

```bash
# Landing Page Database (Public Key - Safe for Frontend)
VITE_LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
VITE_LANDING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ
```

---

## 🗃️ Database Schema

### Table: `landing_leads`

Хранит заявки с лендинга `/twland`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | UUID | Primary key |
| `email` | TEXT | Email пользователя (required) |
| `name` | TEXT | Имя пользователя (required) |
| `phone` | TEXT | Номер телефона (required) |
| `source` | TEXT | Источник (default: 'twland') |
| `amocrm_lead_id` | TEXT | ID сделки в AmoCRM |
| `amocrm_synced` | BOOLEAN | Синхронизировано ли с AmoCRM |
| `metadata` | JSONB | Доп. данные (UTM, устройство) |
| `created_at` | TIMESTAMP | Дата создания |
| `updated_at` | TIMESTAMP | Дата обновления |

---

## 🔧 Применить миграцию

### Вариант 1: Через Supabase Dashboard

1. Открой https://xikaiavwqinamgolmtcy.supabase.co
2. Перейди в **SQL Editor**
3. Скопируй содержимое файла `supabase/migrations/20250108_create_landing_leads.sql`
4. Выполни SQL

### Вариант 2: Через CLI (если настроен)

```bash
cd backend
supabase db push
```

---

## 📡 API Endpoints

### POST `/api/landing/submit`

Отправка заявки с лендинга

**Request:**
```json
{
  "email": "user@example.com",
  "name": "Иван Иванов",
  "phone": "+77001234567"
}
```

**Response:**
```json
{
  "success": true,
  "leadId": "uuid",
  "amocrmLeadId": "12345"
}
```

---

## 🔗 AmoCRM Integration

### Настройка AmoCRM

1. Зайди в AmoCRM: Settings → Integrations → API
2. Создай интеграцию
3. Получи `CLIENT_ID` и `CLIENT_SECRET`
4. Добавь в `.env`:

```bash
AMOCRM_DOMAIN=yourdomain.amocrm.ru
AMOCRM_CLIENT_ID=your-client-id
AMOCRM_CLIENT_SECRET=your-client-secret
AMOCRM_ACCESS_TOKEN=your-access-token
AMOCRM_REFRESH_TOKEN=your-refresh-token
AMOCRM_PIPELINE_ID=your-pipeline-id
AMOCRM_STATUS_ID=your-status-id
```

---

## 🔒 Security

✅ **Service Role Key** - ТОЛЬКО на backend  
✅ **Anon Key** - можно на frontend (публичный)  
✅ **RLS включен** - anon может только INSERT  
✅ **AmoCRM токены** - ТОЛЬКО на backend  

---

## 📊 Monitoring

Проверить заявки:

```sql
SELECT * FROM landing_leads 
ORDER BY created_at DESC 
LIMIT 10;
```

Статистика по синхронизации с AmoCRM:

```sql
SELECT 
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE amocrm_synced = true) as synced,
  COUNT(*) FILTER (WHERE amocrm_synced = false) as pending
FROM landing_leads;
```
