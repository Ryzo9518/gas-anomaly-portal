"""Unit 4 — admin invite flow (create client, invite contacts, resend)."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app import email_graph
from app.clients_admin_api import router
from app.db import get_db
from app.deps import current_admin
from app.models import Contact, Invite


@pytest.fixture()
def client(api_session, monkeypatch):
    # No real email in tests.
    sent = []
    monkeypatch.setattr(email_graph, "send_mail", lambda **kw: sent.append(kw))

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[current_admin] = lambda: {
        "email": "admin@jera.co.za",
        "is_admin": True,
    }

    def _get_db():
        yield api_session

    app.dependency_overrides[get_db] = _get_db
    tc = TestClient(app)
    tc.sent = sent  # type: ignore[attr-defined]
    return tc, api_session


def _make_client(tc):
    r = tc.post("/api/admin/clients", json={"name": "Tourvest"})
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_create_client(client):
    tc, db = client
    cid = _make_client(tc)
    assert cid


def test_invite_creates_contact_and_hashed_token(client):
    tc, db = client
    cid = _make_client(tc)
    r = tc.post(f"/api/admin/clients/{cid}/contacts", json={"emails": ["CFO@tourvest.com"]})
    assert r.status_code == 200, r.text
    assert r.json()["results"][0]["status"] == "sent"
    assert len(tc.sent) == 1  # email attempted

    contact = db.scalar(select(Contact).where(Contact.email == "cfo@tourvest.com"))
    assert contact is not None  # email normalised to lowercase
    assert contact.status == "invited"
    assert contact.delivery_status == "sent"

    invite = db.scalar(select(Invite).where(Invite.contact_id == contact.id))
    assert invite is not None
    assert len(invite.token_hash) == 64  # stored hashed, not raw


def test_same_email_twice_reuses_contact(client):
    tc, db = client
    cid = _make_client(tc)
    tc.post(f"/api/admin/clients/{cid}/contacts", json={"emails": ["a@x.com"]})
    tc.post(f"/api/admin/clients/{cid}/contacts", json={"emails": ["a@x.com"]})
    count = db.scalar(select(func.count()).select_from(Contact).where(Contact.email == "a@x.com"))
    assert count == 1  # no duplicate contact for the same client


def test_resend_issues_new_invite(client):
    tc, db = client
    cid = _make_client(tc)
    tc.post(f"/api/admin/clients/{cid}/contacts", json={"emails": ["b@x.com"]})
    contact = db.scalar(select(Contact).where(Contact.email == "b@x.com"))
    tc.post(f"/api/admin/contacts/{contact.id}/resend")
    n = db.scalar(select(func.count()).select_from(Invite).where(Invite.contact_id == contact.id))
    assert n == 2


def test_invite_unknown_client_404(client):
    tc, _ = client
    r = tc.post("/api/admin/clients/not-a-uuid/contacts", json={"emails": ["x@x.com"]})
    assert r.status_code == 404
