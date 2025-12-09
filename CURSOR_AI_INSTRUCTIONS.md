# 🤖 ИНСТРУКЦИЯ ДЛЯ AI АССИСТЕНТА (CURSOR)

## 🎯 ЗАДАЧА: Настроить ENV файлы для фронтенда

Когда тебе нужно настроить ENV переменные для фронтенда, следуй этому протоколу:

---

## 📋 ПРОТОКОЛ ДЕЙСТВИЙ

### ШАГ 1: Прочитай Backend ENV
```
Read file: /Users/miso/onai-integrator-login/backend/.env
```

### ШАГ 2: Извлеки переменные

Найди в `backend/.env` следующие переменные и запомни их значения:

```bash
# Main Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...

# Tripwire Supabase
TRIPWIRE_SUPABASE_URL=https://...
TRIPWIRE_SUPABASE_ANON_KEY=eyJ...

# Bunny CDN
BUNNY_VIDEO_LIBRARY_ID=...
BUNNY_PULL_ZONE=...
BUNNY_CDN_HOSTNAME=...
```

### ШАГ 3: Создай Frontend ENV

**Важно:** Добавь префикс `VITE_` ко всем переменным!

Создай файл `/Users/miso/onai-integrator-login/.env` с содержимым:

```bash
# ==============================================
# 🌍 SUPABASE MAIN
# ==============================================
VITE_SUPABASE_URL=[значение из SUPABASE_URL]
VITE_SUPABASE_ANON_KEY=[значение из SUPABASE_ANON_KEY]

# ==============================================
# 🔥 SUPABASE TRIPWIRE
# ==============================================
VITE_TRIPWIRE_SUPABASE_URL=[значение из TRIPWIRE_SUPABASE_URL]
VITE_TRIPWIRE_SUPABASE_ANON_KEY=[значение из TRIPWIRE_SUPABASE_ANON_KEY]

# ==============================================
# 🚀 BACKEND API
# ==============================================
VITE_API_URL=https://api.onai.academy

# ==============================================
# 📹 BUNNY CDN
# ==============================================
VITE_BUNNY_VIDEO_LIBRARY_ID=[значение из BUNNY_VIDEO_LIBRARY_ID]
VITE_BUNNY_PULL_ZONE=[значение из BUNNY_PULL_ZONE]
VITE_BUNNY_CDN_HOSTNAME=[значение из BUNNY_CDN_HOSTNAME]
```

### ШАГ 4: Создай Local Development ENV

Создай файл `/Users/miso/onai-integrator-login/.env.local`:

```bash
VITE_API_URL=http://localhost:3000
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО

### ✅ МОЖНО копировать в frontend:
- `SUPABASE_URL` → `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` → `VITE_SUPABASE_ANON_KEY`
- `TRIPWIRE_SUPABASE_URL` → `VITE_TRIPWIRE_SUPABASE_URL`
- `TRIPWIRE_SUPABASE_ANON_KEY` → `VITE_TRIPWIRE_SUPABASE_ANON_KEY`
- `BUNNY_*` (публичные переменные)

### ❌ НЕЛЬЗЯ копировать в frontend:
- `SUPABASE_SERVICE_ROLE_KEY` ❌ (секретный!)
- `TRIPWIRE_SERVICE_ROLE_KEY` ❌ (секретный!)
- `OPENAI_API_KEY` ❌ (секретный!)
- `AMOCRM_API_KEY` ❌ (секретный!)
- `TELEGRAM_BOT_TOKEN` ❌ (секретный!)
- `BUNNY_API_KEY` ❌ (секретный!)

**Почему нельзя?** 
Frontend код выполняется в браузере пользователя. Если там будут секретные ключи - любой пользователь сможет их украсть через DevTools!

---

## 🔄 МАППИНГ ПЕРЕМЕННЫХ

| Backend ENV | Frontend ENV | Описание |
|-------------|--------------|----------|
| `SUPABASE_URL` | `VITE_SUPABASE_URL` | Main Supabase project |
| `SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` | Публичный ключ Main |
| `TRIPWIRE_SUPABASE_URL` | `VITE_TRIPWIRE_SUPABASE_URL` | Tripwire Supabase project |
| `TRIPWIRE_SUPABASE_ANON_KEY` | `VITE_TRIPWIRE_SUPABASE_ANON_KEY` | Публичный ключ Tripwire |
| `BUNNY_VIDEO_LIBRARY_ID` | `VITE_BUNNY_VIDEO_LIBRARY_ID` | ID библиотеки Bunny |
| `BUNNY_PULL_ZONE` | `VITE_BUNNY_PULL_ZONE` | Pull zone для видео |
| `BUNNY_CDN_HOSTNAME` | `VITE_BUNNY_CDN_HOSTNAME` | CDN hostname |

---

## 🧪 ПРОВЕРКА

После создания файлов, проверь:

```bash
# 1. Файлы созданы
ls -la /Users/miso/onai-integrator-login/.env
ls -la /Users/miso/onai-integrator-login/.env.local

# 2. Frontend запускается
cd /Users/miso/onai-integrator-login
npm run dev

# 3. Переменные доступны (в консоли браузера)
console.log(import.meta.env.VITE_SUPABASE_URL)
```

---

## 💡 ПРИМЕР КОМАНДЫ ДЛЯ AI

```
@ENV_SETUP_GUIDE.md 

Настрой ENV файлы для фронтенда:
1. Прочитай backend/.env
2. Скопируй нужные ключи в .env с префиксом VITE_
3. Создай .env.local для local development
4. Проверь что все переменные на месте
```

---

## 🚨 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

1. **Проблема:** Переменные undefined
   **Решение:** Проверь префикс `VITE_`, перезапусти dev server

2. **Проблема:** Supabase auth не работает
   **Решение:** Проверь что скопировал ANON_KEY (не SERVICE_ROLE_KEY!)

3. **Проблема:** Backend не отвечает
   **Решение:** Проверь VITE_API_URL (должен быть localhost:3000 для dev)

---

**Создано:** 8 декабря 2025  
**Для:** AI ассистентов (Cursor, GitHub Copilot, и т.д.)
