"""Postgres-backed fixed-window rate limiter (R16).

Survives process restarts (single-process box), unlike an in-memory counter.
check_and_increment returns True if the action is allowed, False if the caller
is over the limit for the current window.
"""
import datetime as dt

from sqlalchemy.orm import Session

from .models import RateLimit


def check_and_increment(
    db: Session, key: str, *, limit: int, window_seconds: int
) -> bool:
    now = dt.datetime.now(dt.timezone.utc)
    rl = db.get(RateLimit, key)
    if rl is None:
        db.add(RateLimit(key=key, count=1, window_start=now))
        return True
    if (now - rl.window_start).total_seconds() > window_seconds:
        rl.count = 1
        rl.window_start = now
        return True
    if rl.count >= limit:
        return False
    rl.count += 1
    return True
