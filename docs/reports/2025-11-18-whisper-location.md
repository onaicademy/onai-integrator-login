# 🎙️ ОПРЕДЕЛЕНИЕ МЕСТОПОЛОЖЕНИЯ WHISPER API

**Дата:** 2025-11-18  
**Статус:** ✅ НАЙДЕНО

---

## 📍 РЕЗУЛЬТАТ ПОИСКА

### ❌ Отдельного сервиса Whisper НЕТ

Whisper API **НЕ является отдельным сервисом** на сервере Digital Ocean.  
Это **часть основного backend**, который использует OpenAI API для транскрипции аудио.

---

## ✅ ГДЕ НАХОДИТСЯ WHISPER

### Путь до backend (где находится Whisper):
```
/var/www/onai-integrator-login-main/backend/
```

### Путь до .env файла:
```
/var/www/onai-integrator-login-main/backend/.env
```

### Как запускается:
- **Процесс:** `onai-backend` (PM2)
- **Команда запуска:** `pm2 start onai-backend` или `pm2 reload onai-backend --update-env`
- **Статус:** ✅ Уже запущен и работает

---

## 🔍 КАК РАБОТАЕТ WHISPER

### Архитектура:
1. **Frontend** отправляет аудио файл на `/api/openai/audio/transcriptions`
2. **Backend** (`backend/src/controllers/openaiController.ts`) принимает запрос
3. **OpenAI Service** (`backend/src/services/openaiService.ts`) вызывает `openai.audio.transcriptions.create()`
4. **OpenAI API** (Whisper модель) транскрибирует аудио
5. **Backend** возвращает текст фронтенду

### Код интеграции:
```typescript
// backend/src/services/openaiService.ts
export async function transcribeAudio(
  audioFile: any,
  language: string = 'ru',
  prompt?: string
) {
  const openai = getOpenAIClient(); // Использует OPENAI_API_KEY из .env
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: language,
    prompt: prompt,
  });
  
  return transcription.text;
}
```

---

## 🔑 ОБНОВЛЕНИЕ OPENAI_API_KEY ДЛЯ WHISPER

### ✅ Ключ уже обновлён!

Поскольку Whisper использует тот же `OPENAI_API_KEY` что и весь backend,  
и мы уже обновили ключ в `/var/www/onai-integrator-login-main/backend/.env`,  
**Whisper уже использует новый ключ** после перезапуска `onai-backend`.

---

## 📋 КОМАНДЫ ДЛЯ ОБНОВЛЕНИЯ

### 1. Путь до .env:
```
/var/www/onai-integrator-login-main/backend/.env
```

### 2. Команда для замены ключа (одной строкой):
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && cp .env .env.backup-\$(date +%Y%m%d-%H%M%S) && sed -i 's|^OPENAI_API_KEY=.*|OPENAI_API_KEY=sk-НОВЫЙ_КЛЮЧ_ЗДЕСЬ|' .env && pm2 reload onai-backend --update-env"
```

### 3. Или пошагово:
```bash
# Шаг 1: Backup
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && cp .env .env.backup-\$(date +%Y%m%d-%H%M%S)"

# Шаг 2: Замена ключа
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && sed -i 's|^OPENAI_API_KEY=.*|OPENAI_API_KEY=sk-НОВЫЙ_КЛЮЧ_ЗДЕСЬ|' .env"

# Шаг 3: Перезапуск процесса (чтобы ключ применился)
ssh root@207.154.231.30 "pm2 reload onai-backend --update-env"
```

**Важно:** Флаг `--update-env` обязателен! Он перезагружает переменные окружения из `.env`.

---

## ✅ ПРОВЕРКА ЧТО WHISPER ИСПОЛЬЗУЕТ НОВЫЙ КЛЮЧ

### Способ 1: Проверка через debug endpoint
```bash
ssh root@207.154.231.30 "curl -s http://localhost:3000/api/debug/env | grep OPENAI_API_KEY"
```

### Способ 2: Проверка через логи PM2
```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 | grep -i 'openai\|whisper'"
```

### Способ 3: Тест транскрипции через API
```bash
# Отправка тестового аудио файла на транскрипцию
curl -X POST https://api.onai.academy/api/openai/audio/transcriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-audio.mp3" \
  -F "language=ru"
```

Если транскрипция работает без ошибок 401/403 - ключ правильный! ✅

---

## 📊 ИТОГОВАЯ ИНФОРМАЦИЯ

| Параметр | Значение |
|----------|----------|
| **Тип сервиса** | Интегрирован в основной backend |
| **Путь до .env** | `/var/www/onai-integrator-login-main/backend/.env` |
| **Процесс PM2** | `onai-backend` |
| **Переменная окружения** | `OPENAI_API_KEY` (общая для всех сервисов) |
| **Модель Whisper** | `whisper-1` |
| **Endpoint** | `/api/openai/audio/transcriptions` |
| **Статус** | ✅ Уже обновлён и работает |

---

## 🎯 ВЫВОД

**Whisper API не требует отдельного обновления ключа!**

Он использует тот же `OPENAI_API_KEY` из `/var/www/onai-integrator-login-main/backend/.env`,  
который мы уже обновили. После перезапуска `onai-backend` через PM2 с флагом `--update-env`,  
Whisper автоматически начал использовать новый ключ.

---

**Дата проверки:** 2025-11-18  
**Статус:** ✅ Whisper использует обновлённый ключ

