# Audit Portal Handover Package — Complete File Index

**This document lists every file in the handover package and explains the purpose of each.**

---

## Master Reading Order (Follow This First Time)

1. **00-READ_FIRST.md** (10 min) — Entry point with 10-step reading guide + phases
2. **ARCHITECTURE.md** (15 min) — System design, report-scoped principle, data flow
3. **DATA_MODEL_AND_STATE.md** (10 min) — Entity definitions, TypeScript interfaces
4. **FILE_STRUCTURE_AND_CONVENTIONS.md** (10 min) — Where everything lives, naming rules
5. **BUILD_PROCESS_AND_RULES.md** (15 min) — 5-step build contract, immutable rules
6. **QUALITY_GATES.md** (10 min) — Automated checks, pre-commit gates, regression tests
7. **INTEGRATION_POINTS.md** (10 min) — Backend integration contracts (when needed)
8. **LESSONS_LEARNED.md** (15 min) — 10 hard-won rules from development
9. **FEATURE_TEMPLATE.md** (reference) — Checklist for every new feature
10. **TROUBLESHOOTING.md** (reference) — Debug guide for common issues
11. **CRITICAL_RULES_CHECKLIST.md** (1 page) — Print this, tape to monitor

---

## File Descriptions

### 1. 00-READ_FIRST.md
**Purpose:** Entry point for onboarding  
**Read when:** First thing, every session  
**Contains:**
- 10-step reading guide with estimated times
- 3 phase breakdown (Understand / Build / Verify)
- System overview in plain English
- TL;DR for busy readers

**Key takeaway:** "This is a React audit portal where every screen rehydrates based on which report you've selected."

---

### 2. ARCHITECTURE.md
**Purpose:** Complete system design  
**Read when:** Need to understand HOW it works  
**Contains:**
- Report-scoped architecture principle
- ReportContext design + responsibilities
- 4 data entities (Report, Finding, Engagement, EngagementFinding)
- Immutability strategy
- Data flow diagram (text)
- Key invariants (10 non-negotiable rules)

**Key takeaway:** "ReportContext is the single source of truth. All data flows one direction: context → components."

---

### 3. DATA_MODEL_AND_STATE.md
**Purpose:** TypeScript interfaces + field definitions  
**Read when:** Adding new fields or debugging state shape  
**Contains:**
- Complete TypeScript interface for each entity
- Field definitions with types and constraints
- Seed data structure (3 reports, 10 findings each, 2 complete engagements)
- Cumulative summary computation
- 5 immutable rules stated again for clarity

**Key takeaway:** "Engagement status is linear: none → draft → submitted → active → complete. No reversals."

---

### 4. FILE_STRUCTURE_AND_CONVENTIONS.md
**Purpose:** Directory map + naming rules  
**Read when:** Creating new files or renaming things  
**Contains:**
- Complete src/ directory tree
- File naming conventions (routes, components, contexts, utils)
- Import path alias (@/ = src/)
- Status markers for files (ACTIVE / STABLE / REFERENCE)
- Drift prevention checklist
- 5 key invariants about file organization

**Key takeaway:** "src/features/ is data, src/routes/ is screens, src/ui/ is components. Don't mix."

---

### 5. BUILD_PROCESS_AND_RULES.md
**Purpose:** Development workflow + non-negotiable rules  
**Read when:** Starting a feature or if code fails build  
**Contains:**
- 5-step build contract (Understanding → Audit → Design → Implement → Gate)
- 5 immutable rules with BAD/CORRECT examples
- Pre-commit checklist (12 items)
- Development workflow (day-to-day process)
- Breakage recovery process

**Key takeaway:** "Follow the 5-step contract. It prevents 95% of bugs."

---

### 6. QUALITY_GATES.md
**Purpose:** Automated checks + manual regression tests  
**Read when:** Ready to commit  
**Contains:**
- 3 pre-commit gates (TypeScript, Build, Manual test)
- 5 immutable violations that instant-fail
- 8 regression tests to run after changes
- 4 code review dimensions (Architecture, Data Flow, Immutables, Type Safety, Testing)
- Error diagnosis guide

**Key takeaway:** "Run these gates before every commit. No exceptions."

---

### 7. INTEGRATION_POINTS.md
**Purpose:** Backend integration contracts  
**Read when:** Connecting to a real backend  
**Contains:**
- Current state (Phase 1 = fixture data + mocked auth)
- Auth architecture: AuthPort interface, mock adapter, how to swap in real backend
- 4 data entry points (report selection, engagement submit, save draft, file upload)
- Data exit points (engagement write, telemetry events)
- Error handling contract
- Backwards compatibility fallback pattern
- Migration checklist (12 items)

**Key takeaway:** "Phase 1 uses fixtures and mocked auth. Phase 2 will POST to /api/engagements, GET /api/reports, and wire real auth via the AuthPort seam. Maintain fixture fallback."

---

### 8. LESSONS_LEARNED.md
**Purpose:** 10 hard-won rules from building this  
**Read when:** Before writing code (preventive) or stuck on a bug (diagnostic)  
**Contains:**
- LESSON-1: Report selection drives everything
- LESSON-2: Historical reports frozen
- LESSON-3: Cumulative never frozen
- LESSON-4: Plan column = engagement.findings
- LESSON-5: URL param is source of truth
- LESSON-6: ReportContext is source of truth
- LESSON-7: Engagement state machine linear
- LESSON-8: Table columns need explicit spacing
- LESSON-9: Report selector visually dominant
- LESSON-10: Every screen calls useReport()

**Key takeaway:** "These 10 rules are the distilled wisdom. Breaking them creates bugs that are hard to find."

---

### 9. FEATURE_TEMPLATE.md
**Purpose:** Step-by-step checklist for every new feature  
**Read when:** Starting to build a new feature  
**Contains:**
- 5-step process (Understand → Audit → Design → Implement → Gate)
- 3 sections per step with checkboxes
- 3 common feature patterns (new screen, new column, engagement status change)
- Immutable rule verification checklist
- Code review self-checklist
- Commit message format with example

**Key takeaway:** "Print this. Use it for every feature. It's a template, not a suggestion."

---

### 10. TROUBLESHOOTING.md
**Purpose:** Debug guide for common issues  
**Read when:** Something breaks  
**Contains:**
- 13 common problems with diagnosis + fixes
  1. TypeScript errors
  2. Build fails
  3. App won't start
  4. Report selector not working
  5. Plan column not showing
  6. Engagement won't submit
  7. Historical report is editable (BUG)
  8. Console errors (5 subtypes)
  9. Cumulative KPI wrong
  10. Finding detail page 404
  11. X3 export scripts location (not a TopBar button — see Upload Centre intake)
  12. TopBar showing "2027 New" instead of "2026 Audit" (correct when mode=new)
  13. Engagement shows "Closed Cycle" message
- General debug workflow
- Prevention checklist

**Key takeaway:** "Most issues are simple. Follow the diagnosis workflow. Don't panic."

---

### 11. CRITICAL_RULES_CHECKLIST.md
**Purpose:** 1-page rules summary (print + tape to monitor)  
**Read when:** Every session  
**Contains:**
- 5 immutable rules (with BAD/CORRECT)
- 10 lessons summary
- Pre-commit checklist (10 items)
- Regression test checklist (8 items)
- 5-step build contract summary
- Naming conventions cheat sheet
- File structure map
- TypeScript rules
- Color system
- API contract
- State machine diagram
- Stuck priority order
- Slack message template
- Session checklist

**Key takeaway:** "Read this every day. It's short (1 page). Everything else flows from these rules."

---

## File Organization in docs/claude-handoff/

```
docs/
└── claude-handoff/
    ├── INDEX.md                          [YOU ARE HERE]
    ├── 00-READ_FIRST.md                  [START HERE]
    ├── ARCHITECTURE.md
    ├── DATA_MODEL_AND_STATE.md
    ├── FILE_STRUCTURE_AND_CONVENTIONS.md
    ├── BUILD_PROCESS_AND_RULES.md
    ├── QUALITY_GATES.md
    ├── INTEGRATION_POINTS.md
    ├── LESSONS_LEARNED.md
    ├── FEATURE_TEMPLATE.md
    ├── TROUBLESHOOTING.md
    └── CRITICAL_RULES_CHECKLIST.md
```

---

## Recommended Reading Paths

### Path 1: I'm New to the Project (First 2 Hours)
1. 00-READ_FIRST.md (10 min)
2. ARCHITECTURE.md (15 min)
3. DATA_MODEL_AND_STATE.md (10 min)
4. FILE_STRUCTURE_AND_CONVENTIONS.md (10 min)
5. Break (10 min)
6. BUILD_PROCESS_AND_RULES.md (15 min)
7. CRITICAL_RULES_CHECKLIST.md (5 min)
8. Run the app locally + spot-check a feature (15 min)

**Total time:** ~90 minutes to get fully oriented.

---

### Path 2: I'm Adding a Feature (30-60 min)
1. Scan 00-READ_FIRST.md Phase 1 (2 min)
2. Read FEATURE_TEMPLATE.md top-to-bottom (15 min)
3. Scan LESSONS_LEARNED.md for applicable lessons (5 min)
4. Follow FEATURE_TEMPLATE.md steps 1-5 (30-60 min)

**Total time:** Depends on feature size.

---

### Path 3: Something's Broken (5-15 min)
1. Run `npm run typecheck` (2 min)
2. Read QUALITY_GATES.md section "When a Gate Fails" (3 min)
3. Open TROUBLESHOOTING.md and find your error (5 min)
4. Apply the fix (5-10 min)

**Total time:** 15 minutes max.

---

### Path 4: I'm Debugging a Weird State Issue (20 min)
1. Scan CRITICAL_RULES_CHECKLIST.md (1 min)
2. Read LESSONS_LEARNED.md (10 min)
3. Check if you violated any rule (5 min)
4. Fix it (5-10 min)

**Total time:** 20 minutes. (Most state issues are from violating Lesson 1, 5, or 6.)

---

## Using This Package with Claude

### To Prime Claude on This Codebase

1. **When starting a new session with Claude Code:**
   ```
   Read this first:
   - docs/claude-handoff/00-READ_FIRST.md
   - docs/claude-handoff/ARCHITECTURE.md
   - docs/claude-handoff/DATA_MODEL_AND_STATE.md
   - docs/claude-handoff/CRITICAL_RULES_CHECKLIST.md
   
   Then we'll build [feature].
   ```

2. **When asking Claude to fix a bug:**
   ```
   Read TROUBLESHOOTING.md first, specifically the section on [error type].
   Then read LESSONS_LEARNED.md.
   Then look at [file].tsx and tell me what's wrong.
   ```

3. **When asking Claude to add a feature:**
   ```
   Follow FEATURE_TEMPLATE.md exactly.
   Step 1: Read ARCHITECTURE.md (I'll wait).
   Step 2: Tell me which files you'll modify.
   Step 3: Design the change (pseudo-code).
   Step 4: Implement.
   Step 5: Run gates and commit.
   ```

---

## Size & Maintenance

**Total handover package:**
- 11 markdown files
- ~15,000 words
- ~200 KB (uncompressed)

**Maintenance:**
- Update 00-READ_FIRST.md if the directory structure changes
- Append new lessons to LESSONS_LEARNED.md (don't edit existing ones)
- Update BUILD_PROCESS_AND_RULES.md if the build contract changes
- Update CRITICAL_RULES_CHECKLIST.md if any rule changes

---

## What's NOT in This Package

**These are intentionally left out** (they're project-context, not code-context):

- Business requirements (find in GOVERNANCE_FINAL/)
- Sprint status or roadmap
- Deployment instructions (find in DEPLOY_PLAYBOOK.md at repo root)
- Backend API specs (will be created when backend is built)
- Company org chart or decision-makers

---

## How to Use This Package

### For Onboarding a New Developer
1. Share this entire docs/claude-handoff/ folder
2. Ask them to read 00-READ_FIRST.md first
3. Have them follow the 5-step build contract for their first feature
4. Review their code against CRITICAL_RULES_CHECKLIST.md

### For Handing Off to Another Claude Session
1. Copy 00-READ_FIRST.md + CRITICAL_RULES_CHECKLIST.md into the prompt
2. Say: "Read these first, then we'll [build feature]"
3. Reference specific doc names when you ask Claude to check something

### For Your Own Reference
1. Print CRITICAL_RULES_CHECKLIST.md
2. Tape it next to your monitor
3. Read it every session start
4. Refer to other docs as needed

---

## Glossary (Quick Lookup)

**Engagement:** Client's response to an audit. Status: none → draft → submitted → active → complete.

**Finding:** A specific issue identified in the audit. Each report has 10. Immutable per report.

**Plan Column:** Shows engagement status per finding (In plan / Skipped / Resolved / Regressed).

**Report:** One year's audit cycle. Source of truth for everything on screen. IDs: "2024", "2025", "2026".

**ReportContext:** React Context that holds the selected report + engagement state. Single source of truth.

**Historical Report:** Non-latest report. Immutable. Shows amber banner.

**Latest Report:** Most recent report. Only one that allows mutations.

**Cumulative KPI:** Total recovered "to date" across all years. Never frozen.

**Fixture:** Seed data in TypeScript (reports.fixture.ts). Used in demo, fallback when backend offline.

---

## Questions This Package Answers

**Q: How does the app know which report to show?**  
A: Read 00-READ_FIRST.md, then ARCHITECTURE.md section "Report-Scoped Design Principle".

**Q: Why can't I edit a 2024 engagement?**  
A: Read LESSONS_LEARNED.md [LESSON-2] "Historical Reports Must Be Frozen".

**Q: Where should I put this new file I'm creating?**  
A: Read FILE_STRUCTURE_AND_CONVENTIONS.md section "Directory Layout".

**Q: The app broke. Where do I start?**  
A: Read TROUBLESHOOTING.md section "Debug Workflow (General)", step 1.

**Q: What's the right way to add a feature?**  
A: Follow FEATURE_TEMPLATE.md, step by step.

**Q: Why does the Plan column show different statuses than the engagement builder?**  
A: You violated LESSONS_LEARNED.md [LESSON-4]. They must read the same source.

---

## Support

**If you're stuck:**
1. Search TROUBLESHOOTING.md
2. Search LESSONS_LEARNED.md
3. Read ARCHITECTURE.md data flow section
4. Read the code (trace from context to component)
5. Ask a colleague

**The answer is in one of these documents. Read carefully.**

---

## Next Steps

**To get started:**
1. Open `docs/claude-handoff/00-READ_FIRST.md`
2. Follow it top to bottom
3. Spend 2 hours reading
4. Run the app
5. Pick your first feature
6. Use FEATURE_TEMPLATE.md

**You're ready to build.**

---

**Version:** 1.0 (June 2026)  
**Last Updated:** 2026-06-07  
**Status:** PRODUCTION-READY
