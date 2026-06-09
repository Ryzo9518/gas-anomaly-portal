---
title: "feat: Client Invite & Access (Model B — backend-issued)"
type: feat
status: implemented
date: 2026-06-08
origin: docs/specs/2026-06-08-client-invite-access-requirements.md
deepened: 2026-06-08
---

# feat: Client Invite & Access (Model B — backend-issued)

> **⚠ Implementation status (2026-06-09): IMPLEMENTED.** All 12 units below have
> shipped (commits `4d87b35` Unit 1 → `5209f75` Units 11 & 12). The forward-looking
> framing in **Context & Research** ("No DB layer, no email code, no tests exist yet
> — these are stood up here") describes the *starting* state and is no longer true:
> the Postgres layer, Graph email, magic-link auth, admin UI, client login, real-data
> loader, and isolation test all exist in the codebase. Read this plan as a record of
> work done, not work pending.
>
> **Known gap this plan did NOT close:** the plan never specified how the **staff**
> audit switcher (build-time registry) and the **admin-created** client list (Postgres)
> converge. They don't — see
> [`docs/specs/2026-06-09-staff-client-list-reconciliation.md`](../specs/2026-06-09-staff-client-list-reconciliation.md)
> for the resulting staff-UX defect and the proposed fix.

## Overview

Let Jera admins **invite client contacts from the portal UI** and give those contacts **secure, revocable, audited, per-client access** (passwordless magic link) showing only their own data — with no per-client build. Replaces the interim per-client passcode static sites.

Units are ordered in true dependency sequence (the session primitive precedes data scoping). The build opens with a **decision record** (managed Entra External ID vs hand-rolled magic-link); the plan below assumes the **hand-rolled** outcome and is explicit (Unit 1) about how much changes if External ID is chosen — the choice is *not* cheaply reversible, since Unit 2 stands up security-critical token/session infrastructure the team then owns.

## Problem Frame

Client access today is manual: a separate static build per client with a passcode baked in, hand-delivered. No record of who has access, no per-person revocation, passcode lives in the inbox forever, every client is a manual build/deploy. (See origin: `docs/specs/2026-06-08-client-invite-access-requirements.md`.) The pain is only retired when a real client is onboarded through Model B and a passcode site is decommissioned — so this plan includes a **minimal real-data load path** (Unit 11) to make that reachable.

## Requirements Trace

R1 admin-only server-enforced · R2 select/create client + invite emails · R3 single-use expiring link · R4 contact view (status/last-login/delivery)+resend · R5 revoke contact/client, next-request · R6 passwordless client sign-in · R7 used/expired/forged/missing → one outcome · R8 self-service re-link (active only, no enum) · R9 client sees only own data · R10 audit · R11 server-validated sessions · R12 Graph email from anomaly@jera.co.za · R13 per-identity serving, default-deny, isolation-gated · R14 identity=(email,client)+chooser · R15 token CSPRNG+hashed · R16 rate-limit+constant-time · R17 deliverability+admin delivery status. Mapping to units in each unit's **Requirements** line.

## Scope Boundaries
- No client self-registration; staff SSO unchanged; no change to the client Upload Centre flow.

### Deferred to Separate Tasks
- **Rich client data-entry/import UI** — deferred. This plan includes only a **minimal, audited server-side real-data load** (Unit 11) sufficient to onboard one real client; the polished authoring UI is a follow-on.

## Context & Research

### Relevant Code and Patterns
- `backend/app/{auth_microsoft,security,deps,config,main}.py` — staff SSO (authlib OIDC, **stateless HS256 cookie**, `current_staff`). New routers/deps mirror these. **No DB layer, no email code, no tests exist yet** — these are stood up here.
- `src/adapters/{index.ts,bff/auth.bff.ts}`, `src/ports/{auth,clients}.port.ts`, `src/features/clients/{ClientContext.tsx,clients.data.ts}`, `src/features/audit/ReportContext.tsx` — the seam + current **build-time** client data (statically imported; this is what Unit 6 removes from the bundle).
- `src/app/Router.tsx` (`RequireAuth` gates on `actor` only — no role), `src/routes/authCallback.route.tsx`, `src/features/login/LoginCard.tsx`.
- `scripts/verify-client-isolation.sh` — build-time grep; Unit 12 adds the runtime analogue + a built-`dist/` grep.
- `deploy/gas-portal-api.service`, `/etc/caddy/conf.d/anomaly.caddy` — backend service + `/api/*` proxy live.

### Institutional Learnings
- Repo law (`AGENTS.md`, `docs/claude-handoff/`): 10 report-scoped invariants; quality gates are **typecheck / build / manual browser** (no automated test gate, **no GitHub Actions** — Unit 2 adds a test toolchain run locally/as a pre-merge gate, not CI). Gate 3 currently runs `npm run dev` with no backend and passes *because* of fixture-fallback — Unit 6 must define the new demo path.

### External References
- Graph `sendMail` from `anomaly@jera.co.za`: `Mail.Send` granted + verified this session via a manual app-token test send (no code in repo yet — built in Unit 4). The branded invite preview HTML produced this session is the template seed for Unit 4.
- Entra External ID (CIAM) — evaluated in Unit 1.

## Key Technical Decisions
- **Backend gains a Postgres persistence layer** (confirm/provision on the Hetzner box — not assumed present) for clients/contacts/invites/sessions/audit/rate-limit. Current backend is stateless and cannot meet R5/R10/R11/R15/R16.
- **Client sessions are server-validated per request, uncached** — an opaque server-side session id checked against `sessions` every request (revocation real). Staff SSO unchanged.
- **Identity = (email, client)** (R14); multi-client email → chooser; session scoped to one client. Resolve the `client_id` representation (registry slug `string` vs `authStore.client_id: number`) into one canonical key.

### Cross-cutting security invariants (apply across units)
- **Session-type separation:** staff and client sessions use **distinct cookie names + distinct validation**. `current_client` rejects staff cookies; `current_staff`/`current_admin` reject client cookies. Never a generic "is authenticated" check. (Confused-deputy guard.)
- **Default-deny, fail-closed:** any identity with no resolvable single-client scope, and any error, yields **zero data**. Real (non-demo) data served only when `ISOLATION_VERIFIED` (env flag, off by default) is on.
- **Token handling:** ≥128-bit CSPRNG; stored hashed; **atomic single-use** redemption (`UPDATE … WHERE used_at IS NULL AND expires_at > now()`, require rowcount==1); raw token only in the email, never logged (verify endpoint takes token in **POST body**, not query string; auth-endpoint request bodies excluded from logs).
- **Session creation:** session id generated server-side at successful verification, never client-supplied; prior sessions for the contact invalidated/replaced (anti-fixation).
- **Revocation path:** contact and whole-client revoke set `revoked_at`; `current_client` checks `sessions.revoked_at` AND `contacts.revoked_at` AND parent client revoked, every request.

## Open Questions

### Resolved During Planning
- Build-vs-buy: Unit 1 decision record (not a separate blocking phase). Real-data path: in scope (Unit 11, minimal/audited).
- Rate-limit store: **Postgres** `rate_limit` table (survives restart; single-process box) — not deferred.

### Deferred to Implementation
- Exact link TTL / session lifetime (Unit 5/6) — default ~30 min link / ~8 h session, scanner-tolerant.
- ORM/migration tooling (Unit 2) and migration run-hook (e.g. `ExecStartPre`).
- Canonical `client_id` type unification (Unit 6).

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

```
ADMIN (staff cookie + admin grant)          CLIENT (no account, client cookie)
  POST /api/clients (create)                  GET /auth/client/verify?token → interstitial
  POST /api/clients/{id}/contacts (invite)    POST /api/auth/client/verify (token in body)
        │ Graph sendMail ───────────────────▶ email (single-use link)   │ atomic mark-used
        ▼                                      ◀── server-gen session (scoped client_id) ──┘
  FastAPI + Postgres: clients, contacts(email,client unique),           POST /api/auth/client/relink (rate-limited,no-enum)
   invites(token_hash,exp,used_at), sessions(id,contact,client,revoked_at),
   audit, rate_limit
        ▼
  GET /api/reports etc → current_client → scope to session.client_id; default-deny;
   real data only if ISOLATION_VERIFIED; fixtures NOT in SPA bundle
```

## Implementation Units

- [x] **Unit 1: Build-vs-buy decision record**
**Goal:** Record the client-auth choice with honest blast-radius/ownership analysis (not a blocking phase — commit alongside Unit 2).
**Requirements:** shapes R3/R6/R7/R11/R15.
**Files:** Create `docs/specs/2026-06-08-client-auth-build-vs-buy.md`.
**Approach:** Score Entra External ID vs hand-rolled on: client UX (passwordless, no MS account), cost (per-MAU vs zero marginal), **(email,client) multi-client fit (awkward in CIAM)**, **security ownership we keep forever (R15/R16 token+session lifecycle)**, ops complexity, and honest reversal cost. State explicitly: if External ID is chosen, Units 2/5(verify)/6-not-data/7 shrink or move to the IdP — this is **backend rework, not a free swap** (the `AuthPort`/`ClientsPort` seam only contains the *frontend* call shape). Leaning: hand-rolled, but record it as a durable ownership commitment.
**Test expectation:** none — decision record.
**Verification:** Committed record; downstream units confirmed against it.

- [x] **Unit 2: Postgres + persistence layer + test toolchain**
**Goal:** Stand up the DB, schema, and the (currently absent) test harness.
**Requirements:** R10,R11,R14,R15,R16 foundation.
**Dependencies:** Unit 1.
**Files:** Create `backend/app/db.py`, `backend/app/models.py`, `backend/migrations/`, `backend/tests/` + `backend/tests/test_models.py`; Modify `backend/app/config.py` (`DATABASE_URL`), `backend/requirements.txt` (DB driver, migration tool, **pytest + httpx test client**), `package.json` (add `vitest` + `test` script), `deploy/gas-portal-api.service` (migration run-hook), `docs/deployment/HETZNER_DEPLOYMENT.md` (DB + migrations).
**Approach:** **Confirm/provision Postgres on the box** (shared with intacct — isolate a dedicated `gas_portal` DB/role; do not assume it exists). Tables per the security-invariants/schema above; unique `(email, client_id)`. Correct the earlier "as the repo tests components" assumption — there is no existing test pattern; establish one.
**Test scenarios:** Happy: models CRUD; unique (email,client) enforced. Edge: same email/two clients = 2 rows; dup (email,client) rejected. Error: missing `DATABASE_URL` fails fast.
**Verification:** Migrations apply on a fresh DB; `pytest` + `vitest` run; frontend `typecheck`/`build` unaffected.

- [x] **Unit 3: Admin authz + roles surfaced to SPA + session-type separation**
**Goal:** Distinct, server-enforced admin grant; role available to the SPA; staff/client session separation primitives.
**Requirements:** R1,R10.
**Dependencies:** Unit 2.
**Files:** Modify `backend/app/{config,security,deps}.py` (admin set or Entra group claim; `current_admin`→403; emit role), `src/state/authStore.ts` + `src/adapters/bff/auth.bff.ts` (carry `role`/`isAdmin`), `src/app/Router.tsx` (`RequireAdmin`); Test `backend/tests/test_admin_auth.py`.
**Approach:** Admin = distinct grant (decide config-set vs Entra group per Unit 1/tenant), default-deny, audited on change. Establish distinct cookie names for staff vs (future) client sessions now.
**Test scenarios:** admin→allowed; staff-not-admin→403; unauthenticated→401; **client cookie → admin route → 403** (added after Unit 5). Integration: 403 enforced server-side even if UI bypassed.
**Verification:** Admin routes reject non-admins and client sessions server-side; SPA can gate admin nav by role.

- [x] **Unit 4: Invite issuance + Graph email + early deliverability smoke**
**Goal:** Admin creates client/contacts and sends magic-link invites; prove external deliverability early.
**Requirements:** R2,R3,R12,R15,R17,R10.
**Dependencies:** Units 2,3.
**Files:** Create `backend/app/clients_admin_api.py`, `backend/app/email_graph.py` (Graph sendMail client + branded template from this session's preview HTML), `backend/app/tokens.py` (CSPRNG+hash); Test `backend/tests/test_invite.py`, `test_tokens.py`.
**Approach:** Generate ≥128-bit token, store hash only, email raw link via Graph from `anomaly@jera.co.za`. Record audit + delivery status (R4/R10/R17). Graph **client secret in `/etc/gas-portal/api.env` (`GRAPH_CLIENT_SECRET`), expiry recorded, rotation documented**; Application Access Policy restriction is a go-live gate. **Run a real external-domain test send here** (not at the end) to catch spam/DMARC early.
**Test scenarios:** Happy: invite→contact(invited)+send+audit; token stored hashed (raw never persisted/logged). Edge: same email/2nd client → new (email,client). Error: Graph failure → delivery `failed`, admin-visible. Security: entropy ≥128-bit.
**Verification:** Admin invites; email arrives **in inbox (external mailbox)**; DB holds hash+audit.

- [x] **Unit 5: Magic-link verify + server-validated client session**
**Goal:** Redeem a link → revocable, per-client, server-validated session.
**Requirements:** R6,R7,R11,R14,R15.
**Dependencies:** Units 2,4.
**Files:** Create `backend/app/client_auth_api.py` (`GET /auth/client/verify` interstitial, `POST /api/auth/client/verify`, `/session`, `/logout`); Modify `backend/app/deps.py` (`current_client`, uncached per-request, rejects staff cookies). Test `backend/tests/test_client_auth.py`.
**Approach:** Apply all token/session/separation invariants above. **GET shows an interstitial; POST performs the atomic single-use redemption** — link-scanners issue GET, not POST, which resolves the single-use vs scanner-prefetch tension (R7/R17) without a token-reuse grace window. Multi-client email → chooser before issuing a one-client session.
**Test scenarios:** Happy: valid token → correct-client session. Error: used/expired/forged/missing → one identical "no longer valid" (R7); **concurrent double-redeem → exactly one succeeds** (atomicity). Edge: 2 active contacts → chooser. Security: session id server-generated; staff cookie rejected by `current_client`; revocation effective next request.
**Verification:** Client logs in via link; one-client session; reused/expired link rejected; concurrent redeem safe.

- [x] **Unit 6: Per-identity data serving, default-deny, fixtures out of the bundle (R13)**
**Goal:** Serve client data scoped to the session, default-deny; remove real client data from the SPA bundle.
**Requirements:** R9,R13.
**Dependencies:** Unit 5 (`current_client`).
**Files:** Create `backend/app/clients_api.py` (`GET /api/clients`, `GET /api/reports?…` scoped), server-side seed loader, `src/adapters/bff/clients.bff.ts` (**create**); Modify `src/adapters/index.ts` (clients adapter switch parallel to auth), `src/features/clients/ClientContext.tsx` (**async rewrite**: loading/empty/error states), `src/features/clients/clients.data.ts` (**delete static fixture imports**), move fixture data to backend, `docs/claude-handoff/INTEGRATION_POINTS.md` + `QUALITY_GATES.md` (new contract: client-data paths have **no fixture fallback**; define the backend-less Gate-3 demo path). Test `backend/tests/test_data_scoping.py`, extend `scripts/verify-client-isolation.sh` to grep built `dist/`.
**Execution note:** Write the security tests first — no-session→zero-data and cross-client→denied are the boundary.
**Approach:** `current_client`-scoped responses; **no stub session that fabricates a client_id**. Physically remove client fixtures from the SPA build graph so they cannot ship publicly (verified by a `dist/` grep, not just runtime).
**Test scenarios:** Happy: client A → only A's data. Security: **no session → zero data**; forged/expired session → zero data; A requests B's id → denied; flag off → no real data. Build: production `dist/` contains no client fixture data. Integration: `ClientContext` renders from the API.
**Verification:** Cross-client + no-session both return nothing; `dist/` grep clean; demo path defined and works.

- [x] **Unit 7: Self-service re-link (rate-limited, no enumeration)**
**Goal:** Active contacts request a fresh link themselves.
**Requirements:** R8,R16,R17. **Dependencies:** Units 4,5.
**Files:** Modify `backend/app/client_auth_api.py` (`POST /api/auth/client/relink`), `backend/app/email_graph.py` (re-link template); Create `backend/app/ratelimit.py` (Postgres-backed; inline if only one caller). Test `backend/tests/test_relink.py`.
**Approach:** New link only for active, non-revoked contact; identical neutral response regardless of match; rate-limit per email+IP (Postgres counters + TTL cleanup); constant-time.
**Test scenarios:** Happy: active → link, neutral response. Error: unknown/revoked → identical neutral, no link. Security: limit triggers; timing constant (no enum).
**Verification:** Active get links; others nothing; identical responses; limits enforced.

- [x] **Unit 8: Revocation + admin contact/status APIs**
**Goal:** View status/last-login/delivery; revoke contact or whole client (effective next request).
**Requirements:** R4,R5,R10,R11. **Dependencies:** Units 2,3,5.
**Files:** Modify `backend/app/clients_admin_api.py`. Test `backend/tests/test_revoke.py`.
**Approach:** Revoke sets `revoked_at`; whole-client revoke also marks all child sessions revoked (or `current_client` joins through client state — pick the eager path). Revoked rows stay listed.
**Test scenarios:** Happy: list shows status/last-login/delivery; revoke contact. Integration: **whole-client revoke kills a live session on next request (within seconds)**; revoked contact blocked next request. Edge: revoked rows still visible.
**Verification:** Revoke blocks on next request; audit records who/when.

- [x] **Unit 9: Admin "Invite & manage clients" UI**
**Goal:** The in-app admin screen.
**Requirements:** R1,R2,R4,R5. **Dependencies:** Units 3,4,8.
**Files:** Create `src/routes/admin.clients.route.tsx`, `src/features/admin/*`; Modify `src/app/Router.tsx` (`RequireAdmin` route), `src/shell/Sidebar.tsx` (admin-only nav). Test `src/features/admin/*.test.tsx`.
**Approach + resolved interaction decisions (from design review):**
- **Select/create client:** searchable combobox with a "Create new client" item (no separate wizard/modal).
- **Email entry:** chip/tag input (Enter/comma to add); each email a separate invite on submit; per-address errors inline on the chip.
- **Post-send:** success → emails move from form into the contact list as "Invited / Pending delivery"; partial failure → failed address stays with inline rose error; full failure → top-of-form error.
- **Empty contact list:** muted "No contacts yet — invite someone above" (not a generic "no data" row).
- **Whole-client revoke:** destructive-red **modal** confirm (blast radius visible); single-contact revoke = inline confirm pair.
- **Non-admin:** nav item hidden; direct navigation redirects to `/dashboard` (no 403 page that reveals the route); bff treats API 403 as not-found.
- **Design system:** reuse the portal token set (dark-violet glass, indigo/violet, Lucide, LESSON-1 one-control-per-concern); status badges reuse rose/amber/indigo/slate; no new colours/radii.
**Test scenarios:** Happy: invite flow submits, shows success, contact appears. States: empty / in-progress / send-failure / never-logged-in="Pending". Edge: non-admin cannot see/reach. Integration: whole-client revoke modal confirms.
**Verification:** Admin runs the full loop in-app; non-admins cannot.

- [x] **Unit 10: Client login & re-link UI**
**Goal:** Client-facing magic-link flows.
**Requirements:** R6,R7,R8,R14. **Dependencies:** Units 5,7.
**Files:** Modify `src/routes/authCallback.route.tsx` (client verify), `src/features/login/LoginCard.tsx` (client door: email→link, "check your inbox"), `src/adapters/bff/auth.bff.ts` (client endpoints), `src/app/Router.tsx` (`RequireClient`, chooser + invalid-link routes). Test relevant `*.test.tsx`.
**Approach + resolved decisions:**
- **Invalid-link page:** neutral copy "This link is no longer valid. Enter your email to receive a new one," **re-link form inline** on the dark-violet surface (not a plain error page); identical post-submit message regardless of match.
- **Multi-client chooser:** list of client names as selectable cards/pills (not a generic dropdown), with a "wrong account?" path back to re-link.
- **Self-service re-link** reuses the **LoginCard** client variant (email + "Email me a link", no password, no Microsoft button) → neutral "check your inbox."
- Resolve `client_id` slug-vs-number mismatch across `authStore`/port/backend.
**Test scenarios:** Happy: valid link → scoped dashboard (only their data). States: used/expired/invalid → generic → self-service. Edge: multi-client → chooser. Integration: client session drives `RequireClient` + `ClientContext`.
**Verification:** End-to-end emailed-link → scoped dashboard.

- [x] **Unit 11: Minimal real-data load path**
**Goal:** An audited, server-side way to load **one real client's** actual audit data (not the rich UI) so a real client can be onboarded.
**Requirements:** R9,R13 (real data); enables the headline outcome.
**Dependencies:** Units 2,6.
**Files:** Create `backend/app/admin_data_load.py` (admin-only endpoint or CLI to upsert a client's report data), `backend/tests/test_data_load.py`; Modify audit to log loads.
**Approach:** Admin-only, audited import of a client's report JSON (validated against the report schema) into the backend store; no public surface. Same data shape the scoped serving (Unit 6) reads, so the isolation test exercises the real path.
**Test scenarios:** Happy: load client X data → X's client session sees it. Security: load is admin-only + audited; loaded data never enters the SPA bundle. Edge: malformed import rejected with a clear error.
**Verification:** A real client's data can be loaded and is visible only to that client.

- [x] **Unit 12: Isolation test, flag flip, onboard one real client, retire one passcode site**
**Goal:** Prove isolation, enable real data, onboard a real client end-to-end, retire that client's passcode site.
**Requirements:** R9,R13, success criteria. **Dependencies:** Units 5,6,8,11.
**Files:** Create `backend/tests/test_isolation.py` (runtime analogue); Modify deploy/runbook (`ISOLATION_VERIFIED` env flag + procedure; passcode-site retirement).
**Approach:** Automated test = no client session reaches another client's data via any endpoint/param + no-session→zero-data + cross-session-type rejection + built-`dist/` has no client data. `ISOLATION_VERIFIED` is an **env flag (deploy to set), re-run isolation after any schema migration**. Flip on only after pass; then load one real client (Unit 11), verify isolation in production, and retire **that** client's passcode site.
**Test scenarios:** Security: A-session × B-resources matrix → all denied; no-scope → zero; flag off → no real data; staff/client/admin cross-type → denied. Build: `dist/` clean.
**Verification:** Isolation test green (local/manual gate — no CI); one real client served real data + verified before any passcode site retires.

## System-Wide Impact
- **Interaction graph:** client session path parallels staff SSO; `RequireAuth`/`RequireAdmin`/`RequireClient` split by role; client data source moves from build-time registry to `ClientsPort` bff for client sessions.
- **Error propagation:** typed errors; invalid-link/denied never leak existence; admin sees delivery/bounce failures.
- **State lifecycle:** atomic single-use tokens; uncached revocation; rate-limit cleanup; session fixation guard.
- **API surface parity:** staff SSO endpoints unchanged; new `/api/auth/client/*`, `/api/clients*`, admin data-load added; staff/client/admin cross-type calls explicitly rejected.
- **Integration coverage:** revoke→next-request-blocked, link→scoped-session, no-session→zero-data, cross-client + cross-type denial, `dist/` bundle grep — all need integration/build tests, not unit mocks.
- **Unchanged invariants:** the 10 report-scoped invariants and staff Microsoft SSO are not changed.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Runtime scoping bug leaks data | Default-deny fail-closed + Unit 6 no-session/cross-client tests + Unit 12 isolation gate + `dist/` grep |
| Real client data ships in public bundle | Unit 6 deletes static fixture imports + built-`dist/` grep gate |
| Stateless tokens can't revoke | Server-validated, uncached sessions (invariants/Unit 5/8) |
| Confused-deputy across session types | Distinct cookies + cross-type rejection tests (Units 3/5/8) |
| Token race / scanner prefetch burns single-use | Atomic mark-used; GET interstitial + POST redeem (Unit 5) |
| Magic-link lands in spam | Early external deliverability smoke (Unit 4) + SPF/DKIM/DMARC before retiring passcode sites |
| Postgres not actually on the box | Unit 2 confirm/provision step before building on it |
| No test harness exists | Unit 2 stands up pytest + vitest |
| Build-vs-buy rework underestimated | Unit 1 honest blast-radius + ownership framing |
| Graph secret expiry / over-broad send | `api.env` + rotation noted; Application Access Policy a go-live gate |

## Documentation / Operational Notes
- Update `docs/deployment/HETZNER_DEPLOYMENT.md` (DB, migrations, `ISOLATION_VERIFIED` flag + procedure), `INTEGRATION_POINTS.md` + `QUALITY_GATES.md` (client-data no-fallback contract + Gate-3 demo path).
- External prereqs: `Mail.Send` consent ✅; Application Access Policy → go-live gate; `GRAPH_CLIENT_SECRET` rotation tracked.

## Phased Delivery
- **Phase A — Foundation:** Units 1, 2, 3.
- **Phase B — Core auth + data spine:** Units 4, 5, 6, 7, 8. (A thin slice — invite→link→scoped session→data — is demoable by Unit 6 via a scripted invite, before the admin UI.)
- **Phase C — Frontend:** Units 9, 10.
- **Phase D — Real data + go-live:** Units 11, 12.

## Sources & References
- **Origin:** `docs/specs/2026-06-08-client-invite-access-requirements.md`
- Design: `docs/specs/2026-06-08-phase-2-auth-design.md`, `…-multi-client-runtime-switcher-design.md`
- Code: `backend/app/*`, `src/adapters/*`, `src/features/clients/*`, `scripts/verify-client-isolation.sh`
