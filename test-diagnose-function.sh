#!/bin/bash

# 🧪 Скрипт для тестирования Edge Function diagnose-user
# Использование: ./test-diagnose-function.sh [USER_ID]

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Параметры
SUPABASE_URL="https://capdjvokjdivxjfdddmx.supabase.co"
FUNCTION_URL="$SUPABASE_URL/functions/v1/diagnose-user"

# Получаем USER_ID из аргумента или используем тестовый
USER_ID="${1:-test-user-id}"

# Получаем ANON_KEY из .env
if [ -f ".env" ]; then
    export $(cat .env | grep VITE_SUPABASE_PUBLISHABLE_KEY | xargs)
    ANON_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY"
else
    echo -e "${RED}❌ Файл .env не найден!${NC}"
    echo "Создайте файл .env с переменной VITE_SUPABASE_PUBLISHABLE_KEY"
    exit 1
fi

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ ANON_KEY не найден в .env!${NC}"
    exit 1
fi

echo -e "${YELLOW}🧪 Тестируем Edge Function: diagnose-user${NC}"
echo -e "${YELLOW}📍 User ID: $USER_ID${NC}"
echo ""

# Выполняем запрос
echo -e "${YELLOW}📡 Отправка запроса...${NC}"
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}")

# Проверяем ответ
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ Ошибка:${NC}"
    echo "$RESPONSE" | jq '.'
    exit 1
else
    echo -e "${GREEN}✅ Успешно!${NC}"
    echo ""
    echo -e "${GREEN}📊 Результат диагностики:${NC}"
    echo "$RESPONSE" | jq '.'
    
    # Извлекаем ключевые метрики
    echo ""
    echo -e "${GREEN}📈 Ключевые метрики:${NC}"
    echo "Завершено уроков: $(echo "$RESPONSE" | jq -r '.data.lessons_completed')"
    echo "Среднее мин/день: $(echo "$RESPONSE" | jq -r '.data.avg_minutes_per_day')"
    echo "Текущий стрик: $(echo "$RESPONSE" | jq -r '.data.current_streak')"
    echo "Низкая вовлечённость: $(echo "$RESPONSE" | jq -r '.data.flag_low_engagement')"
    echo ""
    echo -e "${YELLOW}💡 Рекомендация:${NC}"
    echo "$(echo "$RESPONSE" | jq -r '.data.recommendation')"
fi

