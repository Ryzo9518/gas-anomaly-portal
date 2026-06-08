from fastapi import Request

from .security import read_session


def current_staff(request: Request) -> dict | None:
    """Return the verified staff claims from the session cookie, or None."""
    claims = read_session(request)
    if not claims or claims.get("role") != "staff":
        return None
    return claims
