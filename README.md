# GAS Anomaly Portal

Client-facing portal for the GAS Anomaly AI audit — a 5-day, AI-driven
Sage X3 audit that turns raw ERP exports into a health-scored,
risk-ranked, leakage-quantified report and a remediation roadmap.

The FastAPI backend now exists (`backend/`) — staff Microsoft SSO, admin
client/invite management, passwordless client magic-link login, and
per-client data isolation. It slots in behind the adapter seam, so the
SPA can still run **offline on mock data** for a quick demo, but the
**staff admin features and the client portal require the backend running**
(see "Run locally" below). The original Phase-1 "mock only, no backend"
framing is historical — that work shipped.

## Stack

- React 18 + Vite 5 + TypeScript 5 + Tailwind 3
- React Router 6, TanStack Query 5, Zustand
- Radix UI primitives + lucide-react icons + sonner toasts

## Run locally

### Frontend only — offline demo (no backend)

```bash
npm install
npm run dev      # opens at http://localhost:5174
npm run build    # production bundle → dist/
npm run preview  # preview the prod build
```

The default port is 5174 (set in `vite.config.ts`). This project uses
`PORT=5199 npm run dev` as the dev convention for the preview server.

This runs the **mock** adapter: the dashboard/report/findings/engagement
screens work on bundled demo data. The **"Clients" admin screen and the
client portal do NOT work in this mode** — they call the backend
(`/api/...`), so without it the admin screen shows *"Couldn't load
clients."* For those, run the backend too (below).

### Build modes (chosen at build time via env)

The same source produces three builds — auth and client-data adapters are
independent, selected by env literals in `src/adapters/index.ts`:

| Build | Env | What it is |
|-------|-----|------------|
| Offline demo | _(none)_ | mock auth + build-time client registry (the sidebar switcher). No backend. |
| Staff site (live) | `VITE_ADAPTER=bff` | Microsoft SSO + admin client/invite screen. Needs the backend. |
| Client portal | `VITE_AUTH=client VITE_DATA_ADAPTER=bff` | passwordless magic-link login; per-client data from the backend. Served at `/portal`. |

> **Known limitation:** in the live staff build the sidebar switcher still
> reads the build-time registry, NOT the admin-created (backend) clients —
> so clients you create in the admin screen do not appear in the switcher.
> See [`docs/specs/2026-06-09-staff-client-list-reconciliation.md`](docs/specs/2026-06-09-staff-client-list-reconciliation.md).

### Backend (FastAPI) — required for staff admin + client portal

The API lives in `backend/` and listens on **:8001** (Vite proxies
`/api/*` → `127.0.0.1:8001`; see `vite.config.ts`). It needs **Postgres**
and Entra/Graph credentials.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # + requirements-dev.txt for tests
alembic upgrade head                      # apply DB migrations
uvicorn app.main:app --port 8001 --reload --proxy-headers
```

Required env (config.py raises at startup if any is missing): `database_url`,
`session_secret`, `allowed_staff_emails`, `entra_tenant_id`,
`entra_client_id`, `entra_client_secret`. Optional: `admin_emails` (who may
invite/revoke — default-deny if empty), `isolation_verified` (off by
default; gates real client data). On the Hetzner box these live in
`/etc/gas-portal/api.env` and the service is `deploy/gas-portal-api.service`.

Then run the frontend with `VITE_ADAPTER=bff npm run dev` to hit the local
backend. Backend tests: `cd backend && pytest`.

## Routes

| URL                | Screen              | Backing |
|--------------------|---------------------|---------|
| `/login`           | Sign in (staff SSO / client magic-link) | mock or backend |
| `/auth/callback`   | OIDC / magic-link return | backend |
| `/auth/verify`     | Client magic-link verify interstitial | backend |
| `/dashboard`       | Audit Dashboard     | mock or backend |
| `/upload`          | Upload Centre       | mock |
| `/report`          | HTML Report Viewer  | mock or backend |
| `/findings`        | Findings & Roadmap  | mock or backend |
| `/findings/:rank`  | Finding Detail      | mock or backend |
| `/engagement`      | Engagement Plan     | mock or backend |
| `/admin/clients`   | Invite & manage clients (admin-only) | **backend required** |

"mock or backend" depends on the build mode (see "Build modes" above).
Anything outside this list redirects to `/dashboard`.

## Where the mock data lives

```
src/features/audit/reports.fixture.ts  single source of truth — all
                                        TypeScript types, three audit
                                        reports (2024/2025/2026), seed
                                        engagements, and derivation
                                        helpers (computeCumulative etc).

src/features/audit/audit.fixture.ts    compat shim only — re-exports
                                        from reports.fixture.ts. Do not
                                        add new logic here.

public/mock-report/clientA_audit_2026Q1.html
                                        standalone styled HTML report
                                        iframed by /report.
```

The offline demo build runs on this fixture data with mocked auth. The
live staff and client-portal builds fetch from the FastAPI backend
(`backend/`) through the same adapter seam — no view-layer rework.

## Project layout

```
src/
├── main.tsx                  app entry
├── App.tsx                   ErrorBoundary + Providers + Router
├── index.css                 Tailwind layer + GAS theme tokens
├── app/                      Providers + Router
├── routes/                   one file per top-level URL
├── shell/                    AppLayout, Sidebar, TopBar, MobileNav, ...
├── features/
│   ├── audit/                fixture + helpers
│   ├── clients/              ClientContext + build-time client registry
│   ├── admin/                admin "Invite & manage clients" UI
│   └── login/                Hero + LoginCard + ClientLogin + MobileHero
├── adapters/
│   ├── index.ts              the only public adapter surface
│   ├── mock/                 mock implementations (auth, clients)
│   └── bff/                  backend implementations (auth, client auth, admin, clients)
├── ports/                    AuthPort + ClientsPort
├── state/                    authStore, uiStore, query
├── ui/                       primitives (Button, Card, StatTile, ...)
├── components/               GasOrbHalo, GasLoginBackground
├── flags/                    feature flags (active / stub / locked)
├── lib/                      utils + scroll hook
└── assets/                   brand + sidebar background
```

## Adapter seam (mock ↔ bff)

Every view imports from `@/adapters`, never from `@/adapters/mock` or
`@/adapters/bff`. Both implementations now exist; the active one is chosen
at build time (`src/adapters/index.ts`):

```
View  →  @/adapters  →  authMock        (offline demo, default)
                     →  authBff         (VITE_ADAPTER=bff — staff Microsoft SSO)
                     →  authClientBff    (VITE_AUTH=client — client magic-link)

                     →  clientsMock      (build-time registry — the demo switcher)
                     →  clientsBff        (VITE_DATA_ADAPTER=bff — per-client backend data)
```

Auth and client-data adapters are selected independently. No view-layer
rework or router changes when switching modes.

> Note: the `bff` clients adapter currently serves the **client portal**.
> The **staff** switcher still uses `clientsMock` (the registry), which is
> why admin-created clients don't appear in it — tracked in
> [`docs/specs/2026-06-09-staff-client-list-reconciliation.md`](docs/specs/2026-06-09-staff-client-list-reconciliation.md).

## License

Proprietary. Internal to GAS Anomaly.
