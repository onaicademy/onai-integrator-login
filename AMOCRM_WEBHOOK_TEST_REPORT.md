# 🧪 AmoCRM Webhook Integration Test Report

**Date:** December 20, 2024  
**Tester:** AI Assistant (Cursor)  
**Environment:** Production (onai.academy)  
**Webhook URL:** https://api.onai.academy/webhook/amocrm/

---

## 📋 Test Overview

This report documents the testing of the unified AmoCRM webhook system that automatically routes sales data to either:
- **Referral System** (for UTM sources starting with `ref_`)
- **Traffic Dashboard** (for targetologist UTM patterns)

---

## ✅ Implementation Completed

### Files Created
1. ✅ `backend/src/integrations/unified-amocrm-webhook.ts` - Unified webhook handler
2. ✅ `supabase/migrations/20251220_create_webhook_logs_table.sql` - Webhook logs table
3. ✅ `src/components/traffic/WebhookLogsViewer.tsx` - Admin debugging UI
4. ✅ `backend/src/routes/admin-webhook-logs.ts` - Webhook logs API

### Files Modified
1. ✅ `backend/src/server.ts` - Routing updated to use unified handler
2. ✅ `backend/src/routes/traffic-main-products.ts` - Documentation updated

### Database Changes
1. ✅ `webhook_logs` table created in Tripwire database
   - Columns: id, received_at, source, pipeline_id, lead_id, deal_data, utm_source, utm_campaign, routing_decision, processing_status, error_message, processed_at
   - Indexes: received_at, lead_id, routing_decision, processing_status, pipeline_id

---

## 🎯 Test Scenario 1: Traffic Team Sale (Targetologist)

### Objective
Verify that a sale with targetologist UTM patterns is correctly:
1. Received by webhook
2. Routed to Traffic Dashboard
3. Saved to `all_sales_tracking` table
4. Visible in Traffic Dashboard UI
5. Telegram notification sent

### Test Setup
To execute this test, create a deal in AmoCRM:

**Pipeline:** VAMUS RM (https://onaiagencykz.amocrm.ru/leads/pipeline/10418746/)

**Deal Details:**
```
Name: TEST SALE - Kenesary Traffic [TIMESTAMP]
Price: 100,000 KZT
Custom Fields:
  - utm_source: kenesary_fb_test
  - utm_campaign: tripwire_test_dec20
  - utm_medium: cpc
Contact: Test Customer
Phone: +77771234567
```

**Action:** Move deal to "Успешно реализовано" (Stage ID: 142)

### Verification Steps

#### 1. Check Backend Logs
```bash
ssh root@207.154.231.30
pm2 logs onai-backend --lines 100 | grep "Unified Webhook"

# Expected output:
# 📥 [Unified Webhook] Incoming request from AmoCRM
# 📊 [Unified Webhook] UTM data for deal XXXXX
# 🎯 [Unified Webhook] Routing decision: traffic
# 🎯 [Traffic] Processing sale for Kenesary
# ✅ [Traffic] Sale processed for Kenesary
# ✅ [Traffic] Telegram notification sent
```

#### 2. Check Webhook Logs Table
```bash
# Option A: Via API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://onai.academy/api/admin/webhook-logs?limit=1"

# Option B: Direct DB query (Supabase)
SELECT 
  lead_id,
  utm_source,
  utm_campaign,
  routing_decision,
  processing_status,
  error_message
FROM webhook_logs
ORDER BY received_at DESC
LIMIT 1;
```

**Expected Result:**
```json
{
  "lead_id": [DEAL_ID],
  "utm_source": "kenesary_fb_test",
  "utm_campaign": "tripwire_test_dec20",
  "routing_decision": "traffic",
  "processing_status": "success",
  "error_message": null
}
```

#### 3. Check Traffic Dashboard Database
```sql
SELECT 
  lead_id,
  targetologist,
  sale_amount,
  utm_source,
  utm_campaign,
  pipeline_id
FROM all_sales_tracking
WHERE lead_id = [DEAL_ID];
```

**Expected Result:**
- ✅ Record exists
- ✅ `targetologist` = "Kenesary"
- ✅ `sale_amount` = 100000
- ✅ `pipeline_id` = 10418746

#### 4. Check Traffic Dashboard UI
1. Navigate to: https://traffic.onai.academy/
2. Login as admin
3. Go to "Основные продукты" tab
4. Search for deal or check recent sales

**Expected Result:**
- ✅ Sale visible in dashboard
- ✅ Targetologist shown as "Kenesary"
- ✅ Amount: 100,000 KZT
- ✅ UTM data displayed correctly

#### 5. Check Telegram Notification
Check the Telegram bot channel for notification:

**Expected Message:**
```
🎉 НОВАЯ ПРОДАЖА!

👑 Таргетолог: Kenesary
👤 Клиент: Test Customer
💰 Сумма: 100,000 ₸
📦 Продукт: Main Product (VAMUS RM)
🏷️ Кампания: tripwire_test_dec20

Kenesary, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ! 🔥
```

### Success Criteria
- [ ] Webhook logged with `routing_decision = 'traffic'`
- [ ] Sale saved to `all_sales_tracking` table
- [ ] Targetologist identified as "Kenesary"
- [ ] Sale visible in Traffic Dashboard
- [ ] Telegram notification sent
- [ ] No errors in PM2 logs
- [ ] Processing latency < 10 seconds

### Cleanup
```sql
-- Delete test record from database
DELETE FROM all_sales_tracking WHERE lead_id = [DEAL_ID];
DELETE FROM sales_notifications WHERE lead_id = [DEAL_ID];
DELETE FROM webhook_logs WHERE lead_id = [DEAL_ID];
```

**AmoCRM:** Delete or archive the test deal manually

---

## 🔗 Test Scenario 2: Referral System Sale

### Objective
Verify that a sale with referral UTM (ref_) is correctly routed to Referral System.

### Test Setup

**Deal Details:**
```
Name: TEST SALE - Referral System [TIMESTAMP]
Price: 150,000 KZT
Custom Fields:
  - utm_source: ref_TEST123ABC
  - utm_medium: referral
Contact: Referral Test Customer
```

**Action:** Move to "Успешно реализовано"

### Verification Steps

#### 1. Check Routing Decision
```bash
pm2 logs onai-backend --lines 100 | grep "ref_TEST123ABC"

# Expected:
# 🎯 [Unified Webhook] Routing decision: referral
# 🔗 [Referral] Processing sale for ref_TEST123ABC
# ✅ [Referral] Conversion recorded
```

#### 2. Check Webhook Logs
```sql
SELECT routing_decision, processing_status
FROM webhook_logs
WHERE utm_source = 'ref_TEST123ABC';
```

**Expected:** `routing_decision = 'referral'`, `processing_status = 'success'`

#### 3. Check Referral Dashboard
1. Navigate to: https://referral.onai.academy/
2. Login as owner of `ref_TEST123ABC`
3. Check conversions list

**Expected:**
- ✅ Conversion appears
- ✅ Amount: 150,000 KZT
- ✅ Commission calculated
- ✅ Status: Pending payment

#### 4. Verify Isolation
**Check Traffic Dashboard:**
- ❌ Sale should NOT appear in Traffic Dashboard
- ✅ Referral sales are isolated from traffic analytics

### Success Criteria
- [ ] Webhook routed to `referral`
- [ ] Conversion recorded in referral system
- [ ] Commission calculated correctly
- [ ] Visible in referral dashboard
- [ ] NOT visible in traffic dashboard

### Cleanup
```sql
DELETE FROM referral_conversions WHERE amocrm_deal_id = '[DEAL_ID]';
DELETE FROM webhook_logs WHERE lead_id = [DEAL_ID];
```

---

## ❓ Test Scenario 3: Unknown UTM Pattern

### Objective
Handle sales with UTM patterns that don't match referral OR traffic patterns.

### Test Setup

**Deal Details:**
```
Name: TEST SALE - Unknown Source [TIMESTAMP]
Price: 50,000 KZT
Custom Fields:
  - utm_source: google_organic
  - utm_campaign: random_campaign
  - utm_medium: organic
```

### Verification Steps

#### 1. Check Routing
```bash
pm2 logs onai-backend --lines 100 | grep "Unknown UTM"

# Expected:
# ❓ [Unified Webhook] Unknown UTM pattern for deal XXXXX
# 📊 [Unified Webhook] Processing complete
```

#### 2. Check Webhook Logs
```sql
SELECT routing_decision, processing_status, utm_source
FROM webhook_logs
WHERE utm_source = 'google_organic';
```

**Expected:** 
- `routing_decision = 'unknown'` OR `'both'`
- `processing_status = 'success'`
- Logged for manual review

### Success Criteria
- [ ] Webhook logged with `routing_decision = 'unknown'`
- [ ] No errors (graceful handling)
- [ ] Admin can review in webhook logs viewer
- [ ] Optional: Admin notification for unknown sources

### Cleanup
```sql
DELETE FROM webhook_logs WHERE utm_source = 'google_organic';
```

---

## 🔄 Test Scenario 4: Webhook Failure Recovery

### Objective
Verify system handles errors gracefully and AmoCRM retry works.

### Test Setup
1. Temporarily modify webhook handler to return 500 error
2. Create test deal
3. Observe AmoCRM retry behavior
4. Fix handler
5. Verify sale processed on retry

### Expected Behavior
- AmoCRM retries failed webhooks (up to 3 attempts)
- Webhook logs capture failed attempts
- After fix, retry succeeds
- No data loss

**Status:** ⏳ NOT EXECUTED (requires manual intervention)

---

## 📊 System Health Check

Before testing, verify:

### Backend Status
```bash
ssh root@207.154.231.30
pm2 status onai-backend

# Expected: online, 0 restarts in last hour
```

### Database Connectivity
```bash
curl https://onai.academy/api/health/tripwire

# Expected: {"status": "ok", "checks": {"db": true}}
```

### Webhook Endpoint Accessibility
```bash
curl https://api.onai.academy/webhook/amocrm/test

# Expected:
# {
#   "success": true,
#   "message": "Unified AmoCRM webhook endpoint is active",
#   "version": "2.0.0"
# }
```

---

## 📝 Test Execution Log

### Pre-Test Checklist
- [ ] Backend is online and stable
- [ ] Database migrations applied
- [ ] Webhook endpoint responds to test request
- [ ] AmoCRM webhook configured to send to `/webhook/amocrm/`
- [ ] Pipeline ID filter set to 10418746
- [ ] Telegram bot is active

### Test Execution
| Scenario | Status | Execution Time | Notes |
|----------|--------|----------------|-------|
| 1. Traffic Sale | ⏳ PENDING | - | Awaiting user to create test deal |
| 2. Referral Sale | ⏳ PENDING | - | Awaiting user to create test deal |
| 3. Unknown UTM | ⏳ PENDING | - | Awaiting user to create test deal |
| 4. Error Recovery | ⏳ PENDING | - | Requires manual error injection |

---

## 🐛 Issues Found

*To be filled after test execution*

### Issue 1: [Title]
- **Severity:** Low/Medium/High/Critical
- **Description:** 
- **Impact:** 
- **Fix:** 
- **Status:** 

---

## ✅ Recommendations

### Immediate Actions
1. **Execute all test scenarios** - Create test deals in AmoCRM
2. **Monitor webhook logs** - Check for any errors during first week
3. **Add cron backup** - Poll AmoCRM API every hour as fallback
4. **Setup alerts** - Notify admin if no webhooks received for 24 hours

### Future Enhancements
1. **Retry Queue** - If webhook fails, queue for manual retry
2. **Admin Panel** - Allow manual trigger of webhook processing for old deals
3. **Analytics** - Track webhook success rate, average latency
4. **Smart Routing** - Machine learning to improve UTM pattern detection

---

## 🎯 Acceptance Criteria

System is ready for production if:

- ✅ All code files created and deployed
- ✅ Database migration applied successfully
- ⏳ Test Scenario 1 (Traffic) passes all checks
- ⏳ Test Scenario 2 (Referral) passes all checks
- ⏳ Test Scenario 3 (Unknown) passes all checks
- ⏳ Webhook logs accessible via admin UI
- ⏳ Zero errors in PM2 logs during testing
- ⏳ Admin confirms system working as expected

**Overall Status:** 🟡 IN PROGRESS (Implementation complete, testing pending)

---

## 📞 Contact

**Support:** If issues arise during testing, check:
1. PM2 logs: `pm2 logs onai-backend`
2. Webhook logs table in Supabase
3. AmoCRM webhook settings
4. Backend ENV variables

---

**Next Steps:**
1. ⏳ User creates test deals in AmoCRM
2. ⏳ Observe webhook processing
3. ⏳ Verify data in dashboards
4. ⏳ Document results above
5. ⏳ Clean up test data
6. ✅ Sign off on production readiness

---

*Report will be updated as tests are executed.*
