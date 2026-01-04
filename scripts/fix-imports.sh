#!/bin/bash
# Fix incorrect imports of trafficAdminSupabase

FILES=(
  "backend/src/cron/facebook-ads-sync.ts"
  "backend/src/services/retroactiveSyncService.ts"
  "backend/src/services/exchangeRateService.ts"
  "backend/src/services/trafficRecommendations.ts"
  "backend/src/services/trafficStatsSyncService.ts"
  "backend/src/routes/amocrm-main-product-webhook.ts"
  "backend/src/routes/amocrm-funnel-webhook.ts"
  "backend/src/routes/attribution-manager.ts"
  "backend/src/routes/traffic-force-sync.ts"
  "backend/src/routes/traffic-stats.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    # Replace wrong import path
    sed -i '' "s|from '../config/supabase-landing.js';|from '../config/supabase-traffic.js';|g" "$file"
  fi
done

echo "✅ All imports fixed!"
