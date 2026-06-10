"""Microsoft Graph email sending (R12) + branded templates.

App-only (client-credentials) token using the same Entra app registration as
staff SSO. `Mail.Send` application permission is granted + verified. Sends from
settings.graph_sender (anomaly@jera.co.za).

send_mail is the single seam tests monkeypatch — no network in tests.
"""
import logging

import httpx

from .config import settings

log = logging.getLogger("uvicorn.error")

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
_TOKEN_URL = (
    "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
)


def _app_token() -> str:
    resp = httpx.post(
        _TOKEN_URL.format(tenant=settings.entra_tenant_id),
        data={
            "client_id": settings.entra_client_id,
            "client_secret": settings.entra_client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def send_mail(*, to: str, subject: str, html: str) -> None:
    """Send one HTML email via Graph. Raises on failure so callers can record a
    `failed` delivery status (R17). Never logs the email body (may contain a
    raw magic-link token)."""
    token = _app_token()
    resp = httpx.post(
        f"{GRAPH_BASE}/users/{settings.graph_sender}/sendMail",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "message": {
                "subject": subject,
                "body": {"contentType": "HTML", "content": html},
                "toRecipients": [{"emailAddress": {"address": to}}],
            },
            "saveToSentItems": True,
        },
        timeout=20,
    )
    resp.raise_for_status()
    log.info("invite email sent to %s", to)  # address only, never the link


def build_invite_email(*, client_name: str, link: str) -> tuple[str, str]:
    """Returns (subject, html) for a client invite. Jera-branded, anti-phish
    framing (R17). One-click link — no passcode."""
    subject = "You have been invited to your GAS Anomaly audit portal"
    html = f"""\
<!doctype html><html><body style="margin:0;padding:0;background:#0b0a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0a1a;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#14122b;border:1px solid #2a2550;border-radius:16px;padding:40px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:40px;height:40px;background:linear-gradient(135deg,#a78bfa,#6d28d9);border-radius:10px;text-align:center;vertical-align:middle;color:#fff;font-weight:800;font-size:15px;">GAS</td>
    <td style="padding-left:12px;color:#fff;font-size:17px;font-weight:700;">GAS Anomaly Portal</td>
  </tr></table>
  <h1 style="color:#fff;font-size:23px;line-height:1.3;margin:28px 0 12px;font-weight:700;">You have been invited to your audit portal</h1>
  <p style="color:#b9b4d6;font-size:15px;line-height:1.6;margin:0 0 24px;">Jera Consulting has prepared the Sage&nbsp;X3 anomaly audit for <b>{client_name}</b>. Use the secure button below to open your private portal &mdash; one click, nothing to remember.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:linear-gradient(135deg,#7c5cff,#6d28d9);">
    <a href="{link}" style="display:inline-block;padding:14px 30px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">Open your secure portal &rarr;</a>
  </td></tr></table>
  <p style="color:#7e789e;font-size:12px;line-height:1.6;margin:0;">This link is private to you, single-use, and expires shortly. Please do not forward it. If it expires, you can request a new one from the portal.</p>
  <hr style="border:none;border-top:1px solid #2a2550;margin:18px 0;">
  <p style="color:#8d87ad;font-size:12px;margin:0;">Sent by Jera Consulting &middot; GAS Anomaly Portal. If you did not expect this, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>"""
    return subject, html
