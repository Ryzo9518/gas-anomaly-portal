---
date: 2026-06-08
topic: client-auth-build-vs-buy
status: decided
decision: hand-rolled
---

# Decision Record: Client passwordless auth — Entra External ID vs hand-rolled

**Context:** Plan Unit 1 of `docs/plans/2026-06-08-client-invite-access.md`. Decide how external client contacts get passwordless access before building Units 2–12. The decision shapes the backend auth implementation.

## Options

- **A — Microsoft Entra External ID (CIAM):** a managed external-identity tenant issues/verifies passwordless sign-in (email OTP / magic link) for client users.
- **B — Hand-rolled magic link** in the existing FastAPI + Postgres + Microsoft Graph stack.

## Criteria scored

| Criterion | Entra External ID | Hand-rolled | Edge |
|---|---|---|---|
| Client UX (passwordless, no account setup) | Managed; but redirect to a Microsoft-hosted flow can read phish-adjacent for a `gasecosys` portal | Plain emailed link to our own domain | Hand-rolled (slight) |
| **(email, client) multi-client identity (R14)** | CIAM is identity-centric; mapping one identity to several client orgs + a chooser is awkward/custom | Native — `(email, client)` is just a table key | **Hand-rolled (strong)** |
| Cost | Per-MAU billing + a new billing/tenant surface to manage | Zero marginal cost | Hand-rolled |
| Security ownership | Microsoft owns token lifecycle, lockout, enumeration hardening | We own R15/R16 (CSPRNG, hashing, rate-limit, constant-time) forever | **External ID** |
| Ops complexity | Separate CIAM tenant, app registrations, user-flow config | Lives in the stack we already run | Hand-rolled |
| Fit with per-client data scoping (R13) | We **still** need our own backend session + scoping layer regardless — so we'd run External ID **and** our session/scoping system | One backend owns auth + scoping together | **Hand-rolled (strong)** |
| Reversibility | Frontend is behind `AuthPort`/`ClientsPort` either way; backend rework is real if switching later | Same | Tie — not free either way |

## Decision: **Hand-rolled (Option B)**

Rationale:
1. **The data-scoping layer (R13) must live in our backend no matter what.** External ID would authenticate the user but not scope their data — so we'd still build the session + per-client scoping in FastAPI/Postgres. External ID therefore *adds a second system* without removing the work that dominates this plan.
2. **The `(email, client)` multi-client model (R14)** is a natural table key for us and awkward in a CIAM identity directory.
3. **Clients are simple external report-viewers** — they don't need a managed identity directory, profile self-service, or federation.
4. **Zero marginal cost** and no new billing/tenant surface; fits the existing FastAPI + Postgres + Graph stack already running on the box.

The one genuine downside — **we own client-auth security indefinitely** — is accepted and bounded by the plan's explicit security invariants (atomic single-use tokens, hashing at rest, per-email+IP rate limiting, constant-time/no-enumeration responses, server-validated revocable sessions, session-type separation). This is a deliberate, durable ownership commitment, not a "reversible" one.

## Consequences
- Proceed with plan Units 2–12 **as written** (hand-rolled path). No units are deleted or reshaped.
- **Revisit trigger:** if client access later needs full SSO/federation, self-service account management, or scales to many thousands of external identities, re-evaluate Entra External ID — the `AuthPort`/`ClientsPort` seam contains the frontend blast radius of such a switch.
