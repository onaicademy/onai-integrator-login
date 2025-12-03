# 🚀 ОБНОВЛЕНИЕ VERCEL ENV (РУЧНАЯ ИНСТРУКЦИЯ)

## ⚠️ КРИТИЧНО: Обновить Tripwire Anon Key в Vercel!

### Шаги:

1. **Зайти на Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Открыть проект `onai-integrator-login`**

3. **Перейти в Settings → Environment Variables**

4. **Найти `VITE_TRIPWIRE_SUPABASE_ANON_KEY`** и удалить старое значение

5. **Добавить новое значение:**
   ```
   Key: VITE_TRIPWIRE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTUzMDgsImV4cCI6MjA4MDM3MTMwOH0.LN6aLfPA25cwevm-kQ6KttxRjhnTfA2QfiGtPWDWlBI
   Environments: Production, Preview, Development
   ```

6. **Save**

7. **Перейти в Deployments**

8. **Найти последний деплой → ... (три точки) → Redeploy**

9. **✅ Use existing Build Cache: NO**

10. **Redeploy** и подождать 2-3 минуты

---

## Альтернатива (через CLI):

Если есть доступ к Vercel CLI:

```bash
cd /Users/miso/onai-integrator-login

# Удаляем старый
vercel env rm VITE_TRIPWIRE_SUPABASE_ANON_KEY production

# Добавляем новый
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTUzMDgsImV4cCI6MjA4MDM3MTMwOH0.LN6aLfPA25cwevm-kQ6KttxRjhnTfA2QfiGtPWDWlBI" | vercel env add VITE_TRIPWIRE_SUPABASE_ANON_KEY production

# Триггерим redeploy
git commit --allow-empty -m "trigger redeploy" && git push
```

---

**После обновления env vars сообщи мне, я протестирую создание студента!** ✅

