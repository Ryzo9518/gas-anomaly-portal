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
    ClientData,
    ClientSession,
    Contact,
)

# Contract field set for an AuditReport payload (docs/FIXTURE_CONTRACT.md §2).
AUDIT_REPORT_KEYS = {
    "id",
    "shortLabel",
    "cycleLabel",
    "status",
    "completedAt",
    "healthScore",
    "leakageEstimate",
    "leakageRecoverable",
    "risks",
    "findings",
    "uploadSubmittedAt",
    "uploads",
}

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---- schemas ----
class CreateClientBody(BaseModel):
    name: str
    health_target: int = 80


class InviteBody(BaseModel):
    emails: list[str]


class LoadDataBody(BaseModel):
    reports: list[dict]
    is_demo: bool = False


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


@router.get("/clients/{client_id}/reports")
def client_reports(
    client_id: str,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    """A single client's audit payload, for STAFF viewing in the internal portal
    (the staff switcher's data source — lets an admin see any client's audit and
    verify a loaded client before retiring its passcode site).

    Admin-scoped (current_admin → 403 for non-admins, never a client cookie).
    Unlike the client-facing /api/reports, this is NOT gated by
    ISOLATION_VERIFIED: staff are the auditors and must be able to view real data
    in order to verify isolation before the client-facing gate is opened. Returns
    [] when the client has no data loaded yet (the empty-workspace state)."""
    client = db.get(Client, _uid(client_id))
    if not client or client.revoked_at is not None:
        raise HTTPException(404, {"error": "client not found", "code": "not_found"})
    data = db.get(ClientData, client.id)
    return data.payload if data and data.payload else []


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


def _validate_reports(reports: list[dict]) -> None:
    """Enforce the fixture contract on incoming report payloads (Unit 11) so a
    real-data load can never drift from what the UI expects."""
    for r in reports:
        missing = AUDIT_REPORT_KEYS - set(r.keys())
        if missing:
            raise HTTPException(
                422,
                {"error": f"report missing fields: {sorted(missing)}", "code": "invalid_report"},
            )
        if set((r.get("risks") or {}).keys()) != {"critical", "high", "medium", "low"}:
            raise HTTPException(
                422,
                {"error": "risks must have critical/high/medium/low", "code": "invalid_report"},
            )


@router.post("/clients/{client_id}/data")
def load_client_data(
    client_id: str,
    body: LoadDataBody,
    admin: dict = Depends(current_admin),
    db: Session = Depends(get_db),
):
    """Minimal, audited real-data load (Unit 11). Upserts a client's audit
    payload (AuditReport[]) into ClientData. The polished authoring UI is a
    later workstream — this is the audited path that lets a real client be
    onboarded. Real data (is_demo=False) is still gated by ISOLATION_VERIFIED at
    serve time."""
    client = db.get(Client, _uid(client_id))
    if not client or client.revoked_at is not None:
        raise HTTPException(404, {"error": "client not found", "code": "not_found"})
    _validate_reports(body.reports)
    existing = db.get(ClientData, client.id)
    if existing:
        existing.payload = body.reports
        existing.is_demo = body.is_demo
        existing.updated_by = admin["email"]
    else:
        db.add(
            ClientData(
                client_id=client.id,
                payload=body.reports,
                is_demo=body.is_demo,
                updated_by=admin["email"],
            )
        )
    db.add(
        AuditLog(
            event="client_data_loaded",
            actor=admin["email"],
            target_client_id=client.id,
            detail=f"{len(body.reports)} report(s), is_demo={body.is_demo}",
        )
    )
    db.commit()
    return {"ok": True, "reports": len(body.reports)}


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
