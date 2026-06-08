# Design Spec: Multi-Client Portal — Internal Switcher + Scoped Per-Client Logins

**Date:** 2026-06-08
**Status:** Approved (design, rev 2) — pending implementation plan
**Applies to:** GAS Anomaly Portal (`anomaly.gasecosys.co.za`)
**Governs / governed by:** `AGENTS.md` (the law). Upholds all existing
invariants in `docs/claude-handoff/`.

---

## 1. Goal

Two outcomes from one codebase:

1. **Internal multi-client switcher** — you/Jera see all clients and switch
   between them in-browser during a demo (`?client=tourvest&report=2026`).
2. **Scoped per-client logins you can send out this week** — each external
   client gets a **private link + passcode** to a build that contains **only
   their own data**, so one client can never see another's audit information.

This week: **Tourvest** + one **New Client** (the `reports.fixture.clean.ts`
scaffold, populated by ops). Adding more clients = adding one data entry.
Designed so a real backend with proper accounts replaces the passcode gate later
behind a single seam, with no view-layer rework.

## 2. Scope

**In scope this week**
- Client registry + `ClientContext` (client layer above reports).
- Internal all-clients build with a sidebar **client switcher**.
- **Build-time client scoping** so a per-client build bundles only that client's
  data (other clients' data is eliminated from the bundle, not merely hidden).
- A **passcode gate** on per-client (and internal) builds, via the existing
  mocked-auth seam and the existing `/login` screen.
- Multiple deployment artifacts (one internal + one per external client).

**Phase 2 (seam designed, NOT built this week)**
- Real backend (FastAPI) and real accounts / magic-link / password auth.
- Server-side per-client data scoping (replaces build-time scoping).
- Self-serve client/audit creation (admin UI).

**Explicit non-goals**
- No change to the audit/report/finding/engagement data shapes or the 10
  report-scoped invariants.
- The passcode is a **gate, not a vault** (see §6). It is not bank-grade and is
  not represented as such.

## 3. Current state (today)

- One client is chosen at **build time** via `VITE_FIXTURE` in
  `src/features/audit/fixture.active.ts`, which re-exports `CLIENT_INFO`,
  `REPORTS`, `REPORTS_DESC`, `LATEST_REPORT_ID`, `SEED_ENGAGEMENTS`, helpers from
  `reports.fixture.ts` (demo/Tourvest) or `reports.fixture.clean.ts` (new client).
  **It already relies on Vite build-time dead-code elimination** to drop the
  unused fixture — this is the exact mechanism we extend for per-client scoping.
- `ReportContext` is the single source of truth for the selected report, driven
  by `?report=`. Routing is **HashRouter** (`src/app/Providers.tsx`); URLs are
  hash-based (`index.html#/dashboard?report=2026`).
- Auth uses a clean seam: `AuthPort` → `adapters/index.ts` (`export const auth`)
  → `adapters/mock/auth.mock.ts` (open session today). The `/login` screen,
  `authStore`, and adapter seam all exist. **We extend the mock to check a
  passcode; we reuse the existing login UI.**

## 4. Architecture

### 4.1 Hierarchy and URL scheme

```
Client  ──>  Report  ──>  Engagement
(new)        (exists)     (exists)
```

URL (within the hash): `index.html#/dashboard?client=tourvest&report=2026`.
`client` selects the dataset; `report` selects within it. Both shareable;
missing params self-heal (4.4). In a per-client build there is exactly one
client, so `?client=` is fixed to it.

### 4.2 Client registry + build-time scoping

New module `src/features/clients/clients.data.ts`:

```typescript
export interface ClientInfo { name: string; healthTarget: number; }

export interface ClientEntry {
  id: string;                               // URL slug, e.g. "tourvest"
  info: ClientInfo;
  reports: AuditReport[];                   // same shape as today, newest-first
  seedEngagements: Record<string, Engagement>;
}

export interface ClientSummary { id: string; name: string; }  // for the switcher
```

- Each client's data lives in its own `reports.fixture.<client>.ts` (Tourvest =
  today's `reports.fixture.ts`; New Client = `reports.fixture.clean.ts`).
- The registry assembles `CLIENTS` based on a build-time env var
  **`VITE_CLIENT`**, written so unselected clients are **tree-shaken out** of a
  per-client production build (same technique `fixture.active.ts` documents
  today):
  - `VITE_CLIENT` unset / `all` → internal build: `CLIENTS = [tourvest, newClient, …]`, switcher shown.
  - `VITE_CLIENT=<id>` → scoped build: `CLIENTS = [<that client only>]`, switcher hidden, other clients' data absent from the bundle.
- **Isolation is verified, not assumed** (see §7): the per-client `dist` bundle
  is grepped for other clients' identifying strings and must contain none.

### 4.3 ClientsPort (the Phase-2 seam)

New `src/ports/clients.port.ts`, mirroring `AuthPort`:

```typescript
export interface ClientsPort {
  listClients(): Promise<ClientSummary[]>;
  getClient(id: string): Promise<ClientEntry | null>;
}
```

- Phase 1 mock `src/adapters/mock/clients.mock.ts` reads the registry.
- Wired via `src/adapters/index.ts` as `export const clients: ClientsPort`.
- Phase 2: `bff/clients.bff.ts` calls `GET /api/clients` / `GET /api/clients/:id`
  scoped to the authenticated identity (admin → all; client → one). Swapping the
  adapter replaces build-time scoping with server-side scoping — no view changes.

### 4.4 ClientContext

New `src/features/clients/ClientContext.tsx`, modeled on `ReportContext`:

```typescript
interface ClientContextValue {
  clients: ClientSummary[];
  selectedClient: ClientEntry;
  selectedClientId: string;
  selectClient: (id: string) => void;     // updates ?client= and repoints ?report=
  reports: AuditReport[];                  // for ReportContext to consume
  seedEngagements: Record<string, Engagement>;
  clientInfo: ClientInfo;
}
```

- Reads `?client=`; if absent/unknown, rewrites to the only (scoped build) or
  default (internal build) client with `replace: true` — same self-heal as
  `ReportContext`.
- `selectClient(id)` sets `?client=` and repoints `?report=` to that client's
  latest report (no stale report id across clients).

### 4.5 ReportContext change (minimal)

- Read `REPORTS` / `SEED_ENGAGEMENTS` / `CLIENT_INFO` from `useClient()` instead
  of `fixture.active`. Nothing else changes; every report-scoped invariant holds,
  now scoped within the selected client.
- `linkWithReport(path)` becomes client-aware (preserves `?client=`).

### 4.6 Provider order

`HashRouter → ClientProvider → ReportProvider → children` (both providers need
URL access; client resolves before report).

### 4.7 Client switcher UI (internal only)

- New control at the **top of the sidebar** (`src/shell/Sidebar.tsx`), visually
  distinct from the violet report pill (upholds LESSON-1).
- Rendered only when `clients.length > 1` (i.e. the internal build). In a scoped
  per-client build it renders the client name as a static label, never a switcher.

### 4.8 Passcode gate (the existing login screen becomes the real gate)

The current `/login` screen (email + password fields, `LoginCard.tsx`) is
**kept and reused** — it is not replaced or bypassed. Today its mock `signIn`
ignores input and opens a session; we make it actually enforce a passcode.

- **Client-facing scoped build:** the client's email is **pre-filled and locked**
  on the login screen (per-build via **`VITE_CLIENT_EMAIL`**, or derived from the
  client entry); the client types only the **passcode** (sent with their private
  link). `auth.mock.ts` `signIn` validates the password field against
  **`VITE_CLIENT_PASSCODE`**; wrong passcode → no session, no data shown. The
  screen looks unchanged; only the email is pre-populated.
- **Internal all-clients build:** also gated (an internal passcode via the same
  mechanism), since it holds every client's data — never openly reachable. Email
  may be a known internal address; open-session is used only for local dev.
- On success `authStore` holds the session and the app renders. A small route
  guard sends unauthenticated users to `/login`. The infra (`/login`,
  `LoginCard`, `authStore`, `AuthPort`) already exists; we add the guard, the
  passcode check, and the per-build email pre-fill.
- Phase 2 swaps `auth.mock` for the real `AuthPort` backend adapter (email +
  password / magic-link) with no screen or seam changes — the same login UI then
  authenticates real accounts.

### 4.9 Retiring VITE_FIXTURE

- `fixture.active.ts` is replaced by the registry. `VITE_FIXTURE` and the
  `dev:demo` / `dev:client` scripts are superseded by `VITE_CLIENT`
  (+ `DEFAULT_CLIENT_ID` for the internal build). `.env.demo` / `.env.client`
  are removed or repurposed in the plan.

## 5. Delivery surfaces & deployment

From one codebase we publish multiple artifacts (each a separate `npm run build`
with different env), all served from the Jera Hetzner box per the runbook:

| Surface | Build env | Contains | Access |
|---------|-----------|----------|--------|
| Internal (all clients) | `VITE_CLIENT=all` + internal passcode | every client + switcher | private path/URL, internal passcode |
| Per external client | `VITE_CLIENT=<id>` + that client's passcode | only that client | private link + that client's passcode |

**Recommended topology (this week):** path-based under the one domain with a
single TLS cert (simplest): e.g. each scoped build served from its own directory
mapped to an unguessable path, the unguessable path being part of the "private
link". Subdomains (`<client>.anomaly.gasecosys.co.za`, wildcard cert) are an
option if cleaner URLs are wanted later. `base: "./"` (relative assets) + the
SPA fallback make path-hosting work without per-build config. Exact paths/slugs
are fixed in the deploy step once the Hetzner box + DNS are confirmed.

Each artifact still passes all three gates before publish; each deploy records
its commit SHA, `VITE_CLIENT`, and target path in the deploy log.

## 6. Security posture (honest)

- **The real guarantee is data isolation by build:** a client's bundle does not
  contain any other client's data, so cross-client exposure is structurally
  impossible — verified by the bundle grep in §7.
- **The passcode is a gate, not a vault:** it lives in the front-end bundle, so a
  determined party with the link could extract it. It stops casual/accidental
  access to *that client's own* data and is appropriate for a pilot. Real
  authentication arrives with the Phase 2 backend behind the same `AuthPort` /
  `ClientsPort` seam. This limitation is stated to the user, not hidden.
- Use distinct passcodes per client; treat private links as sensitive; serve only
  over HTTPS.

## 7. Testing & quality gates

All three standing gates pass (`typecheck`, `build`, manual at `:5199`), plus:

- [ ] **Isolation (critical):** build `VITE_CLIENT=newclient`, then grep the
      `dist/` bundle for Tourvest identifiers (name, distinctive figures) — must
      return **nothing**. Repeat per client.
- [ ] Internal build (`VITE_CLIENT=all`): switcher shows; switching client
      rehydrates every screen; figures never bleed between clients.
- [ ] Scoped build: no switcher (static client label); `?client=` fixed; the
      passcode gate blocks entry until the correct passcode is given.
- [ ] Deep link `#/dashboard?client=<id>&report=<id>` loads the right client.
- [ ] Within each client: historical freeze + amber banner + cumulative-never-
      freezes still hold.
- [ ] Wrong/empty passcode does not reveal any client data.

## 8. Open items (outside the code build)

- **Hetzner box + DNS:** confirm the existing Jera Hetzner box is the target and
  the `anomaly.gasecosys.co.za` A-record points to it (runbook CONFIRM markers).
- **Per-client passcodes + private link slugs:** set per client at deploy time.
- **New Client real data:** ops populates `reports.fixture.clean.ts` (the
  `newClient` entry) with real name, scores, leakage figures, and findings before
  that client's link is sent.

## 9. File summary

**New**
- `src/features/clients/clients.data.ts` — registry, `ClientEntry`/`ClientSummary`, `VITE_CLIENT` scoping
- `src/features/clients/ClientContext.tsx` — provider + `useClient()`
- `src/ports/clients.port.ts` — `ClientsPort`
- `src/adapters/mock/clients.mock.ts` — registry-backed mock
- `src/shell/ClientSwitcher.tsx` — sidebar switcher (internal builds only)
- route guard (small) enforcing the passcode gate before app routes

**Modified**
- `src/features/audit/ReportContext.tsx` — consume `useClient()` not `fixture.active`
- `src/app/Providers.tsx` — add `ClientProvider` inside `HashRouter`
- `src/adapters/index.ts` — add `export const clients`
- `src/adapters/mock/auth.mock.ts` — passcode check via `VITE_CLIENT_PASSCODE`
- `src/features/login/LoginCard.tsx` — pre-fill + lock email via `VITE_CLIENT_EMAIL`
- `src/shell/Sidebar.tsx` — mount `ClientSwitcher`
- `src/features/audit/reports.fixture.clean.ts` — becomes the `newClient` source

**Removed / superseded**
- `src/features/audit/fixture.active.ts` — replaced by the registry
- `.env.demo`, `.env.client`, `dev:demo`/`dev:client` — per 4.9
