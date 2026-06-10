# Fixture Contract (the UI's data contract) & BFF drift audit

**The rule.** The UI was built against the TypeScript **fixtures**, and the fixtures were built against the spec. The **BFF (FastAPI `/api/*`) is the new thing**, so drift will live in the BFF, not the UI.

Every field the UI reads from the fixture **must exist in the BFF response with the same name, the same type, and the same structure.**

**Drift-resolution rule** (apply on any mismatch):
1. *Is the BFF returning the field the UI expects?*
2. **Yes** → it's a **UI bug** → fix the UI.
3. **No** → it's a **BFF bug** → fix the BFF to match the fixture.

This file is the source of truth for the audit. It is generated from
`src/features/audit/reports.fixture.ts` (the canonical types) and
`src/features/clients/clients.data.ts` (the `ClientEntry` the data layer feeds
to `ReportContext`).

---

## 1. The data layer's top-level contract: `ClientEntry`

`ClientContext` provides this shape; in the client-portal build the BFF adapter
(`src/adapters/bff/clients.bff.ts`) must assemble an **identical** object.

| Field | Type | Source in BFF | Notes |
|-------|------|---------------|-------|
| `id` | `string` | `GET /api/clients` → `id` | client UUID (string) |
| `info.name` | `string` | `GET /api/clients` → `name` | |
| `info.healthTarget` | `number` | `GET /api/clients` → `healthTarget` | **NOT** `health_target` — camelCase per contract |
| `reports` | `AuditReport[]` | `GET /api/reports` | authored order (oldest→newest) |
| `reportsDesc` | `AuditReport[]` | derived: `[...reports].sort(byCompletedAt desc)` | adapter derives; same as registry |
| `latestReportId` | `string` | derived: `reportsDesc[0].id` | |
| `seedEngagements` | `Record<string, Engagement>` | `{}` for clients (built live) | object, never null |

## 2. `AuditReport` (each item of `reports`)

| Field | Type |
|-------|------|
| `id` | `string` |
| `shortLabel` | `string` |
| `cycleLabel` | `string` |
| `status` | `"awaiting_data" \| "validating" \| "running" \| "complete" \| "failed"` |
| `completedAt` | `string` (ISO date) |
| `healthScore` | `number` |
| `leakageEstimate` | `number` |
| `leakageRecoverable` | `number` |
| `risks` | `{ critical: number; high: number; medium: number; low: number }` |
| `findings` | `AuditFinding[]` |
| `uploadSubmittedAt` | `string` (ISO) |
| `uploads` | `AuditUploadFile[]` |

## 3. `AuditFinding` (each item of `report.findings`)

| Field | Type |
|-------|------|
| `rank` | `number` |
| `title` | `string` |
| `severity` | `"critical" \| "high" \| "medium" \| "low"` |
| `category` | `"controls" \| "data_quality" \| "leakage" \| "efficiency"` |
| `financialImpact` | `number` (ZAR) |
| `estimatedHours` | `number` |
| `recommendedFix` | `string` |
| `ownerRole` | `string` |
| `status` | `"open" \| "in_progress" \| "resolved" \| "accepted_risk"` |

## 4. `AuditUploadFile` (each item of `report.uploads`)

| Field | Type |
|-------|------|
| `fileType` | `"gl" \| "ap" \| "po" \| "users" \| "workflows"` |
| `fileTypeLabel` | `string` |
| `fileTypeDescription` | `string` |
| `filename` | `string` |
| `rows` | `number` |
| `sizeBytes` | `number` |
| `state` | `"pending" \| "passed" \| "failed"` |
| `submittedAt` | `string` (ISO) |

> A first-time client (clean fixture) uses `uploads: []` → the Upload Centre
> shows intake mode. The BFF must return `[]`, never `null`.

## 5. `Engagement` / `EngagementFinding`

Client sessions start with `seedEngagements: {}` (clients build the plan live),
so the BFF does not currently serve engagements. If/when it does, the shape is:

`Engagement`: `reportId: string`, `status: "none"|"draft"|"submitted"|"active"|"complete"`, `submittedAt?: string`, `improvementHoursPerMonth: number`, `supportHoursPerMonth: number`, `months: number`, `estimatedSavings: number`, `actualSavings?: number`, `findings: EngagementFinding[]`.

`EngagementFinding`: `findingRank: number`, `status: "included"|"skipped"|"resolved"|"regressed"`, `estimatedImpact: number`, `actualImpact?: number`.

---

## 6. BFF endpoint → contract mapping

| Endpoint | Returns | Must equal |
|----------|---------|-----------|
| `GET /api/clients` (client-scoped) | `{ id, name, healthTarget }` | feeds `ClientEntry.id` + `info` |
| `GET /api/reports` (client-scoped) | `AuditReport[]` (§2) | feeds `ClientEntry.reports` verbatim |

**Critical camelCase note:** the DB columns are snake_case (`health_target`),
but the contract is **camelCase** (`healthTarget`). The BFF response and the
stored `client_data.payload` (the `AuditReport[]`) must use the **contract field
names** exactly. The seed/real-data loader (Unit 11) loads the fixture-shaped
JSON unchanged, so `reports` matches §2 by construction.

---

## 7. Audit method (schema-drift detection)

Two automated checks, run as part of the suite:

1. **Frontend adapter parity** — `src/adapters/bff/clients.bff.drift.test.ts`:
   feed the BFF adapter a mocked API response equal to the registry's data, and
   deep-compare the assembled `ClientEntry` against the registry's `ClientEntry`
   (same keys, same nesting). Fails if the adapter renames/drops/adds a field.
2. **Backend payload shape** — `backend/tests/test_contract.py`: assert a
   stored/served `AuditReport` payload has exactly the §2 keys with the right
   primitive types (no snake_case leakage, no missing/extra fields).

## 8. Audit result (2026-06-08)

- Adapter parity: **PASS** — `clients.bff` assembles `ClientEntry` with the §1
  keys; `reports` passed through verbatim; `reportsDesc`/`latestReportId` derived
  identically to the registry; `seedEngagements: {}`.
- Backend payload shape: **PASS** — `/api/reports` returns the `AuditReport[]`
  payload unchanged; contract test asserts §2 keys/types.
- Resolved drift: `GET /api/clients` returns **`healthTarget`** (camelCase), not
  the DB column `health_target` — matched to the contract in `clients_api.py`.
