"""Unit 4 — magic-link token security (R15)."""
from app import tokens


def test_tokens_are_unique_and_high_entropy():
    a, b = tokens.generate_token(), tokens.generate_token()
    assert a != b
    assert len(a) >= 32  # token_urlsafe(32) -> ~43 chars


def test_hash_is_not_the_raw_token():
    t = tokens.generate_token()
    h = tokens.hash_token(t)
    assert h != t
    assert len(h) == 64  # sha256 hex


def test_verify_matches_and_rejects():
    t = tokens.generate_token()
    h = tokens.hash_token(t)
    assert tokens.verify_token(t, h) is True
    assert tokens.verify_token("not-the-token", h) is False
