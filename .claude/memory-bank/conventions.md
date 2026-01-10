# Coding Conventions & Patterns

## Language & Style

### General Rules
- **Code**: English (variable names, functions, comments)
- **User-facing text**: Russian (UI, error messages)
- **Documentation**: English (technical docs) or Russian (user guides)

### TypeScript
```typescript
// ✅ GOOD: Explicit types
function getUser(id: string): Promise<User | null>

// ❌ BAD: Implicit any
function getUser(id): any
```

### File Naming
```
components/       → PascalCase.tsx (UserProfile.tsx)
hooks/            → camelCase.ts (useAuth.ts)
utils/            → camelCase.ts (formatDate.ts)
services/         → camelCase.ts (openaiService.ts)
routes/           → kebab-case.ts (traffic-auth.ts)
```

---

## Error Handling

### Backend - Custom Error Classes
```typescript
// backend/src/middleware/errorHandler.ts

throw new ValidationError('Email is required');     // 400
throw new UnauthorizedError('Invalid token');       // 401
throw new ForbiddenError('Admin access required'); // 403
throw new NotFoundError('User not found');          // 404
throw new RateLimitError('Too many requests');      // 429
```

### Frontend - Error Boundaries
```typescript
// Always wrap pages in error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <PageComponent />
</ErrorBoundary>
```

### NEVER Empty Catch Blocks
```typescript
// ❌ BAD
try { ... } catch (e) {}

// ✅ GOOD
try { ... } catch (e) {
  logger.error('Operation failed', e);
}
```

---

## Logging

### Use SecureLogger (NOT console.log)
```typescript
// backend/src/core/secure-logger.ts

import { getLogger } from './core/index.js';
const logger = getLogger('ServiceName');

// Standard logging
logger.debug('Debug message');
logger.info('Info message', { context });
logger.warn('Warning message');
logger.error('Error message', error);

// Specialized logging
logger.request('POST', '/api/users', 201, 45);
logger.query('SELECT', 'profiles', 12);
logger.externalApi('OpenAI', 'chat', 200, 350);
logger.health('supabase', 'healthy', { latencyMs: 45 });
logger.security('Unauthorized access attempt');
logger.audit('UPDATE', 'admin-123', 'users/456');
```

### Production Rules
- **NEVER** log passwords, tokens, or API keys
- **NEVER** log full request/response bodies in production
- **ALWAYS** use DataMasker for any user data

---

## Security Patterns

### JWT Handling
```typescript
// ✅ GOOD: Use centralized JWT config
import { getJWTSecret } from '../config/jwt.js';
const secret = getJWTSecret();

// ✅ GOOD: Validate payload structure
const decoded = jwt.verify(token, secret);
if (typeof decoded !== 'object' || !decoded.userId) {
  throw new UnauthorizedError('Invalid token payload');
}
```

### Environment Variables
```typescript
// ✅ GOOD: Check before use
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured');
}

// ❌ BAD: Assume exists
const apiKey = process.env.OPENAI_API_KEY!;
```

### Input Validation
```typescript
// ✅ GOOD: Validate all user input
if (!email || !email.includes('@')) {
  throw new ValidationError('Valid email required');
}

// Consider using Zod for complex validation
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

---

## Database Patterns

### Always Use Transactions for Related Operations
```typescript
const { data, error } = await supabase.rpc('create_user_with_profile', {
  p_email: email,
  p_name: name,
});
```

### Handle Errors Gracefully
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

if (error) {
  if (error.code === 'PGRST116') {
    throw new NotFoundError('User not found');
  }
  throw new Error(`Database error: ${error.message}`);
}
```

### Use Indexes
Always add indexes for:
- Foreign keys
- Frequently queried columns
- Sort columns

---

## API Design

### RESTful Routes
```
GET    /api/users          → List users
GET    /api/users/:id      → Get user
POST   /api/users          → Create user
PUT    /api/users/:id      → Update user (full)
PATCH  /api/users/:id      → Update user (partial)
DELETE /api/users/:id      → Delete user
```

### Response Format
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: 'Error message',
  code: 'VALIDATION_ERROR'
}

// List with pagination
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    limit: 20,
    total: 100
  }
}
```

---

## React Patterns

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';

// 2. Types
interface Props { ... }

// 3. Component
export function MyComponent({ prop }: Props) {
  // 3a. Hooks
  const [state, setState] = useState();

  // 3b. Effects
  useEffect(() => { ... }, []);

  // 3c. Handlers
  const handleClick = () => { ... };

  // 3d. Render
  return <div>...</div>;
}
```

### State Management
- **Local state**: `useState`
- **Complex local**: `useReducer`
- **Global**: React Context (AuthContext)
- **Server state**: React Query (tanstack/query)

---

## Git Conventions

### Commit Messages
```
type(scope): description

feat: Add new feature
fix: Fix bug
refactor: Code refactoring
docs: Documentation only
style: Code style (formatting)
test: Add tests
chore: Maintenance
```

### Branch Naming
```
feature/add-user-profile
fix/auth-token-refresh
refactor/cleanup-services
```

### Pull Request
- Always include summary
- Link related issues
- Include test plan

---

## Deployment Rules for Claude Agent

### CRITICAL: Agent Deployment Policy

**Default Mode: NO AUTO-DEPLOY**
- Agent должен ТОЛЬКО пушить изменения в репозиторий
- Agent НЕ должен самостоятельно запускать деплой
- Деплой запускает пользователь вручную через GitHub Actions UI

### Deploy Gate (Exception Mode)

**Когда открывается "шлюз деплоя":**
1. Пользователь явно просит сделать деплой
2. Agent делает push
3. Пользователь запускает workflow вручную
4. Если workflow падает с ошибками - Agent ОБЯЗАН циклично фиксить ошибки
5. Agent продолжает пушить фиксы пока деплой не станет успешным
6. После успешного деплоя - шлюз закрывается

### Workflow
```
[User Request] → [Agent Push] → [User triggers deploy] →
  ↓ (если ошибка)
[Agent fixes] → [Push fix] → [Auto-trigger or User re-run] →
  ↓ (цикл до успеха)
[Success] → [Gate closes]
```

### Commands for User
- Запустить деплой: GitHub Actions → Run workflow
- URL: https://github.com/onaicademy/onai-integrator-login/actions/workflows/deploy-backend.yml
