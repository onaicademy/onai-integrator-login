# 🚨 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ДЛЯ ПРОДАКШЕНА

## 📊 ТЕКУЩЕЕ ПРОБЛЕМЫ

### 1. ❌ НЕВЕРНЫЕ FACEBOOK КЛЮЧИ НА ПРОДАКШЕНЕ

**Проблема:** На продакшене в `/var/www/onai-integrator-login-main/backend/.env`:
```env
FACEBOOK_ADS_TOKEN=placeholder
FACEBOOK_APP_SECRET=placeholder
```

**Должно быть:**
```env
FACEBOOK_ADS_TOKEN=EAAPVZCSfHj0YBQYRvFwPJZAG2GZATGcxKznXpdNOgnq3J74c005jDZBMZCZAUMEhsMbq5mdZC7CYCMHLo3D8G4Y38UssSaReDgaZBL4nnEBcgavooPBHfmd17UEksGkYW3jjGyDYJFvVdnZBRZCcn4HAZCA6U9ZCjNgJM9RjZCrT2iZCZCkuRjTQmGPfDq9ZAvV41M62m6Vf
FACEBOOK_APP_SECRET=<настоящий секрет из локального .env>
```

### 2. ❌ СТАРЫЙ BUILD НА ПРОДАКШЕНЕ

**Проблема:** Build ID на продакшене: `20251223-2035-FULL-DEPLOY` (от 23 декабря)

**Должно быть:** Последний build с исправлениями Team Constructor

**Последствия:**
- Team Constructor не работает (403, 500 ошибки)
- Нет объединенного интерфейса создания команды
- Ключи Facebook не работают

### 3. ❌ ОШИБКИ В TRAFFIC CONSTRUCTOR

**Проблемы:**
- `GET /api/traffic-constructor/teams` → 403 Forbidden
- `POST /api/traffic-constructor/teams` → 500 Internal Server Error
- `POST /api/traffic-constructor/users` → 403 Forbidden

**Причины:**
- Старый build без исправлений
- Возможно проблемы с middleware авторизации

---

## 🛠️ ПЛАН ИСПРАВЛЕНИЙ

### Шаг 1: Исправить .env на продакшене

```bash
# Подключиться к серверу
ssh root@207.154.231.30

# Открыть .env файл
cd /var/www/onai-integrator-login-main/backend
nano .env

# Найти и исправить строки:
FACEBOOK_ADS_TOKEN=placeholder
FACEBOOK_APP_SECRET=placeholder

# Заменить на:
FACEBOOK_ADS_TOKEN=EAAPVZCSfHj0YBQYRvFwPJZAG2GZATGcxKznXpdNOgnq3J74c005jDZBMZCZAUMEhsMbq5mdZC7CYCMHLo3D8G4Y38UssSaReDgaZBL4nnEBcgavooPBHfmd17UEksGkYW3jjGyDYJFvVdnZBRZCcn4HAZCA6U9ZCjNgJM9RjZCrT2iZCZCkuRjTQmGPfDq9ZAvV41M62m6Vf
FACEBOOK_APP_SECRET=<получить из локального .env>

# Сохранить (Ctrl+O, Enter, Ctrl+X)
```

### Шаг 2: Собрать новый build

```bash
# На локальной машине
cd /Users/miso/onai-integrator-login

# Собрать frontend
npm run build

# Создать архив
tar -czf deploy-20251228-traffic-fix.tar.gz dist/ backend/
```

### Шаг 3: Задеплоить на продакшен

```bash
# Скопировать архив на сервер
scp deploy-20251228-traffic-fix.tar.gz root@207.154.231.30:/var/www/

# Подключиться к серверу
ssh root@207.154.231.30

# Распаковать архив
cd /var/www/onai-integrator-login-main
rm -rf dist/
tar -xzf /var/www/deploy-20251228-traffic-fix.tar.gz

# Перезапустить backend
pm2 restart onai-backend

# Перезагрузить Nginx
systemctl reload nginx
```

### Шаг 4: Проверить Build ID

```bash
# Открыть в браузере
curl -s https://traffic.onai.academy/traffic/admin/team-constructor | grep "Build ID"

# Должен показать новый Build ID (например: 20251228-XXXX-TRAFFIC-FIX)
```

### Шаг 5: Протестировать Team Constructor

```bash
# Тест GET teams
curl -X GET https://traffic.onai.academy/api/traffic-constructor/teams \
  -H "Authorization: Bearer <токен>"

# Тест POST team
curl -X POST https://traffic.onai.academy/api/traffic-constructor/teams \
  -H "Authorization: Bearer <токен>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team",
    "direction": "Test Direction"
  }'
```

---

## 🔍 ДИАГНОСТИКА

### Проверить логи backend

```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100"
```

### Проверить ошибки Facebook

```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100 | grep -i facebook"
```

### Проверить ошибки AmoCRM

```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 100 | grep -i amocrm"
```

---

## 📋 CHECKLIST

- [ ] Получить `FACEBOOK_APP_SECRET` из локального .env
- [ ] Исправить `FACEBOOK_ADS_TOKEN` на продакшене
- [ ] Исправить `FACEBOOK_APP_SECRET` на продакшене
- [ ] Собрать новый build с исправлениями Team Constructor
- [ ] Задеплоить новый build на продакшен
- [ ] Перезапустить backend
- [ ] Проверить новый Build ID
- [ ] Протестировать GET /api/traffic-constructor/teams
- [ ] Протестировать POST /api/traffic-constructor/teams
- [ ] Протестировать создание команды с пользователем
- [ ] Проверить что Facebook интеграция работает
- [ ] Проверить что AmoCRM интеграция работает

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После выполнения всех шагов:

1. ✅ Build ID будет новым (20251228-XXXX)
2. ✅ Team Constructor будет работать
3. ✅ Создание команды с пользователем будет работать
4. ✅ Facebook интеграция будет работать
5. ✅ AmoCRM интеграция будет работать
6. ✅ Нет ошибок 403 и 500

---

## 📝 ЗАМЕТКИ

**Почему ключи "слетают":**
- На продакшене они не заданы правильно (placeholder)
- При деплое .env файл не обновляется
- Нужно вручную синхронизировать ключи

**Почему Team Constructor не работает:**
- На продакшене старый build от 23 декабря
- Нет исправлений авторизации и создания команд
- Нужно задеплоить новую версию

---

**Дата создания:** 2025-12-28  
**Статус:** В ожидании исправлений  
**Приоритет:** КРИТИЧЕСКИЙ
