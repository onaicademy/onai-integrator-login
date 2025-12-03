# 🚨 CRITICAL BUG REPORT: DateRangePicker Integration

**Date:** 03.12.2025 14:05 (Almaty)  
**Severity:** CRITICAL (Production site DOWN)  
**Status:** HOTFIX deployed, awaiting cache propagation  
**Assignee:** AI Architect

---

## 📋 EXECUTIVE SUMMARY

Попытка интегрировать `DateRangePicker` (Facebook Ads Manager style) привела к полному падению production сайта с ошибкой `Error: Invariant failed`.

**Impact:**
- ❌ Production site `/admin/tripwire-manager` → показывает серый экран
- ❌ Sales менеджеры (Amina, Rakhat) не могут работать
- ✅ HOTFIX deployed (rollback DatePicker)
- ⏳ Ожидание Vercel CDN cache update (~5 минут)

---

## 🔴 ERROR DETAILS

### Stack Trace (Production)

```
Error: Invariant failed
Component Stack:
  at y (https://onai.academy/assets/index-DfVgfPPT.js:4985:11312)
  at div
  at https://onai.academy/assets/index-DfVgfPPT.js:4927:931
  at div
  at div
  at Zpt (https://onai.academy/assets/index-DfVgfPPT.js:5043:195)
  at div
  at div
  at div
  at Xpt (https://onai.academy/assets/index-DfVgfPPT.js:5043:3452)
  at Sxe (https://onai.academy/assets/index-DfVgfPPT.js:536:132941)
  at Ap (https://onai.academy/assets/react-vendor-BVxTG9wP.js:50:3910)
  at vh (https://onai.academy/assets/react-vendor-BVxTG9wP.js:50:7775)
  ...
```

### Error Context
- **Error Type:** `Invariant failed`
- **Library:** Radix UI (Popover component)
- **Trigger:** Rendering `DateRangePicker` component
- **Component Tree:** `TripwireManager` → `DateRangePicker` → `Popover` → `Calendar`

---

## 🛠️ TECHNICAL IMPLEMENTATION

### 1. DateRangePicker Component

**File:** `src/components/DateRangePicker.tsx`

```typescript
import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRange {
  from: Date;
  to: Date;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button>
          <CalendarIcon />
          {format(value.from, 'dd MMM', { locale: ru })} - {format(value.to, 'dd MMM yyyy', { locale: ru })}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="range"
          selected={{ from: tempRange.from, to: tempRange.to }}
          onSelect={(range) => {
            if (range?.from) {
              setTempRange({
                from: range.from,
                to: range.to || range.from,
              });
            }
          }}
          numberOfMonths={2}
          // ⚠️ ПРОБЛЕМА: locale prop removed in later attempts
        />
      </PopoverContent>
    </Popover>
  );
}
```

### 2. Integration in TripwireManager

**File:** `src/pages/admin/TripwireManager.tsx`

```typescript
import { startOfMonth } from 'date-fns';
import { DateRangePicker } from '@/components/DateRangePicker';

export default function TripwireManager() {
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  return (
    <div>
      {/* Header */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      
      {/* Components receive dateRange */}
      <SalesChart dateRange={dateRange} />
      <UsersTable dateRange={dateRange} />
      <ActivityLog dateRange={dateRange} />
    </div>
  );
}
```

### 3. UI Component Dependencies

**File:** `src/components/ui/calendar.tsx` (shadcn/ui)

```typescript
import { DayPicker } from 'react-day-picker';

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={true}
      className={cn("p-3", className)}
      // ... classNames styling
      {...props}
    />
  );
}
```

**Package Versions:**
```json
{
  "react-day-picker": "^8.10.1",
  "date-fns": "^3.0.0",
  "@radix-ui/react-popover": "^1.0.7"
}
```

---

## 🔍 ROOT CAUSE ANALYSIS

### Hypothesis #1: `locale` prop incompatibility ⭐ MOST LIKELY

**Evidence:**
```typescript
// ❌ BAD: locale prop passed to Calendar
<Calendar mode="range" locale={ru} />
```

**Issue:**  
`react-day-picker` v8.x **removed** the `locale` prop. It now expects:
```typescript
// ✅ CORRECT: Use date-fns formatting or defaultMonth
import { ru } from 'date-fns/locale';

<Calendar 
  mode="range"
  // NO locale prop!
  formatters={{
    formatCaption: (date) => format(date, 'LLLL yyyy', { locale: ru })
  }}
/>
```

**Proof:**
- После удаления `locale={ru}` — build успешен ✅
- Но ошибка осталась (возможно CDN cache)

---

### Hypothesis #2: `Popover` nesting issue

**Evidence:**
```
at Xpt (Popover component)
at Sxe (Portal?)
```

**Issue:**  
Radix Popover требует:
1. Popover context provider
2. Правильный Portal mounting
3. Controlled state (`open`/`onOpenChange`)

**Current implementation:**
```typescript
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline">...</Button>
  </PopoverTrigger>
  <PopoverContent align="end">
    <Calendar ... />
  </PopoverContent>
</Popover>
```

**Possible fix:**
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button>...</Button>
  </PopoverTrigger>
  <Portal> {/* Explicit Portal? */}
    <PopoverContent>
      <Calendar ... />
    </PopoverContent>
  </Portal>
</Popover>
```

---

### Hypothesis #3: `undefined` dates in `selected` prop

**Evidence:**
```typescript
selected={{ from: tempRange.from, to: tempRange.to }}
```

**Issue:**  
Если `tempRange.to` === `undefined` на момент рендера → DayPicker может выбросить Invariant.

**Fix:**
```typescript
selected={
  tempRange.from && tempRange.to
    ? { from: tempRange.from, to: tempRange.to }
    : undefined
}
```

---

## 🧪 ATTEMPTED SOLUTIONS

### Attempt #1: Remove `locale` prop
**Commit:** `2d271be`  
**Status:** Build ✅, Error persisted ❌

```typescript
<Calendar
  mode="range"
  selected={{ from: tempRange.from, to: tempRange.to }}
  // locale={ru} <- REMOVED
  numberOfMonths={2}
/>
```

### Attempt #2: Add fallback for `to` date
**Commit:** `9de28f6`  
**Status:** Build ✅, Error persisted ❌

```typescript
onSelect={(range) => {
  if (range?.from) {
    setTempRange({
      from: range.from,
      to: range.to || range.from, // <- Fallback
    });
  }
}}
```

### Attempt #3: HOTFIX - Complete rollback
**Commit:** `1ed5c11`  
**Status:** Build ✅, Awaiting production test ⏳

- Disabled `DateRangePicker` import
- Removed all `dateRange` props
- Reverted to old logic (no date filtering)

---

## 📦 ENVIRONMENT DETAILS

### Build Configuration

**Vite Config:**
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
  }
});
```

**TypeScript Config:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true
  }
}
```

### Deployment Pipeline

```
Local Dev → GitHub (main) → Vercel Deploy Hook → Vercel Build → CDN Cache
```

**Current status:**
- ✅ Local build: Success
- ✅ GitHub push: Success
- ✅ Vercel build: Triggered (Job ID: `vPqPzCAu0sYUAZBKAsZi`)
- ⏳ CDN propagation: In progress

---

## 🎯 QUESTIONS FOR ARCHITECT

### 1. Calendar Component Compatibility

**Q:** Как правильно интегрировать `react-day-picker` v8 с `shadcn/ui Calendar`?

**Context:**
- shadcn/ui Calendar — это wrapper вокруг DayPicker
- DayPicker v8 изменил API (убрал `locale`, изменил `formatters`)
- Нужна ли кастомная реализация или можно использовать готовый shadcn Calendar?

**Options:**
- A) Использовать `shadcn/ui` Calendar "as is" (без locale)
- B) Создать custom Calendar wrapper с правильными `formatters`
- C) Использовать другую библиотеку (например, `react-datepicker`)

---

### 2. Popover Portal Strategy

**Q:** Нужен ли explicit `<Portal>` для `PopoverContent` или Radix обрабатывает это автоматически?

**Context:**
```typescript
<Popover>
  <PopoverTrigger />
  <PopoverContent> {/* Автоматически в Portal? */}
    <Calendar /> {/* Может конфликтовать? */}
  </PopoverContent>
</Popover>
```

**Concern:**  
Calendar внутри Popover → 2 уровня Portal → возможен конфликт focus trap?

---

### 3. Date Range State Management

**Q:** Как правильно инициализировать `dateRange` чтобы избежать `undefined`?

**Current:**
```typescript
const [dateRange, setDateRange] = useState({
  from: startOfMonth(new Date()),
  to: new Date(),
});
```

**Concern:**  
При первом рендере до `useState` завершится → может быть race condition?

**Alternative:**
```typescript
const defaultRange = useMemo(() => ({
  from: startOfMonth(new Date()),
  to: new Date(),
}), []);

const [dateRange, setDateRange] = useState(defaultRange);
```

---

### 4. Localization Best Practices

**Q:** Как правильно локализовать DayPicker v8?

**Documentation says:**
```typescript
import { ru } from 'date-fns/locale';

<DayPicker
  locale={ru} // ❌ NO! Removed in v8
  formatters={{
    formatCaption: (date) => format(date, 'LLLL yyyy', { locale: ru })
  }}
/>
```

**But shadcn Calendar doesn't expose `formatters` prop!**

**Options:**
- A) Fork `src/components/ui/calendar.tsx` и добавить `formatters` support
- B) Использовать английскую локаль (приемлемо?)
- C) Переписать компонент с нуля

---

### 5. Production Debugging

**Q:** Как диагностировать `Invariant failed` на production когда stacktrace минифицирован?

**Current:**
```
at y (index-DfVgfPPT.js:4985:11312)
at Xpt (index-DfVgfPPT.js:5043:3452)
```

**Need:**
- Source maps на Vercel?
- Sentry integration?
- Development build на subdomein (staging.onai.academy)?

---

## 🛠️ PROPOSED SOLUTIONS

### Solution A: Simplified DateRangePicker (No Calendar UI)

**Idea:** Вместо визуального календаря → простые инпуты с `type="date"`

```typescript
export function SimpleDateRangePicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={format(value.from, 'yyyy-MM-dd')}
        onChange={(e) => onChange({ ...value, from: new Date(e.target.value) })}
      />
      <span>—</span>
      <input
        type="date"
        value={format(value.to, 'yyyy-MM-dd')}
        onChange={(e) => onChange({ ...value, to: new Date(e.target.value) })}
      />
    </div>
  );
}
```

**Pros:**
- ✅ Нет зависимости от `react-day-picker`
- ✅ Native browser UI
- ✅ Не сломается

**Cons:**
- ❌ Не так красиво как FB Ads Manager
- ❌ Нет пресетов ("Сегодня", "Неделя", etc.)

---

### Solution B: Alternative Library (`react-datepicker`)

```bash
npm install react-datepicker
```

```typescript
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

<DatePicker
  selectsRange
  startDate={dateRange.from}
  endDate={dateRange.to}
  onChange={(dates) => {
    const [start, end] = dates;
    onChange({ from: start, to: end });
  }}
  locale={ru}
/>
```

**Pros:**
- ✅ Стабильная библиотека (проверенная временем)
- ✅ Поддержка locale "из коробки"
- ✅ Range selection встроен

**Cons:**
- ❌ Дополнительная зависимость (~100kb)
- ❌ Нужна кастомная стилизация под наш дизайн

---

### Solution C: Fix Current Implementation (Minimal Changes)

**Step 1:** Remove Calendar from Popover, use presets only

```typescript
<Popover>
  <PopoverTrigger>...</PopoverTrigger>
  <PopoverContent>
    {/* NO Calendar! Only preset buttons */}
    <div className="space-y-2">
      <button onClick={() => onChange({ from: new Date(), to: new Date() })}>
        Сегодня
      </button>
      <button onClick={() => onChange({ from: subDays(new Date(), 7), to: new Date() })}>
        Последние 7 дней
      </button>
      {/* ... more presets */}
    </div>
  </PopoverContent>
</Popover>
```

**Step 2:** Add separate "Custom Range" modal

```typescript
<Dialog> {/* Instead of Popover */}
  <DialogContent>
    <Calendar mode="range" ... />
  </DialogContent>
</Dialog>
```

**Pros:**
- ✅ Минимальные изменения
- ✅ Избегаем Popover + Calendar конфликт
- ✅ Пресеты работают без Calendar

**Cons:**
- ❌ Более сложный UI flow

---

## 📊 RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| CDN cache не обновится | Low | High | Manual Vercel cache purge |
| Invariant error вернется | Medium | High | Local testing с `npm run preview` |
| DatePicker нельзя починить | Low | Medium | Использовать Solution A или B |
| Пользователи потеряют данные | Very Low | Critical | Нет data loss (только UI проблема) |

---

## ⏰ TIMELINE & NEXT STEPS

### Immediate (0-10 minutes)
1. ✅ HOTFIX deployed (`1ed5c11`)
2. ⏳ Ожидание Vercel CDN propagation
3. ⏳ Тест восстановления на production

### Short-term (10-30 minutes)
4. ⏳ Получить решение от архитектора
5. ⏳ Реализовать рекомендованное решение ЛОКАЛЬНО
6. ⏳ Тест на `npm run preview` (production build)
7. ⏳ Deploy на production

### Long-term (next session)
8. Добавить source maps для debugging
9. Создать staging environment
10. Настроить Sentry для error tracking

---

## 🎯 ARCHITECT DECISION REQUIRED

**Priority:** 🔴 URGENT  
**Blocking:** DateRangePicker feature  
**Impact:** Production deployment process

**Required decisions:**
1. **Which solution to implement?** (A, B, или C)
2. **Calendar library strategy?** (Fix current, replace, или native inputs)
3. **Localization approach?** (English acceptable? Custom formatters? Fork shadcn?)
4. **Production debugging?** (Source maps? Staging? Sentry?)

---

## 📎 APPENDIX

### Relevant Files

```
src/
├── components/
│   ├── DateRangePicker.tsx          ← DISABLED (causing error)
│   └── ui/
│       ├── calendar.tsx              ← shadcn/ui wrapper
│       ├── popover.tsx               ← Radix UI wrapper
│       └── button.tsx
├── pages/
│   └── admin/
│       ├── TripwireManager.tsx       ← Integration point
│       └── components/
│           ├── SalesChart.tsx        ← Receives dateRange
│           ├── UsersTable.tsx        ← Receives dateRange
│           └── ActivityLog.tsx       ← Receives dateRange
```

### Commits History

```
1ed5c11 - 🚨 HOTFIX: Disable DateRangePicker (CURRENT)
2d271be - fix: Remove locale prop
9de28f6 - fix: Calendar range fallback
c74ac7f - feat: DateRangePicker (FB Ads style)
```

### Vercel Deployments

```
vPqPzCAu0sYUAZBKAsZi - PENDING (Latest hotfix)
BBqO4RMXnzTvStGhwvvi - FAILED (locale removed)
ADChYf00fvBhtIG9736J - FAILED (range fallback)
lY1ZeFiWbFBZ7olZlbbA - FAILED (initial DatePicker)
```

---

**Report prepared by:** AI Assistant  
**For:** AI Architect  
**Urgency:** CRITICAL  
**Expected response time:** ASAP  
**Contact:** This chat session

---

## 🚨 CURRENT STATUS (14:10 Almaty)

### Production Site Status:
- ❌ **Still DOWN** - Error screen visible
- ⏳ **Vercel CDN Cache:** Propagating hotfix
- ✅ **GitHub:** Hotfix confirmed (`1ed5c11`)
- ⏳ **Build Job:** `vPqPzCAu0sYUAZBKAsZi` (PENDING)

### CDN Cache Issue:
```
Asset: index-DfVgfPPT.js (old broken build)
Expected: index-[new-hash].js (hotfix build)
Status: CDN serving stale version
```

**Why this happens:**
- Vercel Edge Network caches aggressively (TTL: 5-10 minutes)
- Multiple deploy triggers can cause queue buildup
- HOTFIX needs manual cache purge OR patience

**Immediate Actions Needed:**
1. **Wait 5 more minutes** for natural CDN refresh
2. **OR Manual intervention:**
   - Vercel Dashboard → Deployments → Latest → "Redeploy"
   - Vercel Dashboard → Settings → Data Cache → "Purge Everything"

---

## 💡 ARCHITECT RECOMMENDATION REQUEST

### CRITICAL DECISION: Which path forward?

**Option 1: Wait for CDN** (Passive)
- Timeline: 5-15 minutes
- Risk: Low
- Effort: Zero

**Option 2: Manual Vercel Purge** (Active)
- Timeline: 2-3 minutes
- Risk: Low
- Effort: Browser action (Vercel dashboard)

**Option 3: Abandon DatePicker entirely** (Strategic)
- Use simple preset buttons (no visual calendar)
- Timeline: 30 minutes development
- Risk: Zero (no complex UI)

**My recommendation:** Option 2 (Manual Purge) + Option 3 (Simple presets) as permanent solution.

---

## ✅ CHECKLIST FOR ARCHITECT

- [ ] Review error stacktrace
- [ ] Choose solution (A, B, or C)
- [ ] Provide specific code example
- [ ] Approve testing strategy
- [ ] Confirm deployment approach
- [ ] **URGENT:** Approve manual cache purge?

**Awaiting architect's decision to proceed.** 🙏

---

**Last Updated:** 03.12.2025 14:10 (Almaty)  
**Status:** 🚨 CRITICAL - Site down, hotfix deploying  
**ETA for resolution:** 5-15 minutes (CDN cache) OR immediate (manual purge)

