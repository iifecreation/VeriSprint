"""
Public Contact form (marketing site → real inbox, spec Section 8's public
site requirement made concrete): the one endpoint on this API meant to be
hit by a visitor who isn't a VeriSprint user at all yet, so it gets the same
rate-limiting discipline as login/password-reset — see app/auth/rate_limit.py.

Every submission is saved first (so it's never lost even if email delivery
is unconfigured or fails) and surfaces in the Super-Admin Dashboard's
Messages panel — the notification email to the internal team is a
best-effort convenience on top of that, not the only place a message lives.
"""
import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.rate_limit import client_ip, enforce_rate_limit
from app.config import get_settings
from app.db.models import ContactMessage
from app.db.session import get_db
from app.integrations.email_client import send_email
from app.schemas import CONTACT_REASONS, ContactMessageCreate, ContactMessageOut

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=ContactMessageOut)
async def submit_contact_message(
    payload: ContactMessageCreate, request: Request, db: AsyncSession = Depends(get_db)
) -> ContactMessage:
    # Generous limits — this is a real lead-capture form for real visitors,
    # not a login form; the point is stopping a spam bot, not a legitimate
    # person double-submitting.
    await enforce_rate_limit(key=f"ratelimit:contact:ip:{client_ip(request)}", max_attempts=10, window_seconds=3600)
    await enforce_rate_limit(key=f"ratelimit:contact:email:{payload.email.lower()}", max_attempts=5, window_seconds=3600)

    reason = payload.reason if payload.reason in CONTACT_REASONS else "other"
    message = ContactMessage(name=payload.name, email=payload.email, reason=reason, message=payload.message)
    db.add(message)
    await db.commit()
    await db.refresh(message)

    try:
        send_email(
            to=settings.contact_notify_email,
            subject=f"New contact message ({reason}): {payload.name}",
            text=f"From: {payload.name} <{payload.email}>\nReason: {reason}\n\n{payload.message}",
        )
    except RuntimeError:
        # Not configured in this environment — the message is already saved
        # and visible in the Super-Admin Dashboard either way, so this is a
        # missed convenience, not a lost submission.
        logger.info("Contact message saved but notification email not sent (RESEND_API_KEY not configured)")
    except Exception:
        logger.exception("Contact message saved but notification email failed to send")

    return message
