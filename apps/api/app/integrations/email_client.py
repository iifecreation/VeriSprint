"""Email digests via Resend's REST API — plain httpx, no SDK dependency needed for one endpoint."""
import httpx

from app.config import get_settings

settings = get_settings()

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "VeriSprint <digests@verisprint.dev>"


def send_email(to: str, subject: str, text: str, from_address: str = DEFAULT_FROM) -> None:
    if not settings.resend_api_key:
        raise RuntimeError("RESEND_API_KEY is not configured — cannot send email digests")

    resp = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"},
        json={"from": from_address, "to": [to], "subject": subject, "text": text},
        timeout=30,
    )
    resp.raise_for_status()
