"""Test harness. Runs against a real Postgres test DB for fidelity.

Set GAS_PORTAL_TEST_DATABASE_URL to override; defaults to a local
`gas_portal_test` database. Tables are created from the models metadata
(create_all) per test session and dropped at the end — fast and isolated,
independent of Alembic (Alembic is verified separately in test_migrations).
"""
import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = os.environ.get(
    "GAS_PORTAL_TEST_DATABASE_URL",
    "postgresql+psycopg://localhost/gas_portal_test",
)

# Default env so modules that import app.config (security/deps/main) load in
# tests without the real runtime secrets. Set before any app.* import.
os.environ.setdefault("ENTRA_TENANT_ID", "test-tenant")
os.environ.setdefault("ENTRA_CLIENT_ID", "test-client")
os.environ.setdefault("ENTRA_CLIENT_SECRET", "test-secret")
os.environ.setdefault("SESSION_SECRET", "test-session-secret-0123456789abcdef")
os.environ.setdefault("ALLOWED_STAFF_EMAILS", "admin@jera.co.za,staff@jera.co.za")
os.environ.setdefault("ADMIN_EMAILS", "admin@jera.co.za")
os.environ.setdefault("DATABASE_URL", TEST_DB_URL)
os.environ.setdefault("COOKIE_SECURE", "false")  # http test client can't keep Secure cookies

from app.models import Base  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, future=True)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture()
def api_session(engine):
    """A committing session for API tests (the routes call db.commit()). Rows are
    deleted after the test to isolate. Use for TestClient get_db overrides."""
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        with engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture()
def db(engine):
    """Per-test session wrapped in a rolled-back transaction for isolation."""
    conn = engine.connect()
    txn = conn.begin()
    Session = sessionmaker(bind=conn, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        if txn.is_active:  # may already be rolled back by a failed flush
            txn.rollback()
        conn.close()
