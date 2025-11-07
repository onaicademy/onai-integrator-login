# 🚀 КАК СДЕЛАТЬ ДЕПЛОЙ ЧЕРЕЗ GITHUB ACTIONS

**Последнее обновление:** 7 ноября 2025  
**Статус:** ✅ Готово к запуску

---

## 🎯 ЧТО ДЕЛАТЬ (2 ШАГА):

### **ШАГ 1: НАСТРОЙ GITHUB SECRETS** 🔐

Тебе нужно **ОДИН РАЗ** добавить секреты в GitHub:

1. **Открой репозиторий:**
   ```
   https://github.com/onaicademy/onai-integrator-login
   ```

2. **Перейди в настройки:**
   - `Settings` → `Secrets and variables` → `Actions`

3. **Нажми `New repository secret`** и добавь каждый секрет:

---

#### 📝 СПИСОК СЕКРЕТОВ (копируй по одному):

| **Name** | **Value** | **Откуда взять** |
|----------|-----------|------------------|
| `DO_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----...` | SSH ключ от Digital Ocean сервера |
| `VITE_SUPABASE_URL` | `https://capdjvokjdivxjfdddmx.supabase.co` | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1...` | Supabase Dashboard |
| `VITE_OPENAI_API_KEY` | `sk-proj-...` | OpenAI Platform |
| `VITE_ASSISTANT_ID` | `asst_...` | OpenAI Platform (твой AI-куратор) |
| `VITE_TELEGRAM_AI_MENTOR_TOKEN` | `8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo` | @BotFather |
| `VITE_TELEGRAM_AI_ANALYST_TOKEN` | `8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4` | @BotFather |

---

#### 🔑 КАК НАЙТИ SSH КЛЮЧ:

**Если ключ на твоём компьютере:**
```bash
# Найди приватный ключ (обычно в ~/.ssh/)
cat ~/.ssh/id_rsa
# или
cat ~/.ssh/digital_ocean_key

# Скопируй ВЕСЬ вывод (включая BEGIN/END)
```

**Если ключа нет:**
```bash
# Создай новый SSH ключ
ssh-keygen -t rsa -b 4096 -C "deploy@onai-integrator"

# Скопируй приватный ключ
cat ~/.ssh/id_rsa

# Добавь публичный ключ на сервер
ssh-copy-id root@178.128.203.40
# или вручную:
cat ~/.ssh/id_rsa.pub
# Скопируй и добавь в /root/.ssh/authorized_keys на сервере
```

---

### **ШАГ 2: ЗАПУСТИ ДЕПЛОЙ** 🚀

1. **Открой GitHub Actions:**
   ```
   https://github.com/onaicademy/onai-integrator-login/actions
   ```

2. **Выбери workflow:**
   - Нажми на `Deploy to DigitalOcean Droplet` (слева в списке)

3. **Запусти вручную:**
   - Нажми `Run workflow` (справа сверху)
   - Выбери ветку `main`
   - Нажми зелёную кнопку `Run workflow`

4. **Смотри прогресс:**
   - Откроется новый запуск
   - Увидишь логи в реальном времени:
     ```
     ✓ Checkout repo
     ✓ Set up Node.js
     ✓ Deploy to Droplet via SSH
       - cd /var/www/onai-integrator-login
       - git pull origin main
       - npm install
       - Updating .env file...
       - npm run build
       - Configuring Nginx...
       - pm2 restart onai-app
       ✅ Deployed successfully to DigitalOcean!
     ```

5. **Проверь результат:**
   - ✅ Зелёная галочка = успешный деплой
   - ❌ Красный крестик = ошибка (посмотри логи)

---

## ⏱️ СКОЛЬКО ЗАЙМЁТ ВРЕМЕНИ?

- **Первый раз (настройка secrets):** ~5-10 минут
- **Каждый последующий деплой:** ~2-3 минуты (автоматически)

---

## 🎯 ЧТО ПРОИСХОДИТ ПРИ ДЕПЛОЕ:

```mermaid
graph LR
    A[GitHub Actions] --> B[Подключение к серверу]
    B --> C[git pull main]
    C --> D[npm install]
    D --> E[Создание .env]
    E --> F[npm run build]
    F --> G[Настройка Nginx]
    G --> H[Перезапуск PM2]
    H --> I[✅ Деплой готов!]
```

**В деталях:**
1. ✅ Подключается к серверу по SSH
2. ✅ Переходит в `/var/www/onai-integrator-login`
3. ✅ Скачивает последний код (`git pull`)
4. ✅ Устанавливает зависимости (`npm install`)
5. ✅ Создаёт `.env` с секретами из GitHub
6. ✅ Собирает production билд (`npm run build`)
7. ✅ Настраивает Nginx для SPA
8. ✅ Перезапускает приложение через PM2
9. ✅ Сайт обновлён! 🎉

---

## 🔍 ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

**Открой сайт:**
```
https://integratoronai.kz
```

**Проверь что работает:**
- ✅ Страница загружается
- ✅ Можешь войти (`saint@onaiacademy.kz`)
- ✅ AI-куратор отвечает
- ✅ Админ панель работает
- ✅ Достижения загружаются
- ✅ Нет ошибок в консоли (F12)

---

## 🆘 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### ❌ Ошибка: "Error: Process completed with exit code 1"

**Причина:** SSH ключ не настроен или неправильный

**Решение:**
1. Проверь что `DO_SSH_KEY` добавлен в GitHub Secrets
2. Проверь что ключ валидный (начинается с `-----BEGIN RSA PRIVATE KEY-----`)
3. Проверь что публичный ключ добавлен на сервер:
   ```bash
   ssh root@178.128.203.40
   cat ~/.ssh/authorized_keys
   ```

---

### ❌ Ошибка: "Permission denied (publickey)"

**Решение:**
```bash
# На локальном компьютере:
ssh-copy-id root@178.128.203.40

# Или вручную на сервере:
echo "твой_публичный_ключ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

### ❌ Ошибка: "npm run build failed"

**Причина:** Не хватает переменных окружения

**Решение:**
1. Проверь что ВСЕ secrets добавлены в GitHub
2. Посмотри логи деплоя - какая переменная отсутствует
3. Добавь недостающий secret и перезапусти деплой

---

### ❌ Сайт не обновился

**Решение:**
```bash
# Подключись к серверу
ssh root@178.128.203.40

# Проверь последний коммит
cd /var/www/onai-integrator-login
git log -1

# Проверь билд
ls -lh dist/

# Проверь Nginx
nginx -t
systemctl status nginx

# Перезапусти вручную
npm run build
systemctl reload nginx
pm2 restart all
```

---

## 🎯 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ (ОПЦИОНАЛЬНО)

**Если хочешь автоматический деплой при каждом push:**

Отредактируй `.github/workflows/deploy.yml`:

```yaml
# Было (ручной запуск):
on:
  workflow_dispatch:

# Измени на (автоматический):
on:
  push:
    branches:
      - main
```

**После этого:**
- ✅ Каждый `git push` на `main` = автоматический деплой
- ⚠️ Убедись что всё работает, прежде чем включать автодеплой!

---

## 📊 МОНИТОРИНГ ДЕПЛОЕВ

**Все деплои можно посмотреть:**
```
https://github.com/onaicademy/onai-integrator-login/actions
```

**Что видно:**
- 📅 История всех деплоев
- ⏱️ Длительность каждого деплоя
- ✅ Успешные / ❌ Провальные
- 📝 Логи каждого шага

---

## ✅ ЧЕКЛИСТ ПЕРВОГО ДЕПЛОЯ

```
□ Добавил DO_SSH_KEY в GitHub Secrets
□ Добавил VITE_SUPABASE_URL в GitHub Secrets
□ Добавил VITE_SUPABASE_ANON_KEY в GitHub Secrets
□ Добавил VITE_OPENAI_API_KEY в GitHub Secrets
□ Добавил VITE_ASSISTANT_ID в GitHub Secrets
□ Добавил VITE_TELEGRAM_AI_MENTOR_TOKEN в GitHub Secrets
□ Добавил VITE_TELEGRAM_AI_ANALYST_TOKEN в GitHub Secrets
□ Открыл GitHub Actions
□ Выбрал "Deploy to DigitalOcean Droplet"
□ Нажал "Run workflow"
□ Дождался зелёной галочки ✅
□ Открыл https://integratoronai.kz
□ Проверил что всё работает
```

---

## 🎉 ГОТОВО!

**Теперь деплой делается в 2 клика! 🚀**

1. **Открой:** https://github.com/onaicademy/onai-integrator-login/actions
2. **Нажми:** `Run workflow` → `Run workflow`
3. **Жди:** ~2-3 минуты
4. **Проверь:** https://integratoronai.kz

**Всё работает автоматически! 🤖✨**

