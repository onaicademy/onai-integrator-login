# 🔍 ПОЛНАЯ ДИАГНОСТИКА SUPABASE

**Дата:** 7 ноября 2025  
**Цель:** Выяснить почему не передается API key

---

## ✅ ЧТО ДОБАВЛЕНО

### 1. Диагностика в `src/lib/supabase.ts`

Теперь при загрузке страницы в консоли будет:

```
🔍 SUPABASE ДИАГНОСТИКА
  Все VITE переменные: {
    VITE_SUPABASE_URL: "https://capdjvokjdivxjfdddmx.supabase.co"
    VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    VITE_SUPABASE_ANON_KEY: undefined
    MODE: "production"
    DEV: false
    PROD: true
  }
  ✅ Supabase config: {
    url: "https://capdjvokjdivxjfdddmx.supabase.co"
    keyLength: 208
    keyPreview: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    keyFull: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M..."
  }
```

### 2. Диагностика в `src/pages/Login.tsx`

При попытке входа будет:

```
🔐 ПОПЫТКА ВХОДА
  📧 Email: saint@onaiacademy.kz
  🔑 Password length: 9
  📊 Request payload: {
    email: "saint@onaiacademy.kz"
    password: "***34!"
  }
  📥 Response data: {...}
  ❌ Response error: {...}
```

---

## 🚀 ДЕПЛОЙ ДИАГНОСТИКИ

### 1. Закоммитить и запушить

```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"

git add -A
git commit -m "feat: добавлена детальная диагностика Supabase"
git push origin main
```

### 2. Задеплоить на сервер

```bash
./deploy.sh
```

---

## 🔍 ИНСТРУКЦИЯ ПО СБОРУ ДАННЫХ

### Шаг 1: Открой сайт

https://onai.academy

### Шаг 2: Открой DevTools

- **Windows/Linux:** `F12` или `Ctrl+Shift+I`
- **Mac:** `Cmd+Option+I`

### Шаг 3: Перейди в Console

В DevTools найди вкладку "Console"

### Шаг 4: Перезагрузи страницу

Жёсткая перезагрузка:
- **Windows/Linux:** `Ctrl+Shift+R`
- **Mac:** `Cmd+Shift+R`

### Шаг 5: Скопируй вывод из Console

Должно быть:

```
🔍 SUPABASE ДИАГНОСТИКА
  Все VITE переменные: { ... }
  ✅ Supabase config: { ... }
```

**СКРИНШОТ #1:** Сделай скриншот этого вывода

### Шаг 6: Перейди в Network

В DevTools найди вкладку "Network"

### Шаг 7: Попробуй войти

Введи:
- Email: `saint@onaiacademy.kz`
- Password: `Onai2134!`

Нажми "Войти"

### Шаг 8: Найди запрос /auth/v1/token

В Network найди запрос:
```
POST /auth/v1/token?grant_type=password
```

Нажми на него.

### Шаг 9: Посмотри Headers

Во вкладке "Headers" найди:

**Request Headers:**
```
apikey: eyJhbGci...
Authorization: Bearer eyJhbGci...
Content-Type: application/json
```

**СКРИНШОТ #2:** Сделай скриншот Request Headers

### Шаг 10: Посмотри Payload

Во вкладке "Payload" должно быть:

```json
{
  "email": "saint@onaiacademy.kz",
  "password": "Onai2134!",
  "gotrue_meta_security": {}
}
```

**СКРИНШОТ #3:** Сделай скриншот Payload

### Шаг 11: Посмотри Response

Во вкладке "Response" посмотри что отвечает Supabase:

**Если ошибка:**
```json
{
  "message": "No API key found in request",
  "hint": "No `apikey` request header or url param was found."
}
```

**Или другая ошибка:**
```json
{
  "error": "Invalid login credentials",
  "message": "..."
}
```

**СКРИНШОТ #4:** Сделай скриншот Response

### Шаг 12: Вернись в Console

В Console должно быть:

```
🔐 ПОПЫТКА ВХОДА
  📧 Email: saint@onaiacademy.kz
  🔑 Password length: 9
  📊 Request payload: { ... }
  📥 Response data: null
  ❌ Response error: { ... }

🚨 ОШИБКА SUPABASE: {
  message: "...",
  status: 400,
  name: "AuthApiError",
  fullError: { ... }
}
```

**СКРИНШОТ #5:** Сделай скриншот Console после попытки входа

---

## 📊 НУЖНО ПРИСЛАТЬ

### Обязательно:

1. ✅ **СКРИНШОТ #1:** Console при загрузке (SUPABASE ДИАГНОСТИКА)
2. ✅ **СКРИНШОТ #2:** Network → Headers (Request Headers)
3. ✅ **СКРИНШОТ #3:** Network → Payload
4. ✅ **СКРИНШОТ #4:** Network → Response
5. ✅ **СКРИНШОТ #5:** Console после входа (ПОПЫТКА ВХОДА + ОШИБКА)

### Дополнительно (текстом):

#### Вопрос 1: Что показывает Console при загрузке?

```
Ответ: 
🔍 SUPABASE ДИАГНОСТИКА
  Все VITE переменные: {
    VITE_SUPABASE_URL: "..."
    VITE_SUPABASE_PUBLISHABLE_KEY: "..."
    ...
  }
```

#### Вопрос 2: Есть ли apikey в Request Headers?

```
Ответ: ДА / НЕТ

Если ДА, то:
apikey: eyJhbGci...

Если НЕТ:
(apikey отсутствует)
```

#### Вопрос 3: Что отвечает Supabase в Response?

```
Ответ:
{
  "message": "...",
  ...
}
```

---

## 🔧 ПРОВЕРКА .env НА СЕРВЕРЕ

### SSH на сервер

```bash
ssh root@178.128.203.40
```

### Проверь .env

```bash
cd /var/www/onai-integrator-login
cat .env | grep VITE_SUPABASE
```

**Должно показать:**
```
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjc5MDUsImV4cCI6MjA3Nzc0MzkwNX0.bsikIoF86BjthWauzbLXq3SZbNQFodppZ2TC64NniJs
```

**СКРИНШОТ #6:** Сделай скриншот вывода команды

### Проверь dist/index.html

```bash
cat dist/index.html | head -20
```

Посмотри встроены ли переменные в билд.

---

## ❓ ВОЗМОЖНЫЕ СЦЕНАРИИ

### Сценарий 1: API key ЕСТЬ в headers

**Console:**
```
✅ Supabase config: { keyLength: 208 }
```

**Network Headers:**
```
apikey: eyJhbGci...
Authorization: Bearer eyJhbGci...
```

**Response:**
```json
{
  "error": "Invalid login credentials"
}
```

**Вывод:** API key передаётся! Проблема в учётных данных или настройках Supabase.

**Решение:**
- Проверить пароль админа в Supabase Dashboard
- Проверить Email Auth включён
- Проверить Redirect URLs

---

### Сценарий 2: API key НЕТ в headers

**Console:**
```
✅ Supabase config: { keyLength: 208 }
```

**Network Headers:**
```
(нет apikey)
(нет Authorization)
```

**Response:**
```json
{
  "message": "No API key found in request"
}
```

**Вывод:** API key инициализируется, но НЕ передаётся в запросе.

**Решение:**
- Проблема с версией @supabase/supabase-js
- Проблема с настройками createClient
- Нужно обновить библиотеку

---

### Сценарий 3: API key undefined при инициализации

**Console:**
```
❌ Supabase credentials not found!
  keyLength: undefined
```

**Вывод:** Переменные окружения НЕ загружаются в билд.

**Решение:**
- .env файл не на месте
- Vite не подхватывает переменные при сборке
- Нужно пересобрать: `npm run build`

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Задеплой диагностику:**
   ```bash
   git add -A
   git commit -m "feat: добавлена диагностика Supabase"
   git push origin main
   ./deploy.sh
   ```

2. **Собери все скриншоты** (6 штук)

3. **Пришли мне:**
   - Все скриншоты
   - Ответы на 3 вопроса
   - Вывод команды `cat .env | grep VITE_SUPABASE`

4. **Я проанализирую** и скажу точное решение!

---

**Удачи! 🚀**

