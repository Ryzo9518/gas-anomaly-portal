"""Unit 8 — revocation (contact + whole client) cascades to live sessions."""
import datetime as dt

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.clients_admin_api import router
from app.db import get_db
from app.deps import current_admin
from app.models import CONTACT_ACTIVE, Client, ClientSession, Contact


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
    return TestClient(app), api_session


def _contact_with_session(db, name="Tourvest", email="cfo@x.com"):
    c = Client(name=name)
    db.add(c)
    db.flush()
    ct = Contact(client_id=c.id, email=email, status=CONTACT_ACTIVE)
    db.add(ct)
    db.flush()
    s = ClientSession(
        contact_id=ct.id,
        client_id=c.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8),
    )
    db.add(s)
    db.commit()
    return c, ct, s


def test_revoke_contact_kills_session(client):
    tc, db = client
    c, ct, s = _contact_with_session(db)
    r = tc.post(f"/api/admin/contacts/{ct.id}/revoke")
    assert r.status_code == 200
    db.expire_all()
    assert db.get(Contact, ct.id).status == "revoked"
    assert db.get(ClientSession, s.id).revoked_at is not None  # live session killed


def test_revoke_whole_client_revokes_all(client):
    tc, db = client
    c, ct, s = _contact_with_session(db, email="a@x.com")
    # second contact + session for same client
    ct2 = Contact(client_id=c.id, email="b@x.com", status=CONTACT_ACTIVE)
    db.add(ct2)
    db.flush()
    s2 = ClientSession(
        contact_id=ct2.id,
        client_id=c.id,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8),
    )
    db.add(s2)
    db.commit()

    r = tc.post(f"/api/admin/clients/{c.id}/revoke")
    assert r.status_code == 200
    db.expire_all()
    assert db.get(Client, c.id).revoked_at is not None
    for sess in db.scalars(select(ClientSession).where(ClientSession.client_id == c.id)):
        assert sess.revoked_at is not None
    for contact in db.scalars(select(Contact).where(Contact.client_id == c.id)):
        assert contact.status == "revoked"
