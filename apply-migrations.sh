#!/bin/bash

# 🚀 Автоматическое применение миграций Supabase
# Дата: 7 ноября 2025

set -e

echo "🚀 Применение миграций Supabase..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка наличия Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI не найден${NC}"
    echo ""
    echo "📦 Установка Supabase CLI..."
    
    # Проверяем систему
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        else
            echo -e "${YELLOW}Homebrew не установлен. Установка через NPM...${NC}"
            npm install -g supabase
        fi
    else
        # Linux или другие
        npm install -g supabase
    fi
fi

echo -e "${GREEN}✅ Supabase CLI установлен${NC}"
echo ""

# Проверяем авторизацию
echo "🔐 Проверка авторизации..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Необходима авторизация в Supabase${NC}"
    echo ""
    echo "📋 Получите Access Token:"
    echo "1. Откройте: https://supabase.com/dashboard/account/tokens"
    echo "2. Скопируйте 'Access Token'"
    echo "3. Вставьте ниже"
    echo ""
    
    supabase login
fi

echo -e "${GREEN}✅ Авторизация успешна${NC}"
echo ""

# Переходим в директорию проекта
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"

# Проверяем наличие миграций
if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Папка supabase/migrations не найдена${NC}"
    exit 1
fi

# Подсчитываем миграции
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Найдено миграций: $MIGRATION_COUNT"
echo ""

# Показываем список миграций
echo "📋 Список миграций:"
ls -1 supabase/migrations/*.sql | while read file; do
    basename "$file"
done
echo ""

# Связываем проект
echo "🔗 Связывание проекта с Supabase..."
PROJECT_REF="capdjvokjdivxjfddmx"

# Проверяем есть ли уже связь
if [ ! -f ".supabase/config.toml" ]; then
    echo "Связываем проект: $PROJECT_REF"
    supabase link --project-ref "$PROJECT_REF"
else
    echo -e "${GREEN}✅ Проект уже связан${NC}"
fi
echo ""

# Применяем миграции
echo "🚀 Применение миграций к базе данных..."
echo ""
supabase db push

echo ""
echo -e "${GREEN}✅ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО!${NC}"
echo ""

# Проверка результата
echo "📊 Проверка созданных таблиц..."
echo ""

# SQL для проверки таблиц
CHECK_SQL="
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%ai_curator%' 
  OR table_name LIKE '%achievement%'
  OR table_name = 'user_statistics'
)
ORDER BY table_name;
"

echo "Выполняем проверку..."
echo "$CHECK_SQL" | supabase db query

echo ""
echo -e "${GREEN}🎉 ГОТОВО!${NC}"
echo ""
echo "📋 Следующие шаги:"
echo "1. ✅ Миграции применены"
echo "2. ⏭️  Обновить код для работы с реальной БД"
echo "3. ⏭️  Протестировать на localhost"
echo "4. ⏭️  Задеплоить на Digital Ocean"
echo ""

