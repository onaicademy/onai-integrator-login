# 🧪 TRIPWIRE API TEST SUITE

## Предварительные условия

1. Backend запущен: `cd backend && npm run dev`
2. У вас есть токен admin'а: `smmmcwin@gmail.com`

## Получение токена

```bash
# 1. Логинимся через Main Platform
curl -X POST https://arqhkacellqbhjhbebfh.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smmmcwin@gmail.com",
    "password": "YOUR_PASSWORD"
  }'
```

Сохраните `access_token` из ответа.

## Test 1: Проверка статистики (Admin только)

```bash
export TOKEN="YOUR_ACCESS_TOKEN"

curl http://localhost:5001/api/tripwire/admin/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Ожидаемый результат (200 OK):**
```json
{
  "total_students": 0,
  "active_students": 0,
  "completed_students": 0,
  "completion_rate": 0,
  "total_transcriptions": 0,
  "transcriptions_completed": 0,
  "total_costs": 0,
  "monthly_costs": 0
}
```

## Test 2: Создание Tripwire пользователя (Sales или Admin)

```bash
curl -X POST http://localhost:5001/api/tripwire/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "TestPassword123!",
    "granted_by": "2d2b44e9-0ba6-4808-a08c-5c23feec4278",
    "manager_name": "Admin Test"
  }'
```

**Ожидаемый результат (200 OK):**
```json
{
  "success": true,
  "user_id": "uuid-here",
  "email": "test@example.com"
}
```

## Test 3: Получить список Tripwire пользователей

```bash
curl http://localhost:5001/api/tripwire/users \
  -H "Authorization: Bearer $TOKEN"
```

**Ожидаемый результат (200 OK):**
```json
[
  {
    "id": "uuid",
    "email": "test@example.com",
    "full_name": "Test User",
    "status": "active",
    "modules_completed": 0,
    ...
  }
]
```

## Test 4: Sales Manager Dashboard

```bash
# Статистика для Sales Manager
curl http://localhost:5001/api/admin/tripwire/stats \
  -H "Authorization: Bearer $SALES_TOKEN"

# Должен вернуть 200 OK, если токен принадлежит sales manager
```

## ❌ Expected Errors

### 401 Unauthorized
- Токен отсутствует или невалидный

### 403 Forbidden
- У пользователя нет роли `admin` или `sales`

---

## ✅ Критерии успеха

1. Admin может получить статистику `/tripwire/admin/stats`
2. Sales может создавать пользователей `/tripwire/users`
3. Admin может видеть детали `/tripwire/admin/students`
4. Все операции используют **TRIPWIRE DB**, не Main Platform DB

