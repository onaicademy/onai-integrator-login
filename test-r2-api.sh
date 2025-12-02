#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 CLOUDFLARE R2 API DIAGNOSTIC TEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Credentials
export R2_ACCOUNT_ID="9759c9a54b40f80e87e525245662da24"
export R2_ACCESS_KEY_ID="7acdb68c6dcedb620831cc926630fa70"
export R2_SECRET_ACCESS_KEY="b603cab224f0e926af5e210b8917bc0de5289fc85fded595e47ad730634add3"
export R2_BUCKET_NAME="onai-academy-videos"
export R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export R2_PUBLIC_URL="https://pub-b4d57373665444eca59ad2bd18dc9c61.r2.dev"

echo "📋 Configuration:"
echo "   Account ID: ${R2_ACCOUNT_ID}"
echo "   Access Key: ${R2_ACCESS_KEY_ID:0:10}..."
echo "   Secret Key: ${R2_SECRET_ACCESS_KEY:0:10}..."
echo "   Bucket: ${R2_BUCKET_NAME}"
echo "   Endpoint: ${R2_ENDPOINT}"
echo ""

# ТЕСТ 1: LIST BUCKET
echo "─────────────────────────────────────────────────────────────"
echo "🧪 ТЕСТ 1: List Bucket Objects"
echo "─────────────────────────────────────────────────────────────"

if command -v aws &> /dev/null; then
    echo "✅ AWS CLI найден"
    
    aws configure set aws_access_key_id "${R2_ACCESS_KEY_ID}" --profile r2-test
    aws configure set aws_secret_access_key "${R2_SECRET_ACCESS_KEY}" --profile r2-test
    aws configure set region auto --profile r2-test
    
    echo ""
    echo "📦 Запрос: List objects in bucket..."
    
    response=$(aws s3 ls "s3://${R2_BUCKET_NAME}/" \
        --endpoint-url "${R2_ENDPOINT}" \
        --profile r2-test 2>&1)
    
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ УСПЕХ: Bucket доступен"
        echo "📄 Содержимое bucket:"
        echo "$response"
    else
        echo "❌ ОШИБКА: Не удалось получить доступ к bucket"
        echo "📄 Ответ сервера:"
        echo "$response"
        
        if echo "$response" | grep -q "InvalidAccessKeyId"; then
            echo ""
            echo "🔍 ДИАГНОЗ: Access Key ID неправильный или неактивен"
        elif echo "$response" | grep -q "SignatureDoesNotMatch"; then
            echo ""
            echo "🔍 ДИАГНОЗ: Secret Access Key неправильный"
        elif echo "$response" | grep -q "AccessDenied"; then
            echo ""
            echo "🔍 ДИАГНОЗ: Недостаточно permissions для bucket"
        elif echo "$response" | grep -q "NoSuchBucket"; then
            echo ""
            echo "🔍 ДИАГНОЗ: Bucket не существует"
        elif echo "$response" | grep -q "Could not connect"; then
            echo ""
            echo "🔍 ДИАГНОЗ: Cloudflare R2 сервис недоступен (возможный outage)"
        else
            echo ""
            echo "🔍 ДИАГНОЗ: Неизвестная ошибка"
        fi
    fi
    
    aws configure set aws_access_key_id "" --profile r2-test
    aws configure set aws_secret_access_key "" --profile r2-test
else
    echo "⚠️ AWS CLI не установлен, используем curl..."
    
    echo "📦 Запрос через curl..."
    
    response=$(curl -I -s -w "\nHTTP_CODE:%{http_code}" \
        "${R2_PUBLIC_URL}/" 2>&1)
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
    
    echo "📄 HTTP код: ${http_code}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "403" ]; then
        echo "✅ Bucket endpoint доступен"
    elif [ "$http_code" = "404" ]; then
        echo "❌ Bucket не найден (404)"
    else
        echo "❌ Неожиданный HTTP код: ${http_code}"
    fi
fi

echo ""

# ТЕСТ 2: ПРОВЕРКА PUBLIC URL
echo "─────────────────────────────────────────────────────────────"
echo "🧪 ТЕСТ 2: Check Public URL"
echo "─────────────────────────────────────────────────────────────"

echo "📦 Запрос: HEAD request to public URL..."

response=$(curl -I -s -w "\nHTTP_CODE:%{http_code}" "${R2_PUBLIC_URL}/" 2>&1)
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)

echo "📄 HTTP код: ${http_code}"
echo "📄 Headers:"
echo "$response" | grep -v "HTTP_CODE:"

if [ "$http_code" = "200" ] || [ "$http_code" = "403" ]; then
    echo "✅ Public URL доступен"
elif [ "$http_code" = "404" ]; then
    echo "❌ Public URL не найден (bucket не публичный?)"
elif [ -z "$http_code" ]; then
    echo "❌ Cloudflare R2 не отвечает (возможный outage)"
else
    echo "⚠️ HTTP код: ${http_code}"
fi

echo ""

# ТЕСТ 3: ПРОВЕРКА ENDPOINT
echo "─────────────────────────────────────────────────────────────"
echo "🧪 ТЕСТ 3: Check R2 Endpoint"
echo "─────────────────────────────────────────────────────────────"

echo "📦 Запрос: HEAD request to R2 endpoint..."

response=$(curl -I -s -w "\nHTTP_CODE:%{http_code}" "${R2_ENDPOINT}/${R2_BUCKET_NAME}" 2>&1)
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)

echo "📄 HTTP код: ${http_code}"

if [ -z "$http_code" ]; then
    echo "❌ R2 endpoint не отвечает"
    echo "🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:"
    echo "   1. Cloudflare R2 service outage"
    echo "   2. Неправильный Account ID в endpoint"
    echo "   3. Сетевые проблемы"
elif [ "$http_code" = "403" ]; then
    echo "✅ R2 endpoint отвечает (403 = требуется аутентификация)"
elif [ "$http_code" = "200" ]; then
    echo "✅ R2 endpoint доступен"
else
    echo "⚠️ Неожиданный код: ${http_code}"
fi

echo ""

# ИТОГОВЫЙ ОТЧЁТ
echo "═══════════════════════════════════════════════════════════════"
echo "📊 ИТОГОВЫЙ ОТЧЁТ"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if command -v aws &> /dev/null; then
    echo "AWS CLI: ✅ Установлен"
else
    echo "AWS CLI: ❌ Не установлен (установи: apt install awscli)"
fi

echo ""
echo "🎯 РЕКОМЕНДАЦИИ:"
echo ""
echo "ЕСЛИ ВСЕ ТЕСТЫ ПРОШЛИ:"
echo "   ✅ R2 credentials валидны"
echo "   ✅ Bucket доступен"
echo "   ✅ Backend должен работать с видео"
echo ""
echo "ЕСЛИ ТЕСТЫ НЕ ПРОШЛИ:"
echo "   ❌ Проверь Access Key ID и Secret"
echo "   ❌ Проверь что bucket существует"
echo "   ❌ Создай новые API токены в Cloudflare Dashboard"
echo ""
echo "ЕСЛИ CLOUDFLARE НЕ ОТВЕЧАЕТ:"
echo "   ⏰ Возможен временный outage"
echo "   ⏰ Проверь: https://www.cloudflarestatus.com/"
echo "   ⏰ Подожди 30-60 минут и попробуй снова"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ ТЕСТ ЗАВЕРШЁН"
echo "═══════════════════════════════════════════════════════════════"


