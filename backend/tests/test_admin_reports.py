"""Staff/admin client-reports endpoint — the staff switcher's data source.

GET /api/admin/clients/{id}/reports lets an admin view ANY client's audit
payload (so the internal staff portal can switch between clients and verify a
loaded client). Authz is the shared current_admin dep (covered by
test_admin_auth); these tests cover the data behaviour: loaded data is returned
verbatim, an unloaded client yields the empty-workspace state, and unknown /
revoked clients 404.
"""
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.clients_admin_api import router
from app.db import get_db
from app.deps import current_admin
from app.models import Client, ClientData

VALID_REPORT = {
    "id": "2026",
    "shortLabel": "2026",
    "cycleLabel": "2026 Annual Audit",
    "status": "complete",
    "completedAt": "2026-04-12",
    "healthScore": 74,
    "leakageEstimate": 480000,
    "leakageRecoverable": 320000,
    "risks": {"critical": 2, "high": 4, "medium": 3, "low": 1},
    "findings": [],
    "uploadSubmittedAt": "2026-03-28",
    "uploads": [],
}


@pytest.fixture()
def client(api_session):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[current_admin] = lambda: {
        "email": "admin@jera.co.za",
        "is_admin": True,
    }

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    c = Client(name="RealCo")
    api_session.add(c)
    api_session.commit()
    return TestClient(app), api_session, c


def test_returns_loaded_payload_verbatim(client):
    tc, db, c = client
    db.add(ClientData(client_id=c.id, payload=[VALID_REPORT], is_demo=False))
    db.commit()
    r = tc.get(f"/api/admin/clients/{c.id}/reports")
    assert r.status_code == 200, r.text
    assert r.json() == [VALID_REPORT]


def test_real_data_returned_to_staff_even_without_isolation_gate(client):
    """Unlike the client-facing /api/reports, the staff view is NOT gated by
    ISOLATION_VERIFIED — staff must see real data to verify it before go-live."""
    tc, db, c = client
    db.add(ClientData(client_id=c.id, payload=[VALID_REPORT], is_demo=False))
    db.commit()
    r = tc.get(f"/api/admin/clients/{c.id}/reports")
    assert r.status_code == 200
    assert len(r.json()) == 1  # returned despite is_demo=False + isolation off


def test_unloaded_client_yields_empty_workspace(client):
    tc, db, c = client
    r = tc.get(f"/api/admin/clients/{c.id}/reports")
    assert r.status_code == 200
    assert r.json() == []


def test_unknown_client_404(client):
    tc, db, c = client
    r = tc.get(f"/api/admin/clients/{uuid.uuid4()}/reports")
    assert r.status_code == 404
    assert r.json()["detail"]["code"] == "not_found"


def test_malformed_client_id_404(client):
    tc, db, c = client
    r = tc.get("/api/admin/clients/not-a-uuid/reports")
    assert r.status_code == 404
