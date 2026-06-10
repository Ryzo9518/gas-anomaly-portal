# Spec: Reconcile the Staff Client List (switcher ↔ admin-created clients)

**Date:** 2026-06-09
**Status:** Implemented (PR #16, 2026-06-09) — Option A shipped; acceptance criteria (§4) met. The §5 security items remain open for JP.
**For:** JP (implementation)
**Origin:** Multi-agent doc review of `docs/plans/2026-06-08-client-invite-access.md` (2026-06-09), triggered by an Ops-Director report that staff cannot differentiate or select clients in the portal.
**Applies to:** GAS Anomaly Portal (`anomaly.gasecosys.co.za`), staff build.

---

## 1. The symptom (what the user sees)

On the live **staff** portal, an admin:

- sees a **sidebar client switcher** listing `Tourvest Travel Group` and `New Client`;
- sees a separate **"Clients" admin screen** listing the clients they created (`Demo Co (Jera test)`, `Test`);
- **cannot tell the clients apart** in the admin list (name-only items, identical styling to the switcher);
- **cannot meaningfully "select" a created client** — selecting it only shows the invite/contacts panel; there is no audit workspace to switch into, and the created client never appears in the sidebar switcher.

The **client-facing portal works** (a logged-in client sees their own data) because that path fetches from the backend. The defect is **staff-side only**.

## 2. Root cause

### 2.1 Two disconnected client stores on the staff side

The staff build runs **two unrelated sources of truth for "client"**, and nothing joins them:

| | Sidebar switcher (audit view) | "Clients" admin screen (access mgmt) |
|---|---|---|
| Data path | `ClientContext` → `clients` port → `clientsMock` → `CLIENT_SUMMARIES` | `AdminClients` → `adminApi` → `GET /api/admin/clients` |
| Backing store | **Build-time registry** (`src/features/clients/clients.data.ts`) | **Postgres** (`clients` table) |
| Contents | Hardcoded `tourvest`, `newclient` | Whatever staff create with the `+` button |
| ID form | text slug (`"tourvest"`) | UUID |
| Has audit data? | yes (bundled fixtures) | no (data only loaded via the Unit 11 path) |

The staff build is `DATA_ADAPTER=mock` (see `src/adapters/index.ts`), so the switcher **always** reads the registry, never the database. Unit 6 of the implementation plan routed only the **client-portal** build (`VITE_DATA_ADAPTER=bff`) through the backend; the **staff** build was left on the registry. Result: a client created in the admin UI is structurally invisible to the switcher, and a registry client has no database row. **They can never show the same set.**

Evidence:
- `src/adapters/mock/clients.mock.ts` → `import { CLIENT_SUMMARIES } from "@/features/clients/clients.data"`
- `src/features/clients/clients.data.ts` → `export const DEFAULT_CLIENT_ID = "tourvest"` (hardcoded slugs)
- `src/adapters/bff/admin.bff.ts` → `listClients: () => call<AdminClient[]>("/api/admin/clients")` (separate call, separate state)
- `src/shell/ClientSwitcher.tsx` reads `useClient()` (registry); `src/features/admin/AdminClients.tsx` reads `adminApi` (DB). No shared state.

### 2.2 `client_id` exists in three incompatible forms

The plan flagged a *two-way* slug-vs-number mismatch to "resolve during implementation." The shipped code actually has **three** representations, with no lossless mapping:

| Layer | Type | Source |
|---|---|---|
| Build-time registry / switcher / `?client=` URL param | `string` slug (`"tourvest"`) | `clients.data.ts` |
| Frontend auth store | `number \| null` | `src/state/authStore.ts` (`client_id`) |
| Backend (rows, sessions, admin API) | `uuid.UUID` | `backend/app/models.py` |

Selecting a client by a stable key can't work coherently while the switcher keys on slugs, the auth store can only hold a number, and every backend identity is a UUID. **This is the load-bearing reason the two lists can't be joined** — it is not a minor cleanup.

## 3. Proposed fix

### Option A — make the staff switcher read the backend (recommended)

The admin list endpoint **already exists** (`GET /api/admin/clients`), so most of the backend work is done.

1. **Canonical ID = UUID string, end to end.** Change `authStore.client_id` to `string`. Treat the two demo registry clients as a separate `demo` namespace (or seed them as real DB rows with fixed UUIDs via the Unit 11 loader) so there is one ID space for real clients.
2. **Staff clients adapter.** Add a staff-scoped clients source so `ClientContext` (the switcher) lists the **admin-created** clients from the backend, not the registry. Reuse `GET /api/admin/clients` (admin-scoped) or add a thin `GET /api/clients` for staff. Keep `clientsMock`/registry only for the offline demo build.
3. **Single roster.** After this, the sidebar switcher and the "Clients" admin screen show the **same** set of clients. Creating a client adds it to both.
4. **Empty / no-data state.** Define what the dashboard/report/findings screens show when a selected client has **no audit data yet** (a created client before Unit 11 load): a clear "No audit loaded for this client yet" placeholder, not a crash, blank, or another client's data. `ClientContext`/`ReportContext` currently assume ≥1 report exists.

### Option B — keep registry for demo, separate the two concepts in the UI (smaller, interim)

If the backend change is deferred, at minimum stop the confusion:
- On the "Clients" admin screen, **hide or visually demote** the sidebar audit switcher (it answers a different question).
- Label the two controls explicitly ("Viewing audit for…" vs "Managing access for…").
- Mark registry clients as **"Demo"** and admin-created clients as **"Live (no audit data yet)"** so staff never expect a created client to appear in the demo switcher.

This does **not** fix the disconnect — it just makes it legible. Option A is the real fix.

## 4. Acceptance criteria (Option A)

- [x] A client created in the "Clients" admin screen appears in the sidebar switcher.
- [x] Selecting that client in either control selects the same client (one roster, one ID).
- [x] Selecting a created-but-no-data client shows a clear empty state, not an error or another client's data.
- [x] `client_id` is a single type (UUID string) across `authStore`, the clients port, the `?client=` URL param, and the backend.
- [x] The offline demo build still works without a backend (registry behind an explicit demo flag).
- [x] Client-portal isolation is unaffected (no regression to the Unit 6/12 isolation guarantee).

## 5. Out of scope here (tracked separately)

These came out of the same review and are **not** part of this reconciliation, but are recorded so they aren't lost:

**Design polish (staff "Clients" screen)** — DONE in PR #16 (resolved the `// FLAGGED for a visual pass ... AI-slop note`):
- [x] Re-themed dark→light to match the app shell (was dark-on-light).
- [x] Stronger selected-state; per-client status dot + summary ("1 active, 1 pending" / "No contacts yet"), not name-only.
- [x] Reject duplicate client names on create.
- [x] Single-contact revoke now shows an inline confirm before revoking.

**Security (for JP)** — genuine plan-level gaps from the review:
- Staff-admin JWT is not revocable: removal from `admin_emails` still grants admin for up to `session_ttl_hours` (10h). No server-side staff-session revocation.
- IP rate-limit is ineffective behind Caddy: `request.client.host` is `127.0.0.1`; use `--proxy-headers` / `X-Forwarded-For`.
- `session_secret` is reused as both the JWT signing key and the magic-link HMAC key — rotation entangles both. The auth spec names `JWT_SIGNING_KEY` separately; `config.py` collapsed them.
- `POST /api/auth/client/verify` (magic-link redemption) has no rate limit.
- Interim passcode static sites still hold real financial data with no time-bound retirement during the build window.

## 6. Note on the plan document

`docs/plans/2026-06-08-client-invite-access.md` is **stale**: it describes the work as not-yet-built ("No DB layer, no email code, no tests exist yet"), but all 12 units have shipped (commits `4d87b35` → `5209f75`). It has been re-statused alongside this spec. Critically, the plan stood up elaborate auth/isolation machinery but **never specified how the staff switcher and the admin-created client list converge** — which is why this defect exists. Section 2 above is the gap the plan left open.
