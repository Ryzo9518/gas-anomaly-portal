"""Unit 12 — runtime cross-client isolation (the go-live gate's automated check).

Exercises the REAL path: admin loads each client's data via the loader, then a
client session fetches via the serving API. Asserts each client sees only their
own data, no-session is denied, and real data is withheld until verified.
"""
import datetime as dt

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.client_auth_api import router as _unused_client_auth  # noqa: F401
from app.clients_admin_api import router as admin_router
from app.clients_api import router as data_router
from app.config import settings
from app.db import get_db
from app.deps import current_admin
from app.models import CONTACT_ACTIVE, Client, ClientSession, Contact


def _report(rid):
    return {
        "id": rid,
        "shortLabel": rid,
        "cycleLabel": f"{rid} Audit",
        "status": "complete",
        "completedAt": "2026-04-12",
        "healthScore": 70,
        "leakageEstimate": 100,
        "leakageRecoverable": 50,
        "risks": {"critical": 1, "high": 1, "medium": 1, "low": 1},
        "findings": [],
        "uploadSubmittedAt": "2026-03-28",
        "uploads": [],
    }


@pytest.fixture()
def app_and_db(api_session):
    app = FastAPI()
    app.include_router(admin_router)
    app.include_router(data_router)
    app.dependency_overrides[current_admin] = lambda: {"email": "admin@jera.co.za", "is_admin": True}

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    return app, api_session


def _seed(db, name, report_id, *, is_demo=True):
    c = Client(name=name)
    db.add(c)
    db.flush()
    ct = Contact(client_id=c.id, email=f"u@{name}.com", status=CONTACT_ACTIVE)
    db.add(ct)
    db.flush()
    s = ClientSession(
        contact_id=ct.id,
        client_id=c.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8),
    )
    db.add(s)
    db.commit()
    return c, s, report_id


def test_cross_client_isolation_matrix(app_and_db):
    app, db = app_and_db
    tc = TestClient(app)
    a, a_sess, _ = _seed(db, "alpha", "A1")
    b, b_sess, _ = _seed(db, "bravo", "B1")
    # Load each client's data via the real loader (demo so it serves without the
    # isolation flag — this test is about cross-client isolation, not the gate).
    tc.post(f"/api/admin/clients/{a.id}/data", json={"reports": [_report("A1")], "is_demo": True})
    tc.post(f"/api/admin/clients/{b.id}/data", json={"reports": [_report("B1")], "is_demo": True})

    # No session -> denied.
    assert TestClient(app).get("/api/reports").status_code == 401

    # A's session sees only A.
    tc.cookies.set(settings.client_cookie_name, str(a_sess.id))
    a_reports = tc.get("/api/reports").json()
    assert [r["id"] for r in a_reports] == ["A1"]

    # B's session sees only B (and never A).
    tc2 = TestClient(app)
    tc2.cookies.set(settings.client_cookie_name, str(b_sess.id))
    b_reports = tc2.get("/api/reports").json()
    assert [r["id"] for r in b_reports] == ["B1"]


def test_real_data_gated_by_isolation_flag(app_and_db, monkeypatch):
    app, db = app_and_db
    tc = TestClient(app)
    c, sess, _ = _seed(db, "realco", "R1")
    tc.post(f"/api/admin/clients/{c.id}/data", json={"reports": [_report("R1")], "is_demo": False})
    tc.cookies.set(settings.client_cookie_name, str(sess.id))

    monkeypatch.setattr(settings, "isolation_verified", False)
    assert tc.get("/api/reports").json() == []          # withheld

    monkeypatch.setattr(settings, "isolation_verified", True)
    assert [r["id"] for r in tc.get("/api/reports").json()] == ["R1"]
