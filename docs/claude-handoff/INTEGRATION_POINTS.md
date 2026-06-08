# Integration Points: Data In / Data Out

## Current State (Phase 1)

Phase 1 runs on a **local mock adapter**. All data comes from TypeScript fixtures. The auth flow is mocked. There is no HTTP connection to a real backend.

The architecture is built with an **adapter seam** so Phase 2 can wire a real backend without touching any view or route file.

---

## Fixture Modes (Demo vs Real Client)

Two fixture modes are available, controlled by the `VITE_FIXTURE` env var via `src/features/audit/fixture.active.ts`.

| Mode | Command | Data |
|------|---------|------|
| `demo` (default) | `PORT=5199 npm run dev:demo` | 3-year history · Tourvest · R670K cumulative |
| `clean` | `PORT=5199 npm run dev:client` | First-time client · no history · upload intake |

**Demo mode** (`VITE_FIXTURE=demo` or unset): loads `reports.fixture.ts`. Three audit cycles, full YoY comparison, R670K cumulative. Use for sales demos.

**Client mode** (`VITE_FIXTURE=clean`): loads `reports.fixture.clean.ts`. One report, `uploads: []`, `SEED_ENGAGEMENTS = {}`. The upload screen automatically shows intake mode (ScriptDownloadCard → ZipDropZone). No YoY card. Cumulative shows zeros. Use when setting up the portal for a real client's first audit.

**Before running in client mode**, update `src/features/audit/reports.fixture.clean.ts`:
1. `CLIENT_INFO.name` → real client name
2. Report `healthScore`, `leakageEstimate`, `leakageRecoverable`, `risks` → real audit output
3. `FINDINGS_CURRENT` array → actual findings from the audit

**Rule:** `ReportContext.tsx` imports from `fixture.active` — never import directly from `reports.fixture` or `reports.fixture.clean` in any route or component.

---

## Auth Integration (Mocked)

**Auth exists in Phase 1.** The login screen, auth state, and adapter seam are all built and working.

### Current implementation

```
/login route → LoginCard → authAdapter.login()
                                ↓
                   src/adapters/index.ts       (public surface)
                                ↓
                   src/adapters/mock/auth.mock.ts  (Phase 1 mock)
                                ↓
                   src/state/authStore.ts       (Zustand — holds session)
```

### AuthPort interface (`src/ports/auth.port.ts`)

```typescript
interface AuthPort {
  login(credentials: { email: string; password: string }): Promise<AuthResult>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
}
```

### Switching to a real backend (Phase 2)

1. Create `src/adapters/bff/auth.bff.ts` implementing `AuthPort`
2. Set `CURRENT_ADAPTER = authBff` in `src/adapters/index.ts` (or use `VITE_ADAPTER=bff` env var)
3. Uncomment the proxy entry in `vite.config.ts`

No view file, route file, or hook needs to change. The adapter seam is the only boundary.

---

## Data Entry Points

### 1. Report Selection

**How it works today:** user clicks a report in the TopBar dropdown → `selectReport(id)` → `setSearchParams({ report: id })` → `ReportContext` reads the URL → all screens rehydrate from `REPORTS` fixture.

**Phase 2 path:** `GET /api/reports` returns `AuditReport[]`. Replace `REPORTS` constant with an API call. `ReportContext` already has the right shape — just swap the data source.

```typescript
// Phase 2 contract
GET /api/reports
→ AuditReport[]     // same shape as the fixture type
```

### 2. Engagement Submit

**How it works today:** `submitEngagement(input)` in `ReportContext` writes to React state. All screens update immediately via context re-render.

**Phase 2 path:** call `POST /api/engagements` before (or after) updating local state. Use optimistic UI — update state immediately, roll back on error.

```typescript
// Phase 2 contract
POST /api/engagements
body: {
  reportId: string;
  improvementHoursPerMonth: number;
  supportHoursPerMonth: number;
  months: number;
  estimatedSavings: number;
  findings: EngagementFinding[];
}
→ { id: string; status: "submitted"; submittedAt: string }
```

### 3. Save Draft

Same as submit, but `status: "draft"` in the response.

```typescript
POST /api/engagements/draft
// same body as submit
→ { id: string; status: "draft" }
```

### 4. File Upload (Upload Centre)

**How it works today:** `ZipDropZone` accepts a `.zip` file, runs a staggered mock extraction animation (hardcoded `setTimeout` sequence), and shows `ExtractionTile` components appearing progressively. "Submit for audit" appears when all 5 mock tiles pass. No actual file is sent anywhere.

**Phase 2 path:**

```typescript
POST /api/uploads?reportId=2027
Content-Type: multipart/form-data
body: FormData with zip file
→ {
    status: "processing" | "complete" | "failed";
    files: { fileType: string; rows: number; state: "passed" | "failed" }[];
  }
```

Poll or use Server-Sent Events to update extraction tile states as each file is validated server-side.

---

## Data Exit Points

### 1. Engagement Written

When `submitEngagement()` is called in Phase 2, it writes to the backend and the local `engagementsById` state is updated from the response.

### 2. Telemetry Events (Future)

Not implemented. When added, events should be fired from ReportContext mutations (submit, draft save, report switch) — not from individual screen components.

---

## Error Handling Contract

All Phase 2 API calls must:
- Return a typed error response `{ error: string; code: string }` for non-2xx
- Fall back to fixture data if the API is unreachable (keep `SEED_ENGAGEMENTS` as the fixture fallback)
- Show a toast notification on failure (use `sonner` — already in the dependency tree)
- Never crash the view layer — use loading states and error states from `src/ui/ErrorState.tsx`

---

## Backwards Compatibility Pattern

When wiring Phase 2 APIs, maintain fixture fallback:

```typescript
async function fetchReports(): Promise<AuditReport[]> {
  try {
    const res = await fetch("/api/reports");
    if (!res.ok) throw new Error("API unavailable");
    return res.json();
  } catch {
    console.warn("API unavailable — using fixture data");
    return REPORTS;  // fallback to fixture
  }
}
```

This ensures the app remains fully functional in demo/offline mode.

---

## Phase 2 Migration Checklist

When connecting a real backend, complete these in order:

- [ ] Add `src/adapters/bff/auth.bff.ts` (implements `AuthPort`)
- [ ] Switch adapter in `src/adapters/index.ts`
- [ ] Uncomment proxy in `vite.config.ts`
- [ ] Wire `GET /api/reports` into `ReportContext` (replace `REPORTS` constant)
- [ ] Wire `POST /api/engagements` into `submitEngagement()` (optimistic + rollback)
- [ ] Wire `POST /api/engagements/draft` into `saveDraft()`
- [ ] Wire `POST /api/uploads` into `ZipDropZone` (replace mock animation)
- [ ] Add polling or SSE for extraction tile state updates
- [ ] Test: report switch still rehydrates all screens
- [ ] Test: submit still locks engagement everywhere simultaneously
- [ ] Test: fixture fallback still works when API is offline
- [ ] Test: auth flow works end-to-end
