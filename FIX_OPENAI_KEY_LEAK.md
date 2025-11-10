# 🔐 ИСПРАВЛЕНИЕ УТЕЧКИ OPENAI API КЛЮЧА

**Проблема:** OpenAI отзывает API ключ через пару часов после добавления в проект  
**Причина:** Ключ попал в историю Git и был найден сканером OpenAI  
**Решение:** Полная очистка истории + новый ключ + защита от будущих утечек

---

## 🚨 ЧТО ПРОИЗОШЛО

1. API ключ был добавлен в `.env` файл
2. Файл был закоммичен в Git (даже если позже удалён)
3. GitHub Actions или публичный репозиторий выставили ключ
4. OpenAI сканер нашёл ключ в истории коммитов
5. Ключ автоматически отозван через 2-4 часа

**❌ GitHub Secrets НЕ ПОМОГАЮТ** - они не защищают от утечек в истории Git!

---

## ✅ ПРАВИЛЬНОЕ РЕШЕНИЕ (ШАГ ЗА ШАГОМ)

### Шаг 1: Создать новый API ключ в OpenAI

1. Открой: https://platform.openai.com/api-keys
2. **Отзови старый ключ** (если он ещё не отозван)
3. Нажми **"Create new secret key"**
4. Назови: `onAI-Academy-Production`
5. **Скопируй ключ** (он покажется только раз!)
6. Сохрани в **безопасное место** (например, password manager)

---

### Шаг 2: Проверить что .env в .gitignore

```bash
# В корне проекта выполни:
cat .gitignore | grep -E "^\.env$"
```

**Ожидаемый результат:**
```
.env
.env.local
.env.production
```

**Если `.env` НЕТ в .gitignore - добавь:**
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

---

### Шаг 3: Очистить историю Git от старого ключа

⚠️ **ВАЖНО:** Это удалит ключ из ВСЕХ коммитов!

**Вариант A: Полная очистка .env из истории**
```bash
# Удалить .env из всей истории Git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Очистить рефлоги
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Форсированный push (ОСТОРОЖНО!)
git push origin --force --all
```

**Вариант B: Создать новый репозиторий (проще)**
```bash
# 1. Сделать бэкап текущего кода
cp -r onai-integrator-login onai-integrator-login-backup

# 2. Удалить .git папку
rm -rf .git

# 3. Создать новый репозиторий
git init
git add .
git commit -m "Initial commit (clean)"

# 4. Пушнуть в GitHub (создай новый приватный репо)
git remote add origin https://github.com/onaicademy/onai-academy-clean.git
git push -u origin main
```

---

### Шаг 4: Настроить .env правильно

**Локально (твой компьютер):**
```bash
# Создать .env файл (НЕ коммитить!)
cat > .env << 'EOF'
# Supabase
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=твой_supabase_ключ

# OpenAI - НОВЫЙ КЛЮЧ!
VITE_OPENAI_API_KEY=sk-proj-НОВЫЙ_КЛЮЧ_СЮДА
VITE_OPENAI_ASSISTANT_ID=asst_SYhUvkKgCMEYlAjA0VNSMbLa

# Telegram Bots
VITE_AI_MENTOR_TELEGRAM_TOKEN=8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo
VITE_AI_ANALYST_TELEGRAM_TOKEN=8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4
EOF
```

**На сервере (Digital Ocean):**
```bash
ssh root@your-server-ip
cd /var/www/onai-academy
nano .env
# Вставь тот же контент с НОВЫМ ключом
# Сохрани: Ctrl+O, Enter, Ctrl+X
```

---

### Шаг 5: Создать .env.example (без ключей)

```bash
cat > .env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-your_openai_key_here
VITE_OPENAI_ASSISTANT_ID=asst_your_assistant_id_here

# Telegram Bots
VITE_AI_MENTOR_TELEGRAM_TOKEN=your_mentor_bot_token_here
VITE_AI_ANALYST_TELEGRAM_TOKEN=your_analyst_bot_token_here

# Site Configuration
VITE_SITE_URL=https://your-domain.com
VITE_APP_URL=https://your-domain.com
EOF

# Закоммитить .env.example (это безопасно)
git add .env.example
git commit -m "docs: add .env.example template"
```

---

### Шаг 6: Настроить GitHub Secrets ПРАВИЛЬНО

**Это нужно для GitHub Actions, если используешь CI/CD:**

1. Открой: `https://github.com/onaicademy/onai-integrator-login/settings/secrets/actions`
2. Нажми **"New repository secret"**
3. Добавь секреты:
   - `VITE_OPENAI_API_KEY` = твой новый ключ
   - `VITE_SUPABASE_URL` = твой Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = твой Supabase ключ

**В GitHub Actions workflow (.github/workflows/deploy.yml):**
```yaml
env:
  VITE_OPENAI_API_KEY: ${{ secrets.VITE_OPENAI_API_KEY }}
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

---

### Шаг 7: Защита от будущих утечек

**Добавить pre-commit hook:**
```bash
# Создать .git/hooks/pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Проверка что .env не добавлен в коммит
if git diff --cached --name-only | grep -E "^\.env$"; then
  echo "❌ ОШИБКА: Попытка закоммитить .env файл!"
  echo "Удали .env из staging area:"
  echo "  git reset HEAD .env"
  exit 1
fi

# Проверка на наличие API ключей в коде
if git diff --cached | grep -E "sk-proj-|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; then
  echo "⚠️ ВНИМАНИЕ: Обнаружен возможный API ключ в коде!"
  echo "Убедись что ключи в .env, а не в коде!"
  read -p "Продолжить? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

exit 0
EOF

# Сделать скрипт исполняемым
chmod +x .git/hooks/pre-commit
```

---

## 🔒 ПРАВИЛА БЕЗОПАСНОСТИ (ЗАПОМНИ!)

### ✅ МОЖНО:
- ✅ Хранить ключи в `.env` файле (если он в .gitignore)
- ✅ Использовать GitHub Secrets для CI/CD
- ✅ Коммитить `.env.example` с плейсхолдерами
- ✅ Хранить ключи в password manager (1Password, Bitwarden)

### ❌ НЕЛЬЗЯ:
- ❌ Коммитить `.env` в Git
- ❌ Хардкодить ключи в коде (`const key = "sk-proj-..."`)
- ❌ Отправлять ключи в чатах (даже в приватных)
- ❌ Логировать полные ключи в консоль
- ❌ Хранить ключи в публичных репозиториях

---

## 🧪 ПРОВЕРКА ЧТО ВСЁ БЕЗОПАСНО

### Тест 1: .env не в Git
```bash
git ls-files | grep -E "^\.env$"
# Должно быть ПУСТО
```

### Тест 2: .env в .gitignore
```bash
grep -E "^\.env" .gitignore
# Должно показать: .env
```

### Тест 3: История Git чистая
```bash
git log --all --full-history --source --oneline -- .env
# Должно быть ПУСТО (или показать только удаления)
```

### Тест 4: Поиск ключей в коде
```bash
grep -r "sk-proj-" src/
# Должно быть ПУСТО
```

---

## 📊 МОНИТОРИНГ API КЛЮЧА

### Проверка использования:
1. Открой: https://platform.openai.com/usage
2. Смотри расход токенов
3. Настрой лимиты (Usage limits)

### Настройка алертов:
1. Settings → Billing → Usage limits
2. Установи лимит: $50/месяц
3. Email alert при: 80% лимита

---

## 🆘 ЕСЛИ КЛЮЧ СНОВА ОТОЗВАН

1. **НЕ ПАНИКУЙ** - создай новый ключ
2. **ПРОВЕРЬ** историю Git: `git log --all --full-history -- .env`
3. **УДАЛИ** репозиторий если ключ в истории
4. **СОЗДАЙ** новый приватный репозиторий
5. **НАСТРОЙ** pre-commit hooks

---

## 📞 КУДА ОБРАТИТЬСЯ ЗА ПОМОЩЬЮ

- **OpenAI Support:** https://help.openai.com/
- **GitHub Security:** https://github.com/security
- **Git Filter-Repo:** https://github.com/newren/git-filter-repo

---

## ✅ ЧЕКЛИСТ БЕЗОПАСНОСТИ

- [ ] Создан новый OpenAI API ключ
- [ ] `.env` добавлен в `.gitignore`
- [ ] История Git очищена от старого ключа
- [ ] `.env.example` создан и закоммичен
- [ ] GitHub Secrets настроены (если нужно)
- [ ] Pre-commit hook установлен
- [ ] Ключ сохранён в password manager
- [ ] Настроены лимиты использования в OpenAI
- [ ] Проверено что ключи не в коде

---

**После выполнения всех шагов - ключ будет в безопасности! 🔒**

