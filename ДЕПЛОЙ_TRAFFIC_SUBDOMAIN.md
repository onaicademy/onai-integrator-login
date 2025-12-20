# 🚀 ДЕПЛОЙ TRAFFIC DASHBOARD НА ПОДДОМЕН

**Дата**: 19 декабря 2025  
**Поддомен**: `traffic.onai.academy`  
**Статус**: ✅ КОД ГОТОВ К ДЕПЛОЮ

---

## 🎯 ЧТО ИЗМЕНИЛОСЬ

### ✅ Все routes обновлены для поддомена:

**ДО** (onai.academy/traffic/):
```
/traffic/login
/traffic/cabinet/:team
/traffic/admin/dashboard
/traffic/settings
```

**ПОСЛЕ** (traffic.onai.academy/):
```
/login
/cabinet/:team
/admin/dashboard
/settings
```

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### 1. DNS НАСТРОЙКА (у регистратора домена)

Добавить A запись для поддомена:

```
Type: A
Host: traffic
Value: 207.154.231.30 (IP сервера)
TTL: 3600
```

**Проверка**:
```bash
# Подожди 5-10 минут после добавления DNS записи
ping traffic.onai.academy

# Должно вернуть: 207.154.231.30
```

---

### 2. NGINX КОНФИГУРАЦИЯ

#### Шаг 1: Загрузить конфиг на сервер

```bash
# С твоего Mac:
scp nginx-traffic.onai.academy.conf root@207.154.231.30:/etc/nginx/sites-available/traffic.onai.academy
```

#### Шаг 2: Получить SSL сертификат

```bash
ssh root@207.154.231.30

# Получить SSL для поддомена
certbot certonly --nginx -d traffic.onai.academy --non-interactive --agree-tos -m admin@onai.academy
```

#### Шаг 3: Активировать конфиг

```bash
# На сервере:
ln -sf /etc/nginx/sites-available/traffic.onai.academy /etc/nginx/sites-enabled/

# Проверить конфиг
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
```

---

### 3. СОЗДАТЬ ДИРЕКТОРИЮ ДЛЯ ПОДДОМЕНА

```bash
# На сервере:
mkdir -p /var/www/traffic.onai.academy
chown -R www-data:www-data /var/www/traffic.onai.academy
chmod -R 755 /var/www/traffic.onai.academy
```

---

### 4. ДЕПЛОЙ FRONTEND

#### Вариант А: Быстрый деплой (с твоего Mac)

```bash
# 1. Build frontend
cd /Users/miso/onai-integrator-login
npm run build

# 2. Загрузить на сервер
rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/

# 3. Исправить права
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/traffic.onai.academy/ && chmod -R 755 /var/www/traffic.onai.academy/"

# 4. Перезагрузить Nginx
ssh root@207.154.231.30 "systemctl reload nginx"
```

#### Вариант Б: Деплой через GitHub

```bash
# На сервере:
cd /root
git clone https://github.com/yourusername/onai-integrator-login.git traffic-dashboard
cd traffic-dashboard
npm install
npm run build
cp -r dist/* /var/www/traffic.onai.academy/
chown -R www-data:www-data /var/www/traffic.onai.academy/
```

---

### 5. BACKEND УЖЕ РАБОТАЕТ

Backend не нужно менять! Он уже настроен на порту 3000 и принимает запросы с любого домена.

**API Endpoint**: `https://api.onai.academy` (тот же backend)

---

## ✅ ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

### 1. Проверить DNS:
```bash
ping traffic.onai.academy
# Ожидается: 207.154.231.30
```

### 2. Проверить HTTPS:
```bash
curl -I https://traffic.onai.academy
# Ожидается: 200 OK
```

### 3. Проверить вход:

Открой: https://traffic.onai.academy/login

Войди как:
- Email: `admin@onai.academy`
- Пароль: `admin123`

✅ Ожидается редирект на: `https://traffic.onai.academy/admin/dashboard`

### 4. Проверить кабинет таргетолога:

Выйди и войди как:
- Email: `kenesary@onai.academy`
- Пароль: `changeme123`

✅ Ожидается редирект на: `https://traffic.onai.academy/cabinet/kenesary`

---

## 🔍 TROUBLESHOOTING

### Проблема: DNS не резолвится

```bash
# Проверь DNS записи:
nslookup traffic.onai.academy

# Если не работает - подожди 10-30 минут
# DNS записи могут кэшироваться
```

### Проблема: SSL ошибка

```bash
# Перезапусти certbot:
ssh root@207.154.231.30
certbot certonly --nginx -d traffic.onai.academy --force-renewal

# Перезагрузи Nginx:
systemctl restart nginx
```

### Проблема: 502 Bad Gateway

```bash
# Проверь что backend работает:
ssh root@207.154.231.30
pm2 list

# Если backend не запущен:
cd /var/www/onai-integrator-login-main/backend
pm2 start ecosystem.config.cjs
pm2 save
```

### Проблема: Белый экран

```bash
# Проверь логи Nginx:
ssh root@207.154.231.30
tail -f /var/log/nginx/traffic.onai.academy.error.log

# Проверь что файлы загружены:
ls -la /var/www/traffic.onai.academy/
# Должны быть: index.html, assets/, images/
```

---

## 📊 СТАТУС ПОСЛЕ ДЕПЛОЯ

После успешного деплоя будут работать:

- ✅ https://traffic.onai.academy/login
- ✅ https://traffic.onai.academy/cabinet/kenesary
- ✅ https://traffic.onai.academy/cabinet/arystan
- ✅ https://traffic.onai.academy/cabinet/muha
- ✅ https://traffic.onai.academy/cabinet/traf4
- ✅ https://traffic.onai.academy/admin/dashboard
- ✅ https://traffic.onai.academy/admin/security
- ✅ https://traffic.onai.academy/admin/utm-sources
- ✅ https://traffic.onai.academy/admin/team-constructor
- ✅ https://traffic.onai.academy/settings
- ✅ https://traffic.onai.academy/detailed-analytics

---

## ⚠️ ВАЖНО

### Старый URL больше НЕ РАБОТАЕТ:

❌ `onai.academy/traffic/login` - НЕ РАБОТАЕТ  
✅ `traffic.onai.academy/login` - РАБОТАЕТ

### Обновить в документации:

Все файлы с аккаунтами уже обновлены:
- ✅ КАРТОЧКА_KENESARY.txt
- ✅ КАРТОЧКА_ARYSTAN.txt
- ✅ КАРТОЧКА_MUHA.txt
- ✅ КАРТОЧКА_TRAF4.txt
- ✅ КАРТОЧКА_ADMIN.txt
- ✅ ТАРГЕТОЛОГИ_АККАУНТЫ.md

---

## 🚀 БЫСТРЫЙ ДЕПЛОЙ (ONE-LINER)

```bash
# Всё в одной команде:
cd /Users/miso/onai-integrator-login && \
npm run build && \
rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/ && \
ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/traffic.onai.academy/ && chmod -R 755 /var/www/traffic.onai.academy/ && systemctl reload nginx" && \
echo "✅ ДЕПЛОЙ ЗАВЕРШЁН!"
```

---

**Автор**: AI Assistant  
**Дата**: 19 декабря 2025



