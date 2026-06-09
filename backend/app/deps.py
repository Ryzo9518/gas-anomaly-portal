import datetime as dt
import uuid

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Client, ClientSession, Contact
from .security import read_session


def current_staff(request: Request) -> dict | None:
    """Return the verified staff claims from the staff session cookie, or None.

    Reads only the staff cookie (settings.cookie_name). A client session uses a
    different cookie, so it can never satisfy this dependency (session-type
    separation / confused-deputy guard).
    """
    claims = read_session(request)
    if not claims or claims.get("role") != "staff":
        return None
    return claims


def current_admin(request: Request) -> dict:
    """Require an admin staff session. 401 if not signed in as staff, 403 if the
    staff member is not on the admin allow-list. Enforced server-side on every
    admin route (R1) -- never trust the UI alone.
    """
    claims = current_staff(request)
    if not claims:
        raise HTTPException(
            status_code=401,
            detail={"error": "not authenticated", "code": "unauthenticated"},
        )
    if not claims.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail={"error": "admin access required", "code": "forbidden"},
        )
    return claims


def current_client(
    request: Request, db: Session = Depends(get_db)
) -> dict | None:
    """Resolve a client session from the CLIENT cookie, validated server-side on
    every request (R11) — uncached, so revocation (R5) takes effect on the next
    request. Reads only the client cookie, so a staff cookie can never satisfy
    it. Returns {session_id, contact_id, client_id, email} or None.

    A session is valid only if: the session row exists, is not revoked, not
    expired, AND its contact is active/non-revoked AND its client is not revoked
    (default-deny / fail-closed).
    """
    raw = request.cookies.get(settings.client_cookie_name)
    if not raw:
        return None
    try:
        sid = uuid.UUID(raw)
    except ValueError:
        return None

    sess = db.get(ClientSession, sid)
    now = dt.datetime.now(dt.timezone.utc)
    if not sess or sess.revoked_at is not None or sess.expires_at <= now:
        return None

    contact = db.get(Contact, sess.contact_id)
    if not contact or contact.revoked_at is not None or contact.status == "revoked":
        return None
    client = db.get(Client, sess.client_id)
    if not client or client.revoked_at is not None:
        return None

    sess.last_seen_at = now
    db.commit()
    return {
        "session_id": str(sess.id),
        "contact_id": str(contact.id),
        "client_id": str(client.id),
        "email": contact.email,
    }


def require_client(ctx: dict | None = Depends(current_client)) -> dict:
    """Like current_client but raises 401 when there is no valid client session.
    Use to guard client-only data routes."""
    if not ctx:
        raise HTTPException(
            status_code=401,
            detail={"error": "not authenticated", "code": "unauthenticated"},
        )
    return ctx
