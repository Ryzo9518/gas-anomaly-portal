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

    # Tenant is already enforced by the single-tenant authority; the explicit
    # staff allow-list is the second gate. A valid Jera token that is NOT on the
    # list is rejected.
    if not email or email not in settings.staff_allow_list:
        return RedirectResponse(f"{settings.app_base_url}/#/login?error=forbidden")

    resp = RedirectResponse(f"{settings.app_base_url}/#/auth/callback")
    issue_session(resp, sub=sub, email=email, name=name)
    return resp
