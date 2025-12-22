#!/bin/bash
# 🛡️ Быстрая защита от повторного краша
# Выполни эти команды ПРЯМО СЕЙЧАС (5-10 минут)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🛡️  БЫСТРАЯ ЗАЩИТА BACKEND API      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# ============================================
# ШАГ 1: ИСПРАВИТЬ PM2 КОНФИГ
# ============================================
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}ШАГ 1/4: Исправление PM2 конфига${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

echo "📝 Подключаемся к серверу и правим ecosystem.config.js..."
ssh root@207.154.231.30 'bash -s' << 'ENDSSH'
cd /var/www/onai-integrator-login-main/backend

# Backup
cp ecosystem.config.js ecosystem.config.js.backup

# Fix max_restarts and min_uptime
sed -i "s/max_restarts: 15/max_restarts: 3/g" ecosystem.config.js
sed -i "s/min_uptime: '5s'/min_uptime: '30s'/g" ecosystem.config.js

echo "✅ PM2 config исправлен:"
grep -A2 "max_restarts\|min_uptime" ecosystem.config.js

echo ""
echo "♻️  Перезапускаем PM2..."
pm2 restart onai-backend

echo ""
echo "✅ ШАГ 1 ЗАВЕРШЁН"
ENDSSH

echo -e "${GREEN}✅ PM2 конфиг исправлен!${NC}"
echo ""
sleep 2

# ============================================
# ШАГ 2: ВКЛЮЧИТЬ SENTRY (если есть DSN)
# ============================================
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}ШАГ 2/4: Включение Sentry${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

read -p "У тебя есть Sentry DSN? (y/n): " HAS_SENTRY

if [ "$HAS_SENTRY" = "y" ] || [ "$HAS_SENTRY" = "Y" ]; then
    read -p "Введи Sentry DSN: " SENTRY_DSN
    
    ssh root@207.154.231.30 "bash -s $SENTRY_DSN" << 'ENDSSH'
    cd /var/www/onai-integrator-login-main/backend
    
    # Backup
    cp env.env env.env.backup
    
    # Add Sentry
    if grep -q "SENTRY_ENABLED" env.env; then
        sed -i "s/SENTRY_ENABLED=.*/SENTRY_ENABLED=true/g" env.env
        sed -i "s|SENTRY_DSN=.*|SENTRY_DSN=$1|g" env.env
    else
        echo "" >> env.env
        echo "# Sentry Error Tracking" >> env.env
        echo "SENTRY_ENABLED=true" >> env.env
        echo "SENTRY_DSN=$1" >> env.env
    fi
    
    echo "✅ Sentry включён"
    pm2 restart onai-backend
ENDSSH
    
    echo -e "${GREEN}✅ Sentry включён!${NC}"
else
    echo -e "${YELLOW}⚠️  Пропускаем Sentry${NC}"
    echo "   Создай проект на https://sentry.io и запусти скрипт снова"
fi
echo ""
sleep 2

# ============================================
# ШАГ 3: ОЧИСТИТЬ СТАРЫЕ АРТЕФАКТЫ
# ============================================
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}ШАГ 3/4: Очистка старых артефактов${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

ssh root@207.154.231.30 'bash -s' << 'ENDSSH'
cd /var/www/onai-integrator-login-main/backend

echo "🧹 Удаляем dist/, *.tar.gz, *.tgz..."
rm -rf dist/ *.tar.gz *.tgz

echo "✅ Артефакты удалены"
echo ""
echo "📂 Содержимое backend/:"
ls -lh | grep -v node_modules

echo ""
echo "✅ ШАГ 3 ЗАВЕРШЁН"
ENDSSH

echo -e "${GREEN}✅ Артефакты очищены!${NC}"
echo ""
sleep 2

# ============================================
# ШАГ 4: ПРОВЕРКА ЗДОРОВЬЯ
# ============================================
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}ШАГ 4/4: Проверка здоровья системы${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

echo "⏳ Ждём 10 секунд для стабилизации..."
sleep 10

echo "🔍 Проверяем PM2 status..."
ssh root@207.154.231.30 'pm2 status onai-backend'

echo ""
echo "🔍 Проверяем health endpoint..."
HEALTH=$(curl -sf https://api.onai.academy/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API работает!${NC}"
    echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
else
    echo -e "${RED}❌ API не отвечает!${NC}"
    echo "Проверь логи: ssh root@207.154.231.30 'pm2 logs onai-backend'"
fi

echo ""
echo -e "${GREEN}✅ ШАГ 4 ЗАВЕРШЁН${NC}"
echo ""

# ============================================
# ИТОГИ
# ============================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ БЫСТРАЯ ЗАЩИТА УСТАНОВЛЕНА!      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

echo "📊 Что сделано:"
echo "  ✅ PM2 max_restarts: 15 → 3"
echo "  ✅ PM2 min_uptime: 5s → 30s"
if [ "$HAS_SENTRY" = "y" ] || [ "$HAS_SENTRY" = "Y" ]; then
    echo "  ✅ Sentry включён"
else
    echo "  ⚠️  Sentry НЕ включён"
fi
echo "  ✅ Старые артефакты удалены"
echo "  ✅ Backend проверен"
echo ""

echo "⚠️  ЧТО ЕЩЁ НУЖНО СДЕЛАТЬ:"
echo ""
echo "1️⃣  МОНИТОРИНГ (КРИТИЧНО!):"
echo "   → Зайди на https://uptimerobot.com"
echo "   → Добавь монитор для https://api.onai.academy/health"
echo "   → Настрой Telegram алерты"
echo ""
echo "2️⃣  ИСПРАВИТЬ DEPLOY СКРИПТЫ:"
echo "   → Удали 'npm run build' из:"
echo "      - deploy-backend-final.sh"
echo "      - scripts/deploy-backend.sh"
echo "      - deploy-production.sh"
echo ""
echo "3️⃣  ДОБАВИТЬ SMOKE TESTS:"
echo "   → После деплоя проверяй /health endpoint"
echo "   → Rollback если не отвечает"
echo ""

echo "📚 Документация:"
echo "  - POSTMORTEM_BACKEND_CRASH_2025-12-22.md"
echo "  - СРОЧНЫЕ_УЛУЧШЕНИЯ_ПОСЛЕ_КРАША.md"
echo "  - ИНЦИДЕНТ_КРАТКАЯ_СВОДКА.md"
echo ""

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Защита установлена! 🛡️${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
