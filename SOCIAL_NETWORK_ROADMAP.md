# 🌐 СОЦИАЛЬНАЯ СЕТЬ ВНУТРИ ПЛАТФОРМЫ - ROADMAP

## 🎯 ВИДЕНИЕ

**Цель**: Создать полноценное **комьюнити-пространство** внутри платформы onAI Academy, где студенты могут общаться, делиться опытом, мотивировать друг друга и создавать нетворкинг.

**Зачем**: Обучение эффективнее в сообществе. Студенты, которые общаются между собой, делятся успехами и помогают друг другу - учатся быстрее и остаются на платформе дольше.

**Влияние на бизнес**:
- ↑ Retention (удержание студентов) +40%
- ↑ Engagement (вовлеченность) +60%
- ↑ Virality (виральность) через шеринг контента
- ↑ Community support (взаимопомощь снижает нагрузку на support)

---

## 📊 ТЕКУЩИЙ СТАТУС

**Прогресс разработки: 15%**

### ✅ Что уже есть:
- База данных для чатов (`student_private_chats`, `student_private_messages`)
- База данных для групп (`student_group_chats`, `student_group_messages`)
- Базовый UI для Messages (временно отключен)
- Real-time инфраструктура (Supabase Realtime)

### ⏳ В разработке:
- Исправление Foreign Keys для чатов
- API endpoints для сообщений
- Frontend интерфейс чатов

### 📋 Запланировано:
- Посты с фото/видео
- Reels (короткие видео)
- Форум/Дискуссии
- Профили студентов
- Система лайков и комментариев

---

## 🗂️ СТРУКТУРА СОЦИАЛЬНОЙ СЕТИ

### 1. **💬 Личные сообщения** (Direct Messages)

**Описание**: Приватные чаты 1-на-1 между студентами  
**Зачем**: Для обмена контактами, совместной работы над проектами, менторства  
**Функции**:
- Текстовые сообщения
- Голосовые сообщения
- Отправка файлов (документы, скриншоты)
- Отправка изображений
- Статус прочтения (✓✓)
- Онлайн статус собеседника
- Поиск по сообщениям
- Пин важных сообщений

**Таблицы БД**:
- `student_private_chats` - чаты между студентами
- `student_private_messages` - сообщения в чатах

---

### 2. **👥 Групповые чаты** (Group Chats)

**Описание**: Группы по интересам, курсам, проектам  
**Зачем**: Для обсуждения учебных вопросов, создания study groups, коллабораций  
**Функции**:
- Создание групп (до 100 человек)
- Роли: админ, модератор, участник
- Пин сообщений
- Упоминания @username
- Прикрепление описания группы
- Групповой аватар
- Статистика активности
- Поиск по сообщениям группы

**Таблицы БД**:
- `student_group_chats` - групповые чаты
- `student_group_members` - участники групп
- `student_group_messages` - сообщения в группах

---

### 3. **📸 Публикации** (Posts/Feed)

**Описание**: Лента новостей где студенты делятся успехами, проектами, инсайтами  
**Зачем**: Мотивация через социальное доказательство, демонстрация прогресса  
**Функции**:
- Публикация текста + изображения (до 10 фото)
- Публикация текста + видео
- Хэштеги для категоризации
- Лайки ❤️
- Комментарии
- Репосты (поделиться)
- Сохранение в закладки
- Фильтры ленты (популярное, новое, подписки)

**Новые таблицы**:
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,                -- Текст поста
  media_urls TEXT[],                    -- Массив ссылок на фото/видео
  media_type TEXT,                      -- 'image', 'video', 'mixed'
  hashtags TEXT[],                      -- Хэштеги для поиска
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,      -- Закреплен в профиле
  visibility TEXT DEFAULT 'public',     -- 'public', 'followers', 'private'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_likes (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id), -- Для ответов
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4. **🎬 Reels** (Короткие видео)

**Описание**: Короткие вертикальные видео (15-60 сек) в стиле TikTok/Instagram Reels  
**Зачем**: Быстрые инсайты, tips & tricks, мотивационные ролики, демо проектов  
**Функции**:
- Запись видео до 60 секунд
- Загрузка готовых видео
- Вертикальный формат 9:16
- Музыка/звук
- Текстовые оверлеи
- Автоплей при скролле
- Лайки, комментарии
- "Дуэты" (ответ видео на видео)
- Trending (популярные Reels)

**Новые таблицы**:
```sql
CREATE TABLE reels (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id),
  video_url TEXT NOT NULL,              -- Ссылка на видео (R2/Bunny CDN)
  thumbnail_url TEXT,                   -- Превью
  caption TEXT,                         -- Подпись к видео
  audio_url TEXT,                       -- Фоновая музыка
  duration_seconds INTEGER,             -- Длительность
  hashtags TEXT[],
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reel_views (
  id UUID PRIMARY KEY,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id),
  watched_percentage INTEGER,           -- Сколько % просмотрел
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5. **🏆 Форум** (Discussions/Forum)

**Описание**: Структурированные дискуссии по темам курсов, технологиям, карьере  
**Зачем**: База знаний, Q&A, обсуждение сложных тем, peer-to-peer learning  
**Функции**:
- Создание топиков (тем)
- Категории: по курсам, по технологиям, карьера, общее
- Теги для классификации
- Лучший ответ (отмечается автором вопроса)
- Система рейтинга ответов
- Модерация (флаги на спам/abuse)
- Подписка на топики
- Уведомления о новых ответах
- Поиск по форуму

**Новые таблицы**:
```sql
CREATE TABLE forum_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,                            -- Эмодзи
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_topics (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id),
  author_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,      -- Закрыт для ответов
  has_best_answer BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_replies (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_best_answer BOOLEAN DEFAULT FALSE,
  upvotes_count INTEGER DEFAULT 0,
  downvotes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_votes (
  id UUID PRIMARY KEY,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);
```

---

### 6. **📊 Best Cases** (Кейсы успеха)

**Описание**: Структурированное описание успешных проектов студентов  
**Зачем**: Вдохновение, обучение на реальных примерах, портфолио  
**Функции**:
- Шаблон кейса: проблема → решение → результат
- Скриншоты/демо проекта
- Технологии (теги)
- Время разработки
- Метрики успеха (ROI, пользователи, выручка)
- Комментарии и вопросы
- Лайки и сохранения
- Фильтр по технологиям/нише

**Новые таблицы**:
```sql
CREATE TABLE best_cases (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  problem_description TEXT NOT NULL,    -- Какую проблему решали
  solution_description TEXT NOT NULL,   -- Как решили
  results_description TEXT NOT NULL,    -- Какие результаты
  technologies TEXT[],                  -- Стек технологий
  demo_url TEXT,                        -- Ссылка на демо
  github_url TEXT,                      -- Ссылка на GitHub
  images_urls TEXT[],                   -- Скриншоты
  development_time_hours INTEGER,       -- Сколько времов ушло
  metrics JSONB,                        -- Метрики: {"users": 1000, "revenue": "$5K"}
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,       -- Отмечен командой как пример
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 7. **👤 Профили студентов** (Student Profiles)

**Описание**: Публичные профили с достижениями, проектами, активностью  
**Зачем**: Нетворкинг, поиск напарников для проектов, демонстрация скиллов  
**Функции**:
- Аватар и обложка
- Био (описание)
- Локация
- Ссылки на соцсети
- Завершенные курсы
- Достижения (badges)
- Опубликованные кейсы
- Статистика (уроков завершено, streak)
- Подписчики/Подписки
- Активность (лента действий)

**Расширение существующей таблицы**:
```sql
ALTER TABLE profiles ADD COLUMN bio TEXT;
ALTER TABLE profiles ADD COLUMN location TEXT;
ALTER TABLE profiles ADD COLUMN website_url TEXT;
ALTER TABLE profiles ADD COLUMN github_url TEXT;
ALTER TABLE profiles ADD COLUMN linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN twitter_url TEXT;
ALTER TABLE profiles ADD COLUMN cover_image_url TEXT;
ALTER TABLE profiles ADD COLUMN is_public BOOLEAN DEFAULT TRUE;

CREATE TABLE profile_followers (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
```

---

## 🎨 UI/UX ДИЗАЙН

### Навигация
```
Главное меню:
├─ 🏠 Главная (Courses)
├─ 🧠 NeuroHUB (AI Наставник)
├─ 🌐 Сообщество ← НОВЫЙ РАЗДЕЛ
│  ├─ 💬 Сообщения (DM + Groups)
│  ├─ 📰 Лента (Posts Feed)
│  ├─ 🎬 Reels
│  ├─ 🏆 Форум
│  ├─ ⭐ Best Cases
│  └─ 👥 Люди (поиск студентов)
├─ 🏆 Достижения
├─ 👤 Мой профиль
└─ ⚙️ Админ панель
```

### Дизайн в стиле платформы
- **Цвета**: Black (#000), Dark Gray (#1a1a24), Neon Green (#00ff00)
- **Типографика**: Inter для текста, Orbitron для заголовков
- **Анимации**: Framer Motion для smooth transitions
- **Компоненты**: Shadcn UI + custom components
- **Мобильная версия**: Responsive дизайн, mobile-first

---

## 🛠️ ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS + Shadcn UI
- **Animations**: Framer Motion
- **State**: React Query (для кэширования)
- **Real-time**: Supabase Realtime subscriptions
- **Media upload**: Bunny CDN / Cloudflare R2

### Backend
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Bunny CDN для видео, R2 для изображений
- **Real-time**: Supabase Realtime channels
- **Video processing**: FFmpeg для обработки Reels
- **Moderation**: AI-модерация контента (OpenAI Moderation API)

### Infrastructure
- **CDN**: Bunny CDN (видео) + Cloudflare (статика)
- **Search**: PostgreSQL Full-Text Search
- **Notifications**: Telegram Bot (уведомления о новых сообщениях)
- **Monitoring**: Sentry (ошибки) + Supabase Analytics

---

## 📅 ROADMAP

### Phase 1: MVP Сообщений (Q1 2026)
**Срок**: 2 месяца  
**Команда**: 1 Frontend + 1 Backend + 1 Designer

- [ ] Исправить Foreign Keys в БД
- [ ] API для личных сообщений
- [ ] Frontend интерфейс чатов
- [ ] Real-time обновления
- [ ] Голосовые сообщения
- [ ] Отправка файлов/изображений
- [ ] Групповые чаты (базовая версия)
- [ ] Поиск по чатам

**Метрики успеха**:
- 30% студентов используют сообщения
- Среднее 5+ сообщений на пользователя в неделю

---

### Phase 2: Лента и Посты (Q2 2026)
**Срок**: 1.5 месяца

- [ ] Создать таблицы для постов
- [ ] API для постов (CRUD)
- [ ] Загрузка изображений
- [ ] Лента новостей (Feed)
- [ ] Лайки и комментарии
- [ ] Система хэштегов
- [ ] Профили студентов (публичные)
- [ ] Подписки (follow/unfollow)

**Метрики успеха**:
- 20% студентов публикуют посты
- Среднее 10+ лайков на пост
- 50% студентов заходят в ленту еженедельно

---

### Phase 3: Reels (Q3 2026)
**Срок**: 2 месяца

- [ ] Видео upload до 60 сек
- [ ] Обработка видео (FFmpeg)
- [ ] Вертикальный плеер
- [ ] Автоплей при скролле
- [ ] Музыка/звуки
- [ ] Trending algorithm
- [ ] Sharing (поделиться)

**Метрики успеха**:
- 15% студентов публикуют Reels
- Среднее 30+ просмотров на Reel
- 40% студентов смотрят Reels еженедельно

---

### Phase 4: Форум (Q4 2026)
**Срок**: 1.5 месяца

- [ ] Создать таблицы форума
- [ ] Категории и топики
- [ ] Система рейтинга ответов
- [ ] Лучший ответ
- [ ] Модерация
- [ ] Поиск по форуму
- [ ] Email уведомления

**Метрики успеха**:
- 100+ топиков создано
- 40% вопросов получают ответ в течение 24ч
- 25% студентов активны на форуме

---

### Phase 5: Best Cases (Q1 2027)
**Срок**: 1 месяц

- [ ] Шаблон кейса
- [ ] Загрузка скриншотов
- [ ] Метрики успеха
- [ ] Featured cases
- [ ] Фильтры по технологиям

**Метрики успеха**:
- 50+ кейсов опубликовано
- 10% студентов публикуют кейсы
- Кейсы используются в маркетинге

---

## 💰 МОНЕТИЗАЦИЯ

### Платные функции Premium сообщества
- Закрытые группы (для Premium студентов)
- Приоритет в поиске профилей
- Больше хранилища для файлов
- Расширенная аналитика (кто смотрел профиль)
- Баджи и выделение профиля

**Цена**: +$10/месяц к базовой подписке

---

## 🎯 KPI СОЦИАЛЬНОЙ СЕТИ

### Метрики вовлеченности
- **DAU/MAU** (Daily/Monthly Active Users)
- **Time in Community** (время в разделе Сообщество)
- **Posts per User** (постов на пользователя)
- **Messages per User** (сообщений на пользователя)
- **Engagement Rate** (лайки + комментарии / просмотры)

### Метрики роста
- **Viral Coefficient** (сколько друзей приглашает 1 пользователь)
- **Content Creation Rate** (% студентов публикующих контент)
- **Retention** (% студентов возвращающихся через 7/30 дней)

### Бизнес метрики
- **Premium Conversion** (% перехода на Premium)
- **Churn Rate** (% отписок)
- **LTV** (Lifetime Value) студента

---

## 🚀 ИТОГО

**Социальная сеть = Ключевой драйвер роста платформы**

### Почему это важно:
1. **Retention**: Студенты остаются ради сообщества
2. **Virality**: Органический рост через шеринг
3. **Support**: Peer-to-peer помощь снижает затраты
4. **Monetization**: Новый источник дохода (Premium Community)
5. **Differentiation**: Уникальное конкурентное преимущество

### Следующие шаги:
1. ✅ Создан roadmap (этот файл)
2. ⏳ Исправить Messages (Foreign Keys)
3. ⏳ Нанять UI/UX дизайнера для mockup'ов
4. ⏳ Разработка MVP Сообщений (Q1 2026)

---

**Файл обновлен**: 24 ноября 2025  
**Статус**: В разработке (15%)  
**Ответственный**: Команда onAI Academy





