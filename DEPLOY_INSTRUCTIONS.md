# 🚀 Инструкции для деплоя в production

## 📋 Что изменилось

### 1. Добавлена система логирования
- Создан [`src/lib/logger.ts`](src/lib/logger.ts) - централизованная система логирования
- В production показываются только **ОШИБКИ** (console.error)
- В development показываются все логи

### 2. Настроено удаление console.log в production
- Обновлен [`vite.config.ts`](vite.config.ts:105-110)
- Удалены: `console.log`, `console.debug`, `console.info`, `console.trace`, `console.warn`
- Оставлен: `console.error` (для отладки в production)

### 3. Добавлена система скрытия чувствительных данных
- В [`src/lib/logger.ts`](src/lib/logger.ts) добавлена функция `sanitizeData()`
- Автоматически скрывает: password, token, api_key, secret, jwt, и т.д.

### 4. Добавлена Docker архитектура
- Созданы все Docker конфигурации (см. [`DOCKER_ARCHITECTURE_OVERVIEW.md`](DOCKER_ARCHITECTURE_OVERVIEW.md))
- Разделение по проектам: Main, Traffic, Tripwire

## 🔧 Как использовать logger в коде

```typescript
import { logger, sanitizeData } from '@/lib/logger';

// Вместо console.log
logger.info('Сообщение', { data: 'value' });

// Вместо console.error
logger.error('Ошибка', error);

// Вместо console.warn
logger.warn('Предупреждение', { warning: 'value' });

// Для скрытия чувствительных данных
const safeData = sanitizeData({ password: 'secret', token: 'abc123' });
// Результат: { password: '***REDACTED***', token: '***REDACTED***' }
```

## 🚀 Деплой в production

### Шаг 1: Сборка проекта

```bash
# Сборка для production
npm run build:production

# Или просто
npm run build
```

### Шаг 2: Проверка сборки

```bash
# Проверь, что в dist нет console.log
grep -r "console.log" dist/
grep -r "console.info" dist/
grep -r "console.warn" dist/

# Должен быть пустой результат (или только в node_modules)
```

### Шаг 3: Деплой на сервер

```bash
# Копирование файлов на сервер
scp -r dist/* user@server:/var/www/onai-frontend/

# Или через rsync
rsync -avz --delete dist/ user@server:/var/www/onai-frontend/
```

### Шаг 4: Перезагрузка Nginx

```bash
# На сервере
ssh user@server

# Перезагрузка Nginx
sudo systemctl reload nginx

# Или перезапуск
sudo systemctl restart nginx
```

### Шаг 5: Проверка

```bash
# Открой сайт в production
# Открой DevTools (F12)
# Проверь Console - там не должно быть логов кроме ошибок
```

## 🐳 Деплой через Docker

### Шаг 1: Сборка Docker образов

```bash
# Сборка всех образов
docker-compose build --no-cache

# Или конкретного проекта
docker-compose -f docker/docker-compose.main.yml build --no-cache
```

### Шаг 2: Перезапуск контейнеров

```bash
# Перезапуск всех контейнеров
docker-compose down
docker-compose up -d

# Или конкретного проекта
docker-compose -f docker/docker-compose.main.yml down
docker-compose -f docker/docker-compose.main.yml up -d
```

### Шаг 3: Проверка логов

```bash
# Проверь логи контейнеров
docker-compose logs -f main-frontend
docker-compose logs -f main-backend

# В production не должно быть логов кроме ошибок
```

## ✅ Проверка после деплоя

### 1. Проверка отсутствия console.log в браузере

```javascript
// Открой DevTools (F12) -> Console
// Там не должно быть:
// ❌ console.log(...)
// ❌ console.info(...)
// ❌ console.warn(...)
// ❌ console.debug(...)

// Должен быть только:
// ✅ console.error(...) (если есть ошибки)
```

### 2. Проверка отсутствия чувствительных данных

```javascript
// Открой DevTools (F12) -> Network
// Проверь запросы - не должно быть:
// ❌ API ключей в URL
// ❌ JWT токенов в URL
// ❌ Паролей в URL
```

### 3. Проверка работы приложения

- ✅ Логин работает
- ✅ Навигация работает
- ✅ API запросы работают
- ✅ Нет ошибок в Console

## 🔒 Правила для production

### ✅ Разрешено в Console
- `console.error()` - только для критических ошибок
- Ошибки из Sentry (если настроен)

### ❌ Запрещено в Console
- `console.log()` - использовать `logger.info()`
- `console.info()` - использовать `logger.info()`
- `console.warn()` - использовать `logger.warn()`
- `console.debug()` - использовать `logger.debug()`
- Любые логи с API ключами, токенами, паролями

### ✅ Разрешено в Network
- API запросы с заголовками Authorization
- API запросы с телом запроса

### ❌ Запрещено в Network
- API ключи в URL параметрах
- JWT токены в URL параметрах
- Пароли в URL параметрах

## 📝 Примеры рефакторинга

### ❌ Плохо (старый код)
```typescript
console.log('🚀 [Main] Initializing Supabase Manager...');
console.log('✅ [Supabase Manager] All clients initialized');
console.log('🔑 Tripwire JWT token received:', token);
console.log('📊 AuthContext render:', authState);
```

### ✅ Хорошо (новый код)
```typescript
import { logger } from '@/lib/logger';

// В development: покажется в Console
// В production: не покажется (только если logger.error)
logger.info('Initializing Supabase Manager...');
logger.info('Supabase Manager initialized');
logger.info('Tripwire JWT token received', { token: '***REDACTED***' });
logger.debug('AuthContext render:', authState);
```

## 🎯 Для AI-ассистента

### При деплое всегда:

1. ✅ Проверь, что используется `logger` вместо `console.log`
2. ✅ Проверь, что чувствительные данные скрыты через `sanitizeData()`
3. ✅ Проверь, что в `vite.config.ts` настроено удаление console.log
4. ✅ После сборки проверь, что в dist нет console.log
5. ✅ После деплоя проверь Console в браузере - там не должно быть логов кроме ошибок

### При разработке:

1. ✅ Используй `logger.info()`, `logger.warn()`, `logger.error()`
2. ✅ Для чувствительных данных используй `sanitizeData()`
3. ✅ Не используй `console.log()`, `console.info()`, `console.warn()`

## 🆘 Troubleshooting

### Проблема: Логи все еще видны в production

**Решение:**
```bash
# 1. Проверь, что сборка была с mode=production
npm run build:production

# 2. Проверь vite.config.ts
# Должно быть: pure: mode === 'production' ? ['console.log', ...] : []

# 3. Пересобери проект
rm -rf dist
npm run build:production

# 4. Проверь dist
grep -r "console.log" dist/
```

### Проблема: Чувствительные данные в логах

**Решение:**
```typescript
import { sanitizeData } from '@/lib/logger';

// ❌ Плохо
logger.info('User login:', { email, password, token });

// ✅ Хорошо
logger.info('User login:', sanitizeData({ email, password, token }));
```

### Проблема: Нет ошибок в Console, но приложение не работает

**Решение:**
```bash
# 1. Проверь Network в DevTools
# Там должны быть API запросы

# 2. Проверь, что backend работает
curl http://localhost:3000/health

# 3. Проверь логи backend
docker-compose logs -f main-backend
```

## 📚 Дополнительная документация

- [`src/lib/logger.ts`](src/lib/logger.ts) - Система логирования
- [`vite.config.ts`](vite.config.ts:105-110) - Конфигурация Vite
- [`DOCKER_ARCHITECTURE_OVERVIEW.md`](DOCKER_ARCHITECTURE_OVERVIEW.md) - Docker архитектура
- [`DOCKER_OPERATIONS.md`](DOCKER_OPERATIONS.md) - Операции с контейнерами

---

## 🎉 Готово!

Теперь в production **НЕ БУДЕТ** никаких логов в Console кроме ошибок!

**Преимущества:**
- ✅ Безопасность - не видно чувствительных данных
- ✅ Производительность - меньше логов в браузере
- ✅ Чистота - Console чистая для отладки
- ✅ Профессионализм - правильный подход к production
