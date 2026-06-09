# File Structure and Naming Conventions

## Directory Layout

```
src/
├── main.tsx                        App entry point
├── App.tsx                         ErrorBoundary + Providers + Router (root of src)
├── index.css                       Tailwind layers + GAS design tokens
│
├── app/                            App-level wiring
│   ├── Providers.tsx               ReportProvider + QueryClientProvider + AuthProvider
│   └── Router.tsx                  Route definitions
│
├── routes/                         One file per URL. All import useReport().
│   ├── login.route.tsx             /login — staff auth flow
│   ├── authCallback.route.tsx      /auth/callback — OAuth redirect handler (restores session from cookie)
│   ├── clientVerify.route.tsx      /auth/verify — client magic-link redemption
│   ├── dashboard.route.tsx         /dashboard — KPI cards + YoY card
│   ├── findings.route.tsx          /findings — findings table + Plan column
│   ├── engagement.route.tsx        /engagement — builder or locked view
│   ├── findingDetail.route.tsx     /findings/:rank — individual finding drill-down
│   ├── upload.route.tsx            /upload — archive view or new-cycle intake
│   ├── report.route.tsx            /report — embedded static report viewer
│   └── admin.clients.route.tsx     /admin/clients — Jera admin client management (admin-only)
│
├── shell/                          App chrome — visible on every screen
│   ├── AppLayout.tsx               Sidebar + TopBar + main content wrapper
│   ├── TopBar.tsx                  Report selector + historical banner + search + bell
│   ├── Sidebar.tsx                 Nav links + logo + client info
│   ├── PageStickyHeader.tsx        Per-route sticky subheader (h1 + contextual actions)
│   ├── MobileNav.tsx               Mobile drawer navigation
│   ├── CommandBar.tsx              Search/command palette (Cmd+K)
│   ├── ErrorBoundary.tsx           React error boundary wrapper
│   ├── SplashScreen.tsx            Initial loading screen
│   ├── RouteProgressBar.tsx        Top-of-page progress bar during navigation
│   ├── PageTransition.tsx          Fade/slide animation on route changes
│   └── SidebarBg.tsx               Sidebar background decoration
│
├── features/                       Domain data and logic
│   ├── audit/
│   │   ├── reports.fixture.ts      THE data file — all types + seed data + derivations
│   │   ├── ReportContext.tsx       Global report state — useReport() hook exported here
│   │   └── audit.fixture.ts        Compat shim — re-exports from reports.fixture.ts only
│   └── login/
│       ├── Hero.tsx                Desktop login hero illustration
│       ├── LoginCard.tsx           Login form card
│       └── MobileHero.tsx          Mobile login hero
│
├── adapters/                       Backend integration seam
│   ├── index.ts                    ONLY public surface — views import from here
│   └── mock/
│       └── auth.mock.ts            Phase 1 mock auth implementation (AuthPort)
│
├── ports/
│   └── auth.port.ts                AuthPort interface definition
│
├── state/
│   ├── authStore.ts                Zustand auth state (login/logout/session)
│   ├── uiStore.ts                  Zustand UI state (mobile nav open, command open, etc.)
│   └── query.ts                    TanStack Query client configuration
│
├── ui/                             Design system primitives — no business logic
│   ├── Button.tsx                  Button + IconButton components
│   ├── Card.tsx                    Card container with padding variants
│   ├── DataTable.tsx               Generic table component
│   ├── EmptyState.tsx              Empty state illustration + copy
│   ├── ErrorState.tsx              Error state display
│   ├── LockedActionChip.tsx        Chip indicating a locked/unavailable action
│   ├── LockedState.tsx             Full locked-state overlay
│   ├── Menu.tsx                    Dropdown menu primitive
│   ├── Popover.tsx                 Radix-based popover wrapper
│   ├── SectionHeader.tsx           Section heading + optional action slot
│   ├── Select.tsx                  Styled select input
│   ├── SkeletonRow.tsx             Loading skeleton for table rows
│   ├── Sparkline.tsx               Inline mini chart
│   ├── StatTile.tsx                KPI tile used in the dashboard strip
│   ├── StatusChip.tsx              Status badge chip
│   └── WaitingOnChip.tsx           "Waiting on" attribution chip
│
├── components/                     One-off branded components
│   ├── GasLoginBackground.tsx      Animated background for the login screen
│   └── GasOrbHalo.tsx              Orb halo decoration used on login
│
├── flags/                          Feature flag definitions (active / stub / locked)
│
├── lib/
│   └── utils.ts                    Shared utilities (cn(), etc.)
│
└── assets/                         Brand assets, sidebar background image
```

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Route | `<section>.route.tsx` | `dashboard.route.tsx` |
| Context | `<Domain>Context.tsx` | `ReportContext.tsx` |
| Hook | `use<Name>()` in Context file | `useReport()` |
| Primitive | `PascalCase.tsx` | `StatTile.tsx`, `Button.tsx` |
| Fixture | `<domain>.fixture.ts` | `reports.fixture.ts` |
| Store | `<domain>Store.ts` | `authStore.ts`, `uiStore.ts` |
| Port | `<domain>.port.ts` | `auth.port.ts` |
| Adapter | `<domain>.<impl>.ts` | `auth.mock.ts`, `auth.bff.ts` |

---

## Import Path Alias

`@/` maps to `src/`. Always use the alias — never relative `../` paths across directory boundaries.

```typescript
import { useReport } from "@/features/audit/ReportContext";
import { Button }    from "@/ui/Button";
import { cn }        from "@/lib/utils";
```

---

## Key Paths — Quick Reference

| What | Path |
|------|------|
| App entry | `src/main.tsx` |
| Root component | `src/App.tsx` |
| All types + seed data | `src/features/audit/reports.fixture.ts` |
| Global report state | `src/features/audit/ReportContext.tsx` |
| useReport() hook | exported from `ReportContext.tsx` |
| Report selector | `src/shell/TopBar.tsx` — `ReportSelector` component |
| Historical banner | `src/shell/TopBar.tsx` — bottom of `TopBar()` |
| Dashboard KPIs | `src/routes/dashboard.route.tsx` |
| Engagement builder | `src/routes/engagement.route.tsx` — `EngagementBuilder` |
| Upload intake flow | `src/routes/upload.route.tsx` — `IntakeView` |
| Upload archive view | `src/routes/upload.route.tsx` — `ArchiveView` |
| KPI tile | `src/ui/StatTile.tsx` |
| Auth state | `src/state/authStore.ts` |
| Public adapter surface | `src/adapters/index.ts` |
| Auth port (interface) | `src/ports/auth.port.ts` |
| Mock auth | `src/adapters/mock/auth.mock.ts` |

---

## Status Markers

When reading the codebase, use these markers to understand a file's role:

| Marker | Meaning |
|--------|---------|
| `ACTIVE` | Live, in use, must not break |
| `COMPAT SHIM` | Wrapper that re-exports — do not add new logic |
| `REFERENCE` | Read-only documentation in the repo |

- `audit.fixture.ts` — **COMPAT SHIM** (re-exports from reports.fixture.ts)
- `reports.fixture.ts` — **ACTIVE** (single source of all types and seed data)
- `ReportContext.tsx` — **ACTIVE** (single source of runtime state)

---

## Drift Prevention Rules

1. **App.tsx is at `src/App.tsx`** — not `src/app/App.tsx`. There is no App.tsx inside `src/app/`.
2. **Do not import from `@/adapters/mock`** — import only from `@/adapters`. The mock directory is an implementation detail.
3. **Do not create new top-level directories** under `src/` without a very strong reason.
4. **All primitives go in `src/ui/`** — no business logic, no context reads.
5. **All routes go in `src/routes/`** — one file per URL, always call `useReport()`.
6. **Do not add to `audit.fixture.ts`** — it is a shim. All new types and data go in `reports.fixture.ts`.
7. **`src/features/audit/` is data only** — context and logic. No JSX that renders on screen.
