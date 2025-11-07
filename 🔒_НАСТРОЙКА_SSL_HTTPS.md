# 🔒 НАСТРОЙКА SSL СЕРТИФИКАТА ДЛЯ HTTPS

## ⚠️ ТЕКУЩАЯ ПРОБЛЕМА:
Сайт **onai.academy** работает **БЕЗ HTTPS** (не защищён)

---

## ✅ РЕШЕНИЕ: Let's Encrypt + Certbot (БЕСПЛАТНО)

### **ШАГ 1: Подключись к серверу**

```bash
ssh root@178.128.203.40
```

---

### **ШАГ 2: Установи Certbot**

```bash
# Обнови пакеты
sudo apt update

# Установи Certbot и плагин для Nginx
sudo apt install certbot python3-certbot-nginx -y
```

---

### **ШАГ 3: Получи SSL сертификат**

```bash
# Автоматическая настройка SSL для onai.academy
sudo certbot --nginx -d onai.academy -d www.onai.academy
```

**Certbot спросит:**
1. **Email:** Введи свой email (для уведомлений о продлении)
2. **Terms of Service:** Согласись (Y)
3. **Share email:** На твоё усмотрение (N)
4. **Redirect HTTP to HTTPS:** **ДА** (2) - автоматически перенаправляет на HTTPS

---

### **ШАГ 4: Проверь что работает**

```bash
# Проверь статус Nginx
sudo systemctl status nginx

# Проверь конфигурацию Nginx
sudo nginx -t

# Перезагрузи Nginx (если нужно)
sudo systemctl reload nginx
```

**Открой в браузере:**
```
https://onai.academy
```

Должен быть **🔒 замочек** в адресной строке!

---

### **ШАГ 5: Автоматическое продление**

Certbot автоматически настраивает cron job для продления сертификата.

**Проверка автопродления:**
```bash
# Тест продления (не продлевает, только проверяет)
sudo certbot renew --dry-run
```

Если всё ОК, сертификат будет продлеваться автоматически каждые 90 дней.

---

## 📋 ЧТО CERTBOT ДЕЛАЕТ АВТОМАТИЧЕСКИ:

1. ✅ Получает бесплатный SSL сертификат от Let's Encrypt
2. ✅ Обновляет конфигурацию Nginx
3. ✅ Настраивает редирект с HTTP на HTTPS
4. ✅ Настраивает автоматическое продление (каждые 90 дней)

---

## 🔍 ПРОВЕРКА КОНФИГУРАЦИИ NGINX

После установки SSL, проверь что конфигурация корректна:

```bash
cat /etc/nginx/sites-available/default
```

Должно быть примерно так:

```nginx
server {
    listen 80;
    server_name onai.academy www.onai.academy;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name onai.academy www.onai.academy;

    # SSL сертификаты (Certbot добавляет автоматически)
    ssl_certificate /etc/letsencrypt/live/onai.academy/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onai.academy/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Прокси для API (если нужно)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🚨 УСТРАНЕНИЕ ПРОБЛЕМ

### **Проблема 1: Port 80 занят**
```bash
# Останови PM2 приложения на 80 порту
pm2 list
pm2 stop <app-name-on-port-80>

# Попробуй снова
sudo certbot --nginx -d onai.academy
```

### **Проблема 2: DNS не настроен**
```bash
# Проверь что домен указывает на сервер
dig onai.academy

# Должен быть A-record:
# onai.academy. 300 IN A 178.128.203.40
```

Если нет - настрой DNS:
1. Открой панель управления доменом
2. Добавь A-record:
   - Name: `@` (или `onai.academy`)
   - Type: `A`
   - Value: `178.128.203.40`
   - TTL: `300`

3. Добавь CNAME для www:
   - Name: `www`
   - Type: `CNAME`
   - Value: `onai.academy`

**Подожди 5-10 минут** пока DNS обновится.

### **Проблема 3: Certbot не может подтвердить домен**
```bash
# Убедись что Nginx работает
sudo systemctl start nginx

# Убедись что .well-known доступен
sudo mkdir -p /var/www/onai-integrator-login/.well-known
sudo chmod -R 755 /var/www/onai-integrator-login/.well-known

# Попробуй снова
sudo certbot --nginx -d onai.academy
```

---

## ✅ ПРОВЕРКА ПОСЛЕ УСТАНОВКИ

### **1. Проверь SSL на сайте:**
```
https://www.ssllabs.com/ssltest/analyze.html?d=onai.academy
```

Должна быть оценка **A** или **A+**

### **2. Проверь редирект:**
```bash
curl -I http://onai.academy
```

Должен быть `301 Moved Permanently` → `https://onai.academy`

### **3. Проверь сертификат:**
```bash
sudo certbot certificates
```

Должно показать:
```
Certificate Name: onai.academy
  Domains: onai.academy www.onai.academy
  Expiry Date: 2026-02-05
  Certificate Path: /etc/letsencrypt/live/onai.academy/fullchain.pem
  Private Key Path: /etc/letsencrypt/live/onai.academy/privkey.pem
```

---

## 🔄 ПРОДЛЕНИЕ СЕРТИФИКАТА ВРУЧНУЮ

Если нужно продлить вручную:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 📊 МОНИТОРИНГ

Настрой уведомления о скором истечении сертификата:

```bash
# Добавь в crontab
sudo crontab -e

# Добавь строку (проверка каждый понедельник в 2:00)
0 2 * * 1 certbot renew --quiet && systemctl reload nginx
```

---

## 🎯 ИТОГ

После выполнения всех шагов:

✅ **onai.academy** работает через HTTPS  
✅ HTTP автоматически редиректит на HTTPS  
✅ Бесплатный SSL сертификат от Let's Encrypt  
✅ Автоматическое продление каждые 90 дней  
✅ Оценка безопасности A/A+ на SSL Labs  

**Время выполнения:** ~5-10 минут

---

## 🆘 ПОДДЕРЖКА

Если что-то не работает:

1. Покажи вывод: `sudo certbot --nginx -d onai.academy`
2. Покажи логи Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Проверь статус: `sudo systemctl status nginx`

Я помогу разобраться! 🚀

