# Sales Manager Dashboard - Tripwire Platform

## 🎯 Обзор

**Sales Manager Dashboard** - админ-панель для менеджеров по продажам (Sales Team) для управления **TRIPWIRE** продуктом, которая позволяет:

✅ Создавать **ОТДЕЛЬНЫЕ** аккаунты для купивших Tripwire курс  
✅ Автоматически отправлять учетные данные на email  
✅ Отслеживать добавленных Tripwire учеников  
✅ Просматривать историю действий  
✅ Интеграция с AmoCRM - перемещение сделки на этап "купил продукт"  

## 🔐 Доступ

**URL Админки:** `https://onai.academy/admin/tripwire-manager`

**Роли:** `admin`, `sales`

## ⚠️ ВАЖНО: Tripwire - ОТДЕЛЬНЫЙ продукт

- Аккаунты Tripwire **НЕ СВЯЗАНЫ** с основной платформой onAI Academy
- Вход для Tripwire учеников: `https://onai.academy/tripwire/login`
- Роль пользователя: `tripwire` (не `student`)
- Создаются отдельные записи в `auth.users` с метаданными `role: "tripwire"`

## 🗄️ База данных

### Таблицы

1. **`tripwire_users`** - пользователи Tripwire, созданные менеджерами
   - `user_id` - ссылка на auth.users
   - `full_name` - ФИО ученика
   - `email` - email ученика
   - `granted_by` - UUID менеджера
   - `generated_password` - временный пароль
   - `status` - статус: active, inactive, completed, blocked
   - `modules_completed` - количество завершенных модулей
   - `welcome_email_sent` - флаг отправки email

2. **`sales_activity_log`** - лог действий менеджеров
   - `manager_id` - UUID менеджера
   - `action_type` - тип действия (user_created, email_sent, status_changed)
   - `target_user_id` - UUID пользователя
   - `details` - JSON с деталями

### RLS политики

- Админы видят всех пользователей
- Менеджеры (sales) видят только своих пользователей
- Создавать могут только admin и sales

## 🚀 Backend API

### Endpoints

#### POST /api/admin/tripwire/users
Создает нового Tripwire пользователя

**Headers:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "full_name": "Иван Петров",
  "email": "ivan@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "email": "ivan@example.com",
  "generated_password": "a7b3c9d1e5f2",
  "welcome_email_sent": true,
  "message": "Пользователь успешно создан"
}
```

#### GET /api/admin/tripwire/users
Получает список Tripwire пользователей

**Query Parameters:**
- `manager_id` - UUID менеджера (опционально, только для админов)
- `status` - фильтр по статусу (active, inactive, completed, blocked)
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество на странице (по умолчанию 20)

**Response:**
```json
{
  "users": [...],
  "total": 100,
  "page": 1,
  "pages": 5,
  "limit": 20
}
```

#### GET /api/admin/tripwire/stats
Получает статистику по Tripwire пользователям

**Response:**
```json
{
  "total_users": 100,
  "active_users": 75,
  "completed_users": 10,
  "this_month": 15
}
```

#### PATCH /api/admin/tripwire/users/:id
Обновляет статус пользователя

**Request Body:**
```json
{
  "status": "active" | "inactive" | "completed" | "blocked"
}
```

#### GET /api/admin/tripwire/activity
Получает историю действий менеджера

**Query Parameters:**
- `limit` - количество записей (по умолчанию 50)

## 📧 Email автоматизация

### Настройка SMTP

Добавьте в `backend/.env`:

```env
# SMTP для отправки Welcome Email
SMTP_USER=support@onaiacademy.kz
SMTP_PASSWORD=your_gmail_app_password
```

### Получение App Password для Gmail

1. Перейдите в Google Account: https://myaccount.google.com/
2. Security → 2-Step Verification (должна быть включена)
3. App passwords → Select app: Mail → Select device: Other
4. Скопируйте сгенерированный пароль (16 символов)
5. Вставьте в `SMTP_PASSWORD`

### Welcome Email шаблон

Email отправляется автоматически при создании пользователя с:
- Логином (email)
- Временным паролем
- **Ссылкой на вход Tripwire:** `https://onai.academy/tripwire/login` ⚠️
- Cyber-дизайном Brand Code 3.0

## 🎨 Frontend компоненты

### Структура

```
src/pages/admin/
├── TripwireManager.tsx          # Главная страница
└── components/
    ├── CreateUserForm.tsx       # Модалка создания пользователя
    ├── StatsCards.tsx           # Карточки статистики
    ├── UsersTable.tsx           # Таблица пользователей
    └── ActivityLog.tsx          # Лог действий
```

### Дизайн

Все компоненты используют **Cyber-Architecture (Brand Code 3.0)**:

- Цвета: `#00FF94` (primary), `#030303` (bg), `#0A0A0A` (surface)
- Шрифты: `Space Grotesk` (заголовки), `Manrope` (текст), `JetBrains Mono` (метки)
- Эффекты: neon glow, blur, градиенты
- Иконки: `@iconify/react` (Solar icon set)

## 🧪 Тестирование

### 1. Создание тестового Sales менеджера

```sql
-- Создаем пользователя с ролью sales
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "sales", "full_name": "Менеджер Тест"}'::jsonb
WHERE email = 'manager@test.com';
```

### 2. Тест создания пользователя

1. Войдите как admin или sales
2. Откройте `/admin/tripwire-manager`
3. Нажмите "ДОБАВИТЬ УЧЕНИКА"
4. Заполните форму:
   - ФИО: Иван Тестов
   - Email: test@example.com
5. Нажмите "СОЗДАТЬ АККАУНТ"
6. Проверьте:
   - ✅ Пользователь создан в базе
   - ✅ Email отправлен
   - ✅ Пароль сгенерирован
   - ✅ Лог создан в sales_activity_log

### 3. Проверка в админке

```
Статистика:
- ВСЕГО УЧЕНИКОВ: +1
- АКТИВНЫХ: +1
- ЭТОТ МЕСЯЦ: +1

Таблица:
- Новый пользователь виден
- Статус: АКТИВЕН
- Email отправлен: ✓
```

## 🔧 Troubleshooting

### Email не отправляется

1. Проверьте SMTP настройки в `.env`
2. Убедитесь что используется App Password (не обычный пароль Gmail)
3. Проверьте 2FA включен в Google Account
4. Проверьте логи backend: `pm2 logs onai-backend`

### Ошибка 403 Forbidden

1. Проверьте роль пользователя:
   ```sql
   SELECT email, raw_user_meta_data->>'role' as role
   FROM auth.users
   WHERE id = '<your_user_id>';
   ```
2. Добавьте роль если нужно:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "sales"}'::jsonb
   WHERE email = 'your@email.com';
   ```

### Пользователь не создается

1. Проверьте RLS политики:
   ```sql
   SELECT * FROM tripwire_users; -- Должны видеть всех если admin
   ```
2. Проверьте логи backend
3. Проверьте что email уникальный (не существует в auth.users)

## 📊 AmoCRM интеграция - Tripwire

### Настройка

1. Добавьте в `backend/.env`:
   ```env
   AMOCRM_ENABLED=true
   AMOCRM_SUBDOMAIN=your_subdomain
   AMOCRM_ACCESS_TOKEN=your_access_token
   AMOCRM_TRIPWIRE_PIPELINE_ID=your_pipeline_id
   AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID=your_stage_id
   ```

2. Получение настроек AmoCRM:
   - Subdomain: `your_company.amocrm.ru` → `your_subdomain`
   - Access Token: Интеграции → Создать интеграцию → Получить токен
   - Pipeline ID: ID воронки Tripwire продаж
   - Stage ID: ID этапа "Купил продукт" в этой воронке

### Логика работы

При создании пользователя через Sales Dashboard:

1. **Поиск существующей сделки** по email контакта в воронке Tripwire
2. Если сделка найдена:
   - ✅ Перемещается на этап **"Купил продукт"**
   - ✅ Добавляется примечание с учетными данными
   - ✅ Сохраняется `amocrm_deal_id` в базу
3. Если сделка НЕ найдена:
   - ⚠️ Создается новая сделка
   - ✅ Создается контакт с email
   - ✅ Ставится на этап "Купил продукт"
   - ✅ Сохраняется `amocrm_deal_id` в базу

### Реализация (backend/src/services/amocrmService.ts)

```typescript
// Функция для перемещения сделки Tripwire на этап "Купил продукт"
export async function moveTripwireDealToStage(contactEmail: string, userName: string) {
  try {
    // 1. Найти контакт по email
    const contact = await findContactByEmail(contactEmail);
    
    // 2. Найти сделку в воронке Tripwire
    const deal = await findDealInPipeline(
      contact.id, 
      process.env.AMOCRM_TRIPWIRE_PIPELINE_ID
    );
    
    if (deal) {
      // 3. Переместить на этап "Купил продукт"
      await updateDealStage(
        deal.id,
        process.env.AMOCRM_TRIPWIRE_STAGE_BOUGHT_ID
      );
      
      // 4. Добавить примечание
      await addNoteToLead(deal.id, `✅ Доступ к Tripwire предоставлен: ${userName}`);
      
      return deal.id;
    } else {
      // 5. Создать новую сделку если не найдена
      return await createTripwireDeal(contact.id, userName);
    }
  } catch (error) {
    console.error('AmoCRM error:', error);
    return null;
  }
}
```

### Сохранение в репозитории

📁 **backend/src/services/amocrmService.ts** - AmoCRM интеграция
📁 **backend/AMOCRM_TRIPWIRE_INTEGRATION.md** - Документация по настройке

## 🚀 Доступ к Админке

### URL для тестирования на Localhost

```
http://localhost:8080/admin/tripwire-manager
```

### URL на Production (НЕ ДЕПЛОИТЬ БЕЗ РАЗРЕШЕНИЯ!)

```
https://onai.academy/admin/tripwire-manager
```

### Деплой (ТОЛЬКО ПОСЛЕ ПОДТВЕРЖДЕНИЯ!)

**Backend:**
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend"
```

**Frontend:**
Vercel автоматически деплоит при push в `main`.

⚠️ **НЕ ДЕЛАТЬ ДЕПЛОЙ БЕЗ ЯВНОГО УКАЗАНИЯ ПОЛЬЗОВАТЕЛЯ!**

## ✅ Чеклист завершения

- [x] База данных (tripwire_users, sales_activity_log)
- [x] Backend API (POST, GET, PATCH endpoints)
- [x] Email автоматизация (nodemailer + HTML шаблон)
- [x] Frontend компоненты (TripwireManager, CreateUserForm, StatsCards, UsersTable, ActivityLog)
- [x] Роутинг (SalesGuard для admin & sales)
- [x] Cyber-дизайн Brand Code 3.0
- [x] RLS политики
- [ ] SMTP настройки (требует App Password)
- [ ] Создание тестового sales пользователя
- [ ] Тестирование создания пользователя
- [ ] Деплой на production

## 📖 Документация

- Backend: `/backend/src/services/tripwireManagerService.ts`
- Controllers: `/backend/src/controllers/tripwireManagerController.ts`
- Routes: `/backend/src/routes/tripwire-manager.ts`
- Frontend: `/src/pages/admin/TripwireManager.tsx`
- Components: `/src/pages/admin/components/`

---

**Готово! 🚀💚**

