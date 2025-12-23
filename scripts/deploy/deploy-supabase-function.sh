#!/usr/bin/env bash

set -euo pipefail

cd /var/www/onai-integrator-login || { echo "Project dir not found"; exit 1; }

# Если supabase CLI не установлен — подскажу
if ! command -v supabase >/dev/null 2>&1; then
  echo "⚠️ supabase CLI не установлен на сервере. Обычно деплоят функцию с локалки:"
  echo "   supabase functions deploy chat --no-verify-jwt"
  exit 0
fi

supabase functions deploy chat --no-verify-jwt || true
echo "✅ Edge Function "chat" — команду отправил."
