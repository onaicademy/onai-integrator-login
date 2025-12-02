#!/bin/bash
cd /var/www/onai-integrator-login-main/backend
echo "=== BACKUP GIT STASH ==="
git stash
echo ""
echo "=== GIT PULL ==="
git pull origin main
echo ""
echo "=== NPM INSTALL ==="
npm install
echo ""
echo "=== BUILD ==="
npm run build
echo ""
echo "=== PM2 RELOAD ==="
pm2 reload onai-backend --update-env
echo ""
echo "=== PM2 STATUS ==="
pm2 status onai-backend
echo ""
echo "=== CHECK LOGS (last 20 lines) ==="
pm2 logs onai-backend --lines 20 --nostream
