"""Client passwordless auth (Unit 5): redeem a magic link -> server-validated
session. Mounted at /api/auth/client.

Security invariants:
- Redemption is ATOMIC single-use: a conditional UPDATE marks the invite used
  only if it is still unused and unexpired; a second/concurrent redemption sees
  zero rows and fails (R7/R15).
- The session id is server-generated (anti-fixation) and set in an HttpOnly,
  Secure, SameSite=Lax cookie distinct from the staff cookie.
- used / expired / forged / missing tokens all return ONE identical outcome
  (R7) — nothing reveals whether a token/contact exists.
"""
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import update
from sqlalchemy.orm import Session

from sqlalchemy import select

from .config import settings
from .db import get_db
from .deps import current_client
from .invites import issue_and_send_invite
from .models import (
    CONTACT_ACTIVE,
    CONTACT_REVOKED,
    DELIVERY_SENT,
    AuditLog,
    Client,
    ClientSession,
    Contact,
    Invite,
)
from .ratelimit import check_and_increment
from .tokens import hash_token

router = APIRouter(prefix="/api/auth/client", tags=["client-auth"])

# One generic failure for every bad-token case (no enumeration).
_INVALID = HTTPException(
    status_code=400,
    detail={"error": "This link is no longer valid", "code": "link_invalid"},
)


class VerifyBody(BaseModel):
    token: str


@router.post("/verify")
def verify(body: VerifyBody, request: Request, response: Response, db: Session = Depends(get_db)):
    now = dt.datetime.now(dt.timezone.utc)
    th = hash_token(body.token.strip())

    # Atomic single-use: only succeeds if currently unused AND unexpired.
    row = db.execute(
        update(Invite)
        .where(
            Invite.token_hash == th,
            Invite.used_at.is_(None),
            Invite.expires_at > now,
        )
        .values(used_at=now)
        .returning(Invite.contact_id)
    ).first()
    if row is None:
        db.commit()
        raise _INVALID
    contact_id = row[0]

    contact = db.get(Contact, contact_id)
    if not contact or contact.revoked_at is not None or contact.status == "revoked":
        db.commit()
        raise _INVALID
    client = db.get(Client, contact.client_id)
    if not client or client.revoked_at is not None:
        db.commit()
        raise _INVALID

    # First successful sign-in activates the contact.
    if contact.status != CONTACT_ACTIVE:
        contact.status = CONTACT_ACTIVE
    contact.last_login_at = now
    contact.delivery_status = DELIVERY_SENT

    session = ClientSession(
        contact_id=contact.id,
        client_id=client.id,
        expires_at=now + dt.timedelta(hours=settings.client_session_ttl_hours),
    )
    db.add(session)
    db.add(
        AuditLog(
            event="client_login",
            actor=contact.email,
            target_contact_id=contact.id,
            target_client_id=client.id,
        )
    )
    db.flush()
    response.set_cookie(
        settings.client_cookie_name,
        str(session.id),
        max_age=settings.client_session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    db.commit()
    return {"ok": True, "client": {"id": str(client.id), "name": client.name}}


@router.get("/session")
def client_session(ctx: dict | None = Depends(current_client)):
    if not ctx:
        return None
    return {"clientId": ctx["client_id"], "email": ctx["email"], "role": "client"}


class RelinkBody(BaseModel):
    email: str


@router.post("/relink")
def relink(body: RelinkBody, request: Request, db: Session = Depends(get_db)):
    """Self-service re-link (R8/R16). Sends a fresh link for every active,
    non-revoked contact matching the email (one per client they belong to).
    Rate-limited per email + per IP. Returns an identical generic response
    regardless of whether the email is registered (no account enumeration)."""
    email = body.email.strip().lower()
    ip = request.client.host if request.client else "unknown"

    allowed = check_and_increment(
        db, f"relink:email:{email}", limit=3, window_seconds=900
    ) and check_and_increment(
        db, f"relink:ip:{ip}", limit=10, window_seconds=900
    )

    if allowed:
        contacts = db.scalars(
            select(Contact).where(
                Contact.email == email,
                Contact.revoked_at.is_(None),
                Contact.status != CONTACT_REVOKED,
            )
        ).all()
        for ct in contacts:
            client = db.get(Client, ct.client_id)
            if client and client.revoked_at is None:
                try:
                    issue_and_send_invite(db, ct, client, ip=ip)
                except Exception:
                    pass  # never reveal per-recipient outcome
        if contacts:
            db.add(AuditLog(event="relink_requested", actor=email, ip=ip))
    db.commit()
    # Identical response in all cases.
    return {"ok": True, "message": "If your email is registered, a link has been sent."}


@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get(settings.client_cookie_name)
    if raw:
        try:
            import uuid

            sess = db.get(ClientSession, uuid.UUID(raw))
            if sess and sess.revoked_at is None:
                sess.revoked_at = dt.datetime.now(dt.timezone.utc)
                db.commit()
        except ValueError:
            pass
    response.delete_cookie(settings.client_cookie_name, path="/")
    return {"ok": True}
