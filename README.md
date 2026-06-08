# GAS Anomaly Portal

Client-facing portal for the GAS Anomaly AI audit — a 5-day, AI-driven
Sage X3 audit that turns raw ERP exports into a health-scored,
risk-ranked, leakage-quantified report and a remediation roadmap.

Phase 1 prototype: front-end runs entirely on a local mock adapter so
the flow can be demoed without a backend. The FastAPI backend lands in
Phase 1 proper and slots in behind the existing adapter seam — no
view-layer rework.

## Stack

- React 18 + Vite 5 + TypeScript 5 + Tailwind 3
- React Router 6, TanStack Query 5, Zustand
- Radix UI primitives + lucide-react icons + sonner toasts

## Run locally

```bash
npm install
npm run dev      # opens at http://localhost:5174
npm run build    # production bundle → dist/
npm run preview  # preview the prod build
```

The default port is 5174 (set in `vite.config.ts`). This project uses
`PORT=5199 npm run dev` as the dev convention for the preview server.

## Routes (V1 prototype)

| URL                | Screen              | Status |
|--------------------|---------------------|--------|
| `/login`           | Sign in             | mock   |
| `/dashboard`       | Audit Dashboard     | mock   |
| `/upload`          | Upload Centre       | mock   |
| `/report`          | HTML Report Viewer  | mock   |
| `/findings`        | Findings & Roadmap  | mock   |
| `/findings/:rank`  | Finding Detail      | mock   |
| `/engagement`      | Engagement Plan     | mock   |

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

Phase 1 runs on fixture data with mocked auth. The FastAPI backend and
real auth land in Phase 2, slotting in behind the adapter seam with no
view-layer rework.

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
│   └── login/                Hero + LoginCard + MobileHero
├── adapters/
│   ├── index.ts              the only public adapter surface
│   └── mock/                 mock implementations (auth)
├── ports/                    AuthPort (the only port today)
├── state/                    authStore, uiStore, query
├── ui/                       primitives (Button, Card, StatTile, ...)
├── components/               GasOrbHalo, GasLoginBackground
├── flags/                    feature flags (active / stub / locked)
├── lib/                      utils + scroll hook
└── assets/                   brand + sidebar background
```

## Adapter seam (mock → bff)

Every view imports from `@/adapters`, never from `@/adapters/mock`.

```
View  →  @/adapters  →  authMock      (Phase 1, default)
                     →  authBff       (Phase 2, when VITE_ADAPTER=bff)
```

When the FastAPI backend lands:
1. Add `src/adapters/bff/auth.bff.ts` implementing `AuthPort`
2. Switch `CURRENT_ADAPTER` in `src/adapters/index.ts`
3. Uncomment the proxy entry in `vite.config.ts`

No view-layer rework, no router changes.

## License

Proprietary. Internal to GAS Anomaly.
