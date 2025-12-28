# 🚀 DEPLOYMENT VERIFICATION CHECKLIST

**ВАЖНО: Выполняй ВСЕ команды сам на сервере! Не верь AI если говорит что это уже сделано.**

## ШАГ 1: ПРОВЕРЬ ЧТО ТЫ НА ПРАВИЛЬНОЙ МАШИНЕ

```bash
ssh root@onai.academy

# Убедись что это правильный сервер:
pwd
# Должно быть: /root

# Убедись что проект там где надо:
ls -la /var/www/ | grep onai-integrator
```

## ШАГ 2: ПРОВЕРЬ ЧТО ПОСЛЕДНИЙ КОММИТ СКАЧАН

```bash
cd /var/www/onai-integrator-login-main

# Проверь какой коммит сейчас:
git log --oneline -1
# Должно быть: 3c0afb5 🔴 EMERGENCY FIX

# Если нет - скачай:
git fetch origin main
git reset --hard origin/main
```

## ШАГ 3: УБЕДИСЬ ЧТО NGINX CONFIG ПРАВИЛЬНЫЙ

```bash
# Проверь что nginx.conf без ошибок:
docker run --rm -v /var/www/onai-integrator-login-main/docker/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t

# ДОЛЖНО быть: "successful"

# Если ERROR - нужно ВРУЧНУЮ исправить!
# (AI может галлюцинировать)
cat docker/nginx.conf | grep -A 2 -B 2 "hash"
```

## ШАГ 4: ОСТАНОВИ ВСЕ КОНТЕЙНЕРЫ АККУРАТНО

```bash
# Способ 1 (рекомендуемый - по одному):
cd /var/www/onai-integrator-login-main

docker compose -f docker/docker-compose.main.yml down
sleep 3
docker compose -f docker/docker-compose.traffic.yml down
sleep 3
docker compose -f docker/docker-compose.tripwire.yml down
sleep 3
docker compose -f docker/docker-compose.shared.yml down
sleep 5

# Способ 2 (агрессивный - если зависает):
docker stop $(docker ps -a -q) 2>/dev/null || true
docker rm $(docker ps -a -q) 2>/dev/null || true
sleep 5
```

## ШАГ 5: ОЧИСТИ ДИСКОВОЕ ПРОСТРАНСТВО

```bash
# Посмотри сколько свободного места:
df -h /

# Если < 5GB свободно - очисти:
docker system prune -af --volumes
# ⚠️  БУДЕТ УДАЛЕНО ВСЕ!

# Проверь снова:
df -h /

# Должно быть: 10GB+ свободно
```

## ШАГ 6: ПРОВЕРЬ ВСЕ .ENV ФАЙЛЫ

```bash
# ВСЕ 4 файла должны быть:
for env in .env .env.traffic .env.tripwire .env.landing; do
  echo "=== $env ===" 
  grep "SUPABASE_URL" "$env" || echo "❌ MISSING SUPABASE_URL"
  grep "SUPABASE_ANON" "$env" || echo "❌ MISSING SUPABASE_ANON"
  echo ""
done

# Если что-то пусто - заполни из DigitalOcean консоли!
```

## ШАГ 7: ЗАПУСТИ SHARED СЕРВИСЫ ПЕРВЫМИ

```bash
cd /var/www/onai-integrator-login-main

# PostgreSQL и Redis СНАЧАЛА:
docker compose -f docker/docker-compose.shared.yml up -d

# Жди 15 секунд:
sleep 15

# Проверь что запустились:
docker ps | grep -E "postgres|redis"
# ДОЛЖНЫ быть оба контейнера
```

## ШАГ 8: ПРОВЕРЬ ЧТО POSTGRES ОТВЕЧАЕТ

```bash
# Пинг:
docker exec onai-shared-postgres psql -U postgres -d postgres -c "SELECT 1;"

# ДОЛЖНО быть: 
# ?column?
# ----------
#        1

# Если ERROR - значит база не инициализирована:
# docker logs onai-shared-postgres --tail 50
```

## ШАГ 9: ЗАПУСТИ MAIN ПЛАТФОРМУ

```bash
docker compose -f docker/docker-compose.main.yml up -d

# Жди 30 секунд:
sleep 30

# Проверь логи:
docker logs onai-main-backend --tail 20

# Ищи ошибки:
docker logs onai-main-backend 2>&1 | grep -i "error\|failed\|undefined" | head -5
# Если много - перезагрузи:
docker compose -f docker/docker-compose.main.yml restart
sleep 10
```

## ШАГ 10: ЗАПУСТИ TRAFFIC ПЛАТФОРМУ

```bash
docker compose -f docker/docker-compose.traffic.yml up -d

sleep 30

docker logs onai-traffic-backend --tail 20
docker logs onai-traffic-backend 2>&1 | grep -i "error\|failed\|undefined" | head -5
```

## ШАГ 11: ЗАПУСТИ TRIPWIRE ПЛАТФОРМУ

```bash
docker compose -f docker/docker-compose.tripwire.yml up -d

sleep 30

docker logs onai-tripwire-backend --tail 20
docker logs onai-tripwire-backend 2>&1 | grep -i "error\|failed\|undefined" | head -5
```

## ШАГ 12: ФИНАЛЬНАЯ ПРОВЕРКА

```bash
echo "=============== FINAL STATUS ==============="
echo ""
echo "Контейнеры (должно быть 10):"
docker ps | wc -l

echo ""
echo "Supabase URLs в бандле:"
curl -s http://localhost/ | grep -c "VITE_SUPABASE"

echo ""
echo "Health endpoints:"
echo "Main (3000):"
curl -s http://localhost:3000/health | jq .status 2>/dev/null || echo "❌ DOWN"

echo "Traffic (3001):"
curl -s http://localhost:3001/health | jq .status 2>/dev/null || echo "❌ DOWN"

echo "Tripwire (3002):"
curl -s http://localhost:3002/health | jq .status 2>/dev/null || echo "❌ DOWN"

echo ""
echo "=============== END ==============="
```

## ШАГ 13: ЕСЛИ NGINX НЕ РАБОТАЕТ

```bash
# Проверь что nginx контейнер скачан:
docker ps | grep nginx

# Если его нет - запусти вручную:
docker run -d --restart always \
  --name onai-nginx \
  -p 80:80 \
  -p 443:443 \
  -v /var/www/onai-integrator-login-main/docker/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /var/www/onai-integrator-login-main/docker/ssl:/etc/nginx/ssl:ro \
  -v /var/www/onai-integrator-login-main/dist:/usr/share/nginx/html:ro \
  --network host \
  nginx:latest

# Проверь что работает:
curl -s http://localhost/ | head -10
```

## КРИТИЧНЫЕ ПЕРЕМЕННЫЕ КОТОРЫЕ ДОЛЖНЫ БЫТЬ

```
.env файл должен содержать ОБЯЗАТЕЛЬНО:

MAIN БД (4 переменные):
- SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
- SUPABASE_ANON=...

TRAFFIC БД (2 переменные):
- TRAFFIC_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
- TRAFFIC_SUPABASE_ANON=...

TRIPWIRE БД (2 переменные):
- TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
- TRIPWIRE_SUPABASE_ANON=...

LANDING БД (1 переменная):
- LANDING_SUPABASE_URL=...

AmoCRM:
- AMOCRM_DOMAIN=...
- AMOCRM_ACCESS_TOKEN=...

Telegram:
- TELEGRAM_MENTOR_BOT_TOKEN=... или placeholder_bot_token
- TELEGRAM_ADMIN_BOT_TOKEN=... или placeholder_admin_bot_token
```

## ЕСЛИ ВСЕ ПАДАЕТ - СКОРАЯ ПОМОЩЬ

```bash
# 1. Посмотри что жрёт память:
docker stats --no-stream | head -10

# 2. Убей самые тяжёлые:
docker kill $(docker ps | grep backend | awk '{print $1}' | head -1)

# 3. Очисти всё и перезагрузи сервер:
docker system prune -af --volumes
reboot

# 4. После перезагрузки повтори всё сначала (шаги 1-12)
```

---

## ✅ УСПЕШНЫЙ ДЕПЛОЙ ВЫГЛЯДИТ ТАК:

**В консоли:**
```
=============== FINAL STATUS ===============
Контейнеры (должно быть 10):
11

Supabase URLs в бандле:
3

Main (3000):
"ok"

Traffic (3001):
"ok"

Tripwire (3002):
"ok"

=============== END ===============
```

**В браузере (БЕЗ ОШИБОК в F12 Console):**
- https://onai.academy/ → Загружается
- https://onai.academy/integrator → Форма логина
- https://traffic.onai.academy/ → Dashboard или Login
- https://tripwire.onai.academy/ → Курсы или Login

---

**ВАЖНО: Если что-то не работает - смотри логи контейнеров, НЕ верь AI асистентам которые говорят что "уже сделал".**

```bash
# Универсальная команда для поиска ошибок:
for service in main traffic tripwire; do
  echo "=== $service ERRORS ==="
  docker logs onai-${service}-backend 2>&1 | grep -i "error\|fatal\|exception" | tail -3
done
```

**Создано: 29 декабря 2025, 02:19 GMT+5**
**Статус: READY FOR MANUAL EXECUTION**
