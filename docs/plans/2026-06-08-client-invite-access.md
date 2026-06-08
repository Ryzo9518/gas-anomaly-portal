---
title: "feat: Client Invite & Access (Model B — backend-issued)"
type: feat
status: active
date: 2026-06-08
origin: docs/specs/2026-06-08-client-invite-access-requirements.md
---

# feat: Client Invite & Access (Model B — backend-issued)

## Overview

Build the system that lets Jera admins **invite client contacts from the portal UI** and gives those contacts **secure, revocable, audited, per-client access** (passwordless magic link) that shows only their own data — with no per-client build. Replaces the interim per-client passcode static sites.

The build opens with a **decision spike** (managed Microsoft Entra External ID vs hand-rolled magic-link in the existing FastAPI backend). Everything after the spike is planned for the **hand-rolled path** (the likely outcome given the existing FastAPI + Postgres + Graph stack); if the spike selects External ID, Units 5–7 and 10 are re-shaped per the note in Unit 1.

## Problem Frame

Client access today is manual: a separate static build per client with a passcode baked in, hand-delivered. No record of who has access, no per-person revocation, passcode lives in the inbox forever, every client is a manual build/deploy. (See origin: `docs/specs/2026-06-08-client-invite-access-requirements.md`.)

The portal was designed for this — staff Microsoft SSO + FastAPI backend are already live; the adapter seam (`src/adapters/`, `AuthPort`/`ClientsPort`) and the Phase-2 design (`docs/specs/2026-06-08-phase-2-auth-design.md`) anticipate it.

## Requirements Trace

- R1. Admin-only, server-enforced invite/manage (distinct admin grant, default-deny, 403 at the API).
- R2. Admin selects/creates client + enters contact email(s); each invited individually.
- R3. Invite emails each contact a single-use, time-limited magic link.
- R4. Admin contact view: status (invited/active/revoked), last login, email delivery status; resend.
- R5. Revoke contact or whole client; effective on next request; whole-client revoke confirmed.
- R6. Client signs in via magic link, no password/passcode.
- R7. Single-use + expiring links; used/expired/forged/missing → one identical "request a new one" outcome.
- R8. Self-service re-link (active, non-revoked only); identical response (no enumeration); rate-limited + constant-time.
- R9. Signed-in client sees only their own org's data.
- R10. Audit trail (invite, login, self-service request, revoke, admin-set changes); token reference/hash only; admin-only read.
- R11. Server-validated client sessions; revocation effective next request; time-limited.
- R12. Email via Jera M365 Graph from `anomaly@jera.co.za`, branded.
- R13. Per-identity server-side data serving; default-deny; real data behind an isolation-test-gated flag (off by default); not shipped in a public bundle.
- R14. Contact identity key = (email, client); multi-client email → client chooser; session scoped to one client.
- R15. Token security: ≥128-bit CSPRNG, stored hashed, constant-time compare; never logged raw.
- R16. Rate-limit issuance/redeem/re-link per email+IP; constant-time responses.
- R17. Deliverability: SPF/DKIM/DMARC, anti-phish framing, scanner-tolerant TTL, admin-visible delivery/bounce.

## Scope Boundaries

- No client self-registration; staff SSO unchanged; no changes to the client data-upload (Upload Centre) flow.
- Visual/layout polish beyond functional states is design's call.

### Deferred to Separate Tasks

- **Rich client audit-data ingestion UI** (admin authoring/import of report data): separate workstream. This plan serves per-client data from a **server-side seed** (the existing fixtures relocated server-side); a full ingestion UI is a follow-on. (See origin Scope Boundaries.)
- Retirement/decommission of the interim passcode sites: separate follow-up, gated on the Unit 12 criterion.

## Context & Research

### Relevant Code and Patterns
- `backend/app/auth_microsoft.py`, `security.py`, `deps.py`, `config.py`, `main.py` — existing FastAPI staff SSO (authlib OIDC, HS256 cookie, `current_staff` dependency). New routers/deps mirror these.
- `src/adapters/index.ts`, `src/adapters/bff/auth.bff.ts`, `src/ports/auth.port.ts`, `src/ports/clients.port.ts` — the seam new client/auth calls plug into.
- `src/features/clients/clients.data.ts`, `ClientContext.tsx`, `src/features/audit/ReportContext.tsx` — current build-time client/report data; R13 moves the data source behind the `ClientsPort` bff adapter.
- `src/features/login/LoginCard.tsx`, `src/routes/authCallback.route.tsx`, `src/app/Router.tsx` — login UI + callback + `RequireAuth`; client flows extend these.
- `scripts/verify-client-isolation.sh` — the existing build-time isolation grep; Unit 12's runtime isolation test is its server-side analogue.
- `deploy/gas-portal-api.service`, `/etc/caddy/conf.d/anomaly.caddy` — backend service + Caddy `/api/*` proxy already live.

### Institutional Learnings
- Repo law (`AGENTS.md`, `docs/claude-handoff/`): 10 report-scoped invariants, 3 quality gates (typecheck/build/manual), commit format, no GitHub Actions. Phase discipline: changes behind the adapter seam.

### External References
- Microsoft Graph `sendMail` (verified working from `anomaly@jera.co.za`, `Mail.Send` granted).
- Microsoft Entra External ID (CIAM) — evaluated in Unit 1.

## Key Technical Decisions
- **Backend gains a persistence layer** (Postgres, already on the box) for clients/contacts/invites/sessions/audit/rate-limit — current backend is stateless and cannot satisfy R5/R10/R11/R15/R16.
- **Client sessions are server-validated per request** (opaque session id or jti checked against a `sessions` table), not stateless JWTs — makes revocation real (R5/R11). Staff SSO sessions unchanged.
- **Identity key = (email, client)** (R14) — supports shared advisors; login/re-link resolving to multiple active contacts presents a client chooser.
- **Admin = distinct grant** (config admin set or Entra group claim surfaced in the staff session), enforced server-side on every admin route (R1).
- **R13 default-deny + isolation-test-gated flag**: an authenticated client identity with no single-client scope gets zero data; real (non-demo) data served only when the flag is on, which is only flipped after the automated isolation test passes.
- **Token model**: opaque random tokens, hashed at rest; the email carries the raw token once (R15).

## Open Questions

### Resolved During Planning
- Build-vs-buy: not pre-resolved — it is Unit 1 (spike), per user instruction.
- Where client data lives initially: server-side seed (relocated fixtures), not a new ingestion UI (deferred).

### Deferred to Implementation
- Exact magic-link TTL and client session lifetime (Unit 6) — pick during implementation; default ~30 min link / ~8 h session, scanner-tolerant per R17.
- ORM/migration tooling choice (SQLAlchemy + Alembic vs alternatives) — Unit 2.
- Rate-limit store mechanism (Postgres counters vs in-process) — Unit 7.
- Admin representation: config set vs Entra group claim — Unit 3 (decide from what the tenant supports cleanly).

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

```
ADMIN (staff session + admin grant)        CLIENT (no account)
  │ POST /api/clients (create)                │
  │ POST /api/clients/{id}/contacts (invite)  │
  ▼                                           │
FastAPI backend ── Graph sendMail ───────────▶│ magic-link email
  ├ clients, contacts(email,client),          │ click → GET/POST /api/auth/client/verify?token
  │ invites(token_hash,exp,used), sessions,   │   → server-validated session cookie (scoped client_id)
  │ audit, rate_limit            ◀────────────┤ POST /api/auth/client/relink (email) [rate-limited, no-enum]
  ▼                                           ▼
Postgres                              GET /api/reports etc. → default-deny, scoped to session.client_id
                                      (real data only when ISOLATION_VERIFIED flag on)
```

## Implementation Units

- [ ] **Unit 1: Build-vs-buy spike — Entra External ID vs hand-rolled magic-link**

**Goal:** Decide how client passwordless auth is provided, with a written recommendation, before building it.
**Requirements:** R3, R6, R7, R11, R15 (shapes how they're met).
**Dependencies:** None.
**Files:** Create: `docs/specs/2026-06-08-client-auth-build-vs-buy.md` (decision record). No app code.
**Approach:** Evaluate both against fixed criteria and record the call:
- Client UX (do external contacts need any Microsoft/account step? passwordless email link/OTP support).
- Cost model (Entra External ID per-MAU vs zero marginal for hand-rolled).
- Control/fit (revocation, audit, (email,client) identity, scoped sessions) vs the existing FastAPI+Postgres+Graph stack.
- Security ownership (managed token lifecycle vs we own R15/R16).
- Setup/operational complexity (separate CIAM tenant vs in-repo).
- Reversibility (both sit behind `AuthPort`/`ClientsPort`, so the seam contains the choice).
- **Leaning (to validate, not assume):** hand-rolled, because the stack already does Graph email + Postgres and clients are simple report-viewers; External ID adds a CIAM tenant, per-MAU cost, and the (email,client) multi-client model is awkward in CIAM. Spike must confirm or overturn.
**Patterns to follow:** `docs/specs/2026-06-08-phase-2-auth-design.md` decision-record style.
**Test scenarios:** Test expectation: none — decision spike, no behavioral code.
**Verification:** A committed decision record with a clear recommendation and the criteria scored; downstream units confirmed against it.

- [ ] **Unit 2: Backend persistence layer + schema**

**Goal:** Add a database layer and the tables the feature needs.
**Requirements:** R10, R11, R14, R15, R16 (foundation).
**Dependencies:** Unit 1 (confirms hand-rolled needs the full schema; if External ID, sessions/invites tables shrink).
**Files:** Create: `backend/app/db.py`, `backend/app/models.py`, `backend/migrations/` (or chosen tool), `backend/app/config.py` (add `DATABASE_URL`); Modify: `backend/requirements.txt`, `deploy/gas-portal-api.service` (ensure DB reachable). Test: `backend/tests/test_models.py`.
**Approach:** Use the Postgres already on the box (dedicated `gas_portal` DB). Tables: `clients`, `contacts` (unique (email, client_id), status), `invites` (token_hash, contact_id, expires_at, used_at, created_by, created_ip), `sessions` (id/jti, contact_id, client_id, issued_at, expires_at, revoked_at), `audit_log`, `rate_limit`. Migrations run on deploy.
**Patterns to follow:** `backend/app/config.py` pydantic-settings; keep secrets in `/etc/gas-portal/api.env`.
**Test scenarios:**
- Happy path: each model persists and reloads; unique (email, client_id) enforced.
- Edge: same email under two clients = two rows (R14); duplicate (email, client) rejected.
- Error: missing `DATABASE_URL` fails fast at startup.
**Verification:** Migrations apply cleanly on a fresh DB; models CRUD in a test; `typecheck`/`build` (frontend) unaffected.

- [ ] **Unit 3: Admin authorization (distinct, server-enforced)**

**Goal:** Introduce an "admin" grant separate from staff access, enforced on every admin route.
**Requirements:** R1, R10.
**Dependencies:** Unit 2.
**Files:** Modify: `backend/app/config.py` (admin set) or `backend/app/security.py` (emit `is_admin` claim), `backend/app/deps.py` (add `current_admin` → 403). Test: `backend/tests/test_admin_auth.py`.
**Approach:** Decide config-set vs Entra group claim (Unit 1/tenant). `current_admin` rejects non-admin staff with 403. Admin-set changes are audited (R10).
**Patterns to follow:** `backend/app/deps.py:current_staff`.
**Test scenarios:**
- Happy path: admin email → allowed.
- Error: staff-but-not-admin → 403 on an admin route; unauthenticated → 401.
- Integration: 403 enforced at API even if the UI is bypassed (direct call).
**Verification:** Admin routes reject non-admins server-side; staff portal still works.

- [ ] **Unit 4: Per-identity data serving + default-deny (R13)**

**Goal:** Serve client data from the backend scoped to the session's client, default-deny, behind an isolation flag.
**Requirements:** R9, R13.
**Dependencies:** Units 2, 6 (client session). Can begin against a stub session.
**Files:** Create: `backend/app/clients_api.py` (`GET /api/clients`, `GET /api/reports?...` scoped), server-side seed loader; Modify: `src/adapters/bff/clients.bff.ts` (new), `src/adapters/index.ts` (select bff for clients), `src/features/clients/ClientContext.tsx` (consume port async), `vite.config.ts` (proxy already set). Test: `backend/tests/test_data_scoping.py`.
**Approach:** Backend returns only the authenticated session's `client_id` data; an identity with no single-client scope (or flag off for real data) gets zero data. Relocate the current fixtures to a server-side seed; supersede the `INTEGRATION_POINTS.md` fixture-fallback for client data paths (no fallback for real data). `ISOLATION_VERIFIED` flag (default off) gates real (non-demo) data.
**Execution note:** Add the cross-client access test first (default-deny is the security boundary).
**Test scenarios:**
- Happy path: client A session → only A's reports.
- Error/security: A's session requests B's report id → 403/empty, never B's data.
- Edge: session with no resolvable client → zero data (default-deny); flag off → no real data served.
- Integration: SPA `ClientContext` renders from the API for an authenticated client.
**Verification:** Cross-client request returns nothing; demo path still renders; isolation test (Unit 12) passes.

- [ ] **Unit 5: Invite issuance + Graph email (admin)**

**Goal:** Admin creates client/contacts and sends magic-link invites by email.
**Requirements:** R2, R3, R12, R15, R17, R10.
**Dependencies:** Units 2, 3; (Unit 1 = hand-rolled).
**Files:** Create: `backend/app/clients_admin_api.py` (`POST /api/clients`, `POST /api/clients/{id}/contacts`, resend), `backend/app/email_graph.py` (sendMail client + templates), `backend/app/tokens.py` (CSPRNG + hash). Test: `backend/tests/test_invite.py`, `backend/tests/test_tokens.py`.
**Approach:** Generate ≥128-bit token, store only its hash (R15), email the raw token link via Graph from `anomaly@jera.co.za` using the approved branded template (reuse the preview HTML). Record audit + delivery status (R4/R10/R17).
**Patterns to follow:** the verified sendMail call; `docs/specs` email preview design.
**Test scenarios:**
- Happy path: invite creates contact (invited) + sends; audit row written; token stored hashed (raw never persisted/logged).
- Edge: same email invited to a 2nd client → new (email,client) contact (R14).
- Error: Graph failure → delivery status `failed`, admin-visible (R17), no silent success.
- Security: token entropy ≥128 bits; DB stores hash only.
**Verification:** Admin can invite; email arrives; DB holds hashed token + audit.

- [ ] **Unit 6: Magic-link verify + server-validated client session**

**Goal:** A client redeems a link and gets a revocable, per-client, server-validated session.
**Requirements:** R6, R7, R11, R14, R15.
**Dependencies:** Units 2, 5.
**Files:** Create: `backend/app/client_auth_api.py` (`/api/auth/client/verify`, `/api/auth/client/session`, `/api/auth/client/logout`), Modify: `backend/app/deps.py` (`current_client` validates session server-side). Test: `backend/tests/test_client_auth.py`.
**Approach:** Verify token (exists, unexpired, unused, constant-time compare), mark used, create a `sessions` row, set an HttpOnly+Secure+SameSite=Lax cookie carrying an opaque session id checked on every request. Multi-client email → client chooser before issuing a scoped session (R14).
**Test scenarios:**
- Happy path: valid token → session scoped to the right client.
- Error: used / expired / forged / missing token → one identical "no longer valid" outcome (R7), nothing revealing existence.
- Edge: email maps to 2 active contacts → chooser; session always one client.
- Security: session validated server-side each request (revocable).
**Verification:** Client logs in via link; session resolves to exactly one client; reused link rejected.

- [ ] **Unit 7: Self-service re-link (rate-limited, no enumeration)**

**Goal:** Active contacts request a fresh link themselves.
**Requirements:** R8, R16, R17.
**Dependencies:** Units 5, 6.
**Files:** Modify: `backend/app/client_auth_api.py` (`POST /api/auth/client/relink`); Create: `backend/app/ratelimit.py`. Test: `backend/tests/test_relink.py`.
**Approach:** Issue a new link only for an active, non-revoked contact; respond identically regardless of match (R8), rate-limited per email+IP, constant-time (R16).
**Test scenarios:**
- Happy path: active contact → new link sent; response neutral.
- Error: unknown/revoked email → identical neutral response, no link; revoked client's contacts blocked.
- Security: rate limit triggers after threshold; response timing constant (no enumeration via latency).
**Verification:** Active contacts get links; non-active get nothing; identical responses; limits enforced.

- [ ] **Unit 8: Revocation + admin contact/status APIs**

**Goal:** Admins see contact status/last-login/delivery and revoke contacts or whole clients (effective next request).
**Requirements:** R4, R5, R10, R11.
**Dependencies:** Units 2, 3, 6.
**Files:** Modify: `backend/app/clients_admin_api.py` (list contacts, revoke contact, revoke client). Test: `backend/tests/test_revoke.py`.
**Approach:** Revocation sets `revoked_at` on contact (and cascade for whole client) + marks sessions revoked; `current_client` rejects on next request. Revoked contacts stay listed for audit.
**Test scenarios:**
- Happy path: list shows status/last-login/delivery; revoke a contact.
- Integration: revoked contact's existing session fails on next request (within seconds).
- Edge: whole-client revoke blocks all its contacts; revoked rows still visible.
**Verification:** Revoke blocks access on next request; audit records who/when.

- [ ] **Unit 9: Admin "Invite & manage clients" UI (admin-gated)**

**Goal:** The in-app screen to invite/manage clients.
**Requirements:** R1, R2, R4, R5.
**Dependencies:** Units 3, 5, 8.
**Files:** Create: `src/routes/admin.clients.route.tsx`, `src/features/admin/*` components; Modify: `src/app/Router.tsx` (admin-gated route), `src/shell/Sidebar.tsx` (admin-only nav). Test: `src/features/admin/*.test.tsx` (as the repo tests components).
**Approach:** Select/create client, enter email(s), send; contact list with status/last-login/delivery; resend; revoke (whole-client revoke confirmed). Nav entry + route hidden/denied for non-admins (mirror server 403).
**Test scenarios:**
- Happy path: invite flow renders, submits, shows success.
- States: empty contact list, in-progress send, send failure surfaced (R17), never-logged-in shows "Pending".
- Edge: non-admin staff cannot see/reach the area.
- Integration: revoke whole client shows confirm.
**Verification:** Admin can run the full invite/manage loop in-app; non-admins cannot.

- [ ] **Unit 10: Client login & re-link UI**

**Goal:** The client-facing flows for the magic link.
**Requirements:** R6, R7, R8, R14.
**Dependencies:** Units 6, 7.
**Files:** Modify: `src/routes/authCallback.route.tsx` (handle client token verify), `src/features/login/LoginCard.tsx` (client email→link request), `src/adapters/bff/auth.bff.ts` (new client endpoints), `src/app/Router.tsx` (client chooser + invalid-link routes). Test: relevant `*.test.tsx`.
**Approach:** Callback verifies token → session → dashboard; client chooser when multi-client; "enter your email for a link" self-service page; one generic invalid-link page routing to self-service (R7).
**Test scenarios:**
- Happy path: valid link → dashboard (only their data).
- States: used/expired/invalid link → generic "request a new one" → self-service.
- Edge: multi-client email → chooser.
- Integration: bff client session drives `RequireAuth` + `ClientContext`.
**Verification:** End-to-end client journey from emailed link to scoped dashboard.

- [ ] **Unit 11: Deliverability + email operations**

**Goal:** Make external delivery reliable and observable.
**Requirements:** R12, R17, R4.
**Dependencies:** Unit 5.
**Files:** Modify: `backend/app/email_graph.py` (templates, headers), `docs/deployment/` (DNS notes). Test: `backend/tests/test_email_render.py`.
**Approach:** Confirm SPF/DKIM/DMARC for `anomaly@jera.co.za`; anti-phish framing (clearly the Jera GAS portal); TTL tolerant of link-scanner prefetch (or prefetch-tolerant verify); capture/display delivery + bounce status to admins (feeds Unit 9).
**Test scenarios:**
- Happy path: rendered email matches the approved branded template; required headers present.
- Error: bounce/failure recorded and surfaced to admin.
- Edge: scanner pre-fetch of the link does not silently consume the only token (or TTL/grace handles it).
**Verification:** Test send lands in inbox (not junk) for an external-style mailbox; bounces visible.

- [ ] **Unit 12: Isolation test, flag flip, and go-live**

**Goal:** Prove cross-client isolation, then enable real data and retire passcode sites.
**Requirements:** R9, R13, success criteria.
**Dependencies:** Units 4, 6, 8.
**Files:** Create: `backend/tests/test_isolation.py` (runtime analogue of `scripts/verify-client-isolation.sh`); Modify: deploy/runbook for the `ISOLATION_VERIFIED` flag + passcode-site retirement.
**Approach:** Automated test asserts no client session can reach another client's data by any endpoint/param; flip `ISOLATION_VERIFIED` on only after it passes; retire a passcode site only after that client is verified isolated in production.
**Test scenarios:**
- Security: matrix of client A sessions vs B's resources → all denied.
- Edge: no-scope identity → zero data; flag off → no real data.
**Verification:** Isolation test green in CI-less gate; one real client served real data + verified before any passcode site retires.

## System-Wide Impact
- **Interaction graph:** new client session path runs parallel to staff SSO; `RequireAuth` now admits both staff and client sessions (via `current_*` deps); `ClientContext`/`ReportContext` data source moves from build-time registry to the `ClientsPort` bff adapter for client sessions.
- **Error propagation:** API returns typed errors; client invalid-link/denied states never leak existence; admin sees delivery/bounce failures.
- **State lifecycle risks:** session revocation must invalidate immediately; invite tokens single-use; rate-limit counters need cleanup.
- **API surface parity:** staff SSO endpoints unchanged; new `/api/auth/client/*`, `/api/clients*` added.
- **Integration coverage:** revoke→next-request-blocked, magic-link→scoped-session, cross-client default-deny — all need integration tests, not just unit mocks.
- **Unchanged invariants:** the 10 report-scoped invariants and staff Microsoft SSO are not changed; client data scoping is additive behind the seam.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Isolation regresses to runtime (a scoping bug leaks data) | Default-deny + Unit 12 automated isolation test + flag gate before real data |
| "Revoke immediately" not real (stateless tokens) | Server-validated sessions (Unit 6/Key Decisions) |
| Magic-link email lands in spam for external clients | Unit 11 SPF/DKIM/DMARC + anti-phish framing; verify before retiring passcode sites |
| Link-scanner prefetch consumes single-use token | Scanner-tolerant TTL/grace (Unit 11); self-service re-link as backstop |
| Build-vs-buy chosen wrong / rework | Unit 1 spike first; both options sit behind `AuthPort`/`ClientsPort` |
| Admin grant defaults to "all staff" | Unit 3 distinct grant, default-deny, server-enforced |
| Mail.Send sends as any mailbox | Application Access Policy (admin task, in progress) |

## Documentation / Operational Notes
- Update `docs/deployment/HETZNER_DEPLOYMENT.md` for the DB, migrations, `ISOLATION_VERIFIED` flag, and `/api/auth/client/*` proxy (already under `/api/*`).
- Record the build-vs-buy decision (Unit 1) and the passcode-site retirement event.
- Prereq (external): `Mail.Send` admin consent ✅ done; Application Access Policy restricting to `anomaly@jera.co.za` — admin task pending.

## Phased Delivery
- **Phase A (decision):** Unit 1.
- **Phase B (backend foundation):** Units 2, 3.
- **Phase C (core auth + data):** Units 4, 5, 6, 7, 8.
- **Phase D (frontend):** Units 9, 10.
- **Phase E (hardening + go-live):** Units 11, 12.

## Sources & References
- **Origin document:** `docs/specs/2026-06-08-client-invite-access-requirements.md`
- Design: `docs/specs/2026-06-08-phase-2-auth-design.md`, `docs/specs/2026-06-08-multi-client-runtime-switcher-design.md`
- Code: `backend/app/*`, `src/adapters/*`, `src/features/clients/*`, `scripts/verify-client-isolation.sh`
