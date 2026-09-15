"""Email delivery adapter (Stage E).

- console: prints the message (local/test/staging demo). Never in production.
- smtp: real SMTP — requires SMTP_* env; EXTERNAL_BLOCKED until credentials.

Production must be `email_delivery=smtp`; console delivery in production is a
config fail-fast problem (checked in Settings.validate_production).
"""

import logging

from app.core.config import get_settings

logger = logging.getLogger("pli.email")


def send_email(to: str, subject: str, body: str) -> None:
    settings = get_settings()
    if settings.email_delivery == "console":
        logger.info("EMAIL[console] to=%s subject=%s\n%s", to, subject, body)
        return
    if settings.email_delivery == "smtp":
        _send_smtp(to, subject, body)
        return
    logger.warning("email_delivery=%s not handled; email not sent.", settings.email_delivery)


def _send_smtp(to: str, subject: str, body: str) -> None:
    # SMTP requires SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD + TLS.
    # Not wired until a real mail account is provided (EXTERNAL_BLOCKED).
    from app.core.errors import ValidationFailed

    raise ValidationFailed("SMTP delivery is EXTERNAL_BLOCKED until SMTP_* credentials are configured.")


def build_verify_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.public_app_url}/verify-email?token={token}"


def build_reset_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.public_app_url}/reset-password?token={token}"
