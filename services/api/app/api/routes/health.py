from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "pli-api"}


@router.get("/ready")
async def ready() -> dict[str, str]:
    # Agent should extend with DB/Redis readiness checks.
    return {"status": "bootstrap"}
