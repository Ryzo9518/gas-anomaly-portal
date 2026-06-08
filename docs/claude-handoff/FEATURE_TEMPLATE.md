# Feature Template: Step-by-Step Checklist

Use this template every time you add a feature. Copy the steps, fill in your specifics, commit when done.

---

## Feature: [NAME]

**Date:** YYYY-MM-DD  
**Requester:** [Name]  
**Scope:** [1-2 sentence summary]

---

## STEP 1: Understand Architecture (Reading Only)

**Goal:** Know what you're changing before touching code.

- [ ] Read ARCHITECTURE.md (5 min)
- [ ] Identify which context/screens/state are affected
- [ ] Identify which data model entities are involved
- [ ] Read the applicable Lesson (check LESSONS_LEARNED.md)
- [ ] Sketch the data flow on paper (or in a comment)

**Findings:**
- Which context? `ReportContext` / other
- Which screens? `dashboard.route`, `findings.route`, etc.
- Which data? `Engagement`, `Finding`, `AuditReport`
- Which lessons apply? [LESSON-1], [LESSON-4], etc.

---

## STEP 2: Audit Current State (No Code Yet)

**Goal:** Know what works before you change it.

```bash
# Gate 1: Build clean
npm run build
# ✓ Should succeed

# Gate 2: TypeScript clean
npm run typecheck
# ✓ Should be 0 errors

# Gate 3: Manual test (in browser)
PORT=5199 npm run dev
# ✓ Navigate to the affected screen(s)
# ✓ Verify current behavior works
# ✓ Take screenshot of BEFORE state
```

**Affected screens to test:**
- [ ] [Screen 1]
- [ ] [Screen 2]

**Before screenshot:** [path to screenshot file]

---

## STEP 3: Design the Change (Still No Code)

**Goal:** Get agreement on what you're building before you build it.

### Data Flow Diagram
```
[User Action]
  ↓
[Component]
  ↓
[Context Mutation]
  ↓
[All Screens Re-render]
```

(Sketch your flow here)

### Files to Create
- [ ] `src/...`

### Files to Modify
- [ ] `src/...`

### Type Changes
- [ ] Add field to `Engagement`? (what field, required?)
- [ ] Add status value? (new option in union type?)
- [ ] New hook? (useReport() already covers 95% of needs)

### Will This Break Any Immutable Rule?
- [ ] Rule 1 (ReportContext = single source of truth)? **No** / **Yes, because:**
- [ ] Rule 2 (URL param drives report selection)? **No** / **Yes, because:**
- [ ] Rule 3 (Historical reports frozen)? **No** / **Yes, because:**
- [ ] Rule 4 (Plan column = engagement.findings)? **No** / **Yes, because:**
- [ ] Rule 5 (Cumulative never frozen)? **No** / **Yes, because:**

**Design review:** ✓ Passed / ✗ Needs redesign

---

## STEP 4: Implement & Test (Iterative)

**Workflow:**
1. Create file(s)
2. After each file, run `npm run typecheck`
3. After all files, run `npm run build`
4. Test in browser
5. Verify no regression on other screens
6. Take screenshot of AFTER state

### File 1: [NAME]
```typescript
// Paste code here
```

**After:** `npm run typecheck` → 0 errors?

### File 2: [NAME]
[repeat pattern]

### Full Build Check
```bash
npm run build
# ✓ Should succeed in < 30 seconds
```

### Browser Test
```
PORT=5199 npm run dev
# Test the feature:
[ ] [Test 1]
[ ] [Test 2]

# Regression tests (QUALITY_GATES.md):
[ ] Report selection still works
[ ] Historical freeze still works
[ ] Cross-screen sync still works
```

**After screenshot:** [path to screenshot]

---

## STEP 5: Gate & Commit

**Pre-commit Checklist:**

### Architecture
- [ ] ReportContext still single source of truth?
- [ ] No new contexts added unnecessarily?
- [ ] Data flows context → component?

### Type Safety
- [ ] `npm run typecheck` → 0 errors?
- [ ] All props typed?
- [ ] No `any` types used?

### Build
- [ ] `npm run build` → success?
- [ ] Production build size reasonable (no surprise bloat)?

### Testing
- [ ] Tested in browser at localhost:5199?
- [ ] Verified no console errors?
- [ ] Did regression tests pass?
  - [ ] Report selection
  - [ ] Historical freeze
  - [ ] URL params
  - [ ] Cross-screen sync

### Code Quality
- [ ] Comments explain complex logic?
- [ ] Status marker at top of new files?
- [ ] File follows naming convention?
- [ ] No dead code or commented-out sections?

### Immutables
- [ ] Did not violate any of the 5 immutable rules?
- [ ] If modified engagement.findings, did I sync Plan column?
- [ ] If added caching, is cumulative metric computed fresh?

**All checks passed? Commit.**

### Commit Message Format

```
[FEATURE] [Brief Title]

- What changed
- Why it changed
- Related lesson: [LESSON-N] (if applicable)
- Related issue: #[number] (if applicable)

Testing:
- [Test 1]: PASS
- [Test 2]: PASS
```

**Example:**
```
[FEATURE] Add status badge to engagement builder

- Show "Draft" / "Submitted" / "Active" status pill
- Colored per engagement status (gray/blue/green)
- Read-only on historical reports
- Related lesson: [LESSON-2]

Testing:
- Badge shows correct color for each status: PASS
- Badge hidden when no engagement: PASS
- Regression tests (report selection, freeze): PASS
```

---

## STEP 5B: Code Review (Self)

Before committing, read your own code as if you're reviewing it:

1. **Would I understand this in 6 months?**
   - Are variable names clear?
   - Is the function purpose obvious from the signature?

2. **Is there any way this breaks?**
   - What if selectedReport is null? (It shouldn't be, but...)
   - What if engagement.findings is empty array?
   - What if user clicks fast?

3. **Did I miss any edge case?**
   - What happens on historical view?
   - What happens when switching reports mid-action?
   - What happens if API call fails? (Not applicable yet, but good to think)

4. **Am I duplicating logic?**
   - Is this already in a utility?
   - Should I extract a new hook?

---

## After Commit: Update Docs

Once feature is merged:

- [ ] Add entry to LESSONS_LEARNED.md if you discovered a new non-negotiable rule
- [ ] Update ARCHITECTURE.md if data model changed
- [ ] Update FILE_STRUCTURE_AND_CONVENTIONS.md if new files created
- [ ] Update this FEATURE_TEMPLATE.md if the process itself needs to change

---

## Common Feature Types

### Type 1: New Screen / Route

**Files to create:**
- `src/routes/[name].route.tsx`

**Files to modify:**
- `src/app/App.tsx` (add route)
- `src/shell/TopBar.tsx` (add nav link)

**Template:** Copy findings.route.tsx, rename, customize.

---

### Type 2: New Column / Field in Existing Table

**Files to modify:**
- `src/features/audit/reports.fixture.ts` (add to data model)
- `src/routes/[table].route.tsx` (add column)

**Tests:**
- Does column show on latest report? Yes
- Does column show on historical report? Yes
- Does column freeze on historical? (If data is historical, yes)

---

### Type 3: Engagement Status Change

**Files to modify:**
- `src/features/audit/ReportContext.tsx` (add mutation)
- `src/routes/engagement.route.tsx` (add UI)

**Tests:**
- Can only transition in one direction (none → draft → submitted → active → complete)?
- Can only submit on latest report?
- Does Plan column update when engagement status changes?

---

**Use this template for every feature. It looks long, but it prevents bugs and keeps the codebase aligned.**

---

**Next:** Read `TROUBLESHOOTING.md` for debugging when something breaks.
