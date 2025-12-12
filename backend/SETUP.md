# 🔧 Backend Setup Guide

## ⚠️ ВАЖНО: Настройка окружения

### Шаг 1: Создайте файл с переменными окружения

Скопируйте `backend/env.env` в безопасное место (НЕ в git!) и убедитесь что у вас есть все необходимые ключи:

```bash
cd backend
cp .env.example env.env
# Или на Windows:
# copy .env.example env.env
```

### Шаг 2: Заполните все секретные ключи

Откройте `backend/env.env` и замените все `your_*` плейсхолдеры на реальные значения:

#### 🔐 Критические ключи (получите из дашбордов):
- `SUPABASE_SERVICE_ROLE_KEY` - из Supabase Main Dashboard
- `TRIPWIRE_SERVICE_ROLE_KEY` - из Supabase Tripwire Dashboard  
- `OPENAI_API_KEY` - из OpenAI Platform
- `BUNNY_STREAM_API_KEY` - из Bunny.net Dashboard
- `AMOCRM_ACCESS_TOKEN` - из AmoCRM интеграции

#### 📧 SMTP настройки:
- `SMTP_USER` - ваш email
- `SMTP_PASS` - пароль приложения Gmail (НЕ обычный пароль!)

### Шаг 3: Проверка безопасности

✅ Убедитесь что `backend/env.env` в `.gitignore`  
✅ Никогда не коммитьте файлы с секретами в git  
✅ Используйте переменные окружения в CI/CD

## 🚀 Запуск

```bash
cd backend
npm install
npm run dev
```

Backend будет доступен на `http://localhost:3000`

## 🔥 Production Deployment

Для продакшена используйте переменные окружения вашего хостинга:
- Vercel: Project Settings → Environment Variables
- Railway/Render: Dashboard → Environment
- Docker: Используйте `.env` файлы вне образа

## 📚 Дополнительно

Если нужна помощь с получением API ключей:
- Supabase: https://supabase.com/dashboard
- OpenAI: https://platform.openai.com/api-keys
- Bunny.net: https://panel.bunny.net/stream
- AmoCRM: Настройки → Интеграции → API
