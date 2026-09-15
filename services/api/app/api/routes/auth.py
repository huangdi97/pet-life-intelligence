"""Auth routes (PLI-217): real registration / login / refresh / reset /
verification / sessions. dev/login kept for local/test/staging demo only,
guarded by DEV_AUTH_ENABLED.
"""

import uuid

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.config import get_settings
from app.core.security import (
    SESSION_COOKIE,
    create_session_token,
    parse_session_token,
)
from app.models import User
from app.services import auth as auth_svc

router = APIRouter(prefix="/auth", tags=["auth"])


# ---- request models ----

class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: str
    password: str
    device_label: str = ""


class RefreshIn(BaseModel):
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


class ResetRequestIn(BaseModel):
    email: str


class ResetConfirmIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class VerifyEmailIn(BaseModel):
    token: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class DeleteAccountIn(BaseModel):
    password: str


class DevLoginRequest(BaseModel):
    user_id: uuid.UUID | None = None
    email: str | None = None


# ---- endpoints ----

@router.post("/register", status_code=201)
async def register(body: RegisterIn, request: Request, db: DBSession) -> dict:
    return await auth_svc.register(
        db, body.email, body.password, body.display_name,
        request, verify_email=True,
    )


@router.post("/verify-email", status_code=200)
async def verify_email(body: VerifyEmailIn, request: Request, db: DBSession) -> dict:
    return await auth_svc.verify_email(db, body.token, request)


@router.post("/login")
async def login(body: LoginIn, request: Request, db: DBSession) -> dict:
    return await auth_svc.login(
        db, body.email, body.password, request, device_label=body.device_label,
    )


@router.post("/refresh")
async def refresh(body: RefreshIn, request: Request, db: DBSession) -> dict:
    return await auth_svc.refresh(db, body.refresh_token, request)


@router.post("/logout")
async def logout(body: LogoutIn, request: Request, db: DBSession, user: CurrentUser) -> dict:
    await auth_svc.logout(db, user, body.refresh_token, request)
    return {"ok": True}


@router.get("/sessions")
async def list_sessions(db: DBSession, user: CurrentUser) -> list[dict]:
    return await auth_svc.list_sessions(db, user)


@router.post("/sessions/{session_id}/revoke")
async def revoke_session(session_id: uuid.UUID, request: Request,
                         db: DBSession, user: CurrentUser) -> dict:
    await auth_svc.revoke_session(db, user, session_id, request)
    return {"ok": True}


@router.post("/change-password")
async def change_password(body: ChangePasswordIn, request: Request,
                          db: DBSession, user: CurrentUser) -> dict:
    await auth_svc.change_password(db, user, body.current_password,
                                   body.new_password, request)
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(body: ResetRequestIn, request: Request,
                          db: DBSession) -> dict:
    return await auth_svc.request_password_reset(db, body.email, request)


@router.post("/reset-password")
async def reset_password(body: ResetConfirmIn, request: Request,
                         db: DBSession) -> dict:
    await auth_svc.reset_password(db, body.token, body.new_password, request)
    return {"ok": True}


@router.post("/delete-account")
async def delete_account(body: DeleteAccountIn, request: Request,
                         db: DBSession, user: CurrentUser) -> dict:
    await auth_svc.delete_account(db, user, body.password, request)
    return {"ok": True, "message": "Account deactivated."}


# ---- dev auth (local/test/staging-demo only) ----

@router.post("/dev/login")
async def dev_login(body: DevLoginRequest, response: Response, db: DBSession) -> dict:
    if not get_settings().dev_auth_enabled:
        raise HTTPException(status_code=403, detail="Dev auth disabled.")
    stmt = select(User)
    if body.user_id is not None:
        stmt = stmt.where(User.id == body.user_id)
    elif body.email:
        stmt = stmt.where(User.email == body.email.lower())
    else:
        raise HTTPException(status_code=422, detail="user_id or email required")
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Unknown user")
    token = create_session_token(user.id)
    response.set_cookie(
        SESSION_COOKIE, token, httponly=True, samesite="lax", path="/"
    )
    return {"user_id": str(user.id), "display_name": user.display_name,
            "email": user.email}


@router.get("/whoami")
async def whoami(
    db: DBSession,
    pli_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> dict:
    if not pli_session:
        raise HTTPException(status_code=401, detail="no session")
    uid = parse_session_token(pli_session)
    if uid is None:
        raise HTTPException(status_code=401, detail="invalid session")
    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="unknown user")
    return {"user_id": str(user.id), "display_name": user.display_name,
            "email": user.email}


@router.get("/status")
async def auth_status() -> dict:
    settings = get_settings()
    return {
        "mode": "production-ready" if not settings.dev_auth_enabled else "dev",
        "real_auth": "enabled",
        "dev_auth_enabled": settings.dev_auth_enabled,
        "access_token_ttl_minutes": settings.access_token_ttl_minutes,
        "refresh_token_ttl_days": settings.refresh_token_ttl_days,
        "email_delivery": settings.email_delivery,
    }
