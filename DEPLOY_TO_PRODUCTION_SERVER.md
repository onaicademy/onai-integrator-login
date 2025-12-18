# 🚨 КРИТИЧНО: DEPLOY НА PRODUCTION СЕРВЕР

## ❌ ПРОБЛЕМА:

Домен `onai.academy` указывает НЕ на Vercel, а на **nginx сервер (Ubuntu)**!

```bash
curl -I https://onai.academy
# server: nginx/1.24.0 (Ubuntu)
# last-modified: Thu, 18 Dec 2025 14:30:50 GMT
```

**ЭТО ЗНАЧИТ:**
- Git push на GitHub → деплоится на Vercel
- НО домен `onai.academy` смотрит на другой сервер
- Там старая версия сайта
- Нужно задеплоить на NGINX сервер!

---

## 🎯 ДВА ВАРИАНТА:

### ВАРИАНТ 1: Перенастроить DNS на Vercel (РЕКОМЕНДУЕТСЯ)
```
1. Зайти в DNS настройки домена onai.academy
2. Изменить A-record или CNAME на Vercel IP
3. Подождать обновления DNS (до 48 часов)
```

**Преимущества:**
- ✅ Автоматический деплой при git push
- ✅ CDN, быстрая загрузка
- ✅ Не нужно ручной деплой

---

### ВАРИАНТ 2: Деплой на NGINX сервер (СЕЙЧАС)

#### Шаг 1: Собрать фронтенд
```bash
cd /Users/miso/onai-integrator-login
npm run build
# → dist/ folder создан
```

#### Шаг 2: Подключиться к серверу
```bash
ssh user@<server-ip>
# или
ssh user@onai.academy
```

#### Шаг 3: Загрузить dist на сервер
```bash
# Со своего Mac:
cd /Users/miso/onai-integrator-login
rsync -avz --delete dist/ user@onai.academy:/var/www/onai.academy/html/

# ИЛИ через SCP:
scp -r dist/* user@onai.academy:/var/www/onai.academy/html/
```

#### Шаг 4: Очистить кеш NGINX
```bash
# На сервере:
sudo nginx -s reload
sudo systemctl restart nginx

# ИЛИ очистить кеш браузера:
# Headers должны быть без кеша
```

---

## 🔑 ДАННЫЕ ДЛЯ SSH (НУЖНЫ):

```
❓ IP сервера: ???
❓ SSH user: ???
❓ SSH password/key: ???
❓ Путь к сайту: /var/www/onai.academy/html/ ???
```

---

## 📊 ТЕКУЩИЙ СТАТУС:

### ✅ Git / GitHub:
```bash
git log --oneline -5
# 9ab1391 🚀 FORCE REDEPLOY
# 8526881 🔧 Force rebuild: Vercel config
# d797189 📋 Sales Webhook - Финальный статус
# 98f4c96 🎉 AmoCRM Sales Webhook
# dae723d 📋 Инструкция по setup Supabase
```
**ВСЁ ЗАКОММИЧЕНО И ЗАПУШЕНО!**

### ✅ Build успешен:
```bash
npm run build
# ✓ 9251 modules transformed
# dist/ folder ready
```

### ❌ Production сервер:
```
last-modified: Thu, 18 Dec 2025 14:30:50 GMT
```
**СТАРАЯ ВЕРСИЯ ОТ 14:30!**

---

## 🚀 БЫСТРЫЙ ДЕПЛОЙ (если есть SSH доступ):

```bash
#!/bin/bash
# deploy.sh

cd /Users/miso/onai-integrator-login

echo "📦 Building..."
npm run build

echo "🚀 Deploying to production..."
rsync -avz --delete dist/ user@onai.academy:/var/www/onai.academy/html/

echo "🔄 Reloading nginx..."
ssh user@onai.academy 'sudo nginx -s reload'

echo "✅ Deploy complete!"
echo "🌐 Check: https://onai.academy"
```

---

## 🔍 КАК ПРОВЕРИТЬ:

### 1. Проверить что именно на production:
```bash
curl -s https://onai.academy | grep -i "traffic analytics"
curl -s https://onai.academy | grep -i "команд трафика"
```

### 2. Проверить дату обновления:
```bash
curl -I https://onai.academy | grep "last-modified"
```

### 3. Проверить что DNS указывает на Vercel:
```bash
dig onai.academy +short
# Должен быть Vercel IP (76.76.21.21 или подобный)
```

---

## ✅ CHECKLIST:

- [x] Git push выполнен
- [x] Build успешен (dist/ ready)
- [ ] **SSH доступ к серверу получен**
- [ ] **dist/ загружен на сервер**
- [ ] **NGINX перезагружен**
- [ ] **Проверка в инкогнито: новая версия**

---

## 🆘 ЕСЛИ НЕТ SSH ДОСТУПА:

**НУЖНЫ ДАННЫЕ:**
1. IP адрес сервера
2. SSH логин/пароль
3. Путь к сайту на сервере

**ИЛИ:**
Перенастроить DNS на Vercel и забыть про ручной деплой!

---

**БРАТАН, ПРОБЛЕМА В ТОМ ЧТО ДОМЕН УКАЗЫВАЕТ НЕ НА VERCEL!**
**НУЖНЫ SSH ДАННЫЕ ДЛЯ СЕРВЕРА ИЛИ ПЕРЕНАСТРОИТЬ DNS!**
