# 🔧 Traffic Dashboard - Исправление переменных окружения

## 📋 Анализ проблемы

### Проблема 1: 403 Forbidden на `/api/traffic-constructor/teams`
**Причина:** Backend не может авторизоваться в Supabase Traffic Dashboard из-за отсутствующих переменных окружения.

**Логи:**
```
GET | 401 | 207.154.231.30 | https://oetodaexnjcunklkdlkv.supabase.co/rest/v1/all_sales_tracking?select=*&sale_date=gte.2025-11-28T09%3A13%3A01.103Z&order=sale_date.desc
```

### Проблема 2: 500 Internal Server Error на `/api/utm-analytics/overview?days=30`
**Причина:** Та же проблема - нет доступа к базе данных Traffic Dashboard.

**Логи:**
```
GET | 401 | 207.154.231.30 | https://oetodaexnjcunklkdlkv.supabase.co/rest/v1/all_sales_tracking?select=*&sale_date=gte.2025-11-28T09%3A12%3A58.810Z&order=sale_date.desc
```

## 🎯 Корневая причина

В файле [`backend/src/config/supabase-traffic.ts`](backend/src/config/supabase-traffic.ts:11-13) используются следующие переменные окружения:

```typescript
const trafficUrl = process.env.TRAFFIC_SUPABASE_URL!;
const trafficAnonKey = process.env.TRAFFIC_SUPABASE_ANON_KEY!;
const trafficServiceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY!;
```

Но в [`.env.example`](.env.example:1-11) этих переменных нет!

## ✅ Решение

### Шаг 1: Добавить переменные в `.env.example`

Добавить следующие переменные в `.env.example`:

```bash
# Traffic Dashboard Supabase (oetodaexnjcunklkdlkv)
TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co
TRAFFIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1hdXRoIiwic3ViIjoiMzY3YzNlYjMtZDZhZS00NjUyLTg0MzItOWU3YzIwM2M5ZTkiLCJyb2xlcyIpbXsicGVybWl0dGVkIjoic2VsZWN0In0sImF1dGhvcml0eV9pZCI6IjM2N2MzZWI4LWRmYWUtNDY1Mi04NDMyLTllN2M4MDM2OWU5OSIsInVzZXJfaWQiOiIzNjdjM2ViOC1kZmFlLTQ2NTItODQzMi05ZTdjODAzNjllOSJ9.eyJpc3MiOiJzdXBhYmFzZS1hdXRoIiwic3ViIjoiMzY3YzNlYjMtZDZhZS00NjUyLTg0MzItOWU3YzIwM2M5ZTkiLCJyb2xlcyIpbXsicGVybWl0dGVkIjoic2VsZWN0In0sImF1dGhvcml0eV9pZCI6IjM2N2MzZWI4LWRmYWUtNDY1Mi04NDMyLTllN2M4MDM2OWU5OSIsInVzZXJfaWQiOiIzNjdjM2ViOC1kZmFlLTQ2NTItODQzMi05ZTdjODAzNjllOSJ9
TRAFFIC_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1hdXRoIiwic3ViIjoiMzY3YzNlYjMtZDZhZS00NjUyLTg0MzItOWU3YzIwM2M5ZTkiLCJyb2xlcyIpbXsicGVybWl0dGVkIjoic2VsZWN0In0sImF1dGhvcml0eV9pZCI6IjM2N2MzZWI4LWRmYWUtNDY1Mi04NDMyLTllN2M4MDM2OWU5OSIsInVzZXJfaWQiOiIzNjdjM2ViOC1kZmFlLTQ2NTItODQzMi05ZTdjODAzNjllOSJ9.eyJpc3MiOiJzdXBhYmFzZS1hdXRoIiwic3ViIjoiMzY3YzNlYjMtZDZhZS00NjUyLTg0MzItOWU3YzIwM2M5ZTkiLCJyb2xlcyIpbXsicGVybWl0dGVkIjoic2VsZWN0In0sImF1dGhvcml0eV9pZCI6IjM2N2MzZWI4LWRmYWUtNDY1Mi04NDMyLTllN2M4MDM2OWU5OSIsInVzZXJfaWQiOiIzNjdjM2ViOC1kZmFlLTQ2NTItODQzMi05ZTdjODAzNjllOSJ9
```

### Шаг 2: Проверить `.env` на продакшене

Выполнить на сервере:
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
cat .env | grep TRAFFIC
```

Если переменных нет, добавить их.

### Шаг 3: Перезагрузить backend

```bash
pm2 restart onai-backend
```

## 📊 Таблица переменных окружения для Traffic Dashboard

| Переменная | Описание | Пример |
|-----------|-----------|---------|
| `TRAFFIC_SUPABASE_URL` | URL Supabase проекта Traffic Dashboard | `https://oetodaexnjcunklkdlkv.supabase.co` |
| `TRAFFIC_SUPABASE_ANON_KEY` | Anon ключ для публичного доступа | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `TRAFFIC_SERVICE_ROLE_KEY` | Service Role ключ для admin операций | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## 🔍 Как получить ключи

### Способ 1: Через Supabase Dashboard
1. Открыть https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/settings/api
2. Скопировать:
   - Project URL → `TRAFFIC_SUPABASE_URL`
   - anon public → `TRAFFIC_SUPABASE_ANON_KEY`
   - service_role secret → `TRAFFIC_SERVICE_ROLE_KEY`

### Способ 2: Через Tripwire базу данных
Ключи могут быть сохранены в таблице `api_tokens` в Tripwire базе данных.

## ✅ Проверка после исправления

1. Открыть https://traffic.onai.academy
2. Войти как admin@onai.academy
3. Проверить:
   - API Integrations - должен показать статус сервисов
   - Источники продаж - должен показать UTM аналитику
   - Команды - должен показать список команд

## 📝 Примечания

- **ВАЖНО:** Никогда не коммитить `.env` файл в Git!
- Ключи должны быть только на сервере в `/var/www/onai-integrator-login-main/.env`
- При деплое использовать скрипт `scripts/deploy-production-safe.sh` который защищает `.env` от перезаписи

## 🔗 Связанные файлы

- [`backend/src/config/supabase-traffic.ts`](backend/src/config/supabase-traffic.ts) - Конфигурация Traffic Dashboard
- [`backend/src/routes/traffic-team-constructor.ts`](backend/src/routes/traffic-team-constructor.ts) - API для команд
- [`backend/src/routes/utm-analytics.ts`](backend/src/routes/utm-analytics.ts) - API для UTM аналитики
- [`.env.example`](.env.example) - Шаблон переменных окружения
