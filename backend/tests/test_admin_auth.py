"""Unit 3 — admin authorization is enforced server-side (R1).

Builds a tiny app with a route guarded by current_admin and exercises the
allow/deny matrix with forged cookies. Proves the 403 is at the API layer, not
just the UI, and that a client-type cookie cannot satisfy an admin route.
"""
import time

import jwt
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.deps import current_admin

app = FastAPI()


@app.get("/admin-only")
def admin_only(claims: dict = Depends(current_admin)):
    return {"ok": True, "email": claims["email"]}


client = TestClient(app)


def _staff_token(email: str, is_admin: bool) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "sub": email,
            "email": email,
            "name": "Test",
            "role": "staff",
            "is_admin": is_admin,
            "iat": now,
            "exp": now + 3600,
        },
        settings.session_secret,
        algorithm="HS256",
    )


def test_admin_allowed():
    r = client.get(
        "/admin-only",
        cookies={settings.cookie_name: _staff_token("admin@jera.co.za", True)},
    )
    assert r.status_code == 200
    assert r.json()["email"] == "admin@jera.co.za"


def test_non_admin_staff_forbidden():
    r = client.get(
        "/admin-only",
        cookies={settings.cookie_name: _staff_token("staff@jera.co.za", False)},
    )
    assert r.status_code == 403


def test_unauthenticated_rejected():
    r = client.get("/admin-only")
    assert r.status_code == 401


def test_client_cookie_cannot_satisfy_admin_route():
    # A client session uses a DIFFERENT cookie name; the staff cookie is absent,
    # so an admin route must reject it (session-type separation).
    token = _staff_token("admin@jera.co.za", True)
    r = client.get("/admin-only", cookies={settings.client_cookie_name: token})
    assert r.status_code == 401
