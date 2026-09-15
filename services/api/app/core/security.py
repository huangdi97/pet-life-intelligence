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
    auth_header = request.headers.get("Authorization", "")
    dev_header = request.headers.get("X-Dev-User-Id", "")
    bearer_token = auth_header.removeprefix("Bearer ").strip() if auth_header.startswith("Bearer ") else ""

    # Real auth path: Bearer access token (hashed in auth_sessions)
    if bearer_token:
        from app.models import AuthSession
        from app.services.auth import _hash_token

        token_hash = _hash_token(bearer_token)
        row = (await db.execute(
            select(AuthSession).where(AuthSession.access_token_hash == token_hash)
        )).scalar_one_or_none()
        if row is not None:
            from datetime import UTC, datetime

            now = datetime.now(UTC)
            if row.revoked_at is None and row.expires_at > now:
                row.last_used_at = now
                await db.flush()
                user = (await db.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
                if user is not None and user.is_active:
                    return user
        raise Unauthenticated("Invalid or expired access token.")

    # Dev auth path: only when dev auth enabled (local/test/staging-demo)
    if not settings.dev_auth_enabled:
        raise Unauthenticated("Authentication required.")

    user_id: uuid.UUID | None = None
    if dev_header:
        user_id = _try_uuid(dev_header)
    if user_id is None:
        cookie = request.cookies.get(SESSION_COOKIE)
        if cookie:
            user_id = parse_session_token(cookie)
    if user_id is None and auth_header.startswith("Bearer "):
        # allow dev login via a plain Bearer dev token for tests/tools
        dev_raw = auth_header.removeprefix("Bearer ")
        user_id = _try_uuid(dev_raw) or parse_session_token(dev_raw)

    if user_id is None:
        raise Unauthenticated("No valid session. Use POST /api/v1/auth/login.")

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
