# Staff Microsoft SSO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the four Jera staff (`kevinm@`, `ryan@`, `jp.schmitt@`, `tshegofatsos@jera.co.za`) sign in to `anomaly.gasecosys.co.za` with their Microsoft 365 accounts and see the multi-client portal (incl. the client switcher). Client magic-link is OUT of scope (later phase).

**Architecture:** A small FastAPI service on the Hetzner box (127.0.0.1:**8001**, behind Caddy at `/api/*`) runs the Microsoft OIDC auth-code+PKCE flow against Jera's single Entra tenant, enforces a 4-email allow-list, and issues a signed **HttpOnly session cookie**. The existing React SPA gets a `bff` auth adapter + a "Sign in with Microsoft" button; everything else (RequireAuth, authStore, routes) already exists. **No database** — the allow-list is an env var (Postgres arrives with clients/magic-link later).

**Tech Stack:** FastAPI + Uvicorn + Authlib + PyJWT (backend, Python 3.11+); React/Vite/TS (frontend); Caddy + systemd (deploy) — same shape as the intacct-toolkit service already on the box.

**Design source:** `docs/specs/2026-06-08-phase-2-auth-design.md` (JP), trimmed to staff-only.
**Law:** `AGENTS.md` — branch → gates → PR; production actions confirmed with Ryan.

---

## Dependencies (Ryan provides — blocks DEPLOY, not BUILD)

- **Rotate the Entra client secret** (it was shared over chat) and place the new value in the server env file `/etc/gas-portal/api.env` as `ENTRA_CLIENT_SECRET`. It is never committed and never pasted into chat.
- **Entra app `Gasecosys`** (already created): tenant `4f124a4c-a71e-463c-a004-f65515cff124`, client `efcf0a9c-ddcf-411d-8139-124cc772895b`, redirect URI `https://anomaly.gasecosys.co.za/api/auth/microsoft/callback` (Web) — already registered. Delegated scopes `openid profile email` (usually pre-consented; confirm no admin-consent block).
- **SSH** to `159.69.216.113` (Ryan has it; this machine knows the host). Confirm Python 3.11+ available on the box.

## Conventions / gates (every task)

- Frontend gates: `npm run typecheck` (0 errors), `npm run build`.
- Backend gates: `python -m compileall backend/app` (no syntax errors) and the service starts locally (`uvicorn app.main:app`) returning 200 on `/api/health`.
- Commit format: `[FEATURE] <summary>`.
- Branch: `feat/staff-microsoft-sso` off latest `main` (after PR #4 merges, rebase if needed).

---

## File structure

**Backend (new — `backend/`)**
- `backend/requirements.txt`
- `backend/app/__init__.py`
- `backend/app/config.py` — env settings (pydantic-settings)
- `backend/app/security.py` — session JWT issue/verify, cookie helpers
- `backend/app/auth_microsoft.py` — OIDC start/callback router + allow-list
- `backend/app/main.py` — FastAPI app, session middleware, routes, `/api/health`
- `backend/app/deps.py` — `current_staff` dependency (reads cookie)
- `backend/.env.example` — documents required vars (no secrets)
- `deploy/gas-portal-api.service` — systemd unit
- `deploy/Caddyfile.anomaly.snippet` — the `/api/*` reverse-proxy block to add

**Frontend (modify)**
- `src/ports/auth.port.ts` — add `startMicrosoftLogin()`
- `src/adapters/mock/auth.mock.ts` — add no-op `startMicrosoftLogin`
- `src/adapters/bff/auth.bff.ts` — NEW, implements `AuthPort` against `/api/*`
- `src/adapters/index.ts` — add `"bff"` kind, select via `VITE_ADAPTER`
- `src/state/authStore.ts` — add `hydrate()` (boot session restore)
- `src/features/login/LoginCard.tsx` — "Sign in with Microsoft" button; hide password door in bff mode
- `src/routes/authCallback.route.tsx` — NEW public callback route
- `src/app/Router.tsx` — register `/auth/callback`
- `src/app/Providers.tsx` (or `App.tsx`) — call `hydrate()` once on boot
- `vite.config.ts` — uncomment `/api` dev proxy → `http://127.0.0.1:8001`

---

## Task 0: Branch

- [ ] `git checkout main && git pull` then `git checkout -b feat/staff-microsoft-sso`.
- [ ] `npm ci && npm run typecheck && npm run build` → clean baseline.

---

## Task 1: Backend scaffold + health

**Files:** `backend/requirements.txt`, `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/main.py`, `backend/.env.example`

- [ ] **Step 1: requirements.txt**

```
fastapi==0.115.*
uvicorn[standard]==0.32.*
authlib==1.3.*
httpx==0.27.*
pyjwt==2.9.*
pydantic-settings==2.5.*
itsdangerous==2.2.*
```

- [ ] **Step 2: `backend/app/__init__.py`** — empty file.

- [ ] **Step 3: `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    # Entra / Microsoft
    entra_tenant_id: str
    entra_client_id: str
    entra_client_secret: str

    # App
    app_base_url: str = "https://anomaly.gasecosys.co.za"
    session_secret: str          # signs our session JWT (HS256) — 32+ random bytes
    session_ttl_hours: int = 10
    # Comma-separated allow-list of staff emails (lowercased on load).
    allowed_staff_emails: str

    # Cookie
    cookie_name: str = "gas_session"
    cookie_secure: bool = True   # False only for local http dev

    @property
    def staff_allow_list(self) -> set[str]:
        return {e.strip().lower() for e in self.allowed_staff_emails.split(",") if e.strip()}

    @property
    def oidc_metadata_url(self) -> str:
        return f"https://login.microsoftonline.com/{self.entra_tenant_id}/v2.0/.well-known/openid-configuration"


settings = Settings()  # raises at startup if a required var is missing
```

- [ ] **Step 4: `backend/app/main.py`** (health only for now)

```python
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from .config import settings

app = FastAPI(title="GAS Portal API", docs_url=None, redoc_url=None, openapi_url=None)

# Transient OIDC state (PKCE verifier, state, nonce) rides a short signed cookie.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    https_only=settings.cookie_secure,
    same_site="lax",
    max_age=600,  # 10 min — only needs to survive the round-trip to Microsoft
)


@app.get("/api/health")
def health():
    return {"ok": True}
```

- [ ] **Step 5: `backend/.env.example`**

```
ENTRA_TENANT_ID=4f124a4c-a71e-463c-a004-f65515cff124
ENTRA_CLIENT_ID=efcf0a9c-ddcf-411d-8139-124cc772895b
ENTRA_CLIENT_SECRET=__set_in_/etc/gas-portal/api.env__
APP_BASE_URL=https://anomaly.gasecosys.co.za
SESSION_SECRET=__openssl rand -hex 32__
SESSION_TTL_HOURS=10
ALLOWED_STAFF_EMAILS=kevinm@jera.co.za,ryan@jera.co.za,jp.schmitt@jera.co.za,tshegofatsos@jera.co.za
COOKIE_SECURE=true
```

- [ ] **Step 6: Local run check**

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# minimal env so settings load (dummy secret/allow-list ok for health):
ENTRA_TENANT_ID=x ENTRA_CLIENT_ID=x ENTRA_CLIENT_SECRET=x SESSION_SECRET=devsecretdevsecretdevsecretdevse \
ALLOWED_STAFF_EMAILS=ryan@jera.co.za COOKIE_SECURE=false \
uvicorn app.main:app --port 8001 &
sleep 2 && curl -s localhost:8001/api/health   # expect {"ok":true}
kill %1
```

- [ ] **Step 7: Commit** — `[FEATURE] Backend scaffold + /api/health (FastAPI)`.

---

## Task 2: Microsoft OIDC start + callback (with allow-list)

**Files:** `backend/app/security.py`, `backend/app/auth_microsoft.py`, edit `backend/app/main.py`

- [ ] **Step 1: `backend/app/security.py`** — session JWT + cookie

```python
import time
import jwt
from fastapi import Request, Response
from .config import settings


def issue_session(resp: Response, *, sub: str, email: str, name: str) -> None:
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": sub,
            "email": email,
            "name": name,
            "role": "staff",
            "iat": now,
            "exp": now + settings.session_ttl_hours * 3600,
        },
        settings.session_secret,
        algorithm="HS256",
    )
    resp.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def read_session(request: Request) -> dict | None:
    token = request.cookies.get(settings.cookie_name)
    if not token:
        return None
    try:
        return jwt.decode(token, settings.session_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def clear_session(resp: Response) -> None:
    resp.delete_cookie(settings.cookie_name, path="/")
```

- [ ] **Step 2: `backend/app/auth_microsoft.py`** — OIDC via Authlib

```python
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from .config import settings
from .security import issue_session

router = APIRouter(prefix="/api/auth/microsoft", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="microsoft",
    server_metadata_url=settings.oidc_metadata_url,
    client_id=settings.entra_client_id,
    client_secret=settings.entra_client_secret,
    client_kwargs={"scope": "openid profile email"},
)


@router.get("/start")
async def start(request: Request):
    redirect_uri = f"{settings.app_base_url}/api/auth/microsoft/callback"
    # Authlib stores state + PKCE verifier + nonce in the (signed) session cookie.
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def callback(request: Request):
    try:
        token = await oauth.microsoft.authorize_access_token(request)
    except Exception:
        return RedirectResponse(f"{settings.app_base_url}/#/login?error=auth")

    claims = token.get("userinfo") or {}
    email = (claims.get("email") or claims.get("preferred_username") or "").lower()
    name = claims.get("name") or email
    sub = claims.get("sub") or email

    # Tenant is already enforced by the single-tenant authority; now the
    # explicit staff allow-list. A valid Jera token that is NOT on the list is rejected.
    if not email or email not in settings.staff_allow_list:
        return RedirectResponse(f"{settings.app_base_url}/#/login?error=forbidden")

    resp = RedirectResponse(f"{settings.app_base_url}/#/auth/callback")
    issue_session(resp, sub=sub, email=email, name=name)
    return resp
```

- [ ] **Step 3: wire the router in `main.py`**

Add: `from .auth_microsoft import router as ms_router` and `app.include_router(ms_router)`.

- [ ] **Step 4: Gate** — `python -m compileall backend/app` → no errors. (Full flow is tested end-to-end in Task 7/9 against the real tenant.)
- [ ] **Step 5: Commit** — `[FEATURE] Microsoft OIDC start/callback + staff allow-list`.

---

## Task 3: Session, logout, current-user

**Files:** `backend/app/deps.py`, edit `backend/app/main.py`

- [ ] **Step 1: `backend/app/deps.py`**

```python
from fastapi import Request
from .security import read_session


def current_staff(request: Request) -> dict | None:
    claims = read_session(request)
    if not claims or claims.get("role") != "staff":
        return None
    return claims
```

- [ ] **Step 2: add session + logout routes in `main.py`**

```python
from fastapi import Depends, Request, Response
from .deps import current_staff
from .security import clear_session


@app.get("/api/auth/session")
def session(staff: dict | None = Depends(current_staff)):
    if not staff:
        return None
    return {
        "userId": staff["sub"],
        "displayName": staff["name"],
        "userName": staff["name"],
        "email": staff["email"],
        "role": "staff",
    }


@app.post("/api/auth/logout")
def logout(resp: Response):
    clear_session(resp)
    return {"ok": True}
```

- [ ] **Step 3: Gate** — `python -m compileall backend/app`; run locally and `curl -s localhost:8001/api/auth/session` → `null` (no cookie). 
- [ ] **Step 4: Commit** — `[FEATURE] /api/auth/session + /api/auth/logout + current_staff dep`.

---

## Task 4: Frontend auth port + bff adapter

**Files:** `src/ports/auth.port.ts`, `src/adapters/mock/auth.mock.ts`, `src/adapters/bff/auth.bff.ts`, `src/adapters/index.ts`

- [ ] **Step 1: extend `AuthPort`** (`src/ports/auth.port.ts`)

Add to the interface:
```typescript
  // Staff door — full-page redirect to the backend OIDC start endpoint.
  startMicrosoftLogin(): void;
```

- [ ] **Step 2: mock no-op** (`src/adapters/mock/auth.mock.ts`)

Add to `authMock`:
```typescript
  startMicrosoftLogin() {
    // Mock/dev: no real IdP. Open-session mode is reached via signIn().
    console.warn("startMicrosoftLogin() is a no-op under the mock adapter");
  },
```

- [ ] **Step 3: bff adapter** (`src/adapters/bff/auth.bff.ts`, NEW)

```typescript
import type { AuthPort, Session } from "@/ports/auth.port";

// Talks to the FastAPI backend through Caddy's /api/* proxy. The session is a
// HttpOnly cookie set by the backend, so every call uses credentials:"include"
// and the SPA never sees the token.
async function getSession(): Promise<Session | null> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  return {
    userId: data.userId,
    displayName: data.displayName,
    userName: data.userName,
  };
}

export const authBff: AuthPort = {
  getSession,
  async signIn() {
    // Staff use Microsoft SSO; there is no password door in bff mode.
    throw new Error("Use Sign in with Microsoft");
  },
  async signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  },
  startMicrosoftLogin() {
    window.location.href = "/api/auth/microsoft/start";
  },
};
```

- [ ] **Step 4: select the adapter** (`src/adapters/index.ts`)

```typescript
import type { AuthPort } from "@/ports/auth.port";
import type { ClientsPort } from "@/ports/clients.port";
import { authMock } from "./mock/auth.mock";
import { authBff } from "./bff/auth.bff";
import { clientsMock } from "./mock/clients.mock";

export type AdapterKind = "mock" | "bff";
export const CURRENT_ADAPTER: AdapterKind =
  (import.meta.env.VITE_ADAPTER as AdapterKind) === "bff" ? "bff" : "mock";

export const auth: AuthPort = CURRENT_ADAPTER === "bff" ? authBff : authMock;
export const clients: ClientsPort = clientsMock;
```

- [ ] **Step 5: Gate** — `npm run typecheck` (0 errors), `npm run build`.
- [ ] **Step 6: Commit** — `[FEATURE] AuthPort.startMicrosoftLogin + bff auth adapter`.

---

## Task 5: Login screen — "Sign in with Microsoft"

**Files:** `src/features/login/LoginCard.tsx`

- [ ] **Step 1:** Import the adapter mode + auth:
```typescript
import { auth, CURRENT_ADAPTER } from "@/adapters";
```

- [ ] **Step 2:** Add a primary Microsoft button above the existing form:
```tsx
<button
  type="button"
  onClick={() => auth.startMicrosoftLogin()}
  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f2f2f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
>
  {/* Microsoft 4-square mark */}
  <span className="grid h-4 w-4 grid-cols-2 gap-px">
    <span className="bg-[#f25022]" /><span className="bg-[#7fba00]" />
    <span className="bg-[#00a4ef]" /><span className="bg-[#ffb900]" />
  </span>
  Sign in with Microsoft
</button>
```

- [ ] **Step 3:** In **bff** mode, hide the email/password door (staff only use Microsoft). Wrap the existing email+password+Sign-in block:
```tsx
{CURRENT_ADAPTER !== "bff" && (
  /* existing email / password / Sign in form stays here for local mock dev */
)}
```
Keep the "Welcome to GAS Anomaly" heading and the branded layout untouched.

- [ ] **Step 4: Gate** — `npm run typecheck`, `npm run build`. Manual (mock mode): the Microsoft button shows; the password form still shows in mock dev.
- [ ] **Step 5: Commit** — `[FEATURE] Login: Sign in with Microsoft button (password door hidden in bff mode)`.

---

## Task 6: Callback route + boot session restore

**Files:** `src/state/authStore.ts`, `src/routes/authCallback.route.tsx`, `src/app/Router.tsx`, `src/app/Providers.tsx`

- [ ] **Step 1: add `hydrate()` to authStore**

In the `AuthState` interface add `hydrate: () => Promise<void>;`. Implement:
```typescript
  async hydrate() {
    const session = await auth.getSession();
    if (session) {
      set({ actor: actorFromSession(session), isOpenSession: !!session.isOpenSession });
    }
  },
```

- [ ] **Step 2: callback route** (`src/routes/authCallback.route.tsx`, NEW)

```tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";

// Public landing after the backend redirects back from Microsoft. It restores
// the session from the cookie (via getSession) and forwards into the app.
export function AuthCallbackRoute() {
  const navigate = useNavigate();
  const hydrate = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    (async () => {
      await hydrate();
      navigate("/dashboard", { replace: true });
    })();
  }, [hydrate, navigate]);

  return (
    <div className="flex h-screen items-center justify-center text-slate-500">
      Signing you in…
    </div>
  );
}
```

- [ ] **Step 3: register the route** (`src/app/Router.tsx`)

Add the import and a public route alongside `/login`:
```tsx
import { AuthCallbackRoute } from "@/routes/authCallback.route";
// ...
<Route path="/login" element={<LoginRoute />} />
<Route path="/auth/callback" element={<AuthCallbackRoute />} />
```

- [ ] **Step 4: boot hydrate** (`src/app/Providers.tsx`)

Inside `Providers`, add a one-shot effect so a refresh keeps the user signed in:
```tsx
React.useEffect(() => { useAuthStore.getState().hydrate(); }, []);
```
(Import `useAuthStore`. Mock mode: `getSession` returns the open session → harmless.)

- [ ] **Step 5: Gate** — `npm run typecheck`, `npm run build`.
- [ ] **Step 6: Commit** — `[FEATURE] /auth/callback route + boot-time session restore`.

---

## Task 7: Local end-to-end (dev proxy)

**Files:** `vite.config.ts`

- [ ] **Step 1: uncomment the `/api` proxy** in `vite.config.ts`:
```typescript
    proxy: {
      "/api/": { target: "http://127.0.0.1:8001", changeOrigin: true },
    },
```

- [ ] **Step 2: run both locally and verify the real Microsoft flow**

Use a localhost redirect for dev only — TEMPORARILY add `http://localhost:5199/api/auth/microsoft/callback` as a second Web redirect URI in Entra (remove after), set `COOKIE_SECURE=false`, `APP_BASE_URL=http://localhost:5199`, real tenant/client/secret in the backend env, then:
```bash
# terminal A
cd backend && . .venv/bin/activate && uvicorn app.main:app --port 8001
# terminal B
VITE_ADAPTER=bff PORT=5199 npm run dev
```
Open `http://localhost:5199/#/login` → click "Sign in with Microsoft" → authenticate as `ryan@jera.co.za` → land on the dashboard. Then test a non-allow-listed Jera account → bounced with `?error=forbidden`.

- [ ] **Step 3: Commit** — `[FEATURE] Enable /api dev proxy for bff mode`.

---

## Task 8: Deploy to Hetzner (Caddy + systemd) — WITH RYAN

> Production actions. Confirm each with Ryan. SSH: `ssh <user>@159.69.216.113`.

**Files:** `deploy/gas-portal-api.service`, `deploy/Caddyfile.anomaly.snippet`

- [ ] **Step 1: systemd unit** (`deploy/gas-portal-api.service`)

```ini
[Unit]
Description=GAS Portal API (FastAPI)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/gas-portal/backend
EnvironmentFile=/etc/gas-portal/api.env
ExecStart=/opt/gas-portal/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Caddy snippet** (`deploy/Caddyfile.anomaly.snippet`) — add INSIDE the existing `anomaly.gasecosys.co.za { … }` block, before the static file server:

```
  # FastAPI backend (staff SSO). Everything else stays static SPA.
  handle /api/* {
    reverse_proxy 127.0.0.1:8001
  }
```

- [ ] **Step 3: ship the code to the box**

```bash
# from repo root, on this machine:
rsync -a --delete backend/ <user>@159.69.216.113:/opt/gas-portal/backend/
```

- [ ] **Step 4: server-side setup (over SSH, confirm with Ryan)**

```bash
ssh <user>@159.69.216.113
python3 -m venv /opt/gas-portal/backend/.venv
/opt/gas-portal/backend/.venv/bin/pip install -r /opt/gas-portal/backend/requirements.txt
sudo mkdir -p /etc/gas-portal
sudo install -m 600 /dev/null /etc/gas-portal/api.env
sudo nano /etc/gas-portal/api.env   # Ryan pastes the ROTATED secret + vars (per backend/.env.example), COOKIE_SECURE=true, APP_BASE_URL=https://anomaly.gasecosys.co.za
sudo cp /opt/gas-portal/backend/deploy/gas-portal-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now gas-portal-api
curl -s 127.0.0.1:8001/api/health   # {"ok":true}
```

- [ ] **Step 5: Caddy** — add the `/api/*` handle to the anomaly block, `caddy validate`, `systemctl reload caddy`. Confirm `https://anomaly.gasecosys.co.za/api/health` returns `{"ok":true}` (through the basic-auth gate for now).

- [ ] **Step 6: build + publish the SPA in bff mode**

```bash
VITE_ADAPTER=bff npm run build         # on this machine
rsync -a --delete dist/ <user>@159.69.216.113:/var/www/anomaly.gasecosys.co.za/current/
```
(Adjust the web root to wherever Caddy serves the site — confirm on the box.)

- [ ] **Step 7: Commit** — `[FEATURE] Deploy assets: systemd unit + Caddy /api snippet`.

---

## Task 9: Verify, then drop the password gate

- [ ] **Step 1:** Through the existing Caddy basic-auth, load the site, click "Sign in with Microsoft", complete as **each** of the four staff → lands on dashboard; the client switcher works.
- [ ] **Step 2:** A Jera account NOT on the allow-list → `?error=forbidden`, no access. A non-Jera account → cannot authenticate (tenant restriction).
- [ ] **Step 3:** Refresh keeps the session; "Sign out" clears it (back to login).
- [ ] **Step 4: Security review** — run the `security-review` skill (or `ce-security-reviewer`) over `backend/app/*` before going public: cookie flags (HttpOnly/Secure/SameSite), state/PKCE handling, allow-list enforcement, no secret logging, error responses leak nothing.
- [ ] **Step 5: Remove the basic-auth gate** (with Ryan): delete the `basicauth` block from the anomaly Caddy site so the app's own Microsoft login is the only door. `caddy reload`. Re-test one staff login end-to-end. Remove the temporary localhost redirect URI from Entra (Task 7).

---

## Task 10: PR

- [ ] `git push -u origin feat/staff-microsoft-sso`
- [ ] `gh pr create --base main --title "[FEATURE] Staff Microsoft SSO (FastAPI + Entra OIDC)" --body "Implements staff-only Microsoft sign-in per docs/specs/2026-06-08-phase-2-auth-design.md (client magic-link deferred). Allow-list: kevinm/ryan/jp.schmitt/tshegofatsos. Backend FastAPI on :8001 behind Caddy; HttpOnly session cookie; no DB. Security review done in Task 9. For JP's review."`
- [ ] Do NOT merge directly — JP reviews.

---

## Spec coverage

- Staff OIDC start/callback + tenant + allow-list → Tasks 2, 9.
- Session cookie (HttpOnly/Secure/SameSite) + session/logout → Tasks 2, 3.
- bff adapter + AdapterKind + VITE_ADAPTER + vite proxy → Tasks 4, 7.
- LoginCard MS button + callback route + boot restore → Tasks 5, 6.
- systemd + Caddy /api proxy + secret in root env → Task 8.
- Drop basic-auth once SSO live → Task 9.
- Deferred (NOT here): client magic-link, Graph email/admin-consent, Postgres, audit log.
