# Build Process and Non-Negotiable Rules

## The 5-Step Build Contract

**Every feature must pass through these stages in order. No skipping.**

### Step 1: Understand the Architecture
- Read ARCHITECTURE.md
- Read DATA_MODEL_AND_STATE.md
- Identify which context/state/screen is affected
- Do NOT write code yet

### Step 2: Audit the Current State
- Run `npm run build` (verify it builds clean)
- Run the app: `PORT=5199 npm run dev`
- Test the affected screens manually
- Screenshot the current state (before your changes)
- Check TypeScript: `tsc --noEmit` (should be 0 errors)

### Step 3: Design the Change
- Which files will you modify?
- Which data model entities are affected?
- Will you break any immutables? (check LESSONS_LEARNED.md)
- Draft pseudo-code or flow diagram
- Ask: "Does this respect ReportContext as single source of truth?"

### Step 4: Implement & Test
- Write code following FILE_STRUCTURE_AND_CONVENTIONS.md
- After each file, check: `tsc --noEmit`
- Build: `npm run build` (must succeed)
- Run: `PORT=5199 npm run dev`
- Test the feature in browser
- Test cross-screen: does selecting a report still work?
- Does historical view still freeze correctly?
- Take screenshot of the feature working

### Step 5: Gate & Commit
- Review your changes against QUALITY_GATES.md
- All tests must pass
- No TypeScript errors
- No hardcoded data
- PR title links to the Lesson number (if applicable)
- Commit message format:
  ```
  [FEATURE] Brief description
  
  - What changed
  - Why it changed
  - Related lesson: [LESSON-N]
  ```

---

## Immutable Rules (Break These = Instant Rejection)

### Rule 1: ReportContext Is the Single Source of Truth
**No route component may have local state that contradicts the context.**

❌ BAD:
```typescript
const Dashboard = () => {
  const [selectedReport, setSelectedReport] = useState(reports[0]); // WRONG
  const { selectedReport: ctxReport } = useReport();
  // Now two sources of truth exist!
```

✅ CORRECT:
```typescript
const Dashboard = () => {
  const { selectedReport } = useReport(); // Only source
  // Use selectedReport everywhere
```

### Rule 2: URL Param (?report=) Drives Context
**Never use local state to track the selected report.**

❌ BAD:
```typescript
const [reportId, setReportId] = useState("2026");
selectReport = () => setReportId("2025"); // Local state only
```

✅ CORRECT:
```typescript
selectReport = (id) => setSearchParams({report: id}); // URL updates
// Context listens to URL and updates
```

### Rule 3: Historical Reports Are Frozen
**If isHistorical === true, no data mutations are allowed.**

❌ BAD:
```typescript
if (isHistorical) {
  return <EngagementBuilder />; // User can edit! WRONG
}
```

✅ CORRECT:
```typescript
if (isHistorical) {
  return <LockedEngagementView />; // Read-only, no edit affordance
}
```

### Rule 4: Plan Column = Engagement.findings Status
**These two arrays must always be in sync.**

❌ BAD:
```typescript
// Dashboard shows engagement.findings
// Findings table reads from a different source
// They diverge! ❌
```

✅ CORRECT:
```typescript
// Both dashboard and findings table read from engagement.findings
// Single source = always in sync
```

### Rule 5: Cumulative KPI Never Freezes
**Even on historical view, computed fresh every render.**

❌ BAD:
```typescript
if (isHistorical) {
  return <div>{frozenCumulativeValue}</div>; // WRONG
}
```

✅ CORRECT:
```typescript
const cumulative = computeCumulative(); // Fresh computation
return <div>{cumulative.totalRecovered}</div>; // Always live
```

---

## Pre-Commit Checklist

Before committing ANY code:

- [ ] **Architecture:** Does this change respect the report-scoped design?
- [ ] **State:** Is ReportContext the only source of truth?
- [ ] **TypeScript:** `tsc --noEmit` returns 0 errors?
- [ ] **Build:** `npm run build` succeeds?
- [ ] **Manual Test:** Tested in browser at localhost:5199?
- [ ] **Cross-Screen:** Changing reports rehydrates all screens?
- [ ] **Historical:** Non-latest reports show amber banner and freeze correctly?
- [ ] **Cumulative:** 4th KPI card stays live on historical view?
- [ ] **Plan Column:** Findings table shows/hides Plan column correctly?
- [ ] **No Hardcode:** All data comes from fixture or context, not literals?
- [ ] **No Dead Code:** All files referenced, no orphans?
- [ ] **Naming:** Follow convention (FILE_STRUCTURE_AND_CONVENTIONS.md)?
- [ ] **Comments:** Status marker at top of new files?

---

## Development Workflow (Day-to-Day)

1. **Start:** Read the feature request
2. **Context:** Which step (1-5) are we in?
3. **If Step 1-2:** No code. Just learning and planning.
4. **If Step 3:** Draft the design. Ask for feedback before coding.
5. **If Step 4:** Code. Test after each file. Don't wait until the end.
6. **If Step 5:** Check the pre-commit checklist. Then commit.

---

## When Something Breaks (Build Fails, Tests Fail, Runtime Error)

1. **Do not panic. Do not revert.**
2. **Understand the error:** Read the full error message.
3. **Isolate the change:** Which file caused it?
4. **Fix the root cause:** Don't patch symptoms.
5. **Verify the fix:** Re-run the test/build.
6. **Check Rule Compliance:** Did you violate an immutable?
7. **Update TROUBLESHOOTING.md** if this was hard to debug.

---

**Next:** Read `QUALITY_GATES.md` for the automated checks that must pass.
