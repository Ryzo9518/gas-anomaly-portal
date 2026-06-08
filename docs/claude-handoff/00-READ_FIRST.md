# GAS Anomaly Audit Portal — Complete Handover Package

**READ THESE IN ORDER. Do not skip.**

## Phase 1: Understanding the System (Read in sequence)
1. **ARCHITECTURE.md** — The report-scoped system design and why it works
2. **DATA_MODEL_AND_STATE.md** — Every entity type, field, and relationship
3. **FILE_STRUCTURE_AND_CONVENTIONS.md** — Where everything lives, naming rules, indexing

## Phase 2: Building the System (Before any code)
4. **BUILD_PROCESS_AND_RULES.md** — Step-by-step build order, immutable gates, no-drift rules
5. **QUALITY_GATES.md** — What must pass before shipping; regression checklist

## Phase 3: Integration Points (For backend work)
6. **INTEGRATION_POINTS.md** — Where data enters/exits; API contracts; data flow diagram

## Phase 4: Development Workflow (For feature work)
7. **LESSONS_LEARNED.md** — 10 non-negotiable architectural lessons
8. **FEATURE_TEMPLATE.md** — How to add a feature correctly without breaking invariants

## Phase 5: When Things Break (Debugging)
9. **TROUBLESHOOTING.md** — Common issues, root causes, how to fix

## Phase 6: Quick Reference
10. **CRITICAL_RULES_CHECKLIST.md** — 1-page summary of must-follow rules

---

## How to Use This Handover

**For Claude (or a new developer):**
```
Here is the GAS Anomaly Audit Portal handover package.

Read in this order:
1. ARCHITECTURE.md
2. DATA_MODEL_AND_STATE.md
3. FILE_STRUCTURE_AND_CONVENTIONS.md
4. BUILD_PROCESS_AND_RULES.md (BEFORE WRITING CODE)
5. QUALITY_GATES.md

Then, when you're ready to build a feature:
- Use FEATURE_TEMPLATE.md as your process
- Follow LESSONS_LEARNED.md (do not violate any of these)
- Check CRITICAL_RULES_CHECKLIST.md before committing

If something breaks, consult TROUBLESHOOTING.md first.
```

**For Project Leads:**
- Phase 1 documents are your architecture bible
- Phase 2 is your QA/gate policy
- Phase 4 is your developer onboarding process
- Keep Phase 5 updated as you encounter new bugs

---

**Next:** Open `ARCHITECTURE.md` and read the system design.
