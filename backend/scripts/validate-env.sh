#!/bin/bash

# 🔒 ENV Validation Script
# Проверяет наличие всех критичных ENV переменных
# Использование: ./scripts/validate-env.sh [path/to/env.env]

set -e

ENV_FILE="${1:-../env.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Validating ENV file: $ENV_FILE"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Счётчики
MISSING=0
FOUND=0

# Функция проверки переменной
check_var() {
  local var_name="$1"
  local description="$2"
  local is_critical="${3:-true}"
  
  if grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
    local value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2-)
    if [ -n "$value" ] && [ "$value" != "your-" ] && [ "$value" != "change-this" ]; then
      echo -e "${GREEN}✅ $var_name${NC} - $description"
      FOUND=$((FOUND + 1))
    else
      if [ "$is_critical" = "true" ]; then
        echo -e "${RED}❌ $var_name${NC} - $description (ПУСТОЕ ЗНАЧЕНИЕ!)"
        MISSING=$((MISSING + 1))
      else
        echo -e "${YELLOW}⚠️  $var_name${NC} - $description (опционально, но пусто)"
      fi
    fi
  else
    if [ "$is_critical" = "true" ]; then
      echo -e "${RED}❌ $var_name${NC} - $description (НЕ НАЙДЕНО!)"
      MISSING=$((MISSING + 1))
    else
      echo -e "${YELLOW}⚠️  $var_name${NC} - $description (опционально, отсутствует)"
    fi
  fi
}

echo "=== КРИТИЧНЫЕ ПЕРЕМЕННЫЕ ==="
echo ""

# SUPABASE (Main Platform)
check_var "SUPABASE_URL" "Main Platform Database URL" true
check_var "SUPABASE_ANON_KEY" "Main Platform Anon Key" true
check_var "SUPABASE_SERVICE_ROLE_KEY" "Main Platform Service Role Key" true

# SUPABASE (Tripwire/Traffic)
check_var "TRIPWIRE_SUPABASE_URL" "Tripwire Database URL" true
check_var "TRIPWIRE_ANON_KEY" "Tripwire Anon Key" true
check_var "TRIPWIRE_SERVICE_ROLE_KEY" "Tripwire Service Role Key" true

# SUPABASE (Landing)
check_var "LANDING_SUPABASE_URL" "Landing Database URL" true
check_var "LANDING_SUPABASE_KEY" "Landing Database Key" true

# OPENAI
check_var "OPENAI_API_KEY" "OpenAI API Key" true
check_var "OPENAI_ASSISTANT_CURATOR_ID" "AI Curator Assistant ID" false
check_var "OPENAI_ASSISTANT_ANALYST_ID" "AI Analyst Assistant ID" false
check_var "OPENAI_ASSISTANT_MENTOR_ID" "AI Mentor Assistant ID" false

# FACEBOOK
check_var "FB_ACCESS_TOKEN" "Facebook Ads API Token (Traffic Dashboard)" true

# JWT
check_var "JWT_SECRET" "JWT Secret для токенов" true

echo ""
echo "=== ДОПОЛНИТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ==="
echo ""

# TELEGRAM
check_var "TELEGRAM_BOT_TOKEN" "Telegram Bot Token" false
check_var "TELEGRAM_CHANNEL_ID" "Telegram Channel ID" false

# EMAIL
check_var "RESEND_API_KEY" "Resend Email API Key" false

# CLOUDFLARE R2
check_var "CLOUDFLARE_R2_ACCOUNT_ID" "Cloudflare R2 Account" false
check_var "CLOUDFLARE_R2_ACCESS_KEY_ID" "Cloudflare R2 Access Key" false
check_var "CLOUDFLARE_R2_SECRET_ACCESS_KEY" "Cloudflare R2 Secret" false

# BUNNY CDN
check_var "BUNNY_STREAM_API_KEY" "Bunny Stream API Key" false
check_var "BUNNY_STREAM_LIBRARY_ID" "Bunny Stream Library ID" false

# WHAPI
check_var "WHAPI_TOKEN" "Whapi Token" false

# SERVER
check_var "NODE_ENV" "Node Environment" true
check_var "PORT" "Server Port" true

echo ""
echo "========================================"
echo -e "Найдено: ${GREEN}${FOUND}${NC} переменных"
echo -e "Отсутствует: ${RED}${MISSING}${NC} критичных переменных"
echo "========================================"
echo ""

if [ $MISSING -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED!${NC}"
  echo ""
  echo "⚠️  Критичные переменные отсутствуют или пусты!"
  echo "📋 Используйте backup для восстановления: backend/.env.production.backup"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ VALIDATION PASSED!${NC}"
  echo ""
  echo "🎉 Все критичные ENV переменные на месте!"
  echo ""
  exit 0
fi
