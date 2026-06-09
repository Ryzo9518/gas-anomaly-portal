"""SQLAlchemy models for the client invite & access system.

Base lives here (not in db.py) so tests and Alembic can import the metadata
without importing app.config / creating the engine (which would require the full
runtime env). app.db builds the engine from settings and re-exports Base.
"""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# Status values for a contact. Kept as strings (not a DB enum) to avoid enum
# migration friction; validated in the application layer.
CONTACT_INVITED = "invited"
CONTACT_ACTIVE = "active"
CONTACT_REVOKED = "revoked"

# Delivery status for the most recent invite/re-link email to a contact.
DELIVERY_PENDING = "pending"
DELIVERY_SENT = "sent"
DELIVERY_FAILED = "failed"


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200))
    health_target: Mapped[int] = mapped_column(Integer, default=80)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(320), nullable=True)
    revoked_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    contacts: Mapped[list["Contact"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )


class Contact(Base):
    __tablename__ = "contacts"
    # Identity key is (client_id, email) — the same email may be a contact for
    # more than one client (R14).
    __table_args__ = (
        UniqueConstraint("client_id", "email", name="uq_contact_client_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320), index=True)  # stored lowercased
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=CONTACT_INVITED)
    delivery_status: Mapped[str] = mapped_column(String(20), default=DELIVERY_PENDING)
    last_login_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(320), nullable=True)
    revoked_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    client: Mapped["Client"] = relationship(back_populates="contacts")


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    contact_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), index=True
    )
    # Only the hash of the high-entropy token is stored (R15). Unique so a
    # collision cannot silently overwrite.
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(320), nullable=True)
    created_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)


class ClientSession(Base):
    __tablename__ = "sessions"

    # id IS the opaque session token stored in the cookie (server-generated).
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    contact_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    # Distinct from staff sessions — staff use the HS256 cookie; client sessions
    # are these server-side rows. session_type guards against confused-deputy use.
    session_type: Mapped[str] = mapped_column(String(20), default="client")
    issued_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    event: Mapped[str] = mapped_column(String(64), index=True)
    actor: Mapped[str | None] = mapped_column(String(320), nullable=True)
    target_contact_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    target_client_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    # Never store raw tokens or full magic-link URLs here (R10/R15) — only a
    # token reference/hash if needed.
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ClientData(Base):
    """The per-client audit payload served by the backend (R13). One row per
    client; `payload` is the same shape the SPA's report fixtures used. `is_demo`
    flags non-real data — real data is withheld until ISOLATION_VERIFIED is on.
    """
    __tablename__ = "client_data"

    client_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True
    )
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_by: Mapped[str | None] = mapped_column(String(320), nullable=True)


class RateLimit(Base):
    __tablename__ = "rate_limit"

    # key e.g. "relink:email:foo@bar.com" or "relink:ip:1.2.3.4"
    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    window_start: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
