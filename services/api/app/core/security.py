"""Auth & token security helpers.

v0.1 runs in dev auth mode (DEV_AUTH_ENABLED=true): the session cookie
carries a signed user id. Real password/OIDC auth is out of v0.1 scope and
returns 501 via /auth/status. Share tokens are random and stored hashed.
"""

import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import PermissionDenied, Unauthenticated
from app.models import User

SESSION_COOKIE = "pli_session"
_ACCESS_LOG_SALT = "pli-share-token-v1"


def _sign(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def create_session_token(user_id: uuid.UUID) -> str:
    settings = get_settings()
    raw = str(user_id)
    return f"{raw}.{_sign(raw, settings.session_secret)}"


def parse_session_token(token: str) -> uuid.UUID | None:
    settings = get_settings()
    try:
        raw, sig = token.rsplit(".", 1)
        if not hmac.compare_digest(sig, _sign(raw, settings.session_secret)):
            return None
        return uuid.UUID(raw)
    except (ValueError, TypeError):
        return None


def hash_share_token(token: str) -> str:
    return hashlib.sha256(f"{_ACCESS_LOG_SALT}:{token}".encode()).hexdigest()


def new_share_token() -> tuple[str, str, str]:
    """Returns (raw_token, token_hash, token_prefix)."""
    raw = secrets.token_urlsafe(24)
    return raw, hash_share_token(raw), raw[:8]


def new_invitation_token() -> tuple[str, str, str]:
    return new_share_token()


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    settings = get_settings()
    if not settings.dev_auth_enabled:
        raise Unauthenticated("Interactive auth is not enabled in this environment.")

    user_id: uuid.UUID | None = None

    auth_header = request.headers.get("Authorization", "")
    dev_header = request.headers.get("X-Dev-User-Id", "")
    if auth_header.startswith("Bearer "):
        user_id = parse_session_token(auth_header.removeprefix("Bearer "))
        if user_id is None:
            user_id = _try_uuid(auth_header.removeprefix("Bearer "))
    elif dev_header:
        user_id = _try_uuid(dev_header)
    if user_id is None:
        cookie = request.cookies.get(SESSION_COOKIE)
        if cookie:
            user_id = parse_session_token(cookie)

    if user_id is None:
        raise Unauthenticated("No valid dev session. Use POST /api/v1/auth/dev/login.")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise Unauthenticated("Unknown or inactive user.")
    return user


def _try_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError, AttributeError):
        return None


async def require_dev_auth_enabled() -> None:
    if not get_settings().dev_auth_enabled:
        raise PermissionDenied("Dev auth disabled.")


def default_token_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(hours=72)
