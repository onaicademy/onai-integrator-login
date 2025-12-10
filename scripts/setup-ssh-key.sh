#!/bin/bash
# SSH Key Setup Script for onAI Backend Server

set -e

echo "🔑 SSH Key Setup для onAI Backend Server"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="207.154.231.30"
USER="root"
PUBLIC_KEY_FILE="$HOME/.ssh/id_rsa.pub"

# Проверяем наличие публичного ключа
if [ ! -f "$PUBLIC_KEY_FILE" ]; then
    echo -e "${RED}❌ Публичный ключ не найден: $PUBLIC_KEY_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Публичный ключ найден${NC}"
echo ""
echo "📋 Ваш публичный ключ:"
echo "----------------------------------------"
cat "$PUBLIC_KEY_FILE"
echo "----------------------------------------"
echo ""

# Копируем ключ на сервер
echo -e "${YELLOW}📤 Копирую публичный ключ на сервер...${NC}"
echo "Введите пароль root для сервера $SERVER:"
echo ""

ssh-copy-id -i "$PUBLIC_KEY_FILE" "$USER@$SERVER"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Публичный ключ успешно добавлен на сервер!${NC}"
    echo ""
    echo "🧪 Тестирую соединение..."
    ssh -o ConnectTimeout=5 onai-backend "echo '✅ SSH connection successful!' && hostname && whoami"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 SSH настроен успешно!${NC}"
        echo ""
        echo "Теперь вы можете использовать:"
        echo "  ssh onai-backend"
        echo "  ./scripts/deploy-backend.sh"
    else
        echo -e "${RED}❌ Тест соединения не прошел${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Не удалось добавить ключ на сервер${NC}"
    exit 1
fi
