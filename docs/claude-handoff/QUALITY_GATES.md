# Quality Gates: What Must Pass

## Pre-Commit Gates (Local)

Run these BEFORE committing:

```bash
# Gate 1: TypeScript Strict
npm run typecheck
# Expected: 0 errors
# Fails if: Any type mismatch, any implicit `any`, any loose types

# Gate 2: Build Production
npm run build
# Expected: succeeds in < 30 seconds
# Fails if: Syntax errors, missing imports, broken dependencies

# Gate 3: Manual Test (Visual Verification)
PORT=5199 npm run dev
# In browser, verify:
#   - Dashboard renders KPI cards
#   - Report selector works (click 2025, screen updates)
#   - Findings table shows data
#   - Engagement builder renders (if latest report selected)
#   - No console errors
```

## Immutable Violations (Instant Fail)

If your code does ANY of these, it will be rejected:

1. **Multiple sources of truth for report selection**
   - Context has selectedReport, local state has another
   - Result: state divergence, UI inconsistency

2. **Engagement.findings and Plan column out of sync**
   - One reads engagement.findings, other reads different source
   - Result: findings table shows wrong status

3. **Cumulative KPI frozen on historical view**
   - If isHistorical, cumulative value is stale
   - Result: business metric incorrect

4. **Historical report allows mutations**
   - User can edit or submit engagement on non-latest report
   - Result: audit data corruption

5. **URL param (?report=) ignored**
   - Local state used instead of URL
   - Result: refresh loses state, links unshare able

---

## Regression Test Checklist

After any change, verify these do NOT break:

- [ ] **Report selection:** Click a different report → all screens update
- [ ] **Historical freeze:** Select 2024 → no edit possible, amber banner shows
- [ ] **Latest mutation:** Select 2026 → edit is enabled
- [ ] **Cross-screen sync:** Change engagement on /engagement → /findings Plan column updates
- [ ] **Cumulative KPI:** 4th KPI card shows R670K on all reports, including 2024 (historical)
- [ ] **Plan column toggle:** No engagement → column hidden; create engagement → column shows
- [ ] **Navigation:** Browser back button works correctly
- [ ] **URL shareability:** Copy current URL, paste in new tab → same screen renders
- [ ] **Upload Centre — archive:** Navigate to /upload on 2026 → see archive view (5 file cards, OutcomeBand)
- [ ] **Upload Centre — intake:** Click "Run new audit" → URL gains `&mode=new` → TopBar shows "2027 New" → CycleLockBanner visible → ScriptDownloadCard is Step 1

---

## Code Review Dimensions

When reviewing your own code before commit, check:

### Architecture
- [ ] Does this change respect report-scoped design?
- [ ] Is ReportContext still the single source of truth?
- [ ] Did I add any new contexts? (If so, should I?)

### Data Flow
- [ ] Does data flow from context → components, or vice versa?
- [ ] Are there any prop-drilling chains longer than 3 levels?
- [ ] Did I create any derived state that contradicts the source?

### Immutables
- [ ] Did I violate any of the 5 Immutable Rules?
- [ ] Can I trace every render back to context updates?
- [ ] Is historical data truly immutable?

### Type Safety
- [ ] `tsc --noEmit` is 0 errors?
- [ ] Did I use `any` anywhere? (If so, remove it)
- [ ] Are all props typed?

### Testing
- [ ] Did I test in browser?
- [ ] Did I verify regression checklist?
- [ ] Did I take a screenshot of the feature working?

---

## When a Gate Fails

**TypeScript errors:**
1. Read the error message fully
2. Find the file and line number
3. Check if the type is too loose (use `as const`, `satisfies`, enums)
4. If in doubt, read the type definition and verify correctness

**Build fails:**
1. Check if you have syntax errors
2. Check if all imports are correct
3. Check if you're importing from the wrong file
4. Run `npm install` (might be missing dependency)

**Manual test fails:**
1. Check browser console for errors
2. Check if `useReport()` is returning undefined
3. Verify context provider is wrapping the component
4. Check if you're reading from the wrong data source

---

**Next:** Read `INTEGRATION_POINTS.md` for backend integration contracts.
