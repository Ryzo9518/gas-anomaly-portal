"""Backend payload-shape contract audit (docs/FIXTURE_CONTRACT.md §7.2).

Asserts the client-facing endpoints return the camelCase contract shape — no
snake_case leakage, exactly the AuditReport keys.
"""
import datetime as dt

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.clients_api import router
from app.config import settings
from app.db import get_db
from app.models import CONTACT_ACTIVE, Client, ClientData, ClientSession, Contact

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

SAMPLE_REPORT = {
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

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    c = Client(name="Tourvest", health_target=80)
    api_session.add(c)
    api_session.flush()
    api_session.add(ClientData(client_id=c.id, payload=[SAMPLE_REPORT], is_demo=True))
    ct = Contact(client_id=c.id, email="cfo@x.com", status=CONTACT_ACTIVE)
    api_session.add(ct)
    api_session.flush()
    s = ClientSession(
        contact_id=ct.id,
        client_id=c.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8),
    )
    api_session.add(s)
    api_session.commit()
    tc = TestClient(app)
    tc.cookies.set(settings.client_cookie_name, str(s.id))
    return tc


def test_clients_endpoint_is_camelcase(client):
    body = client.get("/api/clients").json()
    assert set(body.keys()) == {"id", "name", "healthTarget"}
    assert "health_target" not in body  # no snake_case leakage


def test_reports_endpoint_matches_audit_report_contract(client):
    body = client.get("/api/reports").json()
    assert isinstance(body, list) and len(body) == 1
    report = body[0]
    assert set(report.keys()) == AUDIT_REPORT_KEYS
    assert set(report["risks"].keys()) == {"critical", "high", "medium", "low"}
    assert isinstance(report["findings"], list)
    assert isinstance(report["uploads"], list)
