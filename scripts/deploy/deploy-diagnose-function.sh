#!/bin/bash

# 🚀 Скрипт для деплоя Edge Function diagnose-user
# Использование: ./deploy-diagnose-function.sh

set -e  # Прерываем выполнение при ошибке

echo "🤖 Деплой AI-диагноста (diagnose-user function)..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка что Supabase CLI установлен
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI не установлен!${NC}"
    echo "Установите: npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}📦 Проверка проекта...${NC}"

# Проверка что проект слинкован
if [ ! -f "./.supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Проект не слинкован. Линкуем...${NC}"
    supabase link --project-ref capdjvokjdivxjfdddmx
fi

echo -e "${YELLOW}🔄 Применение миграции базы данных...${NC}"

# Применяем миграцию (если еще не применена)
supabase db push || {
    echo -e "${YELLOW}⚠️  Миграция уже применена или произошла ошибка${NC}"
}

echo -e "${YELLOW}🚀 Деплой функции diagnose-user...${NC}"

# Деплоим функцию
supabase functions deploy diagnose-user --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Функция успешно развёрнута!${NC}"
    echo ""
    echo -e "${GREEN}📍 Endpoint:${NC}"
    echo "https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user"
    echo ""
    echo -e "${GREEN}📖 Документация:${NC}"
    echo "Смотрите DIAGNOSTICS_SETUP_GUIDE.md"
    echo ""
    echo -e "${GREEN}🧪 Тестовый запрос:${NC}"
    echo 'curl -X POST "https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user" \'
    echo '  -H "Authorization: Bearer YOUR_ANON_KEY" \'
    echo '  -d '"'"'{"user_id": "YOUR_USER_ID"}'"'"
else
    echo -e "${RED}❌ Ошибка при деплое функции${NC}"
    exit 1
fi

