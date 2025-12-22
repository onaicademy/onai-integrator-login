# ✅ Testing Checklist

## Before Testing:

### 1. Apply Database Migration
```bash
# Option 1: Via Supabase Dashboard
# Copy SQL from: supabase/migrations/20251222105639_add_exchange_rates.sql
# Paste in SQL Editor
# Run

# Option 2: Via Supabase CLI (if installed)
supabase db push
```

### 2. Check Environment Variables
```bash
# backend/.env должен содержать:
GROQ_API_KEY=your_groq_api_key
TELEGRAM_ADMIN_CHAT_ID=your_telegram_chat_id
CURRENCY_API_KEY=your_currency_api_key  # Optional
```

---

## Testing Sequence:

### ✅ Step 1: Start Services
- [ ] `cd backend && npm run dev` → Backend on :3000
- [ ] `npm run dev` → Frontend on :8080
- [ ] Check logs: "✅ Currency & Traffic Reports schedulers initialized"

### ✅ Step 2: Currency Toggle (1 min)
- [ ] Open `http://localhost:8080/cabinet/kenesary`
- [ ] See USD/KZT toggle buttons
- [ ] Click USD → all amounts in dollars
- [ ] Click KZT → all amounts in tenge
- [ ] Exchange rate displays (e.g., "1 USD = 475 KZT")

### ✅ Step 3: Sales Funnel (1 min)
- [ ] Scroll down on dashboard
- [ ] See pyramid with 4 stages
- [ ] Stages appear with animation (smooth fade-in)
- [ ] Conversion rates between stages (arrows with %)
- [ ] Colors: green gradient (#00FF88 → #009940)
- [ ] Overall conversion summary at bottom

### ✅ Step 4: AI Analysis (2 min)
- [ ] Open `http://localhost:8080/detailed-analytics`
- [ ] Click "AI Analysis" button (green with Sparkles)
- [ ] Loader modal appears (10 seconds)
- [ ] 4 progress steps with checkmarks
- [ ] Results modal shows GROQ analysis
- [ ] Analysis includes: Health Score, Red Flags, Immediate Fixes, Projections
- [ ] Close modal works

### ✅ Step 5: Onboarding Tour (1 min)
- [ ] Clear localStorage: `localStorage.removeItem('traffic-dashboard-tour-completed')`
- [ ] Reload `http://localhost:8080/cabinet/kenesary`
- [ ] Spotlight tour appears
- [ ] Highlights: metrics cards, funnel, campaigns
- [ ] Can navigate through steps
- [ ] Can close/skip tour

### ✅ Step 6: Database Check (Optional)
```sql
-- Check exchange rates
SELECT * FROM exchange_rates ORDER BY date DESC LIMIT 3;
-- Should see today's rate

-- Check transactions store rate
SELECT transaction_date, usd_to_kzt_rate 
FROM traffic_stats 
WHERE usd_to_kzt_rate IS NOT NULL 
LIMIT 5;

-- Check sales store rate
SELECT sale_date, usd_to_kzt_rate, utm_source
FROM amocrm_sales 
WHERE usd_to_kzt_rate IS NOT NULL 
LIMIT 5;
```

### ✅ Step 7: Telegram Reports (Tomorrow morning)
- [ ] Check Telegram at 08:00 Almaty → Exchange rate update
- [ ] Check Telegram at 08:05 Almaty → Daily report in KZT
- [ ] Check Telegram Monday 08:10 → Weekly report with recommendations

---

## 🐛 Troubleshooting:

### Issue: AI Analysis button disabled
**Reason:** No campaigns loaded  
**Fix:** Check FB_ACCESS_TOKEN in backend/.env

### Issue: Funnel shows "Нет данных"
**Reason:** No impressions data  
**Fix:** 
1. Check `traffic_stats` table has data
2. Or check Facebook Ads API accessible

### Issue: Currency toggle not switching amounts
**Reason:** Backend not returning both USD and KZT  
**Fix:** Check API response includes both currencies

### Issue: Onboarding not appearing
**Reason:** Tour already completed  
**Fix:** Clear localStorage key: `traffic-dashboard-tour-completed`

### Issue: Exchange rate not updating
**Reason:** Backend not running or cron not triggered  
**Fix:** 
1. Backend must be running continuously
2. Check logs at 08:00 Almaty
3. Or manually test: Call dailyExchangeRateFetcher()

### Issue: Telegram messages not received
**Reason:** Missing TELEGRAM_ADMIN_CHAT_ID  
**Fix:** Add to backend/.env

---

## ✅ Success Indicators:

### Backend Logs:
```
✅ Exchange rate fetcher scheduled (08:00 Almaty / 02:00 UTC)
✅ Daily traffic report scheduled (08:05 Almaty / 02:05 UTC)
✅ Weekly traffic report scheduled (Monday 08:10 Almaty / 02:10 UTC)
✅ Currency & Traffic Reports schedulers initialized
```

### Frontend Console:
```
🎓 [ONBOARDING] tour_check_start
[Funnel API] Fetching funnel data for team: kenesary
[AI Analysis] Analyzing 5 campaigns...
```

### Database:
```
exchange_rates: Has entries for recent dates
traffic_stats: transaction_date and usd_to_kzt_rate populated
amocrm_sales: sale_date and usd_to_kzt_rate populated
```

### Telegram:
```
💱 Курс обновлен | 2025-12-22
1 USD = 475.25 KZT
Источник: exchangerate-api
```

---

## 🎯 Expected Behavior:

### Currency System:
- Fetches rate daily at 08:00
- Stores with each transaction
- ROI calculations use historical rates
- Toggle switches all metrics

### AI Analysis:
- 10-second loader with 4 steps
- GROQ analysis (or fallback)
- Professional insights
- Specific action items

### Sales Funnel:
- Pyramid visualization
- 4 stages with conversion rates
- Animated appearance
- Summary metrics

### Telegram:
- Daily report at 08:05 (KZT)
- Weekly report Monday 08:10 (KZT + recommendations)
- Alerts for low performers

---

## 📈 Performance Expectations:

### API Response Times:
- Exchange rate fetch: < 2 seconds
- Funnel data: < 1 second
- AI analysis: ~10 seconds
- Dashboard load: < 2 seconds

### Database Queries:
- Exchange rate lookup: < 50ms
- ROI calculation: < 500ms
- Funnel data: < 300ms

### Frontend Rendering:
- Funnel animation: 0.8s per stage
- AI loader: 10 seconds (4 steps × 2.5s)
- Currency toggle: Instant

---

## 🚀 Next Steps After Testing:

1. **If everything works:**
   - Commit changes
   - Push to production
   - Monitor first cron execution (08:00 Almaty)

2. **If issues found:**
   - Check logs (backend console + frontend console)
   - Verify environment variables
   - Check database migration applied
   - Test API endpoints manually

3. **Monitor in Production:**
   - Exchange rate updates (daily 08:00)
   - Daily reports (08:05)
   - Weekly reports (Monday 08:10)
   - Transaction rate storage

---

**Testing Status:** READY ✅  
**Documentation:** COMPLETE ✅  
**Implementation:** 100% ✅  

**Start testing now!** 🚀
