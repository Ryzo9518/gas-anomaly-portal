# Troubleshooting: When Things Break

---

## Problem 1: TypeScript Errors After Build

**Symptoms:** `npm run typecheck` reports errors; build fails.

**Common causes and fixes:**

```
ERROR: Property 'X' does not exist on type 'AuditReport'
```
You used a field that doesn't exist. Check the exact interface in `reports.fixture.ts`. Common mistake: using `cycleCount` instead of `cyclesCompleted` on `CumulativeSummary`, or accessing `shortLabel` expecting `"2026 Audit"` when it is actually `"2026"` (bare year).

```
ERROR: Argument of type 'string | null' is not assignable to parameter of type 'string'
```
You forgot to guard a nullable value. Add a null check: `if (!value) return;` or use optional chaining.

```
ERROR: Property 'engagement' does not exist on type 'ReportContextValue'
```
You are not calling `useReport()` at the top of the component. Add: `const { engagement } = useReport();`

**Fix:** Run `npm run typecheck` after every file edit. Never commit with TypeScript errors.

---

## Problem 2: Build Fails

**Symptoms:** `npm run build` exits with an error.

**Diagnosis steps:**
1. Run `npm run typecheck` first — TypeScript errors block the build and are easier to read
2. Look at the first error line only — later errors are usually cascading from the first
3. Check for circular imports — if component A imports B and B imports A, the build hangs

**Fix:** Resolve TypeScript errors first, then re-run the build.

---

## Problem 3: App Won't Start

**Symptoms:** `npm run dev` starts but the browser shows a blank screen or an error.

**Diagnosis:**
1. Open the browser console (F12)
2. Look for the first red error
3. Common cause: `useReport() must be used within <ReportProvider>` — a new route or component is calling `useReport()` outside the provider tree

**Fix:** Every screen/component that calls `useReport()` must be rendered inside `<ReportProvider>`. Check `src/app/Providers.tsx` to confirm the provider wraps your route.

---

## Problem 4: Report Selector Not Working — Switching Report Doesn't Update Screens

**Symptoms:** clicking a different report in the dropdown changes the pill label but some screens still show the old data.

**Diagnosis:** A screen is reading data from local state instead of `useReport()`.

**Fix:** Find every `useState` that mirrors report data and delete it. All data must come from `useReport()`. The selector calls `selectReport(id)` → updates URL → `ReportContext` rehydrates → every screen that reads from context updates automatically.

Check:
```typescript
// WRONG — local copy of fixture data
const [findings, setFindings] = useState(REPORTS[0].findings);

// CORRECT — always from context
const { selectedReport } = useReport();
const findings = selectedReport.findings;
```

---

## Problem 5: Plan Column Not Showing

**Symptoms:** the Findings table has no "Plan" column after submitting an engagement.

**Diagnosis:**
1. Open the Findings route — check if `engagement` from `useReport()` is null
2. Check if the engagement was actually submitted (check `engagement.status`)
3. Confirm you are on the same report that was submitted (check `?report=` in the URL)

**Fix:** The Plan column only appears when `engagement !== null`. If `engagement` is null on the 2026 report after a submit, it means the submit mutated a different copy of state. Verify `submitEngagement()` is being called (not a local handler), and that the `reportId` in the submission matches `selectedReportId`.

---

## Problem 6: Engagement Won't Submit — Button is Disabled

**Symptoms:** "Submit to Jera" button stays greyed out.

**Diagnosis:**
```typescript
const canSubmit = selected.size > 0 && supportHours >= 0;
```

The button is disabled if:
- No findings are selected (`selected.size === 0`)
- `supportHours` is negative (shouldn't happen with the stepper)

**Fix:** Select at least one finding in the table. The "Critical + High" shortcut at the top of the table selects all critical and high severity findings instantly.

---

## Problem 7: Historical Report Is Editable (BUG)

**Symptoms:** on a 2024 or 2025 report, the Engagement screen shows the builder with an active "Submit" button.

**This is a bug.** The root cause is that `canEditEngagement` returned `true` for a historical report.

**Fix:** Check `ReportContext.tsx`. The correct logic is:
```typescript
const canEditEngagement =
  isLatest &&
  (!engagement || engagement.status === "none" || engagement.status === "draft");
```

If `isLatest` is not `false` for a 2024 report, the report selection is broken — fall back to Problem 4.

---

## Problem 8: Console Errors

### "useReport must be used within ReportProvider"
A component or route is calling `useReport()` before it is wrapped by `ReportProvider`. Check `src/app/Providers.tsx` and confirm `<ReportProvider>` wraps the router and all routes.

### "Cannot read properties of null (reading 'findings')"
A screen is accessing `engagement.findings` without first checking `if (engagement)`. Add a null guard.

### "Cannot read properties of undefined (reading 'healthScore')"
A screen is accessing `priorReport.healthScore` when `priorReport` is null (baseline year has no prior). Add: `if (!priorReport) return null;`

### React key warnings in findings table
Each `<tr>` needs a unique `key`. Use `key={finding.rank}` — ranks are unique within a report.

### "Each child in a list should have a unique 'key' prop"
Same as above — check every `.map()` call for a `key` prop.

---

## Problem 9: Cumulative KPI Shows Wrong Number

**Symptoms:** the 4th KPI card (Total Recovered / cumulative) shows 0 or a wrong value, even on the 2026 report.

**Root cause options:**
1. `computeCumulative()` is not being called with the full `engagementsById` — it might be receiving an empty object
2. The engagements it received are not `status === "complete"` — only complete engagements are counted

**Fix:** Verify the cumulative card reads from `cumulative` (from `useReport()`), not a local constant. `computeCumulative` sums `actualSavings` across complete engagements — `SEED_ENGAGEMENTS` has two complete cycles (2024 + 2025).

Expected cumulative values with the default seed data:
- `totalRecovered`: sum of all `actualImpact` across 2024 + 2025 complete findings
- `cyclesCompleted`: 2
- `healthGain`: `74 - 51 = 23`

---

## Problem 10: Finding Detail Page Shows 404 or Wrong Finding

**Symptoms:** navigating to `/findings/3` shows a blank page or the wrong finding.

**Diagnosis:**
```typescript
// finding detail reads by rank, not index
const { rank } = useParams();
const finding = selectedReport.findings.find(f => f.rank === parseInt(rank));
```

**Fix:** Confirm the route param is `rank` (a number), not an index. Also confirm `linkWithReport("/findings/3")` is being used — not a bare `/findings/3` link that loses the `?report=` param.

---

## Problem 11: Sage X3 Export Scripts Not Visible

**Symptoms:** you can't find the download button for the Sage X3 export scripts.

**Where it is:** the `ScriptDownloadCard` is Step 1 of the intake flow on the **Upload Centre screen** (`/upload`), visible only when the screen is in intake mode.

**How to reach it:**
1. Navigate to `/upload` for the current (2026) report
2. If you see the **archive view** (a grid of 5 validated file cards), the current cycle is already submitted. Click **"Run new audit"** in the top-right to enter intake mode for the 2027 cycle
3. The intake view shows: CycleLockBanner → section heading → Step 1 (ScriptDownloadCard with "Download scripts v2.1") → Step 2 (ZipDropZone)

**There is no X3 scripts button in the TopBar** — it has never been there. The feature lives entirely within the Upload Centre intake flow.

---

## Problem 12: TopBar Selector Shows "2027 New" Instead of "2026 Audit"

**This is correct behaviour**, not a bug. When `?mode=new` is present in the URL, the TopBar selector intentionally shows the next year and "New" to signal that you are setting up the 2027 cycle's upload.

**When it appears:** only when the URL contains `?mode=new` (i.e. the user clicked "Run new audit" from the 2026 archive view).

**To go back:** click "Back to 2026 Archive" in the Upload Centre header, or remove `&mode=new` from the URL.

---

## Problem 13: Engagement Shows "Closed Cycle" Message Instead of Builder

**Symptoms:** on the current (2026) report, the Engagement screen shows a "This cycle is closed and read-only" message.

**Cause:** `canEditEngagement` is `false`. This means either:
- The engagement status is `submitted`, `active`, or `complete` (the plan was already submitted in this session)
- `isLatest` is false (you are not on the 2026 report — check the TopBar pill)

**Fix:** If the plan was submitted in this session, the lock is correct — `LockedEngagementView` should be showing. If you need to test the builder again, refresh the page (engagement state resets to `SEED_ENGAGEMENTS` on page load, and 2026 has no seed engagement).

---

## General Debug Workflow

1. **Read the error message in full** — not just the first line
2. **Run `npm run typecheck`** — most runtime issues surface as TypeScript errors first
3. **Open F12 → Console** — look for red errors and the stack trace
4. **Check which report is selected** — look at the `?report=` URL param; also check the TopBar pill
5. **Check `engagement`** — is it null or does it have a status?
6. **Trace from context to component** — start at `useReport()` and follow the data
7. **Search LESSONS_LEARNED.md** — the violated rule is almost always one of the 10 lessons
8. **Read the actual source file** — do not guess what a function does; read it

**Never:** add `console.log` everywhere and guess. Read first.

---

## Prevention Checklist

Before every commit:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → success
- [ ] Tested at `localhost:5199` — switch between 2024, 2025, 2026 reports
- [ ] Historical view (2024/2025): amber banner, no edit buttons, cumulative still correct
- [ ] Latest view (2026): no banner, engagement builder accessible
- [ ] Plan column: hidden when no engagement, shows after submit
- [ ] Upload Centre: archive view loads for 2026; intake mode loads via "Run new audit"
- [ ] No red errors in F12 console
