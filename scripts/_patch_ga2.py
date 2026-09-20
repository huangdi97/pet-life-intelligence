# -*- coding: utf-8 -*-
import io

"""One-shot patch 2: signature enforcement, welfare profile, field masking,
capability registry, access logging."""

# ---------- 1) PLI-045: signature marking on import -------------------------
p = "services/api/app/api/routes/v02_care_health.py"
src = io.open(p, encoding="utf-8").read()
old = '''    record = HealthRecord(
        pet_id=pet.id, kind=body.kind, occurred_at=body.occurred_at,
        content=body.content, source_type=body.source_type,
        source_note=body.source_note, artifact_id=body.artifact_id,
        created_by_user_id=user.id,
    )'''
new = '''    # PLI-045: professional records must carry signature provenance.
    sig = body.content.get("signature") if isinstance(body.content, dict) else None
    if body.kind in ("PRESCRIPTION", "EXAM"):
        signed = isinstance(sig, dict) and all(
            sig.get(k) for k in ("signer", "institution", "signed_at")
        )
        signature_status = "SIGNED" if signed else "UNSIGNED"
    else:
        signature_status = "NOT_REQUIRED"
    record = HealthRecord(
        pet_id=pet.id, kind=body.kind, occurred_at=body.occurred_at,
        content=body.content, source_type=body.source_type,
        signature_status=signature_status,
        source_note=body.source_note, artifact_id=body.artifact_id,
        created_by_user_id=user.id,
    )'''
assert old in src, "import block not found"
src = src.replace(old, new)
old = '''    return {"record_id": str(record.id), "kind": record.kind,
            "provenance": record.source_type,
            "note": "导入记录带来源分级；不自动生成诊断。"}'''
new = '''    return {"record_id": str(record.id), "kind": record.kind,
            "provenance": record.source_type,
            "signature_status": record.signature_status,
            "note": "导入记录带来源分级；PRESCRIPTION/EXAM 缺签名标记为 UNSIGNED；"
                    "不自动生成诊断。"}'''
assert old in src, "import return not found"
src = src.replace(old, new)
old = '''        {"record_id": str(r.id), "kind": r.kind, "content": r.content,
         "source_type": r.source_type, "source_note": r.source_note,
         "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None}'''
new = '''        {"record_id": str(r.id), "kind": r.kind, "content": r.content,
         "source_type": r.source_type, "source_note": r.source_note,
         "signature_status": r.signature_status,
         "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None}'''
assert old in src, "list block not found"
src = src.replace(old, new)
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("signature enforcement OK")

# ---------- 2) GET /pets/{id} field masking (PLI-012) -----------------------
p = "services/api/app/api/routes/pets.py"
src = io.open(p, encoding="utf-8").read()
old = '''@router.get("/pets/{pet_id}")
async def get_pet(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> PetOut:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    return PetOut.model_validate(pet)'''
new = '''@router.get("/pets/{pet_id}")
async def get_pet(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    caps = await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    data = PetOut.model_validate(pet).model_dump(mode="json")
    # PLI-012: field-level privacy — viewers without manage capability see
    # masked fields; owner/co-owner always see everything.
    if enums.Capability.MANAGE_PET.value not in caps:
        masked = pet.field_privacy or []
        for f in masked:
            if f in data:
                data[f] = None
        data["field_privacy_applied"] = masked
    return data'''
assert old in src, "get_pet block not found"
src = src.replace(old, new)
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("pet masking OK")

# ---------- 2b) care card respects masking ---------------------------------
p = "services/api/app/api/routes/care.py"
src = io.open(p, encoding="utf-8").read()
old = '''    content = {
        "pet": {"name": pet.name, "species": pet.species, "breed": pet.breed,
                "sex": pet.sex, "birth_date": str(pet.birth_date or "")},'''
new = '''    masked = pet.field_privacy or []
    birth = None if "birth_date" in masked else str(pet.birth_date or "")
    breed = None if "breed" in masked else pet.breed
    content = {
        "pet": {"name": pet.name, "species": pet.species, "breed": breed,
                "sex": pet.sex, "birth_date": birth,
                "field_privacy_applied": masked},'''
assert old in src, "care card pet block not found"
src = src.replace(old, new)
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("care card masking OK")

# ---------- 3) PLI-099 welfare profile endpoints ---------------------------
p = "services/api/app/api/routes/v10_extras.py"
src = io.open(p, encoding="utf-8").read()
addition = '''

# --- PLI-099 five-domain welfare profile ------------------------------------


WELFARE_DOMAINS = {"NUTRITION", "ENVIRONMENT", "HEALTH", "BEHAVIOR", "MENTAL"}


class WelfareProfileIn(BaseModel):
    domains: dict


@router.put("/pets/{pet_id}/welfare-profile")
async def put_welfare_profile(pet_id: uuid.UUID, body: WelfareProfileIn,
                              db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    invalid = [k for k in body.domains if k not in WELFARE_DOMAINS]
    if invalid:
        raise ValidationFailed(f"unknown domains: {invalid}")
    from app.models import WelfareProfile as WP

    row = (
        await db.execute(select(WP).where(WP.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        row = WP(pet_id=pet.id, updated_by_user_id=user.id)
        db.add(row)
    row.domains = body.domains
    row.updated_by_user_id = user.id
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "domains")
    await db.flush()
    await db.commit()
    return {"pet_id": str(pet.id), "domains": row.domains}


@router.get("/pets/{pet_id}/welfare-profile")
async def get_welfare_profile(pet_id: uuid.UUID, db: DBSession,
                              user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    from app.models import WelfareProfile as WP

    row = (
        await db.execute(select(WP).where(WP.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        return {"pet_id": str(pet.id), "domains": None,
                "domains_schema": sorted(WELFARE_DOMAINS)}
    return {"pet_id": str(pet.id), "domains": row.domains,
            "updated_at": row.updated_at.isoformat()}
'''
src = src + addition
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("welfare profile OK")

# ---------- 4) capability registry (Phase 7) -------------------------------
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
     "notes": "no payments in v1.0 (AGENTS.md §5)"},
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
old_tail = "@router.get(\"/ops/status\")"
assert old_tail in src
src = src.replace(old_tail, addition + "\n\n" + old_tail, 1)
src = src.replace(
    "from app.models import (\n    AgentActionLog,",
    "from app.models import (\n    AgentActionLog,\n    CapabilityRegistry,")
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("capability registry OK")

# ---------- 5) observability: access log middleware ------------------------
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
assert old in src
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
assert old in src
src = src.replace(old, new)
src = src.replace("import time\nimport uuid as uuid_mod",
                  "import logging\nimport time\nimport uuid as uuid_mod")
io.open(p, "w", encoding="utf-8", newline="\n").write(src)
print("access log OK")
print("ALL PATCHES APPLIED")
