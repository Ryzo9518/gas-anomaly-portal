"""Unit 11 — minimal real-data load endpoint (admin-only, audited, contract-validated)."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.clients_admin_api import router
from app.db import get_db
from app.deps import current_admin
from app.models import AuditLog, Client, ClientData

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
    app.dependency_overrides[current_admin] = lambda: {"email": "admin@jera.co.za", "is_admin": True}

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    c = Client(name="RealCo")
    api_session.add(c)
    api_session.commit()
    return TestClient(app), api_session, c


def test_load_real_data_persists_and_audits(client):
    tc, db, c = client
    r = tc.post(f"/api/admin/clients/{c.id}/data", json={"reports": [VALID_REPORT], "is_demo": False})
    assert r.status_code == 200, r.text
    assert r.json()["reports"] == 1
    data = db.get(ClientData, c.id)
    assert data is not None and data.is_demo is False and data.updated_by == "admin@jera.co.za"
    assert db.scalar(select(AuditLog).where(AuditLog.event == "client_data_loaded"))


def test_load_rejects_payload_violating_contract(client):
    tc, db, c = client
    bad = {**VALID_REPORT}
    del bad["healthScore"]  # contract violation
    r = tc.post(f"/api/admin/clients/{c.id}/data", json={"reports": [bad]})
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "invalid_report"


def test_load_rejects_bad_risks_shape(client):
    tc, db, c = client
    bad = {**VALID_REPORT, "risks": {"critical": 1}}
    r = tc.post(f"/api/admin/clients/{c.id}/data", json={"reports": [bad]})
    assert r.status_code == 422


def test_load_with_engagements_roundtrips(client):
    tc, db, c = client
    engagements = {
        "2026": {
            "reportId": "2026",
            "status": "complete",
            "improvementHoursPerMonth": 20,
            "supportHoursPerMonth": 16,
            "months": 6,
            "estimatedSavings": 100000,
            "actualSavings": 90000,
            "findings": [],
        }
    }
    r = tc.post(
        f"/api/admin/clients/{c.id}/data",
        json={"reports": [VALID_REPORT], "engagements": engagements, "is_demo": True},
    )
    assert r.status_code == 200, r.text
    # Reports read back unchanged...
    rr = tc.get(f"/api/admin/clients/{c.id}/reports")
    assert rr.status_code == 200 and rr.json()[0]["id"] == "2026"
    # ...and engagements are now carried alongside them.
    re = tc.get(f"/api/admin/clients/{c.id}/engagements")
    assert re.status_code == 200
    assert re.json()["2026"]["actualSavings"] == 90000


def test_delete_client_hard_removes_everything(client):
    tc, db, c = client
    tc.post(f"/api/admin/clients/{c.id}/data", json={"reports": [VALID_REPORT]})
    assert db.get(ClientData, c.id) is not None
    cid = c.id
    r = tc.request("DELETE", f"/api/admin/clients/{cid}")
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True
    db.expire_all()
    assert db.get(Client, cid) is None          # company gone
    assert db.get(ClientData, cid) is None       # data cascaded away
    assert db.scalar(select(AuditLog).where(AuditLog.event == "client_deleted"))


def test_delete_missing_client_404(client):
    tc, db, c = client
    import uuid as _uuid
    r = tc.request("DELETE", f"/api/admin/clients/{_uuid.uuid4()}")
    assert r.status_code == 404
