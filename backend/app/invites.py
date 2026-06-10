"""Invite issuance service — shared by the admin invite/resend routes (Unit 4)
and the client self-service re-link route (Unit 7).

Generates a single-use token, stores only its hash, and emails the magic link.
The link points at the SPA hash route, so the raw token rides the URL *fragment*
— it is never sent to the server (kept out of access logs) and a link-scanner's
GET only loads the SPA shell without redeeming anything.
"""
import datetime as dt

from sqlalchemy.orm import Session

from . import email_graph, tokens
from .config import settings
from .models import (
    DELIVERY_FAILED,
    DELIVERY_SENT,
    AuditLog,
    Client,
    Contact,
    Invite,
)


def _link(raw_token: str) -> str:
    # Points at the client-portal build (magic-link login), not the staff root.
    return f"{settings.client_portal_base_url}/#/auth/verify?token={raw_token}"


def issue_and_send_invite(
    db: Session,
    contact: Contact,
    client: Client,
    *,
    created_by: str | None = None,
    ip: str | None = None,
) -> str:
    """Create an invite token row and email the link. Updates contact delivery
    status. Returns the raw token (for tests/audit-ref only — never logged)."""
    raw = tokens.generate_token()
    expires = dt.datetime.now(dt.timezone.utc) + dt.timedelta(
        minutes=settings.magic_link_ttl_minutes
    )
    db.add(
        Invite(
            contact_id=contact.id,
            token_hash=tokens.hash_token(raw),
            expires_at=expires,
            created_by=created_by,
            created_ip=ip,
        )
    )
    subject, html = email_graph.build_invite_email(
        client_name=client.name, link=_link(raw)
    )
    try:
        email_graph.send_mail(to=contact.email, subject=subject, html=html)
        contact.delivery_status = DELIVERY_SENT
    except Exception:
        contact.delivery_status = DELIVERY_FAILED
        raise
    db.add(
        AuditLog(
            event="invite_sent",
            actor=created_by,
            target_contact_id=contact.id,
            target_client_id=client.id,
            ip=ip,
        )
    )
    return raw
