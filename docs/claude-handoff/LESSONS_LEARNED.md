# 10 Non-Negotiable Lessons Learned

These are the hard-won rules. Break them at your peril.

---

## [LESSON-1] Report Selection Must Drive Everything

**The Problem:** Early versions had the report selector in the sidebar AND in the topbar. State diverged. User selected Report A in sidebar, but the KPI cards showed Report B.

**The Lesson:** One control, one data source. The TopBar report selector is the ONLY way to change reports. Everything else reads from context.

**Applied:** TopBar.tsx, ReportContext.tsx, all route components

**If You Ignore It:** Users see inconsistent data. "Why does the dashboard show 2025 but the findings table shows 2026?" Engineering nightmare.

---

## [LESSON-2] Historical Reports Must Be Frozen

**The Problem:** Beta user edited an engagement on a 2024 (historical) report, then navigated to 2026 and submitted. The 2024 changes persisted. Audit data was corrupted.

**The Lesson:** Non-latest reports are read-only. Period. No exceptions. The amber banner is not a suggestion; it's a law.

**Applied:** ReportContext (isHistorical flag), LockedEngagementView (read-only enforcement)

**If You Ignore It:** Audit history becomes unreliable. Compliance nightmare.

---

## [LESSON-3] Cumulative Metrics Never Freeze

**The Problem:** The "Total Recovered" KPI card showed stale data when switching to a historical report. Finance team complained: "Why does the cumulative total change when I look at 2025?"

**The Lesson:** Cumulative metrics across all years must be computed fresh EVERY render. Never cache them based on which report is selected.

**Applied:** Dashboard computeCumulative(), ReportContext

**If You Ignore It:** Business metrics are wrong. End of story.

---

## [LESSON-4] Findings Plan Column = Engagement.findings

**The Problem:** Findings table showed one set of Plan badges, but the engagement ledger showed different ones. Root cause: findings table read from a different array.

**The Lesson:** Single source of truth. Engagement.findings is the canonical list of per-finding statuses. Nothing else.

**Applied:** findings.route.tsx, engagement.route.tsx

**If You Ignore It:** UI sync breaks. Users trust neither screen.

---

## [LESSON-5] URL Param (?report=) Is Not Optional

**The Problem:** User bookmarked a dashboard view. Next day, the URL had no ?report= param, so context defaulted to latest. Their old bookmark broke.

**The Lesson:** The URL is the source of truth for which report is selected. Always read from searchParams, always update it when selecting a report.

**Applied:** ReportContext useSearchParams(), TopBar selectReport()

**If You Ignore It:** State is not shareable. Bookmarks break. Navigation is fragile.

---

## [LESSON-6] ReportContext Is THE Source of Truth

**The Problem:** Early code had both context state AND local component state tracking the engagement. When context updated, the component's local state didn't. They diverged.

**The Lesson:** Do not keep a copy of context data in local state. Read from context every time.

**Applied:** All route components, TopBar, PageStickyHeader

**If You Ignore It:** Mutations are invisible to some screens. "Why didn't my engagement submission work?"

---

## [LESSON-7] Engagement State Machine Is Linear

**The Problem:** Code had a button to revert engagement from "submitted" back to "draft". This broke the immutability assumption.

**The Lesson:** Engagement status flows ONE direction: none → draft → submitted → active → complete. No going backward. Ever.

**Applied:** ReportContext submitEngagement() (no reversals), engagement.route.tsx (UI enforces this)

**If You Ignore It:** Audit trail is unreliable. Compliance fails.

---

## [LESSON-8] Table Columns Need Explicit Spacing

**The Problem:** The "Est." column on the engagement ledger was getting compressed. Tried to make it flex. It wrapped weirdly on some browsers.

**The Lesson:** Numeric columns get fixed widths (w-28) + explicit padding (px-3/px-5). Don't flex them.

**Applied:** engagement.route.tsx table markup

**If You Ignore It:** UI breaks on different screen sizes. Looks unprofessional.

---

## [LESSON-9] Report Selector Must Be Visually Dominant

**The Problem:** Early design had the report selector as a small gray button. User testing showed people didn't notice it. They thought the app was "stuck on one report".

**The Lesson:** Report selector is the most important control. Violet pill with border-2, amber when historical. Make it unmissable.

**Applied:** TopBar.tsx (styling + size + color)

**One exception — `mode=new` override:** When `?mode=new` is in the URL (Upload Centre new-cycle intake), the selector shows the NEXT year and "New" instead of the current year and "Audit". For example, with 2026 selected and `?mode=new`, the pill shows "2027 New". This is by design — it signals the user is setting up the next cycle's upload, not selecting a different report. The report in context is still 2026.

**If You Ignore It:** Users misunderstand the app's fundamental behavior.

---

## [LESSON-10] Every Screen Must Call useReport()

**The Problem:** A new developer added a dashboard variant that read from a hardcoded fixture instead of context. It worked until someone changed reports... then broke.

**The Lesson:** Pattern: every route component that shows report data starts with `const { selectedReport, ... } = useReport()`. No exceptions.

**Applied:** dashboard.route.tsx, findings.route.tsx, engagement.route.tsx, etc.

**If You Ignore It:** New code is fragile. People add features without realizing they're reading from the wrong source.

---

## How to Apply These Lessons

Before you write a feature:
1. Which of these lessons does it touch?
2. How will you enforce the lesson in your code?
3. How will you test that you didn't break it?

---

**Next:** Read `FEATURE_TEMPLATE.md` to see the checklist when adding a feature.
