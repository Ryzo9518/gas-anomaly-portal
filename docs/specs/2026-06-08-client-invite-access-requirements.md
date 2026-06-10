---
date: 2026-06-08
topic: client-invite-access
---

# Client Invite & Access (Model B — backend-issued)

## Problem Frame

Client access today is manual and unscalable: each client gets a separately built static site with a passcode baked into the bundle, and an admin hand-delivers the link + passcode. There is no record of who has access, no way to revoke a single person, the passcode lives in the client's inbox forever, and every new client is a manual build/deploy.

Jera needs admins to **invite client contacts from the portal UI** and have those people get **secure, revocable, audited access that shows only their own data** — with no per-client build. This is the access foundation the portal was designed for (the Phase-2 backend seam in `docs/specs/2026-06-08-phase-2-auth-design.md` and `docs/claude-handoff/INTEGRATION_POINTS.md`). "The seam" referenced throughout is the identity + scoped session established by R1–R12/R14–R17; R13 binds data-serving to that identity. Built once so R1–R17 are not redone when R13's server-side serving lands.

> **Isolation failure-mode note.** Model B is the safest option for *governance and revocation*, but it changes the data-isolation failure mode from **structurally impossible** (today: a client's bundle physically contains no other client's data) to **runtime query-scoping correctness** (one scoping bug could leak). R13's default-deny gate and an automated isolation test are therefore mandatory, not optional.

## Access Flow (target)

```
Admin (staff, MS SSO, admin-grant)   Backend                         Client
  │  invite contact email(s)           │                               │
  ├────────────────────────────────────▶ create contact (email,client) │
  │                                    ├── send magic link (Graph) ─────▶  email arrives
  │                                    │   (token: random, hashed)      │  clicks link
  │                                    ◀── verify single-use token ─────┤
  │                                    ├── issue SERVER-VALIDATED        ▶  in — sees ONLY
  │                                    │   client-scoped session         │  their client's data
  │  revoke contact / client ──────────▶ next request fails (≤secs)     │  blocked
  │  view contacts: status,           │                               │
  │  last login, delivery status ─────▶ audit log                      │
                                       (return visit: client self-requests a fresh link, R8)
```

## Requirements

**Admin invite & management**
- R1. Invite/manage is **admin-only**, enforced **server-side**. "Admin" is a **distinct privilege from staff-portal access**, **default-deny**: every invite / revoke / contact-list / audit API route rejects non-admin staff at the backend (HTTP 403), not just in the UI. Changes to the admin set are themselves audited (R10). *(This supersedes the earlier "any staff invites whoever" note in `2026-06-08-phase-2-auth-design.md` §14.3.)*
- R2. To invite, an admin selects or creates the **client (organisation)** and enters one or more **contact email addresses**; each contact is invited individually. (Exact form interaction — single vs batch entry, select vs create — is a planning/design item.)
- R3. Sending an invite emails each contact a **single-use, time-limited magic link** (token rules: R15).
- R4. Admins can view a client's contacts with each contact's **status** (invited / active / revoked), **last login**, and **email delivery status** (sent / delivered / bounced / failed), and can **re-send** a contact's link.
- R5. Admins can **revoke** a contact, and revoke a whole client; revocation takes effect on the contact's **next request** (server-validated session, R11) — verified within seconds. Whole-client revoke is **confirmed** before applying. Revoked contacts remain visible in the list for audit.

**Client access & identity**
- R6. A client opens their magic link and is **signed in without a password or passcode**.
- R7. Magic links are **single-use** and **expire**. A **used, expired, forged, or missing** token all yield one identical outcome — "this link is no longer valid, request a new one" routing to self-service (R8) — with nothing that reveals whether a contact exists.
- R8. **Self-service re-link**: a client enters their email and receives a new single-use link **only if** they are an active, non-revoked contact (predicate per R14). The response is **identical regardless of match** (no account enumeration), rate-limited and constant-time (R16).
- R9. A signed-in client sees **only their own organisation's data** — never another client's, never the staff/all-clients view (enforced by R13).
- R14. **Contact identity key is (email, client).** The same email may be an active contact for more than one client. When a login or re-link request resolves to **multiple** active contacts for one email, the client is shown a **client chooser** (or issued per-client links); a session is always scoped to **exactly one** client. *(Default chosen while "shared advisor" likelihood is unknown — if it never occurs this behaves as one-email-one-client, and choosing it now avoids a later rebuild.)* "Active, non-revoked contact" = `contact.status == active` AND the contact's client is not revoked.

**Security & anti-abuse**
- R15. Magic-link tokens are **≥128-bit cryptographically random**, stored only as a **keyed hash** (never plaintext), and compared in **constant time**. Raw tokens / full magic-link URLs are never written to logs or the audit trail.
- R16. Link **issuance**, **redemption**, and **self-service re-link** endpoints are **rate-limited per email and per IP**, with **constant-time responses** so neither response body nor latency reveals whether an email is registered.

**Governance & audit**
- R10. The system records an **audit trail**: invite sent (by which admin), link used / login, self-service link requested, revocation (by which admin), and **admin-set changes** — each with timestamp and target contact/client. Logs store a **token reference/hash, never the raw token or URL**. Contact emails are **PII** with a defined retention period; **audit read access is admin-only**.
- R11. Client sessions are **validated server-side on every request** (a server-side session record or equivalent), so revocation (R5) takes effect on the next request. Long-lived stateless tokens that cannot be revoked are **non-conformant**. Sessions are time-limited; on expiry the client re-authenticates via R8.

**Email delivery**
- R12. Invite and re-link emails are sent via the **Jera M365 account (Microsoft Graph) from `anomaly@jera.co.za`**, Jera-branded, with the link and clear instructions.
- R17. **Deliverability:** `anomaly@jera.co.za` must have **SPF / DKIM / DMARC alignment**; emails must clearly identify the Jera GAS audit portal (a link from a `jera.co.za` address to a `gasecosys.co.za` portal otherwise reads as phishing and is spam-prone); the link TTL must tolerate corporate link-scanners that pre-fetch URLs (or tokens must be prefetch-tolerant); and **delivery failures/bounces are visible to admins (R4)** — never a silent client lockout.

**Data isolation (foundational, default-deny)**
- R13. A client's data is **served per authenticated identity by the backend**. An identity with no resolvable single-client scope receives **zero data (default-deny)**. **Real (non-demo) client data is not served to any client session until** server-side scoping is implemented **and verified by an automated isolation test** (analogous to the existing build-time `scripts/verify-client-isolation.sh`), gated behind a flag that is **off by default**. Real client data is not shipped in any publicly reachable bundle. This runtime-enforced model replaces today's build-time per-client scoping (see the failure-mode note above).

## Success Criteria
- The **access-provisioning** step — admin invites a contact → that person is logged in — takes **minutes with no per-client build/deploy**. *(Loading a client's audit results into the system is a separate workstream — see R13 / Deferred to Planning.)*
- Revoking a contact blocks them on their **next request, within seconds** (verified).
- The audit log answers "who has access, who invited them, when did they last log in" for any client.
- An **automated isolation test** proves a signed-in client cannot reach another client's data by any URL or API call.
- The interim passcode sites are retired **only after a real client has been served real data via Model B with isolation verified in production** (not merely when "Model B ships").
- Onboarding the Nth client's **access** requires no code build/deploy.

## Scope Boundaries
- **No client self-registration** — admins invite; clients never sign themselves up.
- **Staff login unchanged** — Microsoft SSO already exists; this builds on it.
- **Client audit-data ingestion** (how audit results get into the backend for R13) is a **related but separate workstream**, not built here. R1–R12/R14–R17 (the access layer) ship on the small "scope sessions to a client" wire; the data-migration/ingestion piece gates the first *real* client.
- The interim per-client **passcode sites stay live** until the retirement criterion above is met, then are decommissioned (tracked as a separate follow-up).
- **UI visual/layout design** of the admin area is left to planning/design.

## Key Decisions
- **Model B (backend-issued access)** over site-per-client: best for governance, revocation, and scale; follows the existing Phase-2 seam. (Rejected: site-per-client + emailed passcode — unscalable, weak governance. Acknowledged trade-off: isolation moves from compile-time-structural to runtime-enforced — mitigated by R13 default-deny + isolation test.)
- **Per-person identities keyed (email, client)** (R14) — enables audit, per-person revocation, and shared advisors without a later rebuild.
- **Admin-only invite/revoke, server-enforced and default-deny** (R1).
- **Magic-link (passwordless)** with **self-service re-link** kept in v1 (gated by R16 anti-abuse).
- **Server-validated client sessions** (R11) so revocation is real.
- **Email via Jera M365 Graph** from `anomaly@jera.co.za` (Gasecosys has no mail tenant).

## Dependencies / Assumptions
- **Microsoft Graph `Mail.Send` application permission with admin consent** on the **Gasecosys** Entra app — **GRANTED & VERIFIED 2026-06-08** (app token carries the `Mail.Send` role). Still to confirm: the `anomaly@jera.co.za` mailbox exists/sends, and an **Application Access Policy** restricts the app to that mailbox (least privilege) — `Mail.Send` (application) can otherwise send as any mailbox in the tenant.
- A backend **datastore** (Postgres, already on the box) for clients / contacts / invites / **sessions** / audit / rate-limit counters. The current backend is stateless (HS256 cookie, no DB) — R5/R11/R15/R16 require adding this.
- **Graph credentials** stored in a server secret store (not source control), with a rotation policy.
- Builds on the **already-live** staff Microsoft SSO + FastAPI backend.
- **Admin list confirmed by Ryan before go-live** (owner: Ryan). Current staff allow-list: kevinm, ryan, jp.schmitt, tshegofatsos @jera.co.za.

## Outstanding Questions

### Resolve Before Planning
- (none — product scope is resolved; the only pre-go-live confirmation is the admin list, owned by Ryan)

### Deferred to Planning
- [Affects R3/R11/R15][Technical][Needs research] **Build-vs-buy spike:** managed **Entra External ID** passwordless (Microsoft issues/revokes tokens, hardens enumeration) vs hand-rolled magic-link. Self-built auth is the highest-reversal-cost component — evaluate before committing the token/session build.
- [Affects R13][Technical][Needs research] Data model + ingestion workflow for server-side per-client data: admin data-entry UI vs structured import, and how it replaces the bundled-fixture + fixture-fallback contract in `INTEGRATION_POINTS.md` for client data paths.
- [Affects R7/R11][Technical] Exact magic-link expiry and client session lifetime.
- [Affects R10][Technical] Audit log storage, schema, and retention.
- [Affects R3][Technical] Graph `sendMail` integration, templating, and bounce/error handling.
- [Affects R2/R4/R5/R7/R8/R1][Design] Admin/client UI interaction states: invite form (single vs batch entry, select vs create client), contact-list empty/loading/partial-failure states, post-send feedback, used/expired/invalid-link pages, whole-client revoke confirmation, non-admin visibility of the invite area.

## Next Steps
-> `/ce-plan` for structured implementation planning. (Begin with the build-vs-buy spike, since it shapes the token/session work.)
