#!/bin/bash

# 🎓 Onboarding Test Script
# Quick commands for testing

echo "🎓 OnAI Academy - Onboarding Test Helper"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Menu
echo "Выберите действие:"
echo ""
echo "1) 🚀 Запустить dev сервер"
echo "2) 🧪 Открыть тестовую страницу"
echo "3) 🎬 Запустить E2E тесты"
echo "4) 👁️  Запустить E2E с UI"
echo "5) 🎥 Запустить E2E с браузером (headed)"
echo "6) 📊 Показать отчет тестов"
echo "7) 🏗️  Build production"
echo "8) 🚀 Deploy на production"
echo "9) 📖 Открыть документацию"
echo "0) ❌ Выход"
echo ""

read -p "Введи номер: " choice

case $choice in
  1)
    echo -e "${GREEN}🚀 Запускаем dev сервер...${NC}"
    npm run dev
    ;;
  2)
    echo -e "${BLUE}🧪 Открываем тестовую страницу...${NC}"
    echo "👉 http://localhost:5173/onboarding-test"
    # MacOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open "http://localhost:5173/onboarding-test"
    # Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      xdg-open "http://localhost:5173/onboarding-test"
    fi
    ;;
  3)
    echo -e "${GREEN}🎬 Запускаем E2E тесты...${NC}"
    npm run test:e2e
    ;;
  4)
    echo -e "${BLUE}👁️  Запускаем E2E с UI...${NC}"
    npm run test:e2e:ui
    ;;
  5)
    echo -e "${YELLOW}🎥 Запускаем E2E с браузером...${NC}"
    npm run test:e2e:headed
    ;;
  6)
    echo -e "${GREEN}📊 Показываем отчет...${NC}"
    npm run test:e2e:report
    ;;
  7)
    echo -e "${GREEN}🏗️  Building production...${NC}"
    npm run build:production
    echo "✅ Build завершен! Проверь папку dist/"
    ;;
  8)
    echo -e "${YELLOW}🚀 Deploying to production...${NC}"
    echo ""
    read -p "⚠️  Ты уверен? Это задеплоит на traffic.onai.academy (y/n): " confirm
    if [ "$confirm" = "y" ]; then
      echo "Building..."
      npm run build:production
      echo ""
      echo "Deploying..."
      rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/
      echo ""
      echo "Reloading Nginx..."
      ssh root@207.154.231.30 "chown -R www-data:www-data /var/www/traffic.onai.academy/ && systemctl reload nginx"
      echo ""
      echo -e "${GREEN}✅ Deploy завершен!${NC}"
      echo "👉 https://traffic.onai.academy/onboarding-test"
    else
      echo "Отменено"
    fi
    ;;
  9)
    echo -e "${BLUE}📖 Открываем документацию...${NC}"
    # MacOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open "ONBOARDING_TEST_REPORT.md"
      open "ONBOARDING_QUICK_START.md"
    # Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      xdg-open "ONBOARDING_TEST_REPORT.md"
      xdg-open "ONBOARDING_QUICK_START.md"
    else
      echo "📖 Документация:"
      echo "  - ONBOARDING_TEST_REPORT.md"
      echo "  - ONBOARDING_QUICK_START.md"
    fi
    ;;
  0)
    echo "👋 Пока!"
    exit 0
    ;;
  *)
    echo "❌ Неверный выбор"
    exit 1
    ;;
esac

