# Debug & Health Check System - Traffic Dashboard

## 🎯 Overview

The **Debug & Health Check System** implements a "Self-Validating UI" architecture for the Traffic Dashboard, ensuring every interactive element has automated validation and logging.

**Core Philosophy:** *"If it's not tested and logged, it doesn't exist."*

---

## 📦 Components Implemented

### 1. Debug Panel UI (`src/components/debug/DebugPanel.tsx`)
- ✅ Real-time system status monitoring
- ✅ Module health indicators (Auth, API, Database, FB Ads, etc.)
- ✅ Action logs viewer with request/response details
- ✅ Module-by-module diagnostics
- ✅ Export health report functionality
- ✅ Keyboard shortcut: **Ctrl/Cmd + Shift + D**

**Features:**
- 🟢 Green/Red status indicators
- 📊 Uptime tracking
- 📝 Action logger with filtering
- 💾 Export reports as JSON
- 🔄 Real-time updates

### 2. Debug System Core (`src/lib/debug-system.ts`)
- ✅ Centralized system health monitoring
- ✅ Module status tracking
- ✅ Action logging system
- ✅ Auto-health checks every 30 seconds
- ✅ Subscriber pattern for real-time updates

**Monitored Modules:**
- **Authentication** - Token validation
- **API Connection** - HTTP request monitoring
- **Database** - Supabase connectivity
- **Facebook Ads API** - Ad account status
- **Data Fetching** - Data retrieval operations
- **Local Storage** - Browser storage health

### 3. API Interceptor (`src/lib/api-interceptor.ts`)
- ✅ Axios request/response interception
- ✅ Automatic request timing
- ✅ Request ID generation
- ✅ Sensitive data sanitization
- ✅ Zod schema validation integration

**Capabilities:**
- Request/response logging
- Error tracking
- Duration measurement
- Data type validation
- Header sanitization

### 4. Action Logger (`src/lib/action-logger.ts`)
- ✅ User interaction tracking
- ✅ Navigation logging
- ✅ Form submission tracking
- ✅ Modal interaction logging
- ✅ React hooks for easy integration

**Tracked Actions:**
- Click events
- Form submissions
- Navigation changes
- Modal open/close
- Toggle actions
- File uploads
- Select changes

### 5. Validation Schemas (`src/lib/validation-schemas.ts`)
- ✅ Zod schemas for all data types
- ✅ User/Auth validation
- ✅ Campaign metrics validation
- ✅ Facebook Ads data validation
- ✅ API response validation

**Schemas:**
- `UserSchema` - User authentication data
- `CampaignMetricsSchema` - Traffic campaign data
- `FacebookAccountSchema` - FB Ads account data
- `ApiResponseSchema` - API response validation

### 6. E2E Test Suite (`tests/e2e/traffic-dashboard.spec.ts`)
- ✅ 10 critical user flow tests
- ✅ Login/logout validation
- ✅ Language toggle testing
- ✅ Team filter verification
- ✅ Tab switching tests
- ✅ Navigation testing
- ✅ Debug panel keyboard shortcut test

---

## 🚀 Usage Guide

### Opening the Debug Panel

**Method 1: Keyboard Shortcut**
```
Press: Ctrl + Shift + D (Windows/Linux)
Press: Cmd + Shift + D (Mac)
```

**Method 2: Programmatic**
```typescript
import { useDebugPanel } from '@/hooks/useDebugPanel';

const debugPanel = useDebugPanel();
debugPanel.open();
```

### Logging User Actions

```typescript
import { actionLogger } from '@/lib/action-logger';

// Log a button click
actionLogger.logClick('connect-fb-button', 'Connect Facebook Account');

// Log form submission
actionLogger.logFormSubmit('campaign-form', { name: 'Test Campaign' });

// Log navigation
actionLogger.logNavigation('/dashboard', '/analytics');

// Log modal
actionLogger.logModal('open', 'Connect FB Modal');
```

### Using React Hook
```typescript
import { useActionLogger } from '@/lib/action-logger';

function MyComponent() {
  const logger = useActionLogger();
  
  const handleClick = () => {
    logger.logClick('my-button', 'My Button Label');
    // ... your logic
  };
  
  return <button onClick={handleClick}>Click Me</button>;
}
```

### API Interceptor Usage

```typescript
import { trackedAxios } from '@/lib/api-interceptor';

// Use trackedAxios instead of axios
const response = await trackedAxios.get('/api/campaigns');
// Automatically logged to Debug Panel
```

### Data Validation

```typescript
import { CampaignMetricsSchema, validateOrThrow } from '@/lib/validation-schemas';

// Validate API response
const data = await fetchCampaigns();
const validated = validateOrThrow(
  CampaignMetricsSchema,
  data,
  'Campaign API Response'
);
```

---

## 🧪 Running Tests

### E2E Tests with Playwright

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run tests in headed mode (watch browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/traffic-dashboard.spec.ts

# Run tests in debug mode
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

### Test Coverage
- ✅ Login flow
- ✅ Language toggle
- ✅ Team filtering
- ✅ Tab switching
- ✅ Navigation
- ✅ Logout
- ✅ Debug panel keyboard shortcut
- ✅ Onboarding tour
- ✅ Settings navigation
- ✅ Analytics navigation

---

## 📊 Health Check Report

### Exporting Health Report

1. **Via Debug Panel:**
   - Press `Ctrl/Cmd + Shift + D`
   - Click "Export Report" button
   - JSON file downloads automatically

2. **Programmatically:**
```typescript
import { debugSystem } from '@/lib/debug-system';

const report = debugSystem.exportHealthReport();
console.log(report);
```

### Report Format

```json
{
  "timestamp": "2025-12-21T10:00:00.000Z",
  "overall_status": "operational",
  "uptime_ms": 120000,
  "modules": [
    {
      "id": "auth",
      "name": "Authentication",
      "status": "operational",
      "last_check": "2025-12-21T10:00:00.000Z",
      "message": "Token present"
    },
    {
      "id": "api",
      "name": "API Connection",
      "status": "operational",
      "last_check": "2025-12-21T09:59:45.000Z",
      "message": "GET /api/campaigns - 200"
    }
  ],
  "recent_logs": [
    {
      "timestamp": "2025-12-21T09:59:30.000Z",
      "level": "action",
      "action": "User click",
      "target": "Connect FB Button",
      "duration_ms": 250
    }
  ]
}
```

---

## 🔧 Integration Checklist

### For Each New UI Component

Following **The Mirror Rule**, every new UI element must have:

1. ✅ **data-tour** attribute for E2E testing
```tsx
<button data-tour="my-button">Click Me</button>
```

2. ✅ **Action logging** on interaction
```tsx
<button onClick={() => {
  actionLogger.logClick('my-button', 'My Button Label');
  handleClick();
}}>Click Me</button>
```

3. ✅ **E2E test** covering the interaction
```typescript
test('should click my button', async ({ page }) => {
  const button = page.locator('[data-tour="my-button"]');
  await expect(button).toBeVisible();
  await button.click();
  // Verify result
});
```

4. ✅ **API validation** if making requests
```typescript
const response = await trackedAxios.post('/api/action');
const validated = validateOrThrow(ResponseSchema, response.data);
```

---

## 📈 System Status Interpretation

### Status Levels

| Status | Color | Meaning |
|--------|-------|---------|
| **Operational** | 🟢 Green | System working normally |
| **Degraded** | 🟡 Yellow | System working but with errors |
| **Down** | 🔴 Red | System not functioning |
| **Unknown** | ⚪ Gray | Status not yet determined |

### Module Health Indicators

- **Auth:** Green = Token valid, Red = No token/expired
- **API:** Green = Recent successful requests, Yellow = Some errors, Red = All requests failing
- **Database:** Green = Supabase connected, Red = Connection issues
- **FB Ads:** Green = Account connected, Red = Connection failed
- **Storage:** Green = LocalStorage accessible, Red = Storage blocked

---

## 🎓 Best Practices

### 1. Always Log Critical Actions
```typescript
// ✅ GOOD
const handleSubmit = () => {
  actionLogger.logFormSubmit('campaign-form', formData);
  submitCampaign(formData);
};

// ❌ BAD
const handleSubmit = () => {
  submitCampaign(formData); // No logging!
};
```

### 2. Validate API Responses
```typescript
// ✅ GOOD
const data = await trackedAxios.get('/api/campaigns');
const validated = validateOrThrow(CampaignMetricsSchema, data.data);

// ❌ BAD
const data = await axios.get('/api/campaigns');
// No validation, potential type errors
```

### 3. Add data-tour Attributes
```tsx
{/* ✅ GOOD */}
<button data-tour="submit-campaign">Submit</button>

{/* ❌ BAD */}
<button>Submit</button>
```

### 4. Write E2E Tests for New Features
```typescript
// ✅ GOOD - Test exists
test('should submit campaign form', async ({ page }) => {
  await page.fill('[data-tour="campaign-name"]', 'Test');
  await page.click('[data-tour="submit-campaign"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## 🚨 Troubleshooting

### Debug Panel Not Opening
- **Check:** Are you pressing the right keys? `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)
- **Check:** Is JavaScript enabled?
- **Solution:** Manually toggle via console:
  ```javascript
  // In browser console
  window.debugPanel = true;
  ```

### Logs Not Appearing
- **Check:** Is `actionLogger.setEnabled(true)` called?
- **Check:** Are imports correct?
- **Solution:** Check console for errors

### Tests Failing
- **Check:** Is dev server running on `http://localhost:5173`?
- **Check:** Are test credentials valid?
- **Solution:** Update test credentials in `traffic-dashboard.spec.ts`

---

## 📝 npm Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:report": "playwright show-report"
  }
}
```

---

## ✅ Verification Checklist

- [x] Debug Panel accessible via keyboard shortcut
- [x] All modules monitored (Auth, API, DB, FB Ads, etc.)
- [x] Action logger tracking user interactions
- [x] API interceptor logging all requests
- [x] Validation schemas for critical data
- [x] E2E tests covering critical flows
- [x] Health report export functionality
- [x] Real-time status updates
- [x] Integration with Traffic Dashboard

---

## 🎉 All Systems Operational

Your Traffic Dashboard now has enterprise-grade debugging and health monitoring!

**Remember:** *"If it's not tested and logged, it doesn't exist."*

For questions or issues, check the Debug Panel (Ctrl/Cmd + Shift + D) for real-time diagnostics.
