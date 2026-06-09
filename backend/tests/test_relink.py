"""Unit 7 — self-service re-link (rate-limited, no enumeration)."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import email_graph
from app.client_auth_api import router
from app.db import get_db
from app.models import CONTACT_ACTIVE, Client, Contact


@pytest.fixture()
def client(api_session, monkeypatch):
    sent = []
    monkeypatch.setattr(email_graph, "send_mail", lambda **kw: sent.append(kw))
    app = FastAPI()
    app.include_router(router)

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    tc = TestClient(app)
    tc.sent = sent  # type: ignore[attr-defined]
    return tc, api_session


def _active_contact(db, email="cfo@x.com"):
    c = Client(name="Tourvest")
    db.add(c)
    db.flush()
    ct = Contact(client_id=c.id, email=email, status=CONTACT_ACTIVE)
    db.add(ct)
    db.commit()
    return ct


def test_active_contact_gets_link(client):
    tc, db = client
    _active_contact(db)
    r = tc.post("/api/auth/client/relink", json={"email": "cfo@x.com"})
    assert r.status_code == 200
    assert len(tc.sent) == 1


def test_unknown_email_no_send_generic_response(client):
    tc, db = client
    r = tc.post("/api/auth/client/relink", json={"email": "nobody@nowhere.com"})
    assert r.status_code == 200          # identical response
    assert len(tc.sent) == 0             # but nothing sent (no enumeration leak)


def test_revoked_contact_gets_nothing(client):
    tc, db = client
    ct = _active_contact(db, "revoked@x.com")
    import datetime as dt

    ct.status = "revoked"
    ct.revoked_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    r = tc.post("/api/auth/client/relink", json={"email": "revoked@x.com"})
    assert r.status_code == 200
    assert len(tc.sent) == 0


def test_rate_limit_stops_sending(client):
    tc, db = client
    _active_contact(db, "spammed@x.com")
    # limit is 3 per email per window
    for _ in range(3):
        tc.post("/api/auth/client/relink", json={"email": "spammed@x.com"})
    assert len(tc.sent) == 3
    tc.post("/api/auth/client/relink", json={"email": "spammed@x.com"})
    assert len(tc.sent) == 3  # 4th request rate-limited; still 200, no extra send
