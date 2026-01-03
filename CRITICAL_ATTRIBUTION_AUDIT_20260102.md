# CRITICAL: Attribution Logic Audit
**Date:** 2026-01-02
**Engineer:** Senior Backend Engineer
**Severity:** HIGH - Production Impact

## Executive Summary

Current attribution logic **USES utm_medium** in one critical place:
- **Team 'Muha'** is matched by `utm_medium === 'yourmarketolog'`

### Impact Assessment

| Component | Uses utm_medium? | Impact if Removed |
|-----------|------------------|-------------------|
| `traffic-utm-attribution.ts` | ✅ Reads but doesn't filter | LOW - No matching logic |
| `traffic-stats.ts` **CRITICAL** | ✅ **Filters 'Muha' team** | **HIGH - Team Muha won't be identified** |
| Other webhooks | ✅ Reads only | LOW - Just metadata |

---

## Detailed Findings

### 1. `traffic-stats.ts` - CRITICAL ISSUE

**Location:** `/backend/src/routes/traffic-stats.ts:342`

```typescript
'Muha': {
  match: (utm: { source?: string; medium?: string; campaign?: string }) =>
    utm.medium?.toLowerCase() === 'yourmarketolog',  // ❌ USES utm_medium
  emoji: '🚀',
  color: '#00FF88',
},
```

**Problem:**
- Team 'Muha' is ONLY identified by utm_medium
- If we remove utm_medium checks, 'Muha' team won't be attributed

**Required Action:**
1. Find 'Muha' team's utm_source pattern from database
2. Update matching logic to use utm_source instead
3. Test with historical data

---

### 2. `traffic-utm-attribution.ts` - LOW IMPACT

**Location:** `/backend/src/services/traffic-utm-attribution.ts`

**Usage:**
- Line 118: Loads `utm_medium` from database (not used for matching)
- Lines 77, 90, 100: Returns utm_medium (metadata only)
- **Attribution matching (lines 147-176):** Uses ONLY utm_source ✅

**Action:** Remove utm_medium from reads and responses

---

### 3. Other Files - METADATA ONLY

**Files:**
- `amocrm-challenge3d-webhook.ts`
- `traffic-team-constructor.ts`
- `amocrm-funnel-webhook.ts`
- Etc.

**Usage:** Read and store utm_medium as metadata, but don't use for filtering

**Action:** Keep for logging/debugging, but ensure no filtering logic uses it

---

## Recommended Fix Strategy

### Phase 1: Data Investigation
1. ✅ Query production database for 'Muha' team's actual utm_source patterns
2. ✅ Identify alternative attribution logic (utm_source pattern)

### Phase 2: Code Refactoring
1. Update `TRAFFIC_TEAM_PATTERNS` in `traffic-stats.ts`
2. Remove utm_medium from attribution matching logic
3. Keep utm_medium in database/logs for historical analysis

### Phase 3: Testing
1. Run attribution tests with historical data
2. Verify 'Muha' team is still correctly identified
3. Confirm no regressions in other teams

### Phase 4: Production Deployment
1. Deploy updated attribution logic
2. Monitor team attribution rates
3. Verify no data loss

---

## SQL Query to Find Muha's utm_source Pattern

```sql
-- Find all utm_source patterns for utm_medium = 'yourmarketolog'
SELECT DISTINCT utm_source, utm_medium, COUNT(*) as count
FROM landing_leads
WHERE utm_medium ILIKE '%yourmarketolog%'
GROUP BY utm_source, utm_medium
ORDER BY count DESC
LIMIT 20;
```

---

## Decision Required

**Option A:** Find Muha's utm_source and update matching logic
- ✅ Pros: Clean separation, utm_source only
- ❌ Cons: Need to verify pattern in production data

**Option B:** Keep utm_medium for Muha ONLY
- ✅ Pros: No changes needed
- ❌ Cons: Still depends on utm_medium (user's requirement not met)

**Recommended:** **Option A** - Find utm_source pattern and update

---

## Next Steps

1. ⏳ Query production database for Muha's utm_source
2. ⏳ Update TRAFFIC_TEAM_PATTERNS
3. ⏳ Run comprehensive tests
4. ⏳ Deploy to production

---

**Status:** BLOCKED - Need production data query to proceed safely
