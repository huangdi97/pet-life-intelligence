"""WeChat mini-program login (Stage E §29).

Real flow:
  wx.login → code → POST /auth/wechat/login
  → backend calls WeChat jscode2session (appid+secret+code) → openid
  → find-or-create PLI user (email = wechat:<openid>@mini.pli)
  → issue the same real session tokens (access + rotating refresh)

Requires WECHAT_APP_ID / WECHAT_APP_SECRET. Without them, this returns a
clear EXTERNAL_BLOCKED error (never a fake session in production).
"""

import httpx
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import Unauthenticated
from app.models import User
from app.services import auth as auth_svc

WECHAT_JSCODE2SESSION = "https://api.weixin.qq.com/sns/jscode2session"


async def _exchange_code(code: str) -> str:
    settings = get_settings()
    if not settings.wechat_app_id or not settings.wechat_app_secret:
        raise Unauthenticated(
            "WeChat login unavailable: WECHAT_APP_ID/APP_SECRET not configured (EXTERNAL_BLOCKED)."
        )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(WECHAT_JSCODE2SESSION, params={
            "appid": settings.wechat_app_id,
            "secret": settings.wechat_app_secret,
            "js_code": code,
            "grant_type": "authorization_code",
        })
    data = resp.json()
    if data.get("errcode"):
        raise Unauthenticated(f"WeChat code exchange failed: {data.get('errmsg', '')}")
    openid = data.get("openid")
    if not openid:
        raise Unauthenticated("WeChat login failed: no openid returned.")
    return openid


async def login(db: AsyncSession, code: str, request: Request, device_label: str) -> dict:
    openid = await _exchange_code(code)
    email = f"wechat:{openid}@mini.pli"

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        # auto-provision a PLI account bound to this openid
        user = User(email=email, display_name="微信用户", is_active=True)
        db.add(user)
        await db.flush()
        from app.models import Credential

        # wechat-bound accounts have no password; a random unguessable hash
        # keeps the credential row present for uniform handling.
        db.add(Credential(user_id=user.id, password_hash=auth_svc.hash_password(
            openid + ":" + get_settings().session_secret
        )))
        await db.flush()

    tokens = await auth_svc._create_session(db, user, request, device_label or "微信小程序")
    await auth_svc._log_security(db, user.id, "wechat.login", request)
    await db.commit()
    return {
        "user_id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "is_new": user.created_at is not None,
        **tokens,
    }
