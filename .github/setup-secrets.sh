#!/bin/bash

# 🔐 Скрипт для настройки GitHub Secrets
# Этот скрипт поможет добавить все необходимые секреты в GitHub репозиторий

set -e

echo "🔐 Настройка GitHub Secrets для автодеплоя"
echo "=========================================="
echo ""

# Проверка что gh CLI установлен
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) не установлен!"
    echo "Установите: https://cli.github.com/"
    exit 1
fi

# Проверка авторизации
if ! gh auth status &> /dev/null; then
    echo "❌ Вы не авторизованы в GitHub CLI"
    echo "Выполните: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI готов к работе"
echo ""

# Функция для добавления секрета
add_secret() {
    local secret_name=$1
    local secret_description=$2

    echo "📝 $secret_description"
    echo "Введите значение для $secret_name (или нажмите Enter чтобы пропустить):"
    read -r secret_value

    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$secret_name"
        echo "✅ $secret_name добавлен"
    else
        echo "⏭️  Пропущено"
    fi
    echo ""
}

# Проверяем существующие секреты
echo "🔍 Проверка существующих секретов..."
gh secret list
echo ""

# Добавляем недостающие секреты
echo "📋 Добавление недостающих секретов"
echo "===================================="
echo ""

# Tripwire Supabase
add_secret "VITE_TRIPWIRE_SUPABASE_URL" "Tripwire Supabase URL (https://pjmvxecykysfrzppdcto.supabase.co)"
add_secret "VITE_TRIPWIRE_SUPABASE_ANON_KEY" "Tripwire Supabase Anon Key"

# Landing Supabase
add_secret "VITE_LANDING_SUPABASE_URL" "Landing Supabase URL (https://xikaiavwqinamgolmtcy.supabase.co)"
add_secret "VITE_LANDING_SUPABASE_ANON_KEY" "Landing Supabase Anon Key"

echo ""
echo "🎉 Готово! Проверьте добавленные секреты:"
gh secret list

echo ""
echo "📝 Следующие шаги:"
echo "1. Перейдите в GitHub → Settings → Secrets and variables → Actions"
echo "2. Убедитесь что все секреты добавлены"
echo "3. Попробуйте запустить workflow вручную: GitHub → Actions → Run workflow"
echo ""
echo "🚀 Автодеплой настроен!"
