#!/bin/bash
set -e

echo "=================================="
echo "SSL Setup for onai.academy"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check DNS resolution
echo -e "${YELLOW}Step 1: Checking DNS...${NC}"
if host onai.academy | grep -q "178.128.203.40"; then
    echo -e "${GREEN}✓ onai.academy resolves to 178.128.203.40${NC}"
else
    echo -e "${RED}✗ DNS not configured correctly!${NC}"
    exit 1
fi

if host www.onai.academy | grep -q "178.128.203.40"; then
    echo -e "${GREEN}✓ www.onai.academy resolves to 178.128.203.40${NC}"
else
    echo -e "${YELLOW}⚠ www.onai.academy DNS issue (may work anyway)${NC}"
fi
echo ""

# 2. Check Nginx config
echo -e "${YELLOW}Step 2: Checking Nginx config...${NC}"
NGINX_CONF="/etc/nginx/sites-available/onai-integrator-login.conf"

if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}✗ Nginx config not found at $NGINX_CONF${NC}"
    exit 1
fi

# Check if old domain is still in config
if grep -q "onai.academy" "$NGINX_CONF"; then
    echo -e "${YELLOW}⚠ Found old domain onai.academy in config${NC}"
    echo -e "${YELLOW}  Replacing with onai.academy...${NC}"
    
    # Backup
    cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Replace domain
    sed -i 's/integratoronai\.kz/onai.academy/g' "$NGINX_CONF"
    echo -e "${GREEN}✓ Domain updated in Nginx config${NC}"
else
    echo -e "${GREEN}✓ Nginx config already has correct domain${NC}"
fi
echo ""

# 3. Test Nginx syntax
echo -e "${YELLOW}Step 3: Testing Nginx syntax...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx config syntax is valid${NC}"
else
    echo -e "${RED}✗ Nginx config has errors!${NC}"
    exit 1
fi
echo ""

# 4. Reload Nginx
echo -e "${YELLOW}Step 4: Reloading Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# 5. Install Certbot if needed
echo -e "${YELLOW}Step 5: Checking Certbot installation...${NC}"
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}  Certbot not found, installing...${NC}"
    apt update -qq
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi
echo ""

# 6. Get SSL certificate
echo -e "${YELLOW}Step 6: Obtaining SSL certificate...${NC}"
echo -e "${YELLOW}  This will run certbot for onai.academy and www.onai.academy${NC}"
echo ""

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/onai.academy" ]; then
    echo -e "${YELLOW}⚠ Certificate already exists${NC}"
    echo -e "${YELLOW}  Running renewal/update...${NC}"
    certbot --nginx -d onai.academy -d www.onai.academy --non-interactive --agree-tos --register-unsafely-without-email || \
    certbot --nginx -d onai.academy -d www.onai.academy --non-interactive --expand
else
    echo -e "${YELLOW}  Obtaining new certificate...${NC}"
    certbot --nginx -d onai.academy -d www.onai.academy --non-interactive --agree-tos --register-unsafely-without-email
fi

echo ""
echo -e "${GREEN}✓ SSL certificate obtained and configured!${NC}"
echo ""

# 7. Verify HTTPS
echo -e "${YELLOW}Step 7: Verifying HTTPS...${NC}"
if curl -sI https://onai.academy | grep -q "HTTP/.*200\|301\|302"; then
    echo -e "${GREEN}✓ HTTPS is working!${NC}"
else
    echo -e "${YELLOW}⚠ HTTPS verification inconclusive (may still work)${NC}"
fi
echo ""

# 8. Setup auto-renewal
echo -e "${YELLOW}Step 8: Setting up auto-renewal...${NC}"
if systemctl list-timers | grep -q certbot; then
    echo -e "${GREEN}✓ Certbot auto-renewal already configured${NC}"
else
    echo -e "${YELLOW}  Enabling certbot timer...${NC}"
    systemctl enable certbot.timer
    systemctl start certbot.timer
    echo -e "${GREEN}✓ Auto-renewal configured${NC}"
fi
echo ""

echo "=================================="
echo -e "${GREEN}SUCCESS! SSL Setup Complete${NC}"
echo "=================================="
echo ""
echo "Your site is now available at:"
echo -e "${GREEN}  https://onai.academy${NC}"
echo -e "${GREEN}  https://www.onai.academy${NC}"
echo ""
echo "SSL certificate will auto-renew every 60 days."
echo ""
echo "Next steps:"
echo "1. Open https://onai.academy in browser"
echo "2. Verify SSL certificate (green lock icon)"
echo "3. Test login functionality"
echo ""

