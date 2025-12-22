# 🔍 PERPLEXITY SEARCH PROMPT - Traffic Dashboard Analytics & Integration Issues

**Date:** December 22, 2025  
**Problem:** Несколько критических проблем с Traffic Dashboard после внедрения Multi-page Onboarding  
**Status:** 🔴 BLOCKING FULL FUNCTIONALITY  

---

## 📋 PROBLEM DESCRIPTION

### **Main Issues:**

1. **🔴 Backend 500 Errors** для Traffic Settings и Onboarding endpoints
2. **🟡 Onboarding Navigation** - не продолжается после автоматического перехода на другую страницу
3. **🔴 Analytics Algorithm** - работает неполноценно, требует доработки алгоритма анализа

### **Error Messages:**

```
GET /api/traffic-settings/{userId} → 500 Internal Server Error
GET /api/traffic-onboarding/status/{userId} → 500 Internal Server Error
GET /api/traffic-settings/facebook/ad-accounts → 500 Internal Server Error
```

### **Symptoms:**
- ✅ Login работает (mock mode)
- ❌ Settings page не загружает данные пользователя
- ❌ Facebook ad accounts не загружаются
- ❌ Onboarding останавливается после редиректа на Settings
- ⚠️ Analytics алгоритм дает поверхностный анализ

---

## 🎯 PROBLEM 1: BACKEND 500 ERRORS (Settings & Onboarding)

### **Technical Context:**

**Environment:**
- Backend: Node.js + Express + TypeScript
- Database: Supabase PostgreSQL (Cloud)
- ORM: @supabase/supabase-js v2.x
- Issue: PostgREST schema cache not updating for localhost

**Current Solution (Partial):**
Mock Mode для authentication работает, но другие endpoints все еще используют Supabase RPC и падают с schema cache errors.

### **Backend Logs:**
```
GET /api/traffic-onboarding/status/Kenesary
❌ Error fetching onboarding status: {
  code: 'PGRST202',
  message: 'Could not find the function in the schema cache'
}

GET /api/traffic-settings/f0decafb-8598-4671-9b02-bb097ae44452
❌ Error: (similar schema cache issue)

GET /api/traffic-settings/facebook/ad-accounts
❌ Error: (Facebook API or schema cache issue)
```

### **What We Need:**

**Question 1:**
> How to implement Mock Mode or direct PostgreSQL queries for ALL Traffic Dashboard endpoints (not just auth), while keeping production code using Supabase RPC?

**Question 2:**
> Best practice for handling environment-specific database queries (Mock for localhost, RPC for production) in Express.js + TypeScript?

**Question 3:**
> How to structure Express routes to support both direct PostgreSQL queries AND Supabase RPC based on NODE_ENV?

---

## 🎯 PROBLEM 2: ONBOARDING NAVIGATION (React Joyride)

### **Technical Context:**

**Stack:**
- React 18
- react-router-dom v6
- react-joyride v2.x
- TypeScript

**Current Implementation:**
```typescript
// Multi-page onboarding with automatic navigation
const handleJoyrideCallback = useCallback((data: CallBackProps) => {
  const { action, index, type } = data;
  
  if (action === ACTIONS.NEXT && type === EVENTS.STEP_AFTER) {
    // Dashboard (шаг 3) → переходим на Settings
    if (index === 3 && currentPage === 'dashboard') {
      setTimeout(() => {
        navigate('/traffic/settings');
        setStepIndex(4);
      }, 300);
      return;
    }
    
    // Settings (шаг 6) → переходим на Analytics
    if (index === 6 && currentPage === 'settings') {
      setTimeout(() => {
        navigate('/traffic/detailed-analytics');
        setStepIndex(7);
      }, 300);
      return;
    }
  }
}, [currentPage, navigate]);
```

### **Problem:**
После вызова `navigate('/traffic/settings')` onboarding **останавливается** и не продолжается с шага 4 на новой странице.

### **Expected Behavior:**
1. User нажимает "Next" на Dashboard (шаг 3)
2. Автоматический redirect на `/traffic/settings`
3. Onboarding **продолжается** с шага 4 на Settings page
4. User видит подсказки для Settings
5. Нажимает "Next" до шага 6
6. Автоматический redirect на `/traffic/detailed-analytics`
7. Onboarding **продолжается** с шага 7 на Analytics page

### **Actual Behavior:**
1. ✅ User нажимает "Next" на Dashboard
2. ✅ Redirect на `/traffic/settings` работает
3. ❌ Onboarding **не продолжается** (останавливается)
4. ❌ Tooltips не показываются

### **What We Need:**

**Question 1:**
> How to persist react-joyride state across React Router navigation (page changes) in a multi-page onboarding flow?

**Question 2:**
> Should we use localStorage, Context API, or react-joyride's built-in methods to resume onboarding after navigation?

**Question 3:**
> What's the best practice for multi-page onboarding tours in React SPA with react-router-dom?

**Question 4:**
> How to ensure that after `navigate()`, the Joyride instance on the new page continues from the correct step?

---

## 🎯 PROBLEM 3: ANALYTICS ALGORITHM (Incomplete Analysis)

### **Technical Context:**

**Current Analytics Stack:**
- Facebook Ads API (via Supabase)
- Groq AI (для анализа кампаний)
- Backend: Node.js Express
- Frontend: React + TypeScript

**What We Analyze Now:**
```typescript
// Current analytics endpoint
GET /api/traffic-analytics/detailed

// Returns:
{
  campaigns: [
    {
      id: "campaign_id",
      name: "Campaign Name",
      spend: 1000,
      impressions: 50000,
      clicks: 500,
      ctr: 1.0,
      cpm: 20,
      cpc: 2.0,
      conversions: 10,
      conversion_rate: 2.0,
      roas: 2.5
    }
  ],
  ai_analysis: {
    overall_grade: "B",
    recommendations: [
      "Increase CTR by improving ad creative",
      "Reduce CPM by narrowing audience"
    ]
  }
}
```

### **Problem: Алгоритм работает неполноценно**

**What's Missing:**

1. **🔴 Audience Analysis:**
   - Не анализируются настройки аудиторий
   - Нет проверки overlap между аудиториями
   - Не учитывается размер аудитории

2. **🔴 Creative Analysis:**
   - Не анализируются креативы (изображения, видео, тексты)
   - Нет оценки performance по типам креативов
   - Не сравниваются форматы (single image vs carousel vs video)

3. **🔴 Budget Optimization:**
   - Не даются рекомендации по перераспределению бюджета между кампаниями
   - Не учитывается cost per result
   - Нет анализа bid strategy

4. **🔴 Timing Analysis:**
   - Не анализируется время показа (day parting)
   - Не учитывается performance по дням недели
   - Нет сезонных паттернов

5. **🔴 Competitive Benchmarks:**
   - Нет сравнения с industry benchmarks
   - Не показывается где кампания лучше/хуже средних показателей
   - Нет contextualization результатов

6. **🔴 Actionable Recommendations:**
   - Рекомендации слишком общие
   - Нет конкретных шагов (с примерами настроек)
   - Не приоритизированы по impact

### **What We Need:**

**Question 1:**
> What are the best practices for building a comprehensive Facebook Ads campaign analyzer using Facebook Graph API?

**Question 2:**
> What specific Facebook API endpoints and fields should we call to get:
- Audience details (demographics, interests, behaviors, lookalike settings)
- Creative performance breakdown (by format, placement, creative_id)
- Budget allocation efficiency
- Time-based performance (hourly, daily, weekly)

**Question 3:**
> How to structure an AI prompt (for Groq/GPT) to analyze Facebook Ads data and provide:
- Specific, actionable recommendations (not generic tips)
- Prioritized action items by estimated impact
- Benchmarking against industry standards
- Budget reallocation suggestions

**Question 4:**
> What's a good algorithm/formula for:
- Detecting underperforming campaigns (beyond just ROAS)
- Identifying budget waste (high spend, low results)
- Finding scaling opportunities (good ROAS, low spend)
- Calculating optimal bid amounts

**Question 5:**
> Are there any open-source or commercial solutions for Facebook Ads analytics we can reference or integrate?

---

## 🔗 SEARCH KEYWORDS

Please search on these platforms:
- ✅ **Facebook Developers Documentation** (developers.facebook.com)
- ✅ **Stack Overflow** (tags: facebook-graph-api, react-joyride, supabase)
- ✅ **GitHub** (search repos: facebook-ads-analyzer, react-onboarding-multi-page)
- ✅ **Reddit** (r/PPC, r/facebook_ads, r/webdev)
- ✅ **Medium/Dev.to** (articles on ads analytics, multi-page onboarding)

**Relevant Keywords:**

**For Problem 1 (Backend):**
- `express typescript environment specific database queries`
- `supabase mock mode local development`
- `nodejs conditional database connection production vs development`

**For Problem 2 (Onboarding):**
- `react-joyride multi page onboarding`
- `react-joyride persist state across navigation`
- `react router onboarding tour continue after navigation`
- `spa onboarding tutorial multiple pages react`

**For Problem 3 (Analytics):**
- `facebook ads campaign analyzer algorithm`
- `facebook graph api detailed campaign insights`
- `facebook ads optimization recommendations ai`
- `facebook ads audience analysis api`
- `ppc campaign analyzer best practices`
- `facebook ads benchmarks by industry`
- `actionable facebook ads recommendations`

---

## 📊 CURRENT CODEBASE STRUCTURE

### **Backend Routes:**
```
backend/src/routes/
├── traffic-auth.ts           ✅ Works (Mock Mode)
├── traffic-settings.ts       ❌ 500 Error (Schema Cache)
├── traffic-onboarding.ts     ❌ 500 Error (Schema Cache)
├── traffic-analytics.ts      ⚠️  Incomplete algorithm
└── traffic-facebook.ts       ❌ 500 Error (Schema Cache)
```

### **Frontend Pages:**
```
src/pages/traffic/
├── TrafficLogin.tsx                    ✅ Works
├── TrafficTargetologistDashboard.tsx   ⚠️  Onboarding stops
├── TrafficSettings.tsx                 ❌ 500 errors, no data
├── TrafficDetailedAnalytics.tsx        ⚠️  Incomplete analysis
└── components/OnboardingTour.tsx       ⚠️  Doesn't resume
```

### **Database Schema:**
```sql
-- Traffic Dashboard Tables
traffic_targetologists              ✅ Works (Mock in localhost)
traffic_targetologist_settings      ❌ Schema cache issue
traffic_onboarding_progress         ❌ Schema cache issue
traffic_stats                       ❌ Schema cache issue

-- RPC Functions
get_targetologist_by_email()        ✅ Works (Mock)
get_targetologist_settings()        ❌ Schema cache issue
update_onboarding_progress()        ❌ Schema cache issue
```

---

## 🎯 DESIRED OUTCOMES

### **For Problem 1 (Backend):**
1. All Traffic endpoints работают на localhost (с mock data или direct PG)
2. Production использует Supabase RPC (как раньше)
3. Легко переключается через `NODE_ENV`

### **For Problem 2 (Onboarding):**
1. Multi-page onboarding продолжается после navigate()
2. User experience плавный (no jarring stops)
3. State сохраняется между страницами
4. Можно вернуться назад через onboarding

### **For Problem 3 (Analytics):**
1. Comprehensive analysis включая:
   - Audience insights
   - Creative performance
   - Budget optimization recommendations
   - Time-based patterns
   - Industry benchmarks
   - Prioritized action items
2. AI recommendations конкретные и actionable
3. Metrics контекстуализированы (good/bad compared to what?)
4. Visual indicators для quick insights

---

## 📝 ADDITIONAL CONTEXT

### **Our Product:**
Traffic Command Dashboard для таргетологов (Facebook Ads specialists).
Цель: Дать им AI-powered insights для оптимизации кампаний.

### **Target Users:**
- Junior/Mid-level таргетологи
- Нужны конкретные рекомендации (не generic tips)
- Хотят сэкономить время на анализе
- Нужен actionable guidance

### **What Works on Production:**
- ✅ Login/Auth
- ✅ Dashboard with stats
- ✅ Basic analytics
- ✅ Facebook token validation

### **What Doesn't Work on Localhost:**
- ❌ Settings page (500 error)
- ❌ Onboarding continuation
- ❌ Facebook ad accounts loading
- ❌ User settings loading

---

## 💬 EXAMPLE SEARCH QUERIES FOR PERPLEXITY:

### **Query 1 (Backend):**
"How to implement environment-specific database queries in Express.js TypeScript app using Mock data for localhost and Supabase RPC for production without code duplication"

### **Query 2 (Onboarding):**
"React Joyride multi-page onboarding tutorial with react-router-dom navigation how to persist state and continue tour after page change"

### **Query 3 (Analytics - Facebook API):**
"Facebook Graph API comprehensive campaign analysis what endpoints and fields to call for audience insights creative performance and budget optimization recommendations"

### **Query 4 (Analytics - Algorithm):**
"Facebook Ads campaign analyzer algorithm best practices for detecting underperforming campaigns and providing actionable optimization recommendations with industry benchmarks"

### **Query 5 (Analytics - AI Prompt):**
"Best prompt engineering for AI to analyze Facebook Ads campaign data and provide specific prioritized actionable recommendations for PPC optimization"

---

## 🚀 PRIORITY ORDER

1. **🔴 HIGHEST:** Problem 3 (Analytics Algorithm) - core product value
2. **🟡 HIGH:** Problem 1 (Backend 500 Errors) - blocking localhost testing
3. **🟢 MEDIUM:** Problem 2 (Onboarding) - UX enhancement

---

## 📚 REFERENCE MATERIALS

### **Facebook Ads Metrics We Have:**
- spend, impressions, clicks, reach
- ctr, cpm, cpc, cpp
- conversions, conversion_rate
- roas, cost_per_result
- frequency, unique_clicks

### **Facebook Ads Metrics We DON'T Have (but need):**
- audience_overlap
- creative_breakdown
- placement_breakdown
- age_gender_breakdown
- device_breakdown
- hourly_stats
- ad_set_details
- bid_strategy
- budget_utilization

### **Industry Benchmarks (What We Need):**
- Average CTR by industry/objective
- Average CPM by country/audience size
- Average conversion rate by industry
- Good/Bad/Excellent thresholds

---

**END OF PROMPT**

Copy this entire document and paste it into Perplexity Pro for comprehensive search across:
- Facebook Developers Docs
- Stack Overflow
- GitHub repos
- Reddit communities
- Technical blogs
- Industry benchmarks databases

---

**Priority:** 🔴 CRITICAL  
**Blocking:** Full Traffic Dashboard functionality  
**Impact:** Product value, User experience, Development workflow

---

## 🎯 DELIVERABLES WE NEED:

1. **Code examples** for environment-specific DB queries (Mock + Supabase)
2. **React Joyride solution** for multi-page state persistence
3. **Facebook API calls** for comprehensive campaign analysis
4. **Algorithm/formula** for campaign scoring and recommendations
5. **AI prompt template** for generating actionable insights
6. **Industry benchmarks** or sources to get them
7. **Best practices** from successful ads analytics tools

---

**Estimated Search Time:** 15-20 minutes  
**Estimated Implementation Time:** 2-4 hours after finding solutions

Copy to Perplexity Pro now! 🚀
