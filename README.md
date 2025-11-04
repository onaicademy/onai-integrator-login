# onAI Academy Platform - Login & Integration System

Платформа онлайн-обучения с интеграцией Google OAuth и Supabase.

## 🚀 Quick Start

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Создайте .env файл (см. .env.example)
cp .env.example .env

# Запуск dev сервера
npm run dev
```

Приложение запустится на `http://localhost:5173`

### Production Build

```bash
# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview
```

---

## 🌐 Production Deployment

**URL:** https://integratoronai.kz  
**Server:** 178.128.203.40

### Деплой на сервер:

```bash
ssh root@178.128.203.40
cd /var/www/onai-integrator-login
git pull origin main
npm install
npm run build
chown -R www-data:www-data dist
systemctl restart nginx
```

---

## 🔧 Переменные окружения

Создайте файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key_here
VITE_SITE_URL=http://localhost:5173
```

**На production сервере:**
```env
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key_here
VITE_SITE_URL=https://integratoronai.kz
```

---

## 📁 Структура проекта

```
onai-integrator-login/
├── src/
│   ├── pages/              # React страницы
│   │   ├── Index.tsx       # Главная (логин)
│   │   ├── Profile.tsx     # Профиль пользователя
│   │   ├── Welcome.tsx     # Опросник
│   │   ├── NeuroHub.tsx    # Центр обучения
│   │   └── admin/
│   │       └── Activity.tsx # Админ-панель
│   ├── components/         # React компоненты
│   ├── lib/               # Утилиты и конфигурация
│   │   ├── supabase.ts    # Supabase клиент
│   │   └── utils.ts       # Вспомогательные функции
│   └── integrations/      # Интеграции
│       └── supabase/      # Supabase типы и клиент
├── supabase/              # Supabase конфигурация
│   ├── functions/         # Edge Functions
│   └── migrations/        # SQL миграции
├── public/                # Статические файлы
└── dist/                  # Production сборка
```

---

## 🗺️ Маршруты приложения

### Публичные страницы:
- `/` - Страница входа (логин)

### Защищенные страницы (требуют авторизацию):
- `/profile` - Личный кабинет пользователя
- `/welcome` - Опросник для новых пользователей
- `/neurohub` - Центр обучения
- `/course/:id` - Страница курса
- `/course/:id/module/:moduleId` - Модуль курса
- `/course/:id/module/:moduleId/lesson/:lessonId` - Урок

### Админские страницы:
- `/admin/activity` - Панель аналитики (требует роль admin)

---

## 🔐 Авторизация

Система использует **Google OAuth** через Supabase Auth.

### Настройка Google OAuth:
См. документацию в `GOOGLE_OAUTH_SETUP.md`

### Для разработки без авторизации:
См. `AUTH_DISABLED_README.md` - инструкции по временному отключению проверок

---

## 🛠️ Технологии

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui + Radix UI
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Router:** React Router v6
- **State:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion
- **Charts:** Recharts

---

## 📚 Документация

- **[PROBLEM_SOLUTION_SUMMARY.md](./PROBLEM_SOLUTION_SUMMARY.md)** - Резюме проблем и решений
- **[AUTH_DISABLED_README.md](./AUTH_DISABLED_README.md)** - Работа без авторизации
- **[FIX_SUMMARY.md](./FIX_SUMMARY.md)** - Сводка исправлений
- **[TESTING_INSTRUCTIONS.md](./TESTING_INSTRUCTIONS.md)** - Инструкции по тестированию
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Инструкции по деплою
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Настройка Supabase
- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** - Настройка Google OAuth
- **[DIAGNOSTICS_QUICK_START.md](./DIAGNOSTICS_QUICK_START.md)** 🤖 - AI-Диагност: Быстрый старт
- **[DIAGNOSTICS_SETUP_GUIDE.md](./DIAGNOSTICS_SETUP_GUIDE.md)** - AI-Диагност: Полная документация
- **[MCP_TROUBLESHOOTING.md](./MCP_TROUBLESHOOTING.md)** 🔧 - Устранение проблем MCP сервера

---

## 🐛 Решенные проблемы

### Проблема с редиректами (4 ноября 2025) ✅ РЕШЕНО

**Симптомы:** Страницы `/profile`, `/welcome`, `/admin/activity` редиректили на главную или показывали 404.

**Причины:**
1. Отсутствие локального `.env` файла
2. Несоответствие имен переменных (`ANON_KEY` vs `PUBLISHABLE_KEY`)
3. Неправильная конфигурация Nginx для SPA
4. Неправильные переменные окружения на сервере

**Решение:**
- Создан `.env` с правильными переменными
- Унифицированы имена переменных во всех файлах
- Добавлена директива `try_files` в Nginx
- Пересобран проект на сервере

**Подробности:** См. `PROBLEM_SOLUTION_SUMMARY.md`

---

## 🔄 CI/CD

Автоматический деплой настроен через **GitHub Actions**.

При каждом push в `main`:
1. Код автоматически деплоится на сервер
2. Устанавливаются зависимости
3. Собирается production build
4. Перезапускается PM2 и Nginx

См. `.github/workflows/deploy.yml`

---

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Линтинг
npm run lint

# Проверка типов
npm run type-check
```

---

## 📦 Полезные команды

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview

# Деплой Supabase функций
npm run db:push

# Линтинг
npm run lint
```

---

## 🤝 Contributing

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📝 License

Proprietary - onAI Academy © 2025

---

## 🆘 Помощь и поддержка

**GitHub Issues:** https://github.com/onaicademy/onai-integrator-login/issues  
**Supabase Dashboard:** https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx  
**Production URL:** https://integratoronai.kz

---

## ✨ Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI Components by [shadcn/ui](https://ui.shadcn.com)
- Backend by [Supabase](https://supabase.com)
- Deployed on DigitalOcean

---

*Последнее обновление: 4 ноября 2025*
