"""Dev auth routes (PLI-217): login as seeded dev user, set signed cookie."""

import uuid

from fastapi import APIRouter, Cookie, HTTPException, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from app.api.deps import DBSession
from app.core.security import (
    SESSION_COOKIE,
    create_session_token,
    parse_session_token,
)
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class DevLoginRequest(BaseModel):
    user_id: uuid.UUID | None = None
    email: str | None = None


@router.post("/dev/login")
async def dev_login(body: DevLoginRequest, response: Response, db: DBSession) -> dict:
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


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


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
    return {
        "mode": "dev",
        "real_auth": "not_implemented_in_v0.1 (planned v0.2, PLI-217 partial)",
    }
