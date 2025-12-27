# 🔍 UTM Tracking Verification Guide

## Quick Start

### Option 1: Automated Test (30 seconds)
```bash
npm run test:utm:live
```

### Option 2: Manual Browser Test (5 minutes)
See [MANUAL_TEST_INSTRUCTIONS.md](./MANUAL_TEST_INSTRUCTIONS.md)

### Option 3: Logic Test (5 seconds)
```bash
npm run test:utm
```

---

## What Gets Tracked

| Parameter | Description | Example |
|-----------|-------------|---------|
| `client_id` | Unique user identifier (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `utm_source` | Traffic source | `facebook`, `google`, `direct` |
| `utm_medium` | Traffic medium | `cpc`, `social`, `email` |
| `utm_campaign` | Campaign name | `expresscourse_q1_2025` |
| `utm_id` | Facebook Ad ID | `120211234567890` |
| `fbclid` | Facebook Click ID | `IwAR1234567890` |

---

## Verification Checklist

### ✅ Step 1: Browser LocalStorage
Open DevTools (F12) → Application → Local Storage → `https://onai.academy`

**Expected keys:**
- `onai_client_id` → UUID string
- `utm_params` → JSON object with UTM parameters

### ✅ Step 2: Network Request
Open DevTools (F12) → Network → Filter: `submit`

Submit form and check request payload:
```json
{
  "utmParams": {
    "utm_source": "TEST_BRO_CHECK",
    "utm_id": "999999",
    "fbclid": "TEST_CLICK_ID",
    "client_id": "550e8400-..."
  }
}
```

### ✅ Step 3: Database (Supabase)
1. Open Supabase Dashboard
2. Select Landing DB (xikaiavwqinamgolmtcy)
3. Table: `landing_leads`
4. Find lead by ID
5. Check `metadata` column → `utmParams`

### ✅ Step 4: CRM (AmoCRM)
1. Open [AmoCRM](https://onaiagencykz.amocrm.ru)
2. Find deal by name
3. Check custom fields:
   - Client ID
   - UTM Source
   - Facebook Ad ID (utm_id)
   - Facebook Click ID (fbclid)

---

## Test URLs

### Basic Test
```
https://onai.academy/expresscourse?utm_source=TEST_BRO_CHECK&utm_id=999999&fbclid=TEST_CLICK_ID
```

### Facebook Ad Simulation
```
https://onai.academy/expresscourse?utm_source=facebook&utm_campaign=expresscourse_q1_2025&utm_id=120211234567890&fbclid=IwAR1234567890
```

### Cross-Device Test (Desktop → Mobile)
**Desktop (ProfTest):**
```
https://onai.academy/proftest/kenesary?utm_source=TEST_DESKTOP&utm_id=111111
```
Copy `client_id` from LocalStorage

**Mobile (Express):**
```
https://onai.academy/expresscourse?utm_source=TEST_DESKTOP&utm_id=111111&client_id=<COPIED_UUID>
```
Verify same `client_id` in AmoCRM

---

## Files Overview

| File | Purpose |
|------|---------|
| [MANUAL_TEST_INSTRUCTIONS.md](./MANUAL_TEST_INSTRUCTIONS.md) | Step-by-step manual testing guide |
| [ПРОВЕРКА_UTM_ТРЕКИНГА.md](./ПРОВЕРКА_UTM_ТРЕКИНГА.md) | Russian version of this guide |
| `scripts/test-utm-tracking.ts` | Logic unit tests |
| `scripts/test-live-utm.cjs` | Live API integration test |
| `src/lib/utm-tracker.ts` | Core tracking library |
| `src/components/UTMTracker.tsx` | React component |
| `backend/src/routes/landing.ts` | Backend API endpoint |

---

## Troubleshooting

### Problem: LocalStorage is empty
**Cause:** UTMTracker component not loaded or blocked by browser

**Solution:**
1. Check browser console (F12 → Console)
2. Look for errors: `Failed to load resource: utm-tracker.js`
3. Verify cookies/localStorage enabled in browser settings

### Problem: Network Request missing utmParams
**Cause:** Form not calling `getAllUTMParams()`

**Solution:**
1. Check file: `/src/components/landing/CheckoutForm.tsx`
2. Verify line exists: `const utmParams = getAllUTMParams();`
3. Verify utmParams passed to fetch body

### Problem: AmoCRM fields empty
**Cause:** Custom fields not created or mapping broken

**Solution:**
1. Verify `.env` has `AMOCRM_ACCESS_TOKEN`
2. Create custom fields in AmoCRM (Settings → Deals → Fields)
3. Check code: `/backend/src/lib/amocrm.ts`

---

## NPM Commands

```bash
# Run all tests
npm run test:utm          # Logic tests (5s)
npm run test:utm:live     # Live API test (30s)

# E2E tests
npm run test:landing      # Playwright landing page tests
npm run test:tripwire     # Playwright tripwire tests

# Development
npm run dev               # Start dev server
npm run build             # Build for production
```

---

## System Architecture

```
Frontend (Browser)
     ↓ captures
UTM Params + Client ID
     ↓ sends via
API Request (/api/landing/submit)
     ↓ saves to
Supabase (landing_leads table)
     ↓ syncs to
AmoCRM (custom fields)
```

---

## Success Criteria

✅ **System is working** if:
1. LocalStorage contains `onai_client_id` and `utm_params`
2. Network Request contains `utmParams` in payload
3. Supabase has record with filled `metadata.utmParams`
4. AmoCRM deal has all 4 custom fields populated

❌ **System is broken** if:
- Any of the above steps is missing data
- client_id changes between visits (should persist 30 days)
- Cross-device tracking fails (different client_id)

---

**Last Updated:** December 25, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for verification
