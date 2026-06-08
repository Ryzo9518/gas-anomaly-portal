# GAS Anomaly Audit Portal — Claude Setup Guide

Feed Claude these files **in this exact order** to set up for development.

## Step 1: Architecture Overview
1. **src/features/audit/reports.fixture.ts** — The data model (Report, Engagement, Finding types + seed data)
2. **src/features/audit/ReportContext.tsx** — The state management (single source of truth)
3. **src/shell/TopBar.tsx** — Report selector + historical banner logic

## Step 2: Core Routes (in order of importance)
4. **src/routes/dashboard.route.tsx** — KPI cards, cumulative tracking, YoY
5. **src/routes/findings.route.tsx** — Findings table, Plan column, severity striping
6. **src/routes/engagement.route.tsx** — EngagementBuilder (draft) + LockedEngagementView (submitted/active/complete) + edit mode

## Step 3: Supporting Files
7. **src/routes/findingDetail.route.tsx** — Individual finding drill-down
8. **src/routes/upload.route.tsx** — Upload Centre: archive view (validated file grid) and new-cycle intake flow (ScriptDownloadCard step 1, ZipDropZone step 2, AnomalySnapshotCard). Mode controlled by `?mode=new` URL param.
9. **src/routes/login.route.tsx** — /login mock auth flow
10. **src/app/Providers.tsx** — ReportProvider + QueryClientProvider wrapper

## Step 4: Configuration
10. **vite.config.ts** — Port 5174 default, 5199 override via PORT env var
11. **package.json** — Dependencies (React 18, Tailwind, Lucide, Radix UI)
12. **tailwind.config.ts** — Color palette (violet/slate/emerald/amber), typography

## Critical Concepts to Explain to Claude

When giving Claude these files, also explain:

**Report-Scoped Architecture:**
- Every screen reads from `useReport()` context
- Selecting a report via URL (?report=2025) rehydrates ALL screens
- Historical reports show frozen data + amber banner
- Latest report allows editing

**Engagement State Machine:**
- Status: none → draft → submitted → active → complete
- Once submitted, the plan is permanently read-only — no edit affordance
- Findings table shows Plan column once any engagement exists for the cycle
- Cumulative "Total Recovered" is always live (never frozen)

**Key Rules:**
1. ReportContext is THE source of truth (no local state conflicts)
2. Findings table Plan column = engagement.findings status array (stay in sync)
3. Table columns: Finding flex-1, numeric cols w-28 fixed, explicit px-3/px-5 padding
4. Report selector (violet pill, border-2) is the most visible control on screen
5. Auth is mocked in Phase 1 (src/adapters/mock/auth.mock.ts) — not absent
6. `shortLabel` is a bare year string ("2026"), not "2026 Audit" — used in TopBar and to derive nextCycleYear via parseInt

## How to Use This with Claude

Copy all 12 files above, paste into Claude with this prompt:

```
I'm building a feature for the GAS Anomaly Audit Portal. Here are the core files:

[paste all 12 files in the order listed above]

The architecture is report-scoped: 
- Every screen reads from useReport() context
- Selecting a report via URL (?report=ID) rehydrates all screens
- Engagements lock after submission but remain editable
- The Plan column on findings table mirrors engagement.findings status

Please review these files and then help me [your task here].
```

---

**Done.** Claude will have the full context to build features that respect the architecture.
