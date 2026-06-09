"""Engine + session wiring for the app runtime.

Imports settings (full runtime env). Tests and Alembic import Base/metadata
from app.models directly and build their own engine, so they do not need the
auth env to be present.
"""
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import settings
from .models import Base  # re-export for convenience

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

__all__ = ["Base", "engine", "SessionLocal", "get_db"]


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
