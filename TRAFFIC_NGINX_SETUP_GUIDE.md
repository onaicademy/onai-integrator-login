# 🚀 Traffic Dashboard - Nginx Setup Guide

## Шаги для настройки поддомена traffic.onai.academy

### 1. SSL Сертификат (Let's Encrypt)

```bash
# Установить certbot (если не установлен)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Получить SSL сертификат для traffic.onai.academy
sudo certbot certonly --nginx -d traffic.onai.academy

# Сертификаты будут сохранены в:
# /etc/letsencrypt/live/traffic.onai.academy/fullchain.pem
# /etc/letsencrypt/live/traffic.onai.academy/privkey.pem
```

### 2. Установка Nginx конфигурации

```bash
# Скопировать конфиг на сервер (с локальной машины)
scp nginx-traffic.onai.academy.conf root@207.154.231.30:/etc/nginx/sites-available/traffic.onai.academy

# Или создать файл напрямую на сервере:
ssh root@207.154.231.30
nano /etc/nginx/sites-available/traffic.onai.academy
# (вставить содержимое из nginx-traffic.onai.academy.conf)
```

### 3. Активировать конфигурацию

```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/traffic.onai.academy /etc/nginx/sites-enabled/

# Проверить синтаксис конфигурации
sudo nginx -t

# Если всё OK, перезагрузить Nginx
sudo systemctl reload nginx

# Проверить статус
sudo systemctl status nginx
```

### 4. Проверка DNS

DNS уже настроен (пользователь сказал "я уже DNS прописал"), но для проверки:

```bash
# Проверить A-запись
dig traffic.onai.academy

# Должно вернуть IP: 207.154.231.30
```

### 5. Проверка работоспособности

```bash
# Проверить HTTP → HTTPS редирект
curl -I http://traffic.onai.academy

# Должен вернуть: 301 Moved Permanently, Location: https://traffic.onai.academy

# Проверить HTTPS
curl -I https://traffic.onai.academy

# Должен вернуть: 200 OK

# Проверить API через поддомен
curl https://traffic.onai.academy/api/health
```

### 6. Логи Nginx

```bash
# Просмотр access logs
tail -f /var/log/nginx/traffic.onai.academy-access.log

# Просмотр error logs
tail -f /var/log/nginx/traffic.onai.academy-error.log
```

## Troubleshooting

### Проблема: 502 Bad Gateway
**Причина:** Backend не запущен на порту 3000

**Решение:**
```bash
pm2 status
pm2 restart onai-backend
```

### Проблема: SSL сертификат не работает
**Причина:** Certbot не смог проверить домен

**Решение:**
```bash
# Проверить, что DNS указывает на правильный IP
ping traffic.onai.academy

# Переполучить сертификат
sudo certbot --nginx -d traffic.onai.academy --force-renewal
```

### Проблема: Nginx не запускается
**Причина:** Ошибка в конфигурации

**Решение:**
```bash
# Проверить синтаксис
sudo nginx -t

# Посмотреть подробные ошибки
sudo journalctl -u nginx -n 50
```

## Финальная проверка

После настройки проверьте:

1. ✅ https://traffic.onai.academy → должна открыться страница логина
2. ✅ https://traffic.onai.academy/api/health → должен вернуть статус backend
3. ✅ https://traffic.onai.academy/login → страница логина
4. ✅ https://traffic.onai.academy/cabinet/kenesary → редирект на login (если не авторизован)

## 🎉 Готово!

После выполнения всех шагов поддомен `traffic.onai.academy` будет полностью работать!




