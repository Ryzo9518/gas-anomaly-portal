"""Magic-link token generation + hashing (R15).

Tokens are high-entropy (256-bit) and only their keyed hash is stored. The raw
token appears once, in the email. Comparison is constant-time.
"""
import hashlib
import hmac
import secrets

from .config import settings


def generate_token() -> str:
    """A URL-safe, ~256-bit cryptographically random token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Keyed HMAC-SHA256 hex digest — what we persist (never the raw token)."""
    return hmac.new(
        settings.session_secret.encode(), token.encode(), hashlib.sha256
    ).hexdigest()


def verify_token(token: str, token_hash: str) -> bool:
    """Constant-time check of a presented token against a stored hash."""
    return hmac.compare_digest(hash_token(token), token_hash)
