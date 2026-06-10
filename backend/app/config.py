from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    # Entra / Microsoft
    entra_tenant_id: str
    entra_client_id: str
    entra_client_secret: str

    # App
    app_base_url: str = "https://anomaly.gasecosys.co.za"
    session_secret: str          # signs our session JWT (HS256) — 32+ random bytes
    session_ttl_hours: int = 10
    # Comma-separated allow-list of staff emails (lowercased on load).
    allowed_staff_emails: str
    # Comma-separated allow-list of ADMIN staff emails (subset of staff who may
    # invite/revoke clients). Admin is a distinct, default-deny grant (R1).
    admin_emails: str = ""

    # Database (SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host/gas_portal)
    database_url: str

    # Microsoft Graph sender for invite/re-link emails (R12). Must be a mailbox
    # in the tenant the app registration lives in.
    graph_sender: str = "anomaly@jera.co.za"

    # Base URL of the CLIENT-PORTAL build (where magic-link emails point). The
    # client portal is a distinct build served at this path; it must NOT be the
    # staff root (that build uses Microsoft login + bundled demo data).
    client_portal_base_url: str = "https://anomaly.gasecosys.co.za/portal"

    # R13 go-live gate: real (non-demo) client data is served only when this is
    # true. Flipped on (Unit 12) only after the isolation test passes. Default
    # off = fail-closed.
    isolation_verified: bool = False

    # Client magic-link / session lifetimes (R7/R11)
    magic_link_ttl_minutes: int = 30
    client_session_ttl_hours: int = 8

    # Cookie
    cookie_name: str = "gas_session"            # staff SSO cookie
    client_cookie_name: str = "gas_client"      # client session cookie — distinct
    cookie_secure: bool = True   # False only for local http dev

    @property
    def staff_allow_list(self) -> set[str]:
        return {e.strip().lower() for e in self.allowed_staff_emails.split(",") if e.strip()}

    @property
    def admin_allow_list(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    @property
    def oidc_metadata_url(self) -> str:
        return (
            f"https://login.microsoftonline.com/{self.entra_tenant_id}"
            "/v2.0/.well-known/openid-configuration"
        )


settings = Settings()  # raises at startup if a required var is missing
