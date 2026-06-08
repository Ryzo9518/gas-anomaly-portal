from fastapi import Depends, FastAPI, Response
from starlette.middleware.sessions import SessionMiddleware

from .auth_microsoft import router as ms_router
from .config import settings
from .deps import current_staff
from .security import clear_session

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


@app.get("/api/health")
def health():
    return {"ok": True}


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
