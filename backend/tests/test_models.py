"""Unit 2 — persistence layer model tests."""
import datetime as dt

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    CONTACT_INVITED,
    Client,
    ClientSession,
    Contact,
    Invite,
)


def _client(db, name="Tourvest"):
    c = Client(name=name, health_target=80, created_by="ryan@jera.co.za")
    db.add(c)
    db.flush()
    return c


def test_client_and_contact_crud(db):
    # Happy path: a client and a contact persist and reload.
    c = _client(db)
    contact = Contact(client_id=c.id, email="cfo@tourvest.com", created_by="ryan@jera.co.za")
    db.add(contact)
    db.flush()

    loaded = db.get(Contact, contact.id)
    assert loaded is not None
    assert loaded.status == CONTACT_INVITED          # default
    assert loaded.delivery_status == "pending"        # default
    assert loaded.client.name == "Tourvest"           # relationship


def test_same_email_two_clients_allowed(db):
    # R14: identity is (client, email) — one email may belong to multiple clients.
    a = _client(db, "Client A")
    b = _client(db, "Client B")
    db.add(Contact(client_id=a.id, email="advisor@firm.com"))
    db.add(Contact(client_id=b.id, email="advisor@firm.com"))
    db.flush()  # no IntegrityError


def test_duplicate_contact_same_client_rejected(db):
    # Edge: the same email cannot be invited twice to the SAME client.
    c = _client(db)
    db.add(Contact(client_id=c.id, email="dup@tourvest.com"))
    db.flush()
    db.add(Contact(client_id=c.id, email="dup@tourvest.com"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_invite_token_hash_unique(db):
    c = _client(db)
    contact = Contact(client_id=c.id, email="x@tourvest.com")
    db.add(contact)
    db.flush()
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=30)
    db.add(Invite(contact_id=contact.id, token_hash="hash-aaa", expires_at=exp))
    db.flush()
    db.add(Invite(contact_id=contact.id, token_hash="hash-aaa", expires_at=exp))
    with pytest.raises(IntegrityError):
        db.flush()


def test_session_defaults_client_type(db):
    c = _client(db)
    contact = Contact(client_id=c.id, email="s@tourvest.com")
    db.add(contact)
    db.flush()
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=8)
    s = ClientSession(contact_id=contact.id, client_id=c.id, expires_at=exp)
    db.add(s)
    db.flush()
    assert s.session_type == "client"   # session-type separation default
    assert s.revoked_at is None
