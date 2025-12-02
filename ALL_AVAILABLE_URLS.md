# 🗺️ Все доступные URL приложения onAI Academy

## 📋 Полный список маршрутов

### 🌐 Production (onai.academy)
Все ссылки работают по HTTPS: `https://onai.academy`

### 💻 Локальная разработка
Все ссылки работают на: `http://localhost:8080`

---

## 1️⃣ Публичные страницы

| Описание | Локальный URL | Production URL |
|----------|---------------|----------------|
| **Главная (Логин)** | http://localhost:8080/ | https://onai.academy/ |

---

## 2️⃣ Основные страницы (без авторизации сейчас)

| Описание | Локальный URL | Production URL |
|----------|---------------|----------------|
| **Профиль пользователя** | http://localhost:8080/profile | https://onai.academy/profile |
| **Опросник (Welcome)** | http://localhost:8080/welcome | https://onai.academy/welcome |
| **NeuroHub (Центр обучения)** | http://localhost:8080/neurohub | https://onai.academy/neurohub |
| **Админ-панель активности** | http://localhost:8080/admin/activity | https://onai.academy/admin/activity |

---

## 3️⃣ Страницы курсов

### 📚 Основная страница курса

**Паттерн:** `/course/:id`

Курс может иметь любой ID (в реальном приложении это UUID из базы данных).

**Примеры:**

| Описание | Локальный URL | Production URL |
|----------|---------------|----------------|
| Курс #1 | http://localhost:8080/course/1 | https://onai.academy/course/1 |
| Курс #2 | http://localhost:8080/course/2 | https://onai.academy/course/2 |
| Любой курс | http://localhost:8080/course/ANY_ID | https://onai.academy/course/ANY_ID |

---

## 4️⃣ Модули курсов (10 модулей)

**Паттерн:** `/course/:courseId/module/:moduleId`

В приложении есть **10 модулей**:

| # | Название модуля | Локальный URL | Production URL |
|---|----------------|---------------|----------------|
| 1 | **Введение в профессию** | http://localhost:8080/course/1/module/1 | https://onai.academy/course/1/module/1 |
| 2 | **Создание GPT бота и CRM** | http://localhost:8080/course/1/module/2 | https://onai.academy/course/1/module/2 |
| 3 | **Интеграция amoCRM и Bitrix24** | http://localhost:8080/course/1/module/3 | https://onai.academy/course/1/module/3 |
| 4 | **Автоматизация при помощи Make** | http://localhost:8080/course/1/module/4 | https://onai.academy/course/1/module/4 |
| 5 | **N8N автоматизация и работа с API** | http://localhost:8080/course/1/module/5 | https://onai.academy/course/1/module/5 |
| 6 | **Реализация и закрытие проекта** | http://localhost:8080/course/1/module/6 | https://onai.academy/course/1/module/6 |
| 7 | **Упаковка и продвижение** | http://localhost:8080/course/1/module/7 | https://onai.academy/course/1/module/7 |
| 8 | **Продажи на высокий чек** | http://localhost:8080/course/1/module/8 | https://onai.academy/course/1/module/8 |
| 9 | **Бонусы** | http://localhost:8080/course/1/module/9 | https://onai.academy/course/1/module/9 |
| 10 | **Воркшопы** | http://localhost:8080/course/1/module/10 | https://onai.academy/course/1/module/10 |

---

## 5️⃣ Уроки модулей

**Паттерн:** `/course/:courseId/module/:moduleId/lesson/:lessonId`

### Пример: Модуль 2 - "Создание GPT бота и CRM" (5 уроков)

| # | Название урока | Длительность | Локальный URL | Production URL |
|---|---------------|--------------|---------------|----------------|
| 1 | Введение и обзор платформы | 7 мин | http://localhost:8080/course/1/module/2/lesson/1 | https://onai.academy/course/1/module/2/lesson/1 |
| 2 | Создание API-ключа OpenAI | 10 мин | http://localhost:8080/course/1/module/2/lesson/2 | https://onai.academy/course/1/module/2/lesson/2 |
| 3 | Подключение Telegram-бота | 12 мин | http://localhost:8080/course/1/module/2/lesson/3 | https://onai.academy/course/1/module/2/lesson/3 |
| 4 | Интеграция с amoCRM через Webhook | 15 мин | http://localhost:8080/course/1/module/2/lesson/4 | https://onai.academy/course/1/module/2/lesson/4 |
| 5 | Настройка автопостов и ответов | 9 мин | http://localhost:8080/course/1/module/2/lesson/5 | https://onai.academy/course/1/module/2/lesson/5 |

### Общий паттерн для уроков:

Вы можете использовать любые комбинации:

```
http://localhost:8080/course/COURSE_ID/module/MODULE_ID/lesson/LESSON_ID
https://onai.academy/course/COURSE_ID/module/MODULE_ID/lesson/LESSON_ID
```

**Примеры:**
- `/course/1/module/1/lesson/1`
- `/course/1/module/3/lesson/7`
- `/course/2/module/5/lesson/3`

---

## 6️⃣ Системные страницы

| Описание | Локальный URL | Production URL |
|----------|---------------|----------------|
| **404 - Страница не найдена** | http://localhost:8080/any-wrong-url | https://onai.academy/any-wrong-url |

---

## 📊 Полная статистика URL

| Категория | Количество |
|-----------|-----------|
| Публичные страницы | 1 |
| Основные страницы | 4 |
| Страницы курсов | ∞ (динамические) |
| Модулей | 10 |
| Уроков (пример модуля 2) | 5 |
| Всего уникальных маршрутов | 6 типов |

---

## 🧪 Быстрый тест всех страниц

### Локально:

```bash
# Основные
open http://localhost:8080/
open http://localhost:8080/profile
open http://localhost:8080/welcome
open http://localhost:8080/neurohub
open http://localhost:8080/admin/activity

# Курсы
open http://localhost:8080/course/1
open http://localhost:8080/course/1/module/2
open http://localhost:8080/course/1/module/2/lesson/3
```

### Production:

```bash
# Основные
open https://onai.academy/
open https://onai.academy/profile
open https://onai.academy/welcome
open https://onai.academy/neurohub
open https://onai.academy/admin/activity

# Курсы
open https://onai.academy/course/1
open https://onai.academy/course/1/module/2
open https://onai.academy/course/1/module/2/lesson/3
```

---

## 🎯 Рекомендуемые ссылки для тестирования

### Минимальный набор для проверки:

1. **Главная:** https://onai.academy/
2. **Профиль:** https://onai.academy/profile
3. **Опросник:** https://onai.academy/welcome
4. **Админка:** https://onai.academy/admin/activity
5. **Курс:** https://onai.academy/course/1
6. **Модуль:** https://onai.academy/course/1/module/2
7. **Урок:** https://onai.academy/course/1/module/2/lesson/3

### Расширенный набор:

```
https://onai.academy/
https://onai.academy/profile
https://onai.academy/welcome
https://onai.academy/neurohub
https://onai.academy/admin/activity
https://onai.academy/course/1
https://onai.academy/course/1/module/1
https://onai.academy/course/1/module/2
https://onai.academy/course/1/module/3
https://onai.academy/course/1/module/2/lesson/1
https://onai.academy/course/1/module/2/lesson/2
https://onai.academy/course/1/module/2/lesson/3
```

---

## 🔍 Как работают динамические маршруты

### Паттерны:

1. **Курс:** `/course/:id`
   - `:id` может быть любым значением
   - Примеры: `/course/1`, `/course/ai-basics`, `/course/uuid-123`

2. **Модуль:** `/course/:id/module/:moduleId`
   - `:id` - ID курса
   - `:moduleId` - ID модуля (1-10 по умолчанию)
   - Пример: `/course/1/module/5`

3. **Урок:** `/course/:id/module/:moduleId/lesson/:lessonId`
   - `:id` - ID курса
   - `:moduleId` - ID модуля
   - `:lessonId` - ID урока
   - Пример: `/course/1/module/2/lesson/3`

---

## 📝 Примечания

1. **Авторизация отключена** - все страницы доступны без логина для тестирования UI
2. **Mock данные** - пока используются моковые данные, в будущем будет из Supabase
3. **UUID vs числа** - в production будут UUID, но сейчас работают числовые ID
4. **404 страница** - любой неизвестный маршрут покажет NotFound компонент

---

## 🚀 Итого: Все рабочие ссылки

### Production (onai.academy):

```
✅ https://onai.academy/
✅ https://onai.academy/profile
✅ https://onai.academy/welcome
✅ https://onai.academy/neurohub
✅ https://onai.academy/admin/activity
✅ https://onai.academy/course/1
✅ https://onai.academy/course/1/module/1
✅ https://onai.academy/course/1/module/2
✅ https://onai.academy/course/1/module/3
✅ https://onai.academy/course/1/module/4
✅ https://onai.academy/course/1/module/5
✅ https://onai.academy/course/1/module/6
✅ https://onai.academy/course/1/module/7
✅ https://onai.academy/course/1/module/8
✅ https://onai.academy/course/1/module/9
✅ https://onai.academy/course/1/module/10
✅ https://onai.academy/course/1/module/2/lesson/1
✅ https://onai.academy/course/1/module/2/lesson/2
✅ https://onai.academy/course/1/module/2/lesson/3
✅ https://onai.academy/course/1/module/2/lesson/4
✅ https://onai.academy/course/1/module/2/lesson/5
```

**Все эти ссылки работают и открываются мгновенно!** 🎉

---

*Последнее обновление: 4 ноября 2025*  
*Статус: ✅ Все маршруты протестированы и работают*

