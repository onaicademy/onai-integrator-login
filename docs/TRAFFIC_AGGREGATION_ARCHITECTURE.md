# Traffic Dashboard: Server-Initiated Aggregation Architecture

## Problem Statement

The original Traffic Dashboard architecture suffered from several issues:

1. **Infinite API Requests**: Each dashboard component made direct calls to Facebook Ads API
2. **Rate Limiting**: Facebook API has strict rate limits (200 calls/hour per ad account)
3. **Slow Load Times**: Multiple sequential API calls caused poor UX
4. **Data Inconsistency**: Simultaneous requests could return different data snapshots
5. **No Offline Support**: Dashboard was unusable without live API access

## Solution: Server-Initiated Aggregation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRAFFIC DASHBOARD ARCHITECTURE                        │
│                         (Server-Initiated Aggregation)                       │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Facebook Ads   │
                              │      API        │
                              │ (Rate Limited)  │
                              └────────┬────────┘
                                       │
                                       │ (Every 10 min)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVER                                  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                  Metrics Aggregation Service                          │   │
│  │                                                                        │   │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │   │
│  │  │   Scheduler  │──▶│   Fetcher    │──▶│  Aggregator  │               │   │
│  │  │ (10 min cron)│   │  (FB + Amo)  │   │  (Calculate) │               │   │
│  │  └──────────────┘   └──────────────┘   └──────┬───────┘               │   │
│  │                                                │                        │   │
│  │                                                ▼                        │   │
│  │                                    ┌──────────────────┐                 │   │
│  │                                    │  Store to Supabase│                 │   │
│  │                                    │(traffic_aggregated)│                │   │
│  │                                    └──────────────────┘                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   Traffic Aggregation API                              │   │
│  │                                                                        │   │
│  │  GET /api/traffic-aggregation/status   - Sync status & last update    │   │
│  │  POST /api/traffic-aggregation/refresh - Manual refresh (admin only)  │   │
│  │  GET /api/traffic-aggregation/metrics  - Get cached metrics           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ (HTTP/REST)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND DASHBOARD                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      SyncStatusBar Component                          │   │
│  │                                                                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │  Freshness  │  │  Last Sync  │  │   Status    │  │  Refresh    │   │   │
│  │  │  Indicator  │  │    Time     │  │  (polling)  │  │   Button    │   │   │
│  │  │ (30s poll)  │  │             │  │             │  │(admin only) │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Dashboard Components                             │   │
│  │                                                                        │   │
│  │  Reads from: traffic_aggregated_metrics (NOT live FB API)             │   │
│  │  Benefits: Instant load, consistent data, no rate limit concerns      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │    Supabase     │
                              │   (Traffic DB)  │
                              └─────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                 │
                     ▼                 ▼                 ▼
          ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
          │traffic_aggregated│ │traffic_sync_ │ │traffic_users     │
          │    _metrics      │ │   history    │ │traffic_settings  │
          │                  │ │              │ │                  │
          │ - user_id        │ │ - sync_id    │ │ - user settings  │
          │ - period (7d,30d)│ │ - started_at │ │ - fb_ad_accounts │
          │ - impressions    │ │ - completed  │ │ - utm_source     │
          │ - clicks, spend  │ │ - error_msg  │ │ - campaigns      │
          │ - conversions    │ │ - metrics    │ │                  │
          │ - revenue, roas  │ │              │ │                  │
          │ - campaigns_json │ │              │ │                  │
          └──────────────────┘ └──────────────┘ └──────────────────┘
```

## Data Flow

### 1. Scheduled Aggregation (Every 10 Minutes)

```
1. Scheduler triggers runAggregation()
2. Service fetches list of active traffic_users
3. For each user:
   a. Get tracked campaigns from traffic_targetologist_settings
   b. Fetch FB Ads metrics (with 100ms delay between calls for rate limiting)
   c. Fetch sales from traffic_sales (AmoCRM)
   d. Calculate derived metrics (CTR, CPC, CPM, ROAS, CPA)
   e. Upsert to traffic_aggregated_metrics
4. Update sync status (lastSync, stats)
```

### 2. Dashboard Data Request

```
1. Dashboard component mounts
2. SyncStatusBar fetches /api/traffic-aggregation/status
3. Dashboard fetches metrics from Supabase (NOT FB API)
4. Display cached data immediately
5. Show "freshness" indicator based on lastSync time
```

### 3. Manual Refresh (Admin Only)

```
1. Admin clicks "Refresh Now" button
2. POST /api/traffic-aggregation/refresh
3. Server runs immediate aggregation
4. Status polling detects completion
5. Dashboard components re-fetch updated data
```

## Why This Avoids Infinite Requests

| Before (Client-Initiated) | After (Server-Initiated) |
|---------------------------|--------------------------|
| Each user loads dashboard = N FB API calls | 1 scheduled job every 10 min |
| 10 users × 10 campaigns = 100 calls | ~50 calls total (all users) |
| Race conditions, data inconsistency | Consistent data snapshots |
| Slow load times (sequential calls) | Instant load from cache |
| No control over rate limiting | Built-in 100ms delay |

## Key Benefits

1. **Rate Limit Compliance**: Server controls API call frequency
2. **Consistent Data**: All users see the same data snapshot
3. **Fast Dashboard**: Reads from local DB, not external API
4. **Offline Support**: Last cached data always available
5. **Transparency**: Clear sync status and freshness indicators
6. **Admin Control**: Manual refresh for urgent updates

## Files Implemented

| File | Purpose |
|------|---------|
| `backend/src/services/metricsAggregationService.ts` | Core aggregation logic |
| `backend/src/routes/traffic-aggregation.ts` | API endpoints |
| `src/components/traffic/SyncStatusBar.tsx` | UI sync status |
| `sql/migrations/008_traffic_aggregated_metrics.sql` | Database schema |

## Configuration

```typescript
// Aggregation interval (10 minutes)
const AGGREGATION_INTERVAL = 10 * 60 * 1000;

// Facebook API rate limiting (100ms between calls)
await new Promise(resolve => setTimeout(resolve, 100));

// Status polling interval (30 seconds)
const interval = setInterval(fetchStatus, 30000);
```

## Freshness Indicators

| Status | Time Since Sync | Color |
|--------|-----------------|-------|
| Fresh | < 15 minutes | Green |
| Slightly Stale | 15-30 minutes | Yellow |
| Stale | > 30 minutes | Red |
| Syncing | In progress | Blue (spinning) |

## Error Handling

- Failed individual campaign fetches are logged and skipped
- Exchange rate API falls back to 507 KZT/USD
- Sync errors are stored in `lastSyncError` and displayed in UI
- Server continues running even if aggregation fails
