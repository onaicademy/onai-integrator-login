#!/bin/bash

set -e

echo "🔧 Обновление .env на сервере..."

ssh root@178.128.203.40 << 'ENDSSH'
  cd /var/www/onai-integrator-login
  
  echo "📝 Создаём новый .env файл..."
  
  cat > .env << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjc5MDUsImV4cCI6MjA3Nzc0MzkwNX0.bsikIoF86BjthWauzbLXq3SZbNQFodppZ2TC64NniJs

# Для обратной совместимости (старое название)
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjc5MDUsImV4cCI6MjA3Nzc0MzkwNX0.bsikIoF86BjthWauzbLXq3SZbNQFodppZ2TC64NniJs

# Site Configuration
VITE_SITE_URL=https://onai.academy
VITE_APP_URL=https://onai.academy

# OpenAI Configuration
VITE_OPENAI_API_KEY=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
VITE_OPENAI_ASSISTANT_ID=asst_SYhUvkKgCMEYlAjA0VNSMbLa

# Telegram Bots (AI-Mentor & AI-Analyst)
VITE_AI_MENTOR_TELEGRAM_TOKEN=8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo
VITE_AI_ANALYST_TELEGRAM_TOKEN=8400927507:AAF1w1H8lyE2vonPY-Z61bBybBT8dkN-Ip4
VITE_AI_MENTOR_ENABLED=false
VITE_AI_ANALYST_ENABLED=false
EOF

  echo "✅ .env файл обновлён!"
  echo ""
  echo "📋 Проверка содержимого:"
  cat .env | grep VITE_SUPABASE
  
ENDSSH

echo ""
echo "🎉 Готово! Теперь запусти: ./deploy.sh"

