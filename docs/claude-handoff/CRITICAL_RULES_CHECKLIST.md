# Critical Rules Checklist: 1-Page Rules to Stay Aligned

**Print this page. Tape it to your monitor. Read it before every commit.**

---

## The 5 Immutable Rules (Breaking These = Rejection)

### Rule 1: ReportContext Is the Single Source of Truth
**❌ BAD:** Local state that contradicts context  
**✅ CORRECT:** All screens read from context via `useReport()`

**Enforcement:** Every route starts with:
```typescript
const { selectedReport, isHistorical, engagement } = useReport();
```

---

### Rule 2: URL Param (?report=) Drives Report Selection
**❌ BAD:** Clicking selector updates local state only  
**✅ CORRECT:** Clicking selector updates URL, context reads URL

**Enforcement:** TopBar.selectReport() does:
```typescript
setSearchParams({ report: reportId });
```

---

### Rule 3: Historical Reports Are Frozen
**❌ BAD:** User can edit 2024 engagement, changes persist  
**✅ CORRECT:** Non-latest report shows amber banner, all edit UIs hidden

**Enforcement:** engagement.route.tsx checks:
```typescript
if (isHistorical) return <LockedEngagementView />;
return <EngagementBuilder />;
```

---

### Rule 4: Plan Column = Engagement.findings Status
**❌ BAD:** Plan column reads from different source than findings table  
**✅ CORRECT:** Both read from engagement.findings only

**Enforcement:** findings.route.tsx:
```typescript
const engFinding = engagement.findings.find(f => f.findingRank === finding.rank);
const status = engFinding?.status || null; // ✓ Single source
```

---

### Rule 5: Cumulative KPI Never Freezes
**❌ BAD:** On historical view, cumulative shows stale value  
**✅ CORRECT:** Cumulative computed fresh EVERY render, never cached

**Enforcement:** dashboard.route.tsx:
```typescript
const cumulative = computeCumulative(); // No caching
```

---

## The 10 Non-Negotiable Lessons (From LESSONS_LEARNED.md)

Read these BEFORE starting a feature:

1. **Report Selection Must Drive Everything** — One control, one data source
2. **Historical Reports Must Be Frozen** — No exceptions, amber banner = law
3. **Cumulative Metrics Never Freeze** — Computed fresh every render
4. **Findings Plan Column = Engagement.findings** — Single source of truth
5. **URL Param (?report=) Is Not Optional** — Source of truth for selection
6. **ReportContext Is THE Source of Truth** — No local state copies
7. **Engagement State Machine Is Linear** — none → draft → submitted → active → complete (no reversals)
8. **Table Columns Need Explicit Spacing** — Numeric columns: w-28 + px-3/px-5
9. **Report Selector Must Be Visually Dominant** — Violet pill + border-2, amber when historical
10. **Every Screen Must Call useReport()** — No hardcoded fixture data in routes

---

## Pre-Commit Checklist (5 Minutes)

- [ ] **Architecture:** Does this respect report-scoped design?
- [ ] **State:** Is ReportContext the only source of truth?
- [ ] **TypeScript:** `npm run typecheck` = 0 errors?
- [ ] **Build:** `npm run build` = success?
- [ ] **Manual Test:** Tested at localhost:5199?
- [ ] **Report Selection:** Switching reports rehydrates all screens?
- [ ] **Historical Freeze:** 2024/2025 show amber banner + no edit?
- [ ] **Plan Column:** Shows/hides correctly with engagement?
- [ ] **Cumulative KPI:** 4th card shows R670K on all reports?
- [ ] **No Hardcode:** All data from context/fixture, no literals?
- [ ] **No Immutable Violations:** Did not break rules 1-5?

---

## Regression Test Checklist (Before Merging)

After ANY change, verify these don't break:

- [ ] **Report Selection:** Click 2025 → all screens show 2025 data
- [ ] **Historical View:** Click 2024 → amber banner shows → no edit buttons
- [ ] **Latest View:** Click 2026 → no banner → edit buttons enabled
- [ ] **Cross-Screen:** Edit engagement → /findings Plan column updates
- [ ] **Cumulative:** 4th KPI = R670K (same on all reports)
- [ ] **Plan Column Toggle:** No engagement → hidden; create → shows
- [ ] **URL Shareability:** Copy URL → paste in new tab → same screen
- [ ] **Browser Back:** Back button works correctly
- [ ] **Console:** F12 console has no red errors
- [ ] **Mobile:** Responsive? (check at 375px width)

---

## The 5-Step Build Contract (Every Feature)

1. **Understand** — Read architecture, sketch data flow, no code yet
2. **Audit** — Build clean, typecheck clean, screenshot BEFORE state
3. **Design** — Plan files/types/mutations, verify no immutable breaks
4. **Implement** — Code, typecheck after each file, build clean, screenshot AFTER
5. **Gate** — Check all boxes above, then commit

**Total time:** 30 min to 2 hours depending on feature size.

---

## Naming Conventions (Cheat Sheet)

**Routes:** `<section>.route.tsx` → `dashboard.route.tsx`  
**Context:** `<domain>Context.tsx` → `ReportContext.tsx`  
**Hooks:** `use<Name>()` → `useReport()`  
**Types:** `PascalCase` → `AuditReport`, `Engagement`, `Finding`  
**State:** `camelCase` → `selectedReport`, `isHistorical`  
**Constants:** `SCREAMING_SNAKE_CASE` → `LATEST_REPORT_ID`

---

## File Structure (Map)

```
src/
├── App.tsx                           [ROOT — at src/App.tsx, NOT src/app/App.tsx]
├── features/audit/
│   ├── reports.fixture.ts            [DATA MODEL + SEED — single source]
│   ├── ReportContext.tsx             [STATE MANAGEMENT]
│   └── audit.fixture.ts              [COMPAT SHIM — re-exports only]
├── features/login/                   [LOGIN UI — Hero, LoginCard, MobileHero]
├── adapters/index.ts                 [AUTH ADAPTER SEAM — only public surface]
├── adapters/mock/auth.mock.ts        [PHASE 1 MOCK AUTH]
├── ports/auth.port.ts                [AuthPort INTERFACE]
├── state/                            [authStore, uiStore, query]
├── routes/
│   ├── login.route.tsx               [/login — mock auth]
│   ├── dashboard.route.tsx           [KPI CARDS]
│   ├── findings.route.tsx            [TABLE + PLAN COLUMN]
│   ├── engagement.route.tsx          [BUILDER + LOCKED VIEW]
│   ├── findingDetail.route.tsx       [DETAIL PAGE]
│   └── upload.route.tsx              [ARCHIVE VIEW + NEW-CYCLE INTAKE]
└── shell/
    ├── TopBar.tsx                    [REPORT SELECTOR + BANNER]
    └── Sidebar, AppLayout, MobileNav, CommandBar, ... (see FILE_STRUCTURE)
```

**Do not create new top-level dirs. Use existing structure.**

---

## TypeScript Rules (Strict Mode)

- **No `any` types** — always type explicitly
- **No implicit `any`** — parameters must have types
- **No loose unions** — use enums or literal unions
- **No undefined without guard** — check before using

**Check:** `npm run typecheck` must be 0 errors.

---

## Color System (Design Locked)

- **Primary Action:** Violet (#7c3aed)
- **Historical TopBar Banner:** Amber (#f59e0b) — the strip below the header when viewing a prior cycle
- **Upload Lock Banner (CycleLockBanner):** Violet gradient — shown in the Upload intake view when mode=new; separate from the historical amber banner
- **Success:** Emerald (#10b981)
- **Risk/Error:** Red (#ef4444)
- **Neutral:** Slate (gray)

**Don't change colors. Use Tailwind classes (text-violet-600, bg-amber-50, etc.).**

---

## API Contract (Phase 2 — backend not yet wired)

**Auth:** Mocked in Phase 1 via `src/adapters/mock/auth.mock.ts`. Real auth added by implementing `AuthPort` in `src/adapters/bff/auth.bff.ts`.

**Report fetch:** `GET /api/reports` → `AuditReport[]`  
**Engagement submit:** `POST /api/engagements` → `{ id, status, createdAt }`  
**File upload:** `POST /api/uploads?reportId=X` → `{ status, message }`

**All requests must include:** `Authorization: Bearer <token>` (wire in Phase 2)

---

## State Machine (Engagement Status)

```
none
  ↓
draft [user edits] ← save draft
  ↓
submitted [locked, read-only]
  ↓
active [locked]
  ↓
complete [locked, show actual savings]
```

**No reversals. No skipping steps. Linear only.**

---

## Deployment & CI (Local Only)

```bash
npm run typecheck   # Gate 1
npm run build       # Gate 2
PORT=5199 npm run dev  # Gate 3 (manual visual test)
```

**All must pass before commit. GitHub Actions not used (standing rule).**

---

## When You're Stuck (Priority Order)

1. **Read the error message fully** (not just the first line)
2. **Search TROUBLESHOOTING.md** for your error
3. **Read LESSONS_LEARNED.md** (might violate one without knowing)
4. **Read ARCHITECTURE.md** (might misunderstand data flow)
5. **Read the code** (trace from context to component)
6. **Ask a colleague** (or log debug output)

**Never:** Skip reading the code and jump to "add console.log everywhere."

---

## Slack Message Template (When Asking for Help)

```
[AUDIT PORTAL] Bug/Feature question

**What I'm trying to do:**
[1-2 sentences]

**What's happening:**
[Description + screenshot]

**What I expected:**
[Description + screenshot]

**What I've checked:**
- [ ] typecheck passes
- [ ] build passes
- [ ] no console errors
- [ ] tested on latest report
- [ ] tested on historical report

**Affected file(s):**
src/routes/...tsx
```

---

## Session Checklist (Every Session Start)

- [ ] Read 00-READ_FIRST.md (10 min)
- [ ] Run `npm run typecheck` → 0 errors
- [ ] Run `npm run build` → success
- [ ] Start dev server: `PORT=5199 npm run dev`
- [ ] Spot-check one feature in browser
- [ ] Determine your task
- [ ] Check FEATURE_TEMPLATE.md for the checklist

---

**Stuck? Slow down. Read a doc. The answer is there.**

---

**END OF HANDOVER PACKAGE**

---

## Quick Links

- **For new features:** FEATURE_TEMPLATE.md
- **For understanding data:** DATA_MODEL_AND_STATE.md
- **For debugging:** TROUBLESHOOTING.md
- **For architecture:** ARCHITECTURE.md
- **For rules:** LESSONS_LEARNED.md

**Start with 00-READ_FIRST.md every time you pick up this codebase.**
