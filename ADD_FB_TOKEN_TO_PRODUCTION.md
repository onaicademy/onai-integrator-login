# 🔥 ДОБАВИТЬ FB TOKEN В PRODUCTION

**Дата**: 19 декабря 2025  
**Статус**: ✅ ЛОКАЛЬНО ДОБАВЛЕНО | ⏳ НУЖНО В PRODUCTION

---

## ✅ ЧТО УЖЕ СДЕЛАНО (ЛОКАЛЬНО)

Добавлено в `/Users/miso/onai-integrator-login/backend/env.env`:

```bash
# ==============================================
# 📘 FACEBOOK ADS API (Traffic Dashboard)
# ==============================================
# Permanent Page Access Token (♾️ Never expires)
# Page: ТОО Onai academy (ID: 627804847089543)
FB_ACCESS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc
FACEBOOK_ADS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc
FACEBOOK_APP_ID=1079708200963910
FACEBOOK_APP_SECRET=48a635657fd97b73afc817d95a1f9dff
```

---

## 🚀 ДОБАВИТЬ В PRODUCTION (ПРЯМО СЕЙЧАС)

### Вариант 1: Через SSH (БЫСТРЕЕ)

```bash
# 1. Подключись к серверу
ssh root@188.225.46.124

# 2. Открой env файл
nano /root/onai-integrator-login/backend/env.env

# 3. Найди секцию "# 📹 BUNNY STREAM"
# 4. ПОСЛЕ неё добавь эти строки:

# ==============================================
# 📘 FACEBOOK ADS API (Traffic Dashboard)
# ==============================================
# Permanent Page Access Token (♾️ Never expires)
# Page: ТОО Onai academy (ID: 627804847089543)
FB_ACCESS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc
FACEBOOK_ADS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc
FACEBOOK_APP_ID=1079708200963910
FACEBOOK_APP_SECRET=48a635657fd97b73afc817d95a1f9dff

# 5. Сохрани (Ctrl+O, Enter, Ctrl+X)

# 6. Перезапусти backend
pm2 restart onai-backend

# 7. Проверь
pm2 logs onai-backend --lines 50 | grep -i facebook
```

---

### Вариант 2: Автоматически через команду

```bash
# Подключись к серверу
ssh root@188.225.46.124

# Выполни одной командой:
cat >> /root/onai-integrator-login/backend/env.env << 'EOF'

# ==============================================
# 📘 FACEBOOK ADS API (Traffic Dashboard)
# ==============================================
# Permanent Page Access Token (♾️ Never expires)
# Page: ТОО Onai academy (ID: 627804847089543)
FB_ACCESS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc
FACEBOOK_ADS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBtYnhR275p9WuUSCgFV1yxBsxCRjZB36QoyQF6qsHBkRV6K1Pu3Y3gXrWiJQl7IEWy1jBurR8gPdTMOKh08Vh9o2MyjffmtYDf9keTvvL0UVUnXmtfZCnkDOT2pebxiVkAfL3fgxH31fsTQdW1gZCZBk4P0sc
FACEBOOK_APP_ID=1079708200963910
FACEBOOK_APP_SECRET=48a635657fd97b73afc817d95a1f9dff
EOF

# Перезапусти backend
pm2 restart onai-backend

# Проверь логи
pm2 logs onai-backend --lines 20
```

---

## ✅ ПРОВЕРКА ПОСЛЕ ДОБАВЛЕНИЯ

### 1. Проверь переменные на сервере:
```bash
ssh root@188.225.46.124 "grep FB_ACCESS_TOKEN /root/onai-integrator-login/backend/env.env"
```

Должно вернуть:
```
FB_ACCESS_TOKEN=EAAPVZCSfHj0YBQA2K9mVDXtta9gmiJu8vcnQ3S4yocYlBt...
```

### 2. Проверь backend health:
```bash
curl https://api.onai.academy/health
```

Должно вернуть:
```json
{"status":"ok","timestamp":"...","uptime":123,"service":"onAI Backend API"}
```

### 3. Проверь Traffic API:
```bash
curl https://api.onai.academy/api/traffic/combined-analytics?preset=7d
```

Должно вернуть данные по командам.

---

## 🎯 ЧТО БУДЕТ РАБОТАТЬ ПОСЛЕ

### На локалке (СЕЙЧАС):
✅ Таргетолог → http://localhost:8080/settings  
✅ Нажимает "Загрузить доступные кабинеты"  
✅ Видит все FB кабинеты с checkbox  
✅ Выбирает нужные  
✅ Загружает кампании  
✅ Сохраняет настройки  

### На production (ПОСЛЕ ДОБАВЛЕНИЯ):
✅ Таргетолог → https://traffic.onai.academy/settings  
✅ Нажимает "Загрузить доступные кабинеты"  
✅ Видит все FB кабинеты с checkbox  
✅ Выбирает нужные  
✅ Загружает кампании  
✅ Сохраняет настройки  

---

## 📊 ИНФОРМАЦИЯ О ТОКЕНЕ

**Тип**: Permanent Page Access Token ♾️  
**Страница**: ТОО Onai academy  
**Page ID**: 627804847089543  
**Права**: ADVERTISE, ANALYZE, CREATE_CONTENT, MESSAGING, MODERATE, MANAGE

**НЕ ИСТЕЧЁТ:**
- ✅ Permanent (вечный)
- ✅ Не требует обновления
- ✅ Работает пока существует страница
- ✅ Автоматически кэшируется

---

## 🔥 ВАЖНО

После добавления на production **ОБЯЗАТЕЛЬНО**:

1. ✅ Перезапусти backend: `pm2 restart onai-backend`
2. ✅ Проверь логи: `pm2 logs onai-backend`
3. ✅ Протестируй API: `/api/traffic/combined-analytics`
4. ✅ Залогинься на traffic.onai.academy/login
5. ✅ Зайди в /settings
6. ✅ Нажми "Загрузить доступные кабинеты"
7. ✅ Должны показаться кабинеты!

---

## 🎉 ПОСЛЕ ЭТОГО

**ВСЯ СИСТЕМА ЗАРАБОТАЕТ:**
- ✅ Загрузка FB кабинетов
- ✅ Выбор кабинетов
- ✅ Загрузка кампаний
- ✅ Выбор кампаний
- ✅ Сохранение настроек
- ✅ Автотрекинг UTM

**ДЕЛАЙ ПРЯМО СЕЙЧАС!** 🚀

---

**Дата**: 19 декабря 2025, 08:10 AM  
**Локально**: ✅ ДОБАВЛЕНО  
**Production**: ⏳ НУЖНО ДОБАВИТЬ

