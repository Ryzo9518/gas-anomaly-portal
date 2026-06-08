import logging

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from .config import settings
from .security import issue_session

log = logging.getLogger("uvicorn.error")

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
    except Exception as e:
        log.warning("OIDC token exchange failed: %r", e)
        return RedirectResponse(f"{settings.app_base_url}/#/login?error=auth", status_code=302)

    claims = dict(token.get("userinfo") or {})
    # Microsoft work-account id_tokens often omit `email`; fall back to the
    # userinfo endpoint if the identity claims are sparse.
    if not (claims.get("email") or claims.get("preferred_username") or claims.get("upn")):
        try:
            claims = dict(await oauth.microsoft.userinfo(token=token)) or claims
        except Exception as e:
            log.warning("userinfo fetch failed: %r", e)

    email = (
        claims.get("email")
        or claims.get("preferred_username")
        or claims.get("upn")
        or ""
    ).strip().lower()
    name = claims.get("name") or email
    sub = claims.get("sub") or email

    allowed = bool(email) and email in settings.staff_allow_list
    log.info(
        "OIDC callback: email=%r claim_keys=%s allowed=%s",
        email, sorted(claims.keys()), allowed,
    )

    if not allowed:
        return RedirectResponse(f"{settings.app_base_url}/#/login?error=forbidden", status_code=302)

    resp = RedirectResponse(f"{settings.app_base_url}/#/auth/callback", status_code=302)
    issue_session(resp, sub=sub, email=email, name=name)
    log.info("OIDC callback: session issued for %s", email)
    return resp
