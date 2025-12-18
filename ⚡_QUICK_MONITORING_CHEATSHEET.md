# ⚡ QUICK MONITORING CHEATSHEET

**Быстрая справка по мониторингу ONAI Platform**

---

## 🚨 КРИТИЧЕСКИЕ ПОРОГИ

```
⚠️  RAM >80% (>25GB)    → Увеличить сервер
⚠️  CPU Load >6.0       → Cluster mode или больше CPU
⚠️  Disk >90%           → Очистить логи или увеличить disk
⚠️  PM2 Restarts >50/день → Memory leak, искать проблему
```

---

## ✅ ЕЖЕДНЕВНАЯ ПРОВЕРКА (1 минута)

```bash
# 1. Полный мониторинг (рекомендуется)
ssh root@207.154.231.30 "/root/monitor.sh"

# 2. Или быстрая проверка
ssh root@207.154.231.30 "pm2 status && free -h && df -h /"
```

**Что смотреть:**
- PM2: status=online, memory<1GB, restarts<100 ✅
- RAM: available >25GB ✅
- Disk: <90% used ✅

---

## 📊 ТЕКУЩАЯ КОНФИГУРАЦИЯ

```
Server:  31GB RAM, 8 CPU cores, 24GB disk
Backend: 1 instance, 4GB memory limit
Database: 80 connections (max)
Rate Limit: 
  - Students: 4000 req/15min
  - Sales: БЕЗ ЛИМИТА
```

---

## 🔥 БЫСТРЫЕ КОМАНДЫ

### Проверить статус backend:
```bash
ssh root@207.154.231.30 "pm2 status"
```

### Посмотреть логи (последние 50 строк):
```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50"
```

### Перезапустить backend (если упал):
```bash
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

### Проверить использование ресурсов:
```bash
ssh root@207.154.231.30 "free -h && uptime"
```

### API Health Check:
```bash
curl -s https://api.onai.academy/api/health | jq '.'
```

### Очистить логи (если disk заполнен):
```bash
ssh root@207.154.231.30 "pm2 flush"
```

---

## 📈 КОГДА МАСШТАБИРОВАТЬ?

| Метрика | Сейчас | Норма | ДЕЙСТВОВАТЬ! |
|---------|--------|-------|--------------|
| RAM usage | 3% | <80% | **>80%** |
| CPU Load | 0.13 | <6.0 | **>6.0** |
| Disk usage | 30% | <90% | **>90%** |
| PM2 Restarts | 0/день | <50/день | **>50/день** |

**Действия при >80% RAM или >6.0 CPU:**
1. Запустить Cluster Mode (4 instances)
2. Или увеличить сервер до 64GB RAM + 16 CPU

---

## 🎯 НОРМА vs ПРОБЛЕМА

### ✅ ВСЁ ОК:
```
PM2 Status: online
Memory: <1GB
CPU: <30%
Restarts: <50
RAM Free: >25GB
Load Average: <2.0
```

### ⚠️ ПРОБЛЕМА:
```
PM2 Status: errored / stopping
Memory: >3GB
CPU: >80%
Restarts: >100
RAM Free: <5GB
Load Average: >6.0
```

---

## 💡 ПОЛЕЗНЫЕ ССЫЛКИ

- 📊 Полный гайд: `📊_SCALING_MONITORING_GUIDE.md`
- 🚀 Deployment: `🚀_DEPLOY_PRODUCTION_GUIDE.md`
- 📋 Frontend: https://onai.academy
- 🔌 API: https://api.onai.academy
- 📧 Health: https://api.onai.academy/api/health

---

**Сохрани эту шпаргалку!** 🔖










