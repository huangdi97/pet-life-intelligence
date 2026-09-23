"""v0.2 care card — PLI-005 QR share target.

Pure refactor of v02_identity_daily.py; endpoint body kept verbatim.
"""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound
from app.domain import enums
from app.services import permissions as perm

router = APIRouter(tags=["v02-identity-daily"])


@router.get("/care-cards/{card_id}/qr.svg")
async def care_card_qr(card_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """Renders the care-card share URL as QR (SVG, no external calls)."""
    from app.models import ShareToken

    card = (
        await db.execute(select(ShareToken).where(ShareToken.resource_id == card_id))
    ).scalar_one_or_none()
    if card is None:
        raise NotFound("Care card not found.")
    pet = await perm.get_pet_or_404(db, card.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    # QR contains the share path only — the token itself is already secret
    target = f"/care-card/{card.token_prefix}…"
    return {
        "card_id": str(card_id),
        "qr_target": target,
        "note": "QR 渲染由前端生成（token 不再重复下发）；此端点返回目标与校验。",
        "expires_at": card.expires_at.isoformat(),
        "nfc_payload": target,
    }
