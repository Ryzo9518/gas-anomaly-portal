from fastapi import HTTPException, Request

from .security import read_session


def current_staff(request: Request) -> dict | None:
    """Return the verified staff claims from the staff session cookie, or None.

    Reads only the staff cookie (settings.cookie_name). A client session uses a
    different cookie, so it can never satisfy this dependency (session-type
    separation / confused-deputy guard).
    """
    claims = read_session(request)
    if not claims or claims.get("role") != "staff":
        return None
    return claims


def current_admin(request: Request) -> dict:
    """Require an admin staff session. 401 if not signed in as staff, 403 if the
    staff member is not on the admin allow-list. Enforced server-side on every
    admin route (R1) -- never trust the UI alone.
    """
    claims = current_staff(request)
    if not claims:
        raise HTTPException(
            status_code=401,
            detail={"error": "not authenticated", "code": "unauthenticated"},
        )
    if not claims.get("is_admin"):
        raise HTTPException(
            status_code=403,
            detail={"error": "admin access required", "code": "forbidden"},
        )
    return claims
