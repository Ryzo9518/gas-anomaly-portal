import time

import jwt
from fastapi import Request, Response

from .config import settings


def issue_session(resp: Response, *, sub: str, email: str, name: str) -> None:
    """Set the signed, HttpOnly session cookie after a successful login."""
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": sub,
            "email": email,
            "name": name,
            "role": "staff",
            "iat": now,
            "exp": now + settings.session_ttl_hours * 3600,
        },
        settings.session_secret,
        algorithm="HS256",
    )
    resp.set_cookie(
        settings.cookie_name,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def read_session(request: Request) -> dict | None:
    """Return verified session claims, or None if missing/invalid/expired."""
    token = request.cookies.get(settings.cookie_name)
    if not token:
        return None
    try:
        return jwt.decode(token, settings.session_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def clear_session(resp: Response) -> None:
    resp.delete_cookie(settings.cookie_name, path="/")
