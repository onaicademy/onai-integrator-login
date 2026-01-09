# Traffic Dashboard Architecture

> **Domain**: traffic.onai.academy
> **Purpose**: Marketing analytics for targetologists

## Overview

Traffic Dashboard is a specialized analytics platform for marketing team members (targetologists) to:
- Track Facebook Ads performance
- Monitor sales attribution
- Analyze ROI by UTM source
- Generate weekly performance reports

## Key Features

1. **Facebook Ads Integration**
   - Real-time campaign metrics
   - Ad set and ad-level analytics
   - Cost tracking and ROAS calculation

2. **Sales Attribution**
   - UTM parameter tracking
   - Cross-device attribution
   - Sales funnel visualization

3. **Team Management**
   - Multiple targetologists
   - Team-based data isolation
   - Performance comparison

## Frontend Structure

```
src/pages/traffic/
├── TrafficLogin.tsx          # Custom JWT auth
├── TrafficDashboard.tsx      # Main dashboard
├── TrafficAnalytics.tsx      # Detailed analytics
├── TrafficFunnel.tsx         # Sales funnel view
├── TrafficSettings.tsx       # User settings
└── admin/
    ├── TrafficAdmin.tsx      # Admin panel
    ├── TeamConstructor.tsx   # Team management
    └── UserManagement.tsx    # User CRUD
```

## Database Schema (Traffic Supabase)

### traffic_users
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE
password_hash TEXT
full_name TEXT
role TEXT (admin|targetologist)
team_id UUID
fb_ad_account_id TEXT
created_at TIMESTAMP
```

### traffic_teams
```sql
id UUID PRIMARY KEY
name TEXT
lead_id UUID REFERENCES traffic_users(id)
created_at TIMESTAMP
```

### traffic_sales
```sql
id UUID PRIMARY KEY
lead_id INTEGER (AmoCRM)
sale_amount DECIMAL
sale_currency TEXT
utm_source TEXT
utm_medium TEXT
utm_campaign TEXT
utm_content TEXT
targetologist_id UUID
sale_date TIMESTAMP
created_at TIMESTAMP
```

### fb_campaigns
```sql
id UUID PRIMARY KEY
campaign_id TEXT
campaign_name TEXT
ad_account_id TEXT
spend DECIMAL
impressions INTEGER
clicks INTEGER
conversions INTEGER
date DATE
created_at TIMESTAMP
```

### fb_adsets
```sql
id UUID PRIMARY KEY
adset_id TEXT
adset_name TEXT
campaign_id TEXT
spend DECIMAL
impressions INTEGER
clicks INTEGER
date DATE
```

### fb_ads
```sql
id UUID PRIMARY KEY
ad_id TEXT
ad_name TEXT
adset_id TEXT
spend DECIMAL
impressions INTEGER
clicks INTEGER
date DATE
```

## Authentication

Traffic Dashboard uses **custom JWT authentication** (not Supabase Auth):

```typescript
// backend/src/config/jwt.ts
const JWT_SECRET = getJWTSecret();  // Cached, validated

// backend/src/middleware/traffic-auth.ts
authenticateTrafficJWT(req, res, next)
```

### Why Custom Auth?
1. Independence from main platform
2. Simpler user management
3. No Supabase Auth overhead
4. Custom role system

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/traffic-auth/login` | POST | Login |
| `/api/traffic-auth/register` | POST | Register (admin only) |
| `/api/traffic-dashboard/sales` | GET | Get sales data |
| `/api/traffic-dashboard/metrics` | GET | Get aggregated metrics |
| `/api/traffic-facebook/campaigns` | GET | Get FB campaigns |
| `/api/traffic-funnel/data` | GET | Get funnel data |

## Facebook Ads Integration

### Data Flow
```
Facebook API → facebook-ads-loader.ts → Traffic DB → Dashboard
```

### Cron Jobs
1. `facebook-ads-loader.ts` - Every 6 hours
2. `facebook-ads-sync.ts` - Every hour
3. `metrics-aggregation.ts` - Every 10 minutes

### API Rate Limiting
- 60 requests per 2 minutes per user
- Cached responses (15-minute TTL)

## AmoCRM Webhook

Sales data flows from AmoCRM via webhook:

```
AmoCRM Sale → /webhook/amocrm/traffic → traffic_sales table
```

### Webhook Data
- Lead ID
- Sale amount
- UTM parameters
- Responsible user (targetologist)

## Weekly Reports

Generated via Telegram bot:
- Every Monday at 08:10 Almaty time
- Includes:
  - Total spend
  - Total sales
  - ROAS
  - Top performing campaigns
