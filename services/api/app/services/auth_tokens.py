"""Token & password primitives for the auth service.

Argon2id password hashing (never plaintext), opaque random tokens stored as
salted SHA-256 hashes.
"""

import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Request

_ph = PasswordHasher()

TOKEN_SALT = "pli-auth-token-v1"


def _hash_token(raw: str) -> str:
    # SECURITY:
    # Only the salted SHA-256 digest is ever stored/persisted; the raw token
    # is shown to the client exactly once. Kept importable from
    # app.services.auth for app.core.security (lazy import).
    return hashlib.sha256(f"{TOKEN_SALT}:{raw}".encode()).hexdigest()


def new_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, _hash_token(raw)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        # SAFETY:
        # Argon2 errors beyond a mismatch (corrupt hash, params change) must
        # not crash login; treat as failed verification, never as success.
        return False


def _ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    return (request.client.host if request.client else "") or ""


def _ua(request: Request) -> str:
    return request.headers.get("User-Agent", "")[:300]
