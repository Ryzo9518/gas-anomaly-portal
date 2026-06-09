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

from app.models import Base

TEST_DB_URL = os.environ.get(
    "GAS_PORTAL_TEST_DATABASE_URL",
    "postgresql+psycopg://localhost/gas_portal_test",
)


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, future=True)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


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
