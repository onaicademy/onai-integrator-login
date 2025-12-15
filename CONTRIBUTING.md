# 🤝 CONTRIBUTING GUIDE

Краткое руководство для разработчиков и AI-ассистентов

---

## 🚀 БЫСТРЫЙ СТАРТ

### Локальная разработка

```bash
# 1. Клонировать проект
git clone <repo-url>
cd onai-integrator-login

# 2. Установить зависимости
npm install
cd backend && npm install && cd ..

# 3. Настроить .env
cp .env.example .env.local
# Заполнить переменные: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 4. Запустить frontend (терминал 1)
npm run dev
# → http://localhost:5173

# 5. Запустить backend (терминал 2)
cd backend
npm run dev
# → http://localhost:3001
```

---

## 📁 СТРУКТУРА ПРОЕКТА

```
onai-integrator-login/
├── src/                    # Frontend (React + TypeScript)
│   ├── pages/              # Страницы
│   ├── components/         # Компоненты
│   └── lib/                # Утилиты
├── backend/                # Backend (Node.js + Express)
│   └── src/
│       ├── routes/         # API endpoints
│       ├── services/       # Бизнес-логика
│       ├── middleware/     # Express middleware
│       └── utils/          # Утилиты
└── supabase/               # Database
    └── migrations/         # SQL миграции
```

**Подробнее:** [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)

---

## 🎯 ПРАВИЛА РАЗРАБОТКИ

### Code Style

```typescript
// ✅ Хорошо
import { logger } from '@/utils/logger';

const userName = 'John';
const MAX_RETRIES = 3;

async function getUserById(id: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      logger.error('Database error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Failed to get user:', error);
    throw error;
  }
}

// ❌ Плохо
const user_name = 'John';  // snake_case
function getuser(id) {     // без типов
  const data = await supabase.from('users').select('*');
  return data;  // без обработки ошибок
}
```

### Logging

```typescript
// ✅ Используй logger (не console.log!)
import { logger } from '@/utils/logger';

logger.debug('Детали для отладки');
logger.info('Общая информация');
logger.warn('Предупреждение');
logger.error('Ошибка');

// ❌ НЕ используй console.log в production
console.log('User:', user);  // Спамит логи!
```

### Обработка ошибок

```typescript
// ✅ Хорошо
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  // Sentry автоматически залогирует критичные ошибки
  throw error;
}

// ❌ Плохо
await riskyOperation();  // Без try/catch
```

### Database Queries

```typescript
// ✅ Хорошо - всегда проверяй error
const { data, error } = await supabase
  .from('users')
  .select('*');

if (error) {
  logger.error('DB error:', error);
  throw error;
}

// ❌ Плохо - игнорирование ошибок
const { data } = await supabase.from('users').select('*');
// Что если error?
```

---

## 🔐 БЕЗОПАСНОСТЬ

### Backend Routes

```typescript
import { requireAuth, requireAdmin } from '@/middleware/authMiddleware';

// ✅ Защищённый роут
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  // Только админы
});

// ❌ Незащищённый роут
app.get('/api/admin/users', async (req, res) => {
  // Любой получит доступ!
});
```

### Environment Variables

```bash
# ✅ Хорошо - в .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=secret_key

# ❌ ПЛОХО - в коде!
const apiKey = 'sk-1234567890';  // НИКОГДА ТАК НЕ ДЕЛАЙ!
```

---

## 🚀 ДЕПЛОЙ

### Перед деплоем

```bash
# 1. Убедись что код компилируется
npm run build                    # Frontend
cd backend && npx tsc --skipLibCheck  # Backend

# 2. Проверь что нет ошибок
npm run lint  # (если настроен)

# 3. Протестируй локально
npm run dev
```

### Деплой на production

```powershell
# Используй готовый скрипт
.\deploy-now.ps1
```

**Или вручную:**
```bash
# Собрать
npm run build
cd backend && npx tsc --skipLibCheck

# Задеплоить
rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
  dist/ \
  root@207.154.231.30:/var/www/onai-integrator-login-main/

rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
  backend/dist/ \
  root@207.154.231.30:/var/www/onai-integrator-login-main/backend/

# Перезапустить
ssh -i ~/.ssh/id_rsa root@207.154.231.30 'pm2 restart onai-backend'
```

### Миграции БД

```bash
# Открыть Supabase Dashboard SQL Editor
# https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Скопировать SQL из:
# supabase/migrations/YYYYMMDD_название.sql

# Выполнить в SQL Editor
```

**ВАЖНО:** Миграции применяются ВРУЧНУЮ (не через CLI)

---

## 📝 GIT WORKFLOW

### Коммиты

```bash
# ✅ Хорошие коммиты
git commit -m "Add user achievements system"
git commit -m "Fix AmoCRM token refresh logic"
git commit -m "Update database indexes for performance"

# ❌ Плохие коммиты
git commit -m "fix"
git commit -m "update"
git commit -m "WIP"
```

### Ветки

```bash
# main - Production (стабильная)
# develop - Development (текущая разработка)
# feature/* - Новые фичи

# Создать ветку для фичи
git checkout -b feature/add-certificates
```

---

## 🔧 НОВЫЕ УТИЛИТЫ

### Logger (декабрь 2025)

```typescript
import { logger } from '@/utils/logger';

logger.info('User logged in:', userId);
logger.error('Failed to send email:', error);
logger.request('POST', '/api/users', 201, 45);
```

**Настройка:** `LOG_LEVEL=warn` в `.env`

### Retry with Backoff

```typescript
import { retryAmoCRM, retryEmail } from '@/utils/retryWithBackoff';

// AmoCRM с автоматическими повторами
const deal = await retryAmoCRM(
  async () => await amoClient.get(`/api/v4/leads/${id}`),
  'Get Deal'
);
```

### Alerting

```typescript
import { sendAlert, trackIntegrationFailure } from '@/utils/alerting';

// Отправить алерт админам
await sendAlert('Critical error in payment', 'critical');

// Отслеживать сбои
trackIntegrationFailure('amocrm', 'update_deal', false);
```

---

## ❌ ЧТО НЕЛЬЗЯ ДЕЛАТЬ

1. ❌ НЕ коммитить `.env` файлы
2. ❌ НЕ использовать `console.log` (используй `logger`)
3. ❌ НЕ игнорировать ошибки БД
4. ❌ НЕ деплоить без тестирования локально
5. ❌ НЕ хардкодить API ключи/токены
6. ❌ НЕ редактировать старые миграции (создавай новые)
7. ❌ НЕ делать N+1 запросы к БД
8. ❌ НЕ использовать `any` в TypeScript

---

## ✅ ЧТО НУЖНО ДЕЛАТЬ

1. ✅ ВСЕГДА проверять `error` в Supabase запросах
2. ✅ ВСЕГДА использовать `logger` для логирования
3. ✅ ВСЕГДА оборачивать async код в try/catch
4. ✅ ВСЕГДА тестировать локально перед деплоем
5. ✅ ВСЕГДА проверять логи после деплоя
6. ✅ ВСЕГДА использовать TypeScript типы
7. ✅ ВСЕГДА защищать admin роуты
8. ✅ ВСЕГДА делать бэкап БД перед миграциями

---

## 📚 ДОКУМЕНТАЦИЯ

- **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)** - Полная архитектура проекта
- **[QUICK_OPTIMIZATION_CHECKLIST.md](./QUICK_OPTIMIZATION_CHECKLIST.md)** - Чеклист оптимизаций
- **[backend/OPTIMIZATION_DEPLOYMENT_GUIDE.md](./backend/OPTIMIZATION_DEPLOYMENT_GUIDE.md)** - Гайд по деплою оптимизаций

---

## 🐛 ОТЛАДКА

### Backend не запускается

```bash
# Проверить логи
pm2 logs onai-backend --err

# Частые причины:
# - .env не заполнен
# - Порт 3001 занят
# - Миграции БД не применены
```

### Frontend белый экран

```bash
# Открыть консоль браузера (F12)
# Частые причины:
# - .env.local не заполнен
# - Backend недоступен
# - CORS не настроен
```

### AmoCRM не работает

```sql
-- Проверить токены в БД
SELECT service_name, LEFT(access_token, 20), expires_at 
FROM integration_tokens 
WHERE service_name = 'amocrm';
```

---

## 📞 ПОМОЩЬ

**При проблемах:**
1. Проверить [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)
2. Открыть Sentry Dashboard (ошибки)
3. Проверить PM2 логи: `pm2 logs onai-backend`
4. Проверить health check: `curl https://api.onai.academy/api/health/deep`

---

## 🎓 ДЛЯ AI-АССИСТЕНТОВ

**Перед началом работы:**
1. ✅ Прочитать [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)
2. ✅ Изучить структуру проекта
3. ✅ Понять правила разработки
4. ✅ Следовать установленным паттернам

**При внесении изменений:**
- ✅ Использовать существующие утилиты (`logger`, `retryWithBackoff`)
- ✅ Следовать code style
- ✅ Обрабатывать ошибки
- ✅ Не ломать существующую функциональность
- ✅ Документировать сложную логику

---

**Версия:** 1.0  
**Дата:** Декабрь 2025

🚀 **ГОТОВ К РАБОТЕ!**
