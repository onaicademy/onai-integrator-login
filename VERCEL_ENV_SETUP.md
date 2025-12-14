# 🔧 VERCEL ENVIRONMENT VARIABLES SETUP

## ❌ ПРОБЛЕМА
Admin панель `/integrator/admin/leads` не загружает данные.

**Console error:**
```
⚠️ Landing Supabase env vars not found
```

---

## ✅ РЕШЕНИЕ: Добавить env vars в Vercel

### 📝 ПЕРЕМЕННЫЕ ДЛЯ ДОБАВЛЕНИЯ:

```env
VITE_LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
VITE_LANDING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ
```

---

## 🚀 КАК ДОБАВИТЬ (2 способа):

### Способ 1: Vercel Dashboard (РЕКОМЕНДУЕТСЯ)

1. Зайди: https://vercel.com/onaicademy/onai-integrator-login/settings/environment-variables
2. Нажми **"Add New"**
3. Добавь **первую переменную:**
   - Name: `VITE_LANDING_SUPABASE_URL`
   - Value: `https://xikaiavwqinamgolmtcy.supabase.co`
   - Environment: ✅ **Production**
4. Добавь **вторую переменную:**
   - Name: `VITE_LANDING_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ`
   - Environment: ✅ **Production**
5. Нажми **"Redeploy"** latest commit

### Способ 2: Vercel CLI

```bash
vercel env add VITE_LANDING_SUPABASE_URL production
# Paste: https://xikaiavwqinamgolmtcy.supabase.co

vercel env add VITE_LANDING_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ

vercel --prod  # Redeploy
```

---

## ✅ ПРОВЕРКА:

После добавления и redeploy:

1. Открой: https://onai.academy/integrator/admin/leads
2. **Должно показать:**
   - ✅ Всего лидов: >0
   - ✅ Email отправлено: статистика
   - ✅ SMS отправлено: статистика
   - ✅ Таблица с заявками

---

## 🔒 БЕЗОПАСНОСТЬ:

- `ANON_KEY` - публичный ключ (безопасно для frontend)
- Row Level Security (RLS) защищает данные
- Service Key только на backend
