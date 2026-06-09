"""Admin-only client + contact management (Units 4, 8). Every route requires an
admin staff session (current_admin → 403 for non-admins). Mounted at /api/admin.
"""
import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session


def _uid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(404, {"error": "not found", "code": "not_found"})

from .deps import current_admin
from .db import get_db
from .invites import issue_and_send_invite
from .models import (
    CONTACT_REVOKED,
    AuditLog,
    Client,
    ClientSession,
    Contact,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---- schemas ----
class CreateClientBody(BaseModel):
    name: str
    health_target: int = 80


class InviteBody(BaseModel):
    emails: list[str]


class ContactOut(BaseModel):
    id: str
    email: str
    status: str
    delivery_status: str
    last_login_at: dt.datetime | None


class ClientOut(BaseModel):
    id: str
    name: str
    health_target: int
    revoked: bool
    contacts: list[ContactOut]


def _contact_out(c: Contact) -> ContactOut:
    return ContactOut(
        id=str(c.id),
        email=c.email,
        status=c.status,
        delivery_status=c.delivery_status,
        last_login_at=c.last_login_at,
    )


# ---- routes ----
@router.post("/clients")
def create_client(
    body: CreateClientBody,
    request: Request,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
):
    client = Client(
        name=body.name.strip(),
        health_target=body.health_target,
        created_by=admin["email"],
    )
    db.add(client)
    db.flush()
    db.add(
        AuditLog(event="client_created", actor=admin["email"], target_client_id=client.id)
    )
    db.commit()
    return {"id": str(client.id), "name": client.name}


@router.get("/clients")
def list_clients(
    admin: dict = Depends(current_admin), db: Session = Depends(get_db)
) -> list[ClientOut]:
    clients = db.scalars(select(Client).order_by(Client.name)).all()
    out: list[ClientOut] = []
    for c in clients:
        out.append(
            ClientOut(
                id=str(c.id),
                name=c.name,
                health_target=c.health_target,
                revoked=c.revoked_at is not None,
                contacts=[_contact_out(ct) for ct in c.contacts],
            )
        )
    return out


@router.post("/clients/{client_id}/contacts")
def invite_contacts(
    client_id: str,
    body: InviteBody,
    request: Request,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
):
    client = db.get(Client, _uid(client_id))
    if not client or client.revoked_at is not None:
        raise HTTPException(404, {"error": "client not found", "code": "not_found"})

    ip = request.client.host if request.client else None
    results = []
    for raw_email in body.emails:
        email = str(raw_email).strip().lower()
        contact = db.scalar(
            select(Contact).where(
                Contact.client_id == client.id, Contact.email == email
            )
        )
        if contact is None:
            contact = Contact(client_id=client.id, email=email, created_by=admin["email"])
            db.add(contact)
            db.flush()
        try:
            issue_and_send_invite(db, contact, client, created_by=admin["email"], ip=ip)
            results.append({"email": email, "status": "sent"})
        except Exception:
            results.append({"email": email, "status": "failed"})
    db.commit()
    return {"results": results}


@router.post("/contacts/{contact_id}/resend")
def resend_invite(
    contact_id: str,
    request: Request,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
):
    contact = db.get(Contact, _uid(contact_id))
    if not contact or contact.status == CONTACT_REVOKED:
        raise HTTPException(404, {"error": "contact not available", "code": "not_found"})
    client = db.get(Client, contact.client_id)
    ip = request.client.host if request.client else None
    try:
        issue_and_send_invite(db, contact, client, created_by=admin["email"], ip=ip)
        status = "sent"
    except Exception:
        status = "failed"
    db.commit()
    return {"email": contact.email, "status": status}


def _revoke_sessions(db: Session, *, contact_id=None, client_id=None) -> None:
    now = dt.datetime.now(dt.timezone.utc)
    stmt = update(ClientSession).where(ClientSession.revoked_at.is_(None))
    if contact_id is not None:
        stmt = stmt.where(ClientSession.contact_id == contact_id)
    if client_id is not None:
        stmt = stmt.where(ClientSession.client_id == client_id)
    db.execute(stmt.values(revoked_at=now))


@router.post("/contacts/{contact_id}/revoke")
def revoke_contact(
    contact_id: str,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
):
    contact = db.get(Contact, _uid(contact_id))
    if not contact:
        raise HTTPException(404, {"error": "not found", "code": "not_found"})
    now = dt.datetime.now(dt.timezone.utc)
    contact.revoked_at = now
    contact.status = CONTACT_REVOKED
    _revoke_sessions(db, contact_id=contact.id)  # kill live sessions immediately
    db.add(
        AuditLog(
            event="contact_revoked",
            actor=admin["email"],
            target_contact_id=contact.id,
            target_client_id=contact.client_id,
        )
    )
    db.commit()
    return {"ok": True}


@router.post("/clients/{client_id}/revoke")
def revoke_client(
    client_id: str,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
):
    client = db.get(Client, _uid(client_id))
    if not client:
        raise HTTPException(404, {"error": "not found", "code": "not_found"})
    now = dt.datetime.now(dt.timezone.utc)
    client.revoked_at = now
    for ct in client.contacts:
        ct.revoked_at = now
        ct.status = CONTACT_REVOKED
    _revoke_sessions(db, client_id=client.id)
    db.add(
        AuditLog(event="client_revoked", actor=admin["email"], target_client_id=client.id)
    )
    db.commit()
    return {"ok": True}
