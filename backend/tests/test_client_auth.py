"""Unit 5 — magic-link verify + server-validated client session."""
import datetime as dt

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app import tokens
from app.client_auth_api import router
from app.config import settings
from app.db import get_db
from app.models import Client, ClientSession, Contact, Invite


def _now():
    return dt.datetime.now(dt.timezone.utc)


@pytest.fixture()
def client(api_session):
    app = FastAPI()
    app.include_router(router)

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    return TestClient(app), api_session


def _seed_invite(db, *, used=False, expired=False):
    c = Client(name="Tourvest")
    db.add(c)
    db.flush()
    ct = Contact(client_id=c.id, email="cfo@tourvest.com")
    db.add(ct)
    db.flush()
    raw = tokens.generate_token()
    exp = _now() + dt.timedelta(minutes=-1 if expired else 30)
    db.add(
        Invite(
            contact_id=ct.id,
            token_hash=tokens.hash_token(raw),
            expires_at=exp,
            used_at=_now() if used else None,
        )
    )
    db.commit()
    return raw, c, ct


def test_valid_token_signs_in_and_scopes_to_client(client):
    tc, db = client
    raw, c, ct = _seed_invite(db)
    r = tc.post("/api/auth/client/verify", json={"token": raw})
    assert r.status_code == 200, r.text
    assert r.json()["client"]["name"] == "Tourvest"
    assert tc.cookies.get(settings.client_cookie_name)  # session cookie set

    db.expire_all()
    contact = db.get(Contact, ct.id)
    assert contact.status == "active"
    assert contact.last_login_at is not None
    invite = db.scalar(select(Invite).where(Invite.contact_id == ct.id))
    assert invite.used_at is not None  # marked used
    assert db.scalar(select(ClientSession).where(ClientSession.contact_id == ct.id))


def test_used_token_rejected_once_redeemed(client):
    tc, db = client
    raw, *_ = _seed_invite(db)
    assert tc.post("/api/auth/client/verify", json={"token": raw}).status_code == 200
    # Second redemption of the same token -> generic invalid (single-use).
    r2 = tc.post("/api/auth/client/verify", json={"token": raw})
    assert r2.status_code == 400
    assert r2.json()["detail"]["code"] == "link_invalid"


def test_expired_token_rejected(client):
    tc, db = client
    raw, *_ = _seed_invite(db, expired=True)
    r = tc.post("/api/auth/client/verify", json={"token": raw})
    assert r.status_code == 400


def test_forged_token_rejected(client):
    tc, _ = client
    r = tc.post("/api/auth/client/verify", json={"token": "totally-made-up"})
    assert r.status_code == 400


def test_session_endpoint_reflects_login_and_revocation(client):
    tc, db = client
    raw, c, ct = _seed_invite(db)
    tc.post("/api/auth/client/verify", json={"token": raw})

    r = tc.get("/api/auth/client/session")
    assert r.status_code == 200
    assert r.json()["clientId"] == str(c.id)
    assert r.json()["email"] == "cfo@tourvest.com"

    # Revoke the session server-side -> next request is no longer authenticated.
    sess = db.scalar(select(ClientSession).where(ClientSession.contact_id == ct.id))
    sess.revoked_at = _now()
    db.commit()
    assert tc.get("/api/auth/client/session").json() is None
