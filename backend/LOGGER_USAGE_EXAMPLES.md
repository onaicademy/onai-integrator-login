# 📝 LOGGER - ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

## ✅ КАК ПРАВИЛЬНО ИСПОЛЬЗОВАТЬ LOGGER

### Импорт:

```typescript
import logger from '../utils/logger';
// или
import { debug, info, warn, error, success } from '../utils/logger';
```

---

## 🎯 ПРИМЕРЫ ПО УРОВНЯМ

### 1. DEBUG (только Development)

**Используй для:** Детальной отладки, внутренней логики

```typescript
// ❌ СТАРЫЙ КОД:
console.log('🔑 JWT token:', token);
console.log('📦 Payload:', payload);

// ✅ НОВЫЙ КОД:
logger.debug('JWT token received');  // БЕЗ самого токена!
logger.debug('Processing request', { userId, action });  // Безопасные данные
```

### 2. INFO (только Development)

**Используй для:** Общей информации о работе приложения

```typescript
// ❌ СТАРЫЙ КОД:
console.log('✅ User created:', user.email, user.password);

// ✅ НОВЫЙ КОД:
logger.info('User created successfully', { 
  userId: user.id,  // ✅ OK
  email: user.email  // ✅ OK
  // ❌ password: НЕТ!
});
```

### 3. WARN (Development + Production)

**Используй для:** Потенциальных проблем

```typescript
logger.warn('Rate limit approaching', { 
  userId, 
  requestCount: 95,
  limit: 100 
});

logger.warn('Deprecated API endpoint used', { 
  endpoint: req.path 
});
```

### 4. ERROR (Development + Production)

**Используй для:** Критических ошибок

```typescript
// ❌ СТАРЫЙ КОД:
console.error('Database error:', error);

// ✅ НОВЫЙ КОД:
logger.error('Database connection failed', error);

// С дополнительными данными:
logger.error('Failed to create user', { 
  email: data.email,  // ✅ OK
  error: err.message  // ✅ OK
  // ❌ password: НЕТ!
});
```

### 5. SUCCESS (только Development)

**Используй для:** Успешных операций

```typescript
logger.success('Payment processed', { 
  orderId, 
  amount, 
  currency 
});

logger.success('Email sent', { 
  to: user.email,
  template: 'welcome'
});
```

---

## 🔒 AUTO-SANITIZATION

Logger **автоматически удаляет** sensitive data:

```typescript
// Этот код:
logger.info('User authenticated', {
  email: 'user@example.com',
  password: 'secret123',  // ❌ Чувствительные данные
  token: 'eyJhbG...',      // ❌ Чувствительные данные
  userId: '123'
});

// Будет залогирован как:
// {
//   email: 'user@example.com',
//   password: '[REDACTED]',
//   token: '[REDACTED]',
//   userId: '123'
// }
```

### Список auto-redacted ключей:
- `password`
- `token`
- `secret`
- `apiKey` / `api_key`
- `serviceRoleKey` / `service_role_key`
- `jwt`
- `authorization`
- `cookie`
- `session`

---

## 📦 ЗАМЕНА CONSOLE.LOG В BACKEND

### Пример: Authentication Service

```typescript
// ❌ СТАРЫЙ КОД:
export async function loginUser(email: string, password: string) {
  console.log('🔐 Login attempt:', email, password);  // ❌ ОПАСНО!
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Login failed:', error);
  }
  
  console.log('✅ Login successful, token:', data.session.access_token);  // ❌ ОПАСНО!
  return data;
}

// ✅ НОВЫЙ КОД:
import logger from '../utils/logger';

export async function loginUser(email: string, password: string) {
  logger.debug('Login attempt', { email });  // ✅ БЕЗ пароля!
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    logger.error('Login failed', { email, error: error.message });
  }
  
  logger.info('Login successful', { userId: data.user.id });  // ✅ БЕЗ токена!
  return data;
}
```

### Пример: Database Operations

```typescript
// ❌ СТАРЫЙ КОД:
export async function createStudent(data: StudentData) {
  console.log('Creating student:', data);  // ❌ Может содержать password!
  
  const result = await db.insert(data);
  console.log('Student created:', result);  // ❌ Может содержать sensitive data
  
  return result;
}

// ✅ НОВЫЙ КОД:
import logger from '../utils/logger';

export async function createStudent(data: StudentData) {
  logger.debug('Creating student', { email: data.email });
  
  try {
    const result = await db.insert(data);
    logger.success('Student created', { 
      studentId: result.id,
      email: result.email
    });
    return result;
  } catch (err) {
    logger.error('Failed to create student', err as Error);
    throw err;
  }
}
```

---

## 🎬 PRODUCTION VS DEVELOPMENT

### Development:
```typescript
logger.debug('Debug message');   // ✅ Показывается
logger.info('Info message');     // ✅ Показывается
logger.warn('Warning message');  // ✅ Показывается
logger.error('Error message');   // ✅ Показывается
```

### Production:
```typescript
logger.debug('Debug message');   // ❌ НЕ показывается
logger.info('Info message');     // ❌ НЕ показывается
logger.warn('Warning message');  // ✅ Показывается
logger.error('Error message');   // ✅ Показывается
```

---

## 🚀 MIGRATION GUIDE

### Шаг 1: Найти все console.log

```bash
grep -r "console\.log" backend/src/ --include="*.ts"
```

### Шаг 2: Заменить по паттернам

| Старый код | Новый код |
|------------|-----------|
| `console.log('debug info', data)` | `logger.debug('debug info', data)` |
| `console.log('ℹ️ info')` | `logger.info('info')` |
| `console.warn('warning')` | `logger.warn('warning')` |
| `console.error('error')` | `logger.error('error')` |
| `console.log('✅ success')` | `logger.success('success')` |

### Шаг 3: Убрать sensitive data

```typescript
// ❌ BEFORE:
console.log('User data:', { email, password, token });

// ✅ AFTER:
logger.debug('User data received', { email });  // Только email!
```

---

## ⚡ БЫСТРЫЙ СТАРТ

1. **Импортируй logger:**
   ```typescript
   import logger from '../utils/logger';
   ```

2. **Замени console.log:**
   - `console.log` → `logger.debug` или `logger.info`
   - `console.error` → `logger.error`
   - `console.warn` → `logger.warn`

3. **Убери sensitive data:**
   - НЕ логируй: passwords, tokens, API keys
   - Логируй: user IDs, emails, timestamps

4. **Тестируй:**
   ```bash
   NODE_ENV=production npm start
   # Должны видеть только errors/warnings!
   ```

---

**ВАЖНО:** 
- ✅ Logger уже настроен
- ✅ Auto-sanitization работает
- ✅ Production mode включается через `NODE_ENV=production`
- ✅ Никаких дополнительных зависимостей не требуется

---

**СОЗДАНО:** 2025-12-07  
**СТАТУС:** 🔒 ОБЯЗАТЕЛЬНО К ИСПОЛЬЗОВАНИЮ

