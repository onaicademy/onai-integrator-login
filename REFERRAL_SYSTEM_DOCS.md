# 🎯 onAI Academy Referral System Documentation

## 📋 Overview
Complete referral program for onAI Academy with fixed-dollar commission tiers, UTM tracking, and leaderboards. Fully localized in Russian with Kazakh names.

## 🏗️ Architecture

### Frontend Components
```
src/pages/referral/
├── ReferralGeneratorPage.tsx    # Main landing page
├── referral.css                 # Brand DNA styling
```

### Backend Services
```
backend/src/
├── services/referral.service.ts    # Core referral logic
├── routes/referral.ts             # API endpoints
├── integrations/amocrm-webhook.ts # Conversion tracking
```

### Database Schema (Supabase)
```
Tables:
- referral_referrers      # Referrer profiles
- referral_conversions    # Sales/conversions
- referral_commission_tiers # Commission tiers
- referral_payments       # Payment records

Views:
- referral_stats          # Aggregated statistics

Triggers:
- trigger_update_commission  # Auto-tier upgrades
- trigger_update_earnings    # Earnings calculation
```

## 🔗 URLs & Routes

### Public URLs
- **Landing Page**: https://referral.onai.academy
- **Sales Page**: https://onai.academy/integrator/expresscourse
- **UTM Tracking**: `?utm_source=ref_{uuid}_{name}`

### API Endpoints
```
POST /api/referral/create              # Generate UTM code
GET  /api/referral/tiers               # Get commission tiers
POST /api/referral/webhook/amocrm-conversion  # AmoCRM webhook
POST /webhook/amocrm                   # Alternative webhook route
```

### Admin Endpoints
```
GET  /api/referral/admin/stats/:id     # Referrer statistics
POST /api/referral/admin/confirm-payment/:id  # Confirm payment
POST /api/referral/admin/send-payment/:id     # Send payment notification
```

## 💰 Commission Structure

| Sales/Month | Payout Per Sale | Example Income |
|-------------|-----------------|----------------|
| 1-2 sales   | $60             | 2 × $60 = $120 |
| 3-4 sales   | $80             | 4 × $80 = $320 |
| 5-7 sales   | $100            | 7 × $100 = $700 |
| 8+ sales    | $120            | 10 × $120 = $1,200 |

## 🎨 UI Components

### 1. Commission Table
Displays fixed-dollar payout tiers with examples

### 2. Referral Form
Collects email, phone, and name to generate UTM link

### 3. Leaderboard
Shows top earners with 80% Kazakh / 20% Russian names:
- Аскар Б. (Almaty) - 12 sales, $1,440
- Айгерим Т. (Astana) - 8 sales, $960
- Дарья К. (Moscow) - 6 sales, $600
- Нурсултан М. (Shymkent) - 5 sales, $500
- Жансая А. (Karaganda) - 4 sales, $320

### 4. Statistics Cards
- 47 Active Referrers
- 89 Sales This Month
- $7,840 Paid This Month

## 🛠️ Implementation Files

### Frontend
- [`src/pages/referral/ReferralGeneratorPage.tsx`](file:///Users/miso/onai-integrator-login/src/pages/referral/ReferralGeneratorPage.tsx) - Main React component
- [`src/pages/referral/referral.css`](file:///Users/miso/onai-integrator-login/src/pages/referral/referral.css) - Styling

### Backend
- [`backend/src/services/referral.service.ts`](file:///Users/miso/onai-integrator-login/backend/src/services/referral.service.ts) - Business logic
- [`backend/src/routes/referral.ts`](file:///Users/miso/onai-integrator-login/backend/src/routes/referral.ts) - API routes
- [`backend/src/integrations/amocrm-webhook.ts`](file:///Users/miso/onai-integrator-login/backend/src/integrations/amocrm-webhook.ts) - Webhook handler
- [`backend/src/server.ts`](file:///Users/miso/onai-integrator-login/backend/src/server.ts) - Server configuration

### Database (Supabase)
- Migration scripts in Supabase dashboard
- Tables: `referral_referrers`, `referral_conversions`, `referral_commission_tiers`, `referral_payments`
- Views: `referral_stats`
- Triggers: `trigger_update_commission`, `trigger_update_earnings`

## 🌐 Deployment

### Frontend
- **Domain**: https://referral.onai.academy
- **Hosting**: Nginx on DigitalOcean
- **Build Command**: `npm run build`
- **Deploy Path**: `/var/www/referral.onai.academy/`

### Backend
- **API Endpoint**: https://api.onai.academy
- **Port**: 3000
- **Process Manager**: PM2
- **Service Name**: onai-backend

## 📊 Test Data

### Commission Tiers
```javascript
[
  { sales: '1-2', amount: 60, label: 'Старт' },
  { sales: '3-4', amount: 80, label: 'Прогресс' },
  { sales: '5-7', amount: 100, label: 'Профи' },
  { sales: '8+', amount: 120, label: 'Мастер' }
]
```

### Top Earners (80% Kazakh, 20% Russian)
```javascript
[
  { name: 'Аскар Б.', city: 'Алматы', sales: 12, earned: 1440 },
  { name: 'Айгерим Т.', city: 'Астана', sales: 8, earned: 960 },
  { name: 'Дарья К.', city: 'Москва', sales: 6, earned: 600 },
  { name: 'Нурсултан М.', city: 'Шымкент', sales: 5, earned: 500 },
  { name: 'Жансая А.', city: 'Караганда', sales: 4, earned: 320 }
]
```

### Statistics
```javascript
{
  totalReferrers: 47,
  totalSales: 89,
  totalPaid: 7840
}
```

## 📞 Support
For issues or questions, contact admin@onai.academy