# Traffic Aggregation: Local Testing Plan

## Prerequisites

1. Backend running locally on port 3000
2. Traffic Supabase configured with required tables
3. Valid Facebook Access Token in `.env`
4. At least one test user in `traffic_users`

## Phase 1: Database Setup

### Step 1.1: Run Migration

Apply the migration to create required tables:

```sql
-- Run in Traffic Supabase SQL Editor

-- 008_traffic_aggregated_metrics.sql
CREATE TABLE IF NOT EXISTS traffic_aggregated_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('today', '7d', '30d')),
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  spend_kzt DECIMAL(12,2) DEFAULT 0,
  conversions INT DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  sales INT DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  roas DECIMAL(10,4) DEFAULT 0,
  cpa DECIMAL(12,2) DEFAULT 0,
  campaigns_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE INDEX idx_traffic_aggregated_metrics_user_id ON traffic_aggregated_metrics(user_id);
CREATE INDEX idx_traffic_aggregated_metrics_period ON traffic_aggregated_metrics(period);

-- Sync history for debugging
CREATE TABLE IF NOT EXISTS traffic_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN DEFAULT FALSE,
  users_processed INT DEFAULT 0,
  metrics_updated INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  error_message TEXT
);
```

### Step 1.2: Verify Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'traffic_%';
```

Expected output should include:
- `traffic_aggregated_metrics`
- `traffic_sync_history`

## Phase 2: API Endpoint Testing

### Step 2.1: Test Sync Status Endpoint

```bash
# Get current sync status (no auth required for testing)
curl http://localhost:3000/api/traffic-aggregation/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "inProgress": false,
  "lastSync": null,
  "lastError": null,
  "stats": {
    "usersProcessed": 0,
    "campaignsProcessed": 0,
    "metricsUpdated": 0,
    "duration": 0
  },
  "nextSync": null
}
```

### Step 2.2: Trigger Manual Refresh (Admin Only)

```bash
# First login as admin
TOKEN=$(curl -s -X POST http://localhost:3000/api/traffic-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onai.academy","password":"YOUR_PASSWORD"}' | jq -r '.token')

# Trigger manual refresh
curl -X POST http://localhost:3000/api/traffic-aggregation/refresh \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Sync started"
}
```

### Step 2.3: Check Sync Progress

```bash
# Poll status every 5 seconds until sync completes
while true; do
  curl -s http://localhost:3000/api/traffic-aggregation/status \
    -H "Authorization: Bearer $TOKEN" | jq
  sleep 5
done
```

### Step 2.4: Fetch Cached Metrics

```bash
# Get metrics for a specific user
curl "http://localhost:3000/api/traffic-aggregation/metrics?period=7d" \
  -H "Authorization: Bearer $TOKEN"
```

## Phase 3: Frontend Component Testing

### Step 3.1: Start Frontend Dev Server

```bash
npm run dev
```

### Step 3.2: Navigate to Traffic Dashboard

1. Open browser to `http://localhost:5173/traffic`
2. Login with traffic credentials

### Step 3.3: Verify SyncStatusBar

Check for these elements:
- [ ] Freshness indicator (green/yellow/red dot)
- [ ] "Last sync: X min ago" text
- [ ] Refresh button (admin only)
- [ ] Spinning indicator during sync

### Step 3.4: Test Manual Refresh

1. Click "Refresh Now" button (as admin)
2. Verify spinner appears
3. Verify toast notification "Sync started in background"
4. Wait for sync to complete
5. Verify freshness indicator updates

## Phase 4: Load Testing

### Step 4.1: Simulate Multiple Users

```bash
# Create test script
cat > /tmp/test-aggregation-load.sh << 'EOF'
#!/bin/bash

TOKEN="YOUR_ADMIN_TOKEN"
BASE_URL="http://localhost:3000"

echo "Testing sync status under load..."

for i in {1..10}; do
  (
    curl -s "$BASE_URL/api/traffic-aggregation/status" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
    echo "Request $i completed"
  ) &
done

wait
echo "All requests completed"
EOF

chmod +x /tmp/test-aggregation-load.sh
/tmp/test-aggregation-load.sh
```

### Step 4.2: Verify Rate Limiting Protection

Watch server logs during aggregation:
```bash
# Look for rate limit delays
grep "100ms" backend/logs/*.log
```

## Phase 5: Error Handling Tests

### Step 5.1: Test Without FB Token

```bash
# Temporarily remove FB token
export FB_ACCESS_TOKEN=""

# Trigger sync
curl -X POST http://localhost:3000/api/traffic-aggregation/refresh \
  -H "Authorization: Bearer $TOKEN"

# Check error message
curl http://localhost:3000/api/traffic-aggregation/status \
  -H "Authorization: Bearer $TOKEN" | jq '.lastError'
```

Expected: `"Facebook access token not configured"`

### Step 5.2: Test Invalid Campaign ID

1. Add invalid campaign ID to user settings
2. Trigger sync
3. Verify partial success (other campaigns still processed)

### Step 5.3: Test Database Connection Failure

1. Temporarily change Supabase URL
2. Trigger sync
3. Verify graceful error handling

## Phase 6: Integration Testing

### Step 6.1: End-to-End Flow

```bash
# Full integration test script
cat > /tmp/e2e-aggregation-test.sh << 'EOF'
#!/bin/bash

BASE_URL="http://localhost:3000"
EMAIL="admin@onai.academy"
PASSWORD="YOUR_PASSWORD"

echo "1. Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/traffic-auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "Login failed!"
  exit 1
fi

echo "2. Checking initial status..."
curl -s "$BASE_URL/api/traffic-aggregation/status" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "3. Triggering sync..."
curl -s -X POST "$BASE_URL/api/traffic-aggregation/refresh" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "4. Waiting for sync to complete..."
sleep 30

echo "5. Checking final status..."
curl -s "$BASE_URL/api/traffic-aggregation/status" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "6. Fetching metrics..."
curl -s "$BASE_URL/api/traffic-aggregation/metrics?period=7d" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "Done!"
EOF

chmod +x /tmp/e2e-aggregation-test.sh
/tmp/e2e-aggregation-test.sh
```

## Verification Checklist

### Database
- [ ] `traffic_aggregated_metrics` table created
- [ ] `traffic_sync_history` table created
- [ ] Unique constraint on (user_id, period) working

### Backend
- [ ] `/api/traffic-aggregation/status` returns correct format
- [ ] `/api/traffic-aggregation/refresh` requires admin auth
- [ ] `/api/traffic-aggregation/metrics` returns cached data
- [ ] Scheduler starts on server boot (production only)
- [ ] 100ms delay between FB API calls

### Frontend
- [ ] SyncStatusBar renders correctly
- [ ] Freshness indicator updates based on lastSync
- [ ] Refresh button visible only for admin
- [ ] Toast notifications work
- [ ] Polling updates status every 30s

### Error Handling
- [ ] Missing FB token handled gracefully
- [ ] Failed campaign fetches don't crash sync
- [ ] Error messages displayed in UI
- [ ] Server continues running after sync errors

## Troubleshooting

### Sync Never Completes
1. Check server logs for errors
2. Verify FB token is valid
3. Check if users have tracked campaigns

### Metrics Always Zero
1. Verify campaigns have data in FB Ads
2. Check date range (today vs 7d vs 30d)
3. Verify campaign IDs are correct

### Frontend Not Updating
1. Clear browser cache
2. Check network tab for failed requests
3. Verify token hasn't expired

### Rate Limit Errors
1. Reduce number of tracked campaigns
2. Increase delay between calls (100ms -> 200ms)
3. Check FB API rate limit status
