# 🔒 ИСПРАВЛЕНИЕ SSL ДЛЯ ONAI.ACADEMY

## ⚠️ ТЕКУЩАЯ ПРОБЛЕМА:

```
❌ Сертификат выдан для: integratoronai.kz
❌ Нужен сертификат для: onai.academy
```

**Браузер показывает:** "Соединение не защищено" или "NET::ERR_CERT_COMMON_NAME_INVALID"

---

## ✅ РЕШЕНИЕ (5 МИНУТ):

### **ШАГ 1: Подключись к серверу**

```bash
ssh root@178.128.203.40
```

---

### **ШАГ 2: Получи сертификат для onai.academy**

```bash
# Получаем новый сертификат для onai.academy
sudo certbot --nginx -d onai.academy -d www.onai.academy
```

**Certbot спросит:**
1. **Email:** Введи свой email (если ещё не вводил)
2. **Terms of Service:** Нажми `Y`
3. **Share email:** На твоё усмотрение `N`
4. **Redirect HTTP to HTTPS:** Нажми `2` (ДА)

---

### **ШАГ 3: Проверь конфигурацию Nginx**

```bash
# Проверь что Nginx корректно настроен
sudo nginx -t

# Если всё ОК, перезапусти Nginx
sudo systemctl reload nginx
```

---

### **ШАГ 4: Проверь что работает**

**Открой в браузере:**
```
https://onai.academy
```

**Должен быть:**
- ✅ Зелёный замочек 🔒
- ✅ "Соединение защищено"
- ✅ Сертификат выдан Let's Encrypt для `onai.academy`

---

## 🔍 ПРОВЕРКА СЕРТИФИКАТА

После установки проверь:

```bash
# Посмотри список всех сертификатов
sudo certbot certificates
```

**Должно быть:**
```
Certificate Name: onai.academy
  Domains: onai.academy www.onai.academy
  Expiry Date: 2026-02-05 (или позже)
  Certificate Path: /etc/letsencrypt/live/onai.academy/fullchain.pem
```

---

## 🚨 ЕСЛИ ВОЗНИКНУТ ПРОБЛЕМЫ:

### **Проблема 1: "Too many certificates already issued"**

Let's Encrypt лимит: 5 сертификатов в неделю на домен.

**Решение:**
```bash
# Проверь существующие сертификаты
sudo certbot certificates

# Удали старые/ненужные
sudo certbot delete --cert-name integratoronai.kz

# Попробуй снова
sudo certbot --nginx -d onai.academy
```

---

### **Проблема 2: DNS не указывает на сервер**

```bash
# Проверь DNS
dig onai.academy

# Должен быть A-record:
# onai.academy. 300 IN A 178.128.203.40
```

Если нет - настрой DNS в панели управления доменом:
- **Type:** A
- **Name:** @ (или `onai.academy`)
- **Value:** 178.128.203.40
- **TTL:** 300

Подожди 5-10 минут и попробуй снова.

---

### **Проблема 3: Nginx конфликт портов**

```bash
# Проверь что Nginx слушает правильные порты
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80

# Если порты заняты другим процессом:
sudo lsof -i :443
sudo lsof -i :80
```

---

## 📋 АЛЬТЕРНАТИВА: Добавить домен к существующему сертификату

Если хочешь, чтобы ОДИН сертификат работал для ОБОИХ доменов:

```bash
# Получи сертификат для обоих доменов сразу
sudo certbot --nginx \
  -d integratoronai.kz \
  -d www.integratoronai.kz \
  -d onai.academy \
  -d www.onai.academy

# Выбери "Expand" если спросит
```

---

## ✅ ПОСЛЕ УСТАНОВКИ:

### **Проверь в браузере:**
1. Открой: `https://onai.academy`
2. Кликни на замочек 🔒 в адресной строке
3. Нажми "Сертификат"
4. Проверь:
   - **Выдан для:** `onai.academy`
   - **Выдан:** Let's Encrypt
   - **Действителен до:** ~90 дней от сегодня

### **Проверь редирект:**
```bash
# HTTP должен редиректить на HTTPS
curl -I http://onai.academy
```

Должен быть: `301 Moved Permanently` → `https://onai.academy`

---

## 🔄 АВТОМАТИЧЕСКОЕ ПРОДЛЕНИЕ:

Certbot уже настроил автоматическое продление.

**Проверка:**
```bash
# Тест (не продлевает реально)
sudo certbot renew --dry-run
```

**Если всё ОК:**
```
Congratulations, all simulated renewals succeeded
```

---

## 🎯 ИТОГ:

После выполнения команды:
```bash
sudo certbot --nginx -d onai.academy -d www.onai.academy
```

**Результат:**
- ✅ HTTPS с правильным сертификатом
- ✅ Зелёный замочек в браузере
- ✅ "Соединение защищено"
- ✅ Автопродление каждые 90 дней

**Время:** 5 минут

---

## 🆘 ЕСЛИ НЕ РАБОТАЕТ:

Покажи мне вывод команд:
```bash
sudo certbot certificates
sudo nginx -t
curl -I https://onai.academy
```

Я помогу разобраться! 🚀

