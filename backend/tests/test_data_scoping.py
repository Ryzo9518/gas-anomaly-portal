"""Unit 6 — per-identity data serving, default-deny, isolation gate (R9/R13)."""
import datetime as dt

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.clients_api import router
from app.config import settings
from app.db import get_db
from app.models import CONTACT_ACTIVE, Client, ClientData, ClientSession, Contact


@pytest.fixture()
def client(api_session):
    app = FastAPI()
    app.include_router(router)

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    return TestClient(app), api_session


def _client_with_session(db, name, payload, *, is_demo=True):
    c = Client(name=name)
    db.add(c)
    db.flush()
    db.add(ClientData(client_id=c.id, payload=payload, is_demo=is_demo))
    ct = Contact(client_id=c.id, email=f"user@{name}.com", status=CONTACT_ACTIVE)
    db.add(ct)
    db.flush()
    s = ClientSession(
        contact_id=ct.id,
        client_id=c.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8),
    )
    db.add(s)
    db.commit()
    return c, s


def test_no_session_is_denied(client):
    tc, _ = client
    assert tc.get("/api/reports").status_code == 401
    assert tc.get("/api/clients").status_code == 401


def test_session_sees_only_own_data(client):
    tc, db = client
    a, a_sess = _client_with_session(db, "alpha", [{"id": "A1"}])
    _client_with_session(db, "bravo", [{"id": "B1"}])  # other client

    tc.cookies.set(settings.client_cookie_name, str(a_sess.id))
    reports = tc.get("/api/reports").json()
    assert reports == [{"id": "A1"}]          # only alpha's data
    assert tc.get("/api/clients").json()["name"] == "alpha"


def test_real_data_withheld_until_isolation_verified(client, monkeypatch):
    tc, db = client
    c, sess = _client_with_session(db, "realco", [{"id": "R1"}], is_demo=False)
    tc.cookies.set(settings.client_cookie_name, str(sess.id))

    monkeypatch.setattr(settings, "isolation_verified", False)
    assert tc.get("/api/reports").json() == []   # withheld (fail-closed)

    monkeypatch.setattr(settings, "isolation_verified", True)
    assert tc.get("/api/reports").json() == [{"id": "R1"}]


def test_revoked_session_denied(client):
    tc, db = client
    c, sess = _client_with_session(db, "gamma", [{"id": "G1"}])
    sess.revoked_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    tc.cookies.set(settings.client_cookie_name, str(sess.id))
    assert tc.get("/api/reports").status_code == 401
