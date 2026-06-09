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
