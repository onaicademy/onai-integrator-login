# 📧 SMTP Setup для Welcome Email

## Настройка Gmail App Password

### Шаг 1: Включить 2FA в Google Account

1. Откройте: https://myaccount.google.com/security
2. Найдите секцию **2-Step Verification**
3. Нажмите **Get started** и следуйте инструкциям
4. Убедитесь что 2FA включен (вам придет SMS код)

### Шаг 2: Создать App Password

1. Откройте: https://myaccount.google.com/apppasswords
2. Или: Google Account → Security → 2-Step Verification → App passwords
3. В поле "Select app" выберите **Mail**
4. В поле "Select device" выберите **Other (Custom name)**
5. Введите название: `onAI Academy Backend`
6. Нажмите **Generate**
7. Скопируйте **16-символьный пароль** (пробелы можно убрать)

### Шаг 3: Добавить в backend/.env

```bash
cd /Users/miso/onai-integrator-login/backend
nano .env
```

Добавьте строки:

```env
# SMTP для отправки Welcome Email
SMTP_USER=support@onaiacademy.kz
SMTP_PASSWORD=abcd efgh ijkl mnop
```

**Важно:**
- Используйте **App Password** (16 символов), НЕ обычный пароль!
- Пробелы можно убрать: `abcdefghijklmnop`
- SMTP_USER должен совпадать с email Google Account

### Шаг 4: Перезапустить Backend

```bash
pm2 restart onai-backend
pm2 logs onai-backend --lines 50
```

Или для локального тестирования:

```bash
npm run dev
```

## Production настройка

### На сервере Digital Ocean

```bash
ssh root@207.154.231.30

# Редактируем .env
cd /var/www/onai-integrator-login-main/backend
nano .env

# Добавляем SMTP настройки
SMTP_USER=support@onaiacademy.kz
SMTP_PASSWORD=your_app_password_here

# Перезапускаем backend
pm2 restart onai-backend

# Проверяем логи
pm2 logs onai-backend --lines 50
```

## Тестирование Email

### 1. Создать тестового пользователя

1. Откройте `/admin/tripwire-manager`
2. Нажмите "ДОБАВИТЬ УЧЕНИКА"
3. Заполните:
   - ФИО: Тестовый Пользователь
   - Email: **ваш_реальный_email@gmail.com**
4. Нажмите "СОЗДАТЬ АККАУНТ"

### 2. Проверить email

1. Проверьте папку **Входящие** (Inbox)
2. Если нет - проверьте **Спам**
3. Email будет от: `onAI Academy <support@onaiacademy.kz>`
4. Тема: `🎓 Добро пожаловать в onAI Academy - Ваши учетные данные`

### 3. Проверить Backend логи

```bash
pm2 logs onai-backend --lines 100 | grep -i email
```

Успешная отправка:
```
✅ Welcome email sent to test@example.com
```

Ошибка:
```
❌ Error sending welcome email: Invalid login: 535-5.7.8 Username and Password not accepted
```

## Troubleshooting

### Ошибка: "Invalid login: 535-5.7.8"

**Причина:** Используется обычный пароль вместо App Password

**Решение:**
1. Создайте App Password (см. Шаг 2)
2. Убедитесь что 2FA включен
3. Используйте именно App Password в SMTP_PASSWORD

### Ошибка: "Authentication failed"

**Причина:** Неправильный SMTP_USER или SMTP_PASSWORD

**Решение:**
1. SMTP_USER должен совпадать с email Google Account
2. SMTP_PASSWORD - это 16-символьный App Password
3. Проверьте что нет лишних пробелов

### Email не приходит (нет ошибок в логах)

**Причина:** Email попал в спам или заблокирован

**Решение:**
1. Проверьте папку **Спам**
2. Добавьте `support@onaiacademy.kz` в контакты
3. Проверьте настройки фильтрации в Gmail

### Проверка SMTP настроек

```bash
cd backend
node -e "console.log('SMTP_USER:', process.env.SMTP_USER); console.log('SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD);"
```

## Альтернативы Gmail

Если Gmail не работает, можно использовать:

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
```

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your_mailgun_password
```

### Yandex Mail

```env
SMTP_HOST=smtp.yandex.com
SMTP_PORT=587
SMTP_USER=your_yandex_email@yandex.com
SMTP_PASSWORD=your_yandex_password
```

---

**Готово! 📧✅**


