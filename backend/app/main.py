import logging

from fastapi import Depends, FastAPI, Request, Response
from starlette.middleware.sessions import SessionMiddleware

from .auth_microsoft import router as ms_router
from .client_auth_api import router as client_auth_router
from .clients_admin_api import router as admin_router
from .config import settings
from .deps import current_staff
from .security import clear_session

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="GAS Portal API", docs_url=None, redoc_url=None, openapi_url=None)

# Transient OIDC state (PKCE verifier, state, nonce) rides a short signed cookie.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    https_only=settings.cookie_secure,
    same_site="lax",
    max_age=600,  # 10 min — only needs to survive the round-trip to Microsoft
)

app.include_router(ms_router)
app.include_router(admin_router)
app.include_router(client_auth_router)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/auth/session")
def session(request: Request, staff: dict | None = Depends(current_staff)):
    # Log only anomalies (a cookie that fails to authenticate), not every poll.
    if not staff and settings.cookie_name in request.cookies:
        log.warning("session check: cookie present but invalid/expired")
    if not staff:
        return None
    return {
        "userId": staff["sub"],
        "displayName": staff["name"],
        "userName": staff["name"],
        "email": staff["email"],
        "role": "staff",
        "isAdmin": bool(staff.get("is_admin")),
    }


@app.post("/api/auth/logout")
def logout(resp: Response):
    clear_session(resp)
    return {"ok": True}
