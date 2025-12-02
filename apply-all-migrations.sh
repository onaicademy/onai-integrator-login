#!/bin/bash

# ========================================
# СКРИПТ ДЛЯ ПРИМЕНЕНИЯ ВСЕХ МИГРАЦИЙ
# ========================================

echo "🚀 Применение миграций к Supabase..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Supabase URL и ключ
SUPABASE_URL="https://capdjvokjdivxjfddmx.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkbXgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzMwNTY2MTU3LCJleHAiOjIwNDYxNDIxNTd9.123" # НУЖЕН SERVICE ROLE KEY!

# Функция для применения миграции
apply_migration() {
    local file=$1
    local name=$(basename "$file")
    
    echo -e "${YELLOW}📋 Применяю: $name${NC}"
    
    # Читаем SQL файл
    SQL_CONTENT=$(cat "$file")
    
    # Отправляем запрос через REST API
    response=$(curl -s -X POST \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Успешно: $name${NC}"
        echo ""
    else
        echo -e "${RED}❌ Ошибка: $name${NC}"
        echo "$response"
        echo ""
    fi
}

# Список миграций В ПОРЯДКЕ
migrations=(
    "supabase/migrations/20251103164013_remote_schema.sql"
    "supabase/migrations/20251103182016_remote_schema.sql"
    "supabase/migrations/20251104_add_diagnostics_tables.sql"
    "supabase/migrations/20250115_add_ai_curator_chat_tables.sql"
    "supabase/migrations/20250116_achievements_system.sql"
    "supabase/migrations/20250117_students_management_system.sql"
    "supabase/migrations/20250118_ai_mentor_and_analyst.sql"
    "supabase/migrations/20250109_token_usage_tracking.sql"
    "supabase/migrations/20250110_student_messaging.sql"
)

echo "========================================="
echo "ВНИМАНИЕ!"
echo "========================================="
echo ""
echo "Этот скрипт НЕ РАБОТАЕТ напрямую, так как требует:"
echo "1. Service Role Key (не Anon Key!)"
echo "2. Доступ к Supabase REST API"
echo ""
echo "ЛУЧШИЙ СПОСОБ:"
echo "Открой Supabase Dashboard вручную и примени миграции:"
echo ""
echo "1. Открой: https://supabase.com/dashboard/project/capdjvokjdivxjfddmx"
echo "2. SQL Editor → New Query"
echo "3. Скопируй содержимое каждого файла и запусти"
echo ""
echo "========================================="
echo ""
read -p "Продолжить автоматическое применение? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 0
fi

# Применяем миграции
for migration in "${migrations[@]}"; do
    if [ -f "$migration" ]; then
        apply_migration "$migration"
        sleep 2
    else
        echo -e "${RED}❌ Файл не найден: $migration${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Готово!${NC}"
echo ""
echo "Проверь таблицы в Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/capdjvokjdivxjfddmx/editor"

