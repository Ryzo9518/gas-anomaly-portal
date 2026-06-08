# Phase 2 Auth Design — Staff M365 SSO + Client Magic Link

**Status:** Draft spec for review (JP). Not yet implemented.
**Author:** Ryan (with Claude), 2026-06-08
**Base commit:** `7788b1b`
**Scope:** Real authentication for `anomaly.gasecosys.co.za`, replacing the Phase 1 mock (`src/adapters/mock/auth.mock.ts`, open session).
**Governance:** This spec must be implemented under `AGENTS.md` (branch → 3 quality gates → PR → deploy runbook). It proposes a **port extension** and **scoped login-view changes** — both are deviations from the "adapter-seam-only" wording in `INTEGRATION_POINTS.md` and therefore need an explicit recorded decision (see §11).

---

## 1. Product decision (locked)

Two sign-in paths into the same portal:

| Door | Who | Method | 2FA / security |
|------|-----|--------|----------------|
| **Staff** | Jera internal team | **"Sign in with Microsoft"** (Entra ID / M365 OIDC) | Enforced by Microsoft (Conditional Access / MFA). We store no staff passwords. |
| **Client** | External client contacts | **Magic link** emailed to them (passwordless), single-use + short TTL | Possession of the mailbox + single-use token. Scoped to that client's report(s) only. |

Email (magic links + future notifications) is sent via **Microsoft Graph `sendMail`** using a dedicated **Entra App registration** (Ryan is creating it).

Non-goals for this phase: client self-registration, social logins, SMS 2FA, role/permission UI beyond "staff vs client".

---

## 2. Architecture overview

```
                         ┌─────────────────────────────┐
  Browser (SPA)          │  Caddy  (anomaly.gasecosys)  │
  React + bff adapter ──▶│  static SPA  +  /api/* proxy │──▶ FastAPI backend (127.0.0.1:8001)
                         └─────────────────────────────┘            │
                                                                    ├─▶ Microsoft Entra (OIDC)  [staff]
                                                                    ├─▶ Microsoft Graph sendMail [client emails]
                                                                    └─▶ Postgres (users, magic_link_tokens, sessions)
```

- The SPA stays a static client-side-routed build (per the deploy runbook). The only new server-side piece is the FastAPI backend behind `/api/`.
- The Caddy `/api/` reverse-proxy block already exists (commented) in `docs/deployment/HETZNER_DEPLOYMENT.md §7` and in `vite.config.ts` for local dev.
- **Backend port:** use **8001** on the Hetzner box. Port 8000 is already taken by the intacct-toolkit backend (`uvicorn`). Bind to `127.0.0.1` only; expose solely through Caddy.

---

## 3. Front-end seam — the truth about the current code

`INTEGRATION_POINTS.md` is slightly out of date. The **actual** port (`src/ports/auth.port.ts`) is authoritative:

```ts
interface Session { userId: string; displayName: string; userName: string; isOpenSession?: boolean }
interface SignInCredentials { email: string; password: string }
interface AuthPort {
  getSession(): Promise<Session | null>;
  signIn(credentials: SignInCredentials): Promise<Session>;
  signOut(): Promise<void>;
}
```

(The doc's `login()` / `AuthResult` names do not exist in code — use `signIn()` / `Session`.)

`authStore.ts` is already Phase-2-aware: it has `setSession({ jwt, expiresAt, client_id, actor })` and documents the magic-link/JWT path. `RequireAuth` (`src/app/Router.tsx`) gates purely on `actor` being non-null and bounces to `/login`.

### 3.1 Required port extension

Neither door fits the single `signIn(email, password)` call:
- A client requesting a magic link produces **no session** (just sends an email).
- A magic-link/SSO **callback** completes with a token/code, not a password.

Proposed `AuthPort` (final names are JP's call; `authStore` comments already sanction extending here for "MFA/OTP"):

```ts
interface AuthPort {
  getSession(): Promise<Session | null>;          // session restore on app boot (reads cookie)
  signOut(): Promise<void>;

  // Client door
  requestMagicLink(email: string): Promise<{ sent: true }>;   // always returns sent:true (no account enumeration)
  completeMagicLink(token: string): Promise<Session>;         // called by the callback route

  // Staff door
  startMicrosoftLogin(): void;                                 // full-page redirect to /api/auth/microsoft/start
  // completion handled server-side; SPA just calls getSession() on return
}
```

`signIn(credentials)` may be retired or kept as a dev shim. Keep `src/adapters/mock/auth.mock.ts` working so demo/offline mode (and Gate 3) still runs without a backend.

### 3.2 Login-view changes (scoped, unavoidable)

Changing the auth *method* means the login UI changes (this is the one place `INTEGRATION_POINTS.md`'s "no view changes" does not hold):
- `LoginCard` (`src/features/login/LoginCard.tsx`): replace password field with (a) **"Sign in with Microsoft"** button → `startMicrosoftLogin()`, and (b) an **email field + "Email me a link"** → `requestMagicLink()` then a "Check your inbox" state. Keep the locked visual system, tokens, and `GasLoginBackground`.
- **New callback route** `/auth/callback` (client magic link + staff return): reads `?token=` (client) or just calls `getSession()` (staff), hydrates the store via `setSession()`, then `navigate("/dashboard")`. Register it in `src/app/Router.tsx` as a public route (outside `RequireAuth`), mirroring `/login`.
- **Session restore on boot:** call `auth.getSession()` once at app start (e.g. in `Providers`/`App`) and hydrate `authStore` so a refresh keeps the user signed in (Phase 1 store is intentionally not persisted; Phase 2 relies on the backend cookie instead).

### 3.3 Adapter switch (per the migration checklist)

- Add `src/adapters/bff/auth.bff.ts` implementing the extended `AuthPort` against `/api/*`.
- In `src/adapters/index.ts`: add `"bff"` to `AdapterKind` and select via `VITE_ADAPTER=bff` (keep `mock` as default so demo builds are unchanged).
- Uncomment the `/api/` proxy in `vite.config.ts`.

---

## 4. Backend API contract (FastAPI, mounted at `/api`)

All non-2xx return `{ error: string, code: string }` (per the repo's Error Handling Contract). Session is delivered as an **HttpOnly, Secure, SameSite=Lax cookie** holding a signed JWT — not localStorage — so XSS can't read the token. CSRF: state-changing routes require the cookie + an `Origin` check (SameSite=Lax already blocks cross-site form posts).

### Staff — Microsoft OIDC (auth-code + PKCE)
- `GET /api/auth/microsoft/start` → 302 to Entra `authorize` (tenant-restricted, `scope=openid profile email`, `state`, PKCE).
- `GET /api/auth/microsoft/callback?code=&state=` → backend exchanges code for tokens, validates the ID token, **enforces tenant + allowed-group/domain (§9)**, upserts the staff user, sets the session cookie, 302 → `/auth/callback`.
- The SPA's `/auth/callback` then calls `GET /api/auth/session`.

### Client — Magic link
- `POST /api/auth/magic-link/request` body `{ email }` → if the email maps to an invited client, generate a single-use token (store hash + expiry + report scope), email the link via Graph. **Always** respond `{ sent: true }` (no account enumeration). Rate-limit per email + per IP.
- `GET /api/auth/magic-link/verify?token=` → validate (exists, unexpired, unused), mark used, set session cookie scoped to the client's report(s), 302 → `/auth/callback`.
  - Link URL emailed: `https://anomaly.gasecosys.co.za/auth/callback?token=<token>` → SPA forwards token to `completeMagicLink()` → `POST /api/auth/magic-link/verify`. (Choose either a backend-redirect verify or an SPA-driven verify; pick one and document it. Backend-redirect is simpler and keeps the token out of SPA history.)

### Shared
- `GET /api/auth/session` → `Session | null` (reads cookie). Backs `getSession()`.
- `POST /api/auth/logout` → clears cookie. Backs `signOut()`.
- **Staff invite a client:** `POST /api/clients/invite` (staff-only) body `{ email, reportId }` → creates/links the client, sends the first magic link. This is the "invite the client to the portal" action.

JWT claims: `sub`, `actor` (displayName/userName), `role` ("staff"|"client"), `client_id` (clients only — drives `setSession`), `exp`. Staff session ~8–12h; client session shorter (e.g. 2–4h). Refresh strategy: re-issue on activity or require re-auth — JP's call, document it.

---

## 5. Email via Microsoft Graph

- App registration with **application permission `Mail.Send`** (admin consent required).
- Send with client-credentials (`POST /v1.0/users/{senderUpn}/sendMail`).
- **Sender mailbox:** a real/shared mailbox (decision in §10). `Mail.Send` (application) can send as any mailbox in the tenant — recommend an Application Access Policy to restrict the app to *only* the sender mailbox.
- Templates: magic-link invite, magic-link re-send, (future) "report ready" notification. Plain + HTML, Jera-branded.
- This is the same M365 capability the intacct-toolkit uses; reuse the pattern, but a **separate App registration** for this portal is cleaner than sharing intacct's.

---

## 6. Data model (Postgres)

Reuse the Postgres already on the Hetzner box; create a dedicated database/schema `gas_portal` (do **not** share intacct's DB).

- `users` — `id`, `email` (unique), `role` (`staff`|`client`), `display_name`, `entra_oid` (staff), `created_at`, `last_login_at`, `disabled`.
- `client_reports` — `user_id` → `report_id` mapping (which report(s) a client may see). Resolves the "how is a client tied to a report" question (§10).
- `magic_link_tokens` — `id`, `user_id`, `token_hash`, `report_id`, `expires_at`, `used_at`, `created_ip`, `created_by` (staff who invited).
- `sessions` (optional if JWT is stateless) — for server-side revocation/audit: `jti`, `user_id`, `issued_at`, `expires_at`, `revoked_at`.
- `audit_log` (recommended) — sign-ins, invites, magic-link issuance/verification.

Store only **hashes** of magic-link tokens. Tokens are high-entropy random (≥32 bytes).

---

## 7. Deployment (per `HETZNER_DEPLOYMENT.md`)

1. **SPA**: unchanged static-serve + SPA fallback. (Note: the live site must be **rebuilt from `main`** and served per the runbook — see §12 about the current interim deployment.)
2. **Backend**: `gas-portal-api.service` (systemd), `uvicorn` bound to `127.0.0.1:8001`, `Restart=on-failure`, env from a root-only `/etc/gas-portal/api.env` (never in the repo).
3. **Caddy**: add an `/api/*` reverse-proxy to `127.0.0.1:8001` inside the existing `anomaly.gasecosys.co.za` block (the runbook's commented block). Keep everything else.
4. **Secrets** (in `api.env`, 0600, root): `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `GRAPH_SENDER_UPN`, `JWT_SIGNING_KEY`, `DATABASE_URL`, `MAGIC_LINK_TTL_MIN`, `ALLOWED_STAFF_*` (§9).
5. **Redirect URI** registered in Entra: `https://anomaly.gasecosys.co.za/api/auth/microsoft/callback`.
6. Record SHA + fixture mode in the deploy log (runbook §6).

---

## 8. Phase-2 implementation checklist (for JP)

Backend
- [ ] FastAPI app, `/api` mount, error envelope, CORS off (same-origin via Caddy), cookie/session middleware.
- [ ] Postgres schema + migrations (§6).
- [ ] Entra OIDC start/callback (tenant + group/domain enforcement).
- [ ] Magic-link request/verify (+ rate limiting + always-`sent:true`).
- [ ] `GET /api/auth/session`, `POST /api/auth/logout`, `POST /api/clients/invite`.
- [ ] Graph `sendMail` integration + branded templates.

Front-end
- [ ] `src/adapters/bff/auth.bff.ts` implementing the extended `AuthPort`.
- [ ] Extend `AuthPort` (§3.1); keep `mock` adapter compiling + demo-functional.
- [ ] `AdapterKind += "bff"`, `VITE_ADAPTER` switch, uncomment vite proxy.
- [ ] `LoginCard` rework (MS button + email-link request + "check inbox" state).
- [ ] `/auth/callback` route + boot-time `getSession()` session restore.
- [ ] Pass all 3 quality gates (typecheck, build, manual Gate 3 regression list).

Deploy
- [ ] `gas-portal-api.service`, Caddy `/api/` block, `api.env`, Entra redirect URI, deploy-log entry.

Tests
- [ ] Staff SSO end-to-end (incl. MFA prompt), tenant/group rejection path.
- [ ] Client invite → email → magic-link → scoped report access; expired/used/forged token rejected.
- [ ] Refresh keeps session; logout clears it; demo/offline (`mock`) still works.

---

## 9. Security notes

- **Staff:** restrict to the Jera tenant **and** an allowed group or verified domain — a tenant alone may include guests. Lean on Entra Conditional Access for MFA (don't reimplement 2FA).
- **Client magic links:** single-use, short TTL (15 min default), hashed at rest, rate-limited, no account enumeration, scoped to specific report(s).
- **Session cookie:** HttpOnly + Secure + SameSite=Lax; short-lived; revocable via `sessions`/`jti` if stateless JWT proves insufficient.
- **Least privilege for email:** Application Access Policy so the App can only send from the one sender mailbox.
- **Secrets** never in the repo; root-only env file; rotate the client secret on a schedule.

---

## 10. Open decisions needed from Ryan / IT

1. **Allowed staff:** whole Jera tenant, a specific Entra **group**, or a domain (`@jera.co.za`)? (Recommend a dedicated group.)
2. **Sender mailbox** for magic-link emails: e.g. `noreply@gasecosys.co.za` vs a Jera address. (Must exist in the tenant the App registration lives in.)
3. **Client ↔ report mapping:** one client → one report, or multiple? Who can invite clients (any staff, or admins)?
4. **Magic-link TTL** (default 15 min) and **session lengths** (staff vs client).
5. **Tenant for the App registration:** Jera's existing M365 tenant (assumed). Confirm `gasecosys.co.za` email is sendable from it, or use a Jera address.

## 11. Prerequisites Ryan is providing (Entra App registration)

- `Tenant ID`, `Client ID`, `Client secret`.
- Graph **`Mail.Send`** application permission **with admin consent**.
- Redirect URI: `https://anomaly.gasecosys.co.za/api/auth/microsoft/callback`.
- Confirmation of the sender mailbox (§10.2).

## 12. Note on the current interim deployment

The site is presently serving the **older pre-built `dist`** via a small Node static server with a **Caddy basic-auth password gate** in front — a quick placeholder, **not** the runbook-compliant deployment. Before/with Phase 2:
- Rebuild from `main` (`npm ci && typecheck && build`) and serve per the runbook.
- **Remove the basic-auth gate** so the app's own login is the front door (only do this once real auth is live, or while in public-demo mode — the Phase 1 mock login does not actually restrict access).

## 13. Compliance with the Law (AGENTS.md)

- `ReportContext` / `?report=` / historical-freeze / plan-column / cumulative-KPI invariants: **untouched** (auth work doesn't alter report state).
- Stack additions are backend-only (FastAPI/Postgres) — no new front-end state lib/router/styling.
- Deviations requiring a recorded decision: **(a)** `AuthPort` extension (§3.1), **(b)** login-view changes (§3.2). `authStore.ts` already anticipates (a).
- All three quality gates run before any deploy; deploy follows the Hetzner runbook; commit messages use the repo format.

---

## 14. Provided configuration & answered decisions (2026-06-08)

**Entra App registration "Gasecosys" (created in Jera's tenant):**

| Item | Value |
|------|-------|
| Directory (tenant) ID | `4f124a4c-a71e-463c-a004-f65515cff124` |
| Application (client) ID | `efcf0a9c-ddcf-411d-8139-124cc772895b` |
| Object ID | `582a0baa-ddfb-4c43-bc07-609ccd344e8a` |
| Supported accounts | **My organization only** (single-tenant) — correct: only Jera staff can use the staff OIDC door |
| Platform / Redirect URI | **Web** → `https://anomaly.gasecosys.co.za/api/auth/microsoft/callback` ✅ matches §7 |
| Client secret | **Delivered out-of-band — NOT stored in this repo.** Secret ID `a2e87a97-0b51-4777-bd36-5d94a5412e3a`, expires 2028-06-07. Lives only in `/etc/gas-portal/api.env` as `ENTRA_CLIENT_SECRET` (root-only, 0600). **Rotate before production** (was shared over chat). |

**Answered decisions (refs §10):**
1. **Allowed staff = invite-only allow-list**, not the whole tenant. Staff authenticate via Jera Entra OIDC, but only users explicitly invited into the portal (`users.role='staff'`) gain access — the backend checks the allow-list, not merely a valid Jera token.
2. **Sender mailbox = `anomaly@jera.co.za`** (a Jera mailbox). gasecosys.co.za is cPanel-only with no Microsoft tenant, so **all** portal email originates from Jera's M365. The mailbox must exist (shared mailbox is fine) in Jera's tenant. Client magic-link emails will therefore arrive *from* `anomaly@jera.co.za` — expected and acceptable.
3. **Invites:** staff invite both staff and clients ("we invite who we want"). A client is tied to their report at invite time. (Confirm one-vs-many reports per client at build time; default = one.)
4. **TTLs:** defaults stand (magic link 15 min).

**Still outstanding in Entra (do before staff/email work):**
- **API permissions → Microsoft Graph → Application permission `Mail.Send` → Grant admin consent** (needed for sending magic-link emails). For staff OIDC, delegated `openid profile email User.Read` is sufficient and usually pre-consented.
- Recommended: an **Application Access Policy** restricting the app's `Mail.Send` to only `anomaly@jera.co.za` (least privilege — otherwise the app can technically send as any mailbox in the tenant).
