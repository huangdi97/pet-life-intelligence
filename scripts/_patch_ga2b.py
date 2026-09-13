# -*- coding: utf-8 -*-
import io

# --- capability registry into v10_platform (anchor: ops incidents tail) ------
p = "services/api/app/api/routes/v10_platform.py"
src = io.open(p, encoding="utf-8").read()
addition = '''

# --- Stage D Phase 7: integration capability registry -----------------------


REGISTRY_SEED = [
    {"capability": "device.telemetry", "provider": "fake", "mode": "SANDBOX",
     "status": "SANDBOX_READY", "feature_flag": "device.fake",
     "risk_level": "LOW", "notes": "sandbox provider; marked sandbox in payload"},
    {"capability": "device.telemetry", "provider": "<real vendors>",
     "mode": "REAL", "status": "EXTERNAL_BLOCKED",
     "feature_flag": "device.<vendor>", "risk_level": "HIGH",
     "notes": "no credential/agreement; adapter interface only"},
    {"capability": "vet.booking", "provider": "sandbox", "mode": "SANDBOX",
     "status": "DISABLED", "feature_flag": "feature.vet_booking",
     "risk_level": "HIGH", "notes": "policy: booking never auto-executed"},
    {"capability": "vet.booking", "provider": "real_provider", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "feature.vet_booking_real",
     "risk_level": "HIGH", "notes": "no legal/technical agreement"},
    {"capability": "payments", "provider": "any", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "", "risk_level": "HIGH",
     "notes": "no payments in v1.0 (AGENTS.md section 5)"},
    {"capability": "push.notifications", "provider": "any", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "", "risk_level": "LOW",
     "notes": "in-app notifications only in v1.0"},
    {"capability": "insurance.claims", "provider": "any", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "", "risk_level": "HIGH",
     "notes": "record layer only"},
]


async def ensure_registry_seeded(db) -> None:
    for entry in REGISTRY_SEED:
        exists = (
            await db.execute(
                select(CapabilityRegistry).where(
                    CapabilityRegistry.capability == entry["capability"],
                    CapabilityRegistry.provider == entry["provider"],
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            db.add(CapabilityRegistry(**entry))


@router.get("/capabilities")
async def list_capabilities(db: DBSession, user: CurrentUser) -> list[dict]:
    await ensure_registry_seeded(db)
    await db.commit()
    rows = (
        await db.execute(
            select(CapabilityRegistry).order_by(
                CapabilityRegistry.capability, CapabilityRegistry.mode
            )
        )
    ).scalars().all()
    return [
        {
            "capability": r.capability, "provider": r.provider,
            "mode": r.mode, "environment": r.environment,
            "status": r.status, "feature_flag": r.feature_flag,
            "contract_version": r.contract_version,
            "risk_level": r.risk_level,
            "last_verified_at": r.last_verified_at.isoformat() if r.last_verified_at else None,
            "notes": r.notes,
        }
        for r in rows
    ]
'''
anchor = '    return {"pet_id": str(pet.id), "score": round(score, 2), "checks": checks,
            "event_count": event_count}'
assert anchor in src, "incidents anchor missing"
src = src.replace(anchor, addition + "\n\n" + anchor, 1)
src = src.replace(
    "from app.models import (\n    AgentActionLog,",
    "from app.models import (\n    AgentActionLog,\n    CapabilityRegistry,")
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("registry OK")

# --- access log middleware ---------------------------------------------------
p = "services/api/app/main.py"
src = io.open(p, encoding="utf-8").read()
old = '''@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid_mod.uuid4().hex
    request.state.request_id = request_id
'''
new = '''logger = logging.getLogger("pli.access")


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid_mod.uuid4().hex
    request.state.request_id = request_id
    started = time.perf_counter()
'''
assert old in src, "middleware head not found"
src = src.replace(old, new)
old = '''    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response'''
new = '''    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    # structured access log — no request bodies, no tokens, no health text
    logger.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": int((time.perf_counter() - started) * 1000),
        },
    )
    return response'''
assert old in src, "middleware tail not found"
src = src.replace(old, new)
src = src.replace("import time\nimport uuid as uuid_mod",
                  "import logging\nimport time\nimport uuid as uuid_mod")
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("access log OK")
print("PATCH 2b COMPLETE")
