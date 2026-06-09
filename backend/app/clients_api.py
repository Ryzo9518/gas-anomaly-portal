"""Client-facing, per-identity data serving (Unit 6, R13). Mounted at /api.

Default-deny: require_client → 401 with no valid client session. Every endpoint
serves ONLY the authenticated session's own client — no client_id parameter is
accepted, so one client can never request another's data. Real (non-demo) data
is withheld until ISOLATION_VERIFIED is on (fail-closed go-live gate).
"""
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .deps import require_client
from .models import Client, ClientData

router = APIRouter(prefix="/api", tags=["client-data"])


@router.get("/clients")
def my_client(ctx: dict = Depends(require_client), db: Session = Depends(get_db)):
    """The signed-in client's own organisation (scoped to the session)."""
    client = db.get(Client, uuid.UUID(ctx["client_id"]))
    if not client or client.revoked_at is not None:
        return None
    return {
        "id": str(client.id),
        "name": client.name,
        "healthTarget": client.health_target,
    }


@router.get("/reports")
def my_reports(ctx: dict = Depends(require_client), db: Session = Depends(get_db)):
    """The signed-in client's audit payload, scoped to their session. Returns
    [] (zero data) when none exists, or when it is real data and isolation has
    not yet been verified."""
    data = db.get(ClientData, uuid.UUID(ctx["client_id"]))
    if not data:
        return []
    if not data.is_demo and not settings.isolation_verified:
        return []  # real data withheld until the isolation gate is opened
    return data.payload or []
