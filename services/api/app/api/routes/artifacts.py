"""Artifact upload + download (PLI-003/032/051). Allowlist MIME + signature
check, size limit, random object keys, MinIO backend with local-disk
fallback (docs/08)."""

import hashlib
import uuid as uuid_mod

from fastapi import APIRouter, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.config import get_settings
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import Artifact, LifeEvent, Pet
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit
from app.services.storage import get_storage

router = APIRouter(tags=["media"])

ALLOWED = {
    "image/png": ("IMAGE", b"\x89PNG"),
    "image/jpeg": ("IMAGE", b"\xff\xd8\xff"),
    "image/gif": ("IMAGE", b"GIF8"),
    "image/webp": ("IMAGE", b"RIFF"),
    "video/mp4": ("VIDEO", None),  # ftyp box checked below
    "video/webm": ("VIDEO", b"\x1a\x45\xdf\xa3"),
    "audio/mpeg": ("AUDIO", None),
    "audio/mp4": ("AUDIO", None),
    "application/pdf": ("DOCUMENT", b"%PDF"),
}

MAX_SIGNATURE_CHECK = 12


def sniff(content_type: str, head: bytes) -> str:
    kind_sig = ALLOWED.get(content_type)
    if kind_sig is None:
        raise ValidationFailed(f"Content type {content_type} not allowed.")
    kind, magic = kind_sig
    if magic is not None:
        if not head.startswith(magic):
            raise ValidationFailed("File signature does not match content type.")
    elif content_type == "video/mp4":
        if head[4:8] != b"ftyp":
            raise ValidationFailed("File signature does not match content type.")
    return kind


@router.post("/pets/{pet_id}/artifacts", status_code=201)
async def upload_artifact(
    pet_id: uuid_mod.UUID, file: UploadFile, db: DBSession, user: CurrentUser,
    sensitive: bool = False,
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)

    settings = get_settings()
    head = await file.read(MAX_SIGNATURE_CHECK)
    await file.seek(0)
    kind = sniff(file.content_type or "", head)
    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise ValidationFailed(f"File exceeds {settings.max_upload_mb}MB limit.")
    if len(content) == 0:
        raise ValidationFailed("Empty file.")
    sha = hashlib.sha256(content).hexdigest()
    key = f"{pet_id}/{uuid_mod.uuid4().hex}"

    storage = get_storage()
    await storage.put(key, content, file.content_type or "application/octet-stream")

    artifact = Artifact(
        pet_id=pet.id, kind=kind, content_type=file.content_type or "",
        size_bytes=len(content), sha256=sha,
        storage_backend=storage.name, storage_key=key,
        original_filename=(file.filename or "")[:255], sensitive=sensitive,
        created_by_user_id=user.id,
    )
    db.add(artifact)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="artifact.added",
        payload={"artifact_id": str(artifact.id), "kind": kind,
                 "content_type": artifact.content_type},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"artifact:{artifact.id}",
    )
    await write_audit(db, action="artifact.upload", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Artifact", resource_id=str(artifact.id))
    await db.commit()
    return {
        "artifact_id": str(artifact.id), "kind": kind,
        "content_type": artifact.content_type, "size_bytes": artifact.size_bytes,
        "sha256": sha, "storage_backend": storage.name,
    }


@router.get("/artifacts/{artifact_id}/content")
async def download_artifact(
    artifact_id: uuid_mod.UUID, db: DBSession, user: CurrentUser
) -> Response:
    artifact = (
        await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    ).scalar_one_or_none()
    if artifact is None or artifact.deleted_at is not None:
        raise NotFound("Artifact not found.")
    pet = await perm.get_pet_or_404(db, artifact.pet_id)
    capability = (
        enums.Capability.MEDICAL_READ if artifact.sensitive else enums.Capability.DAILY_READ
    )
    await perm.require_capability(db, pet, user.id, capability)
    if artifact.sensitive:
        await write_audit(db, action="artifact.view_sensitive", actor_user_id=user.id,
                          household_id=pet.household_id, pet_id=pet.id,
                          resource_type="Artifact", resource_id=str(artifact.id))
        await db.commit()
    storage = get_storage()
    content = await storage.get(artifact.storage_key)
    return Response(
        content=content, media_type=artifact.content_type,
        headers={"Content-Disposition": f'inline; filename="{artifact.storage_key}"'},
    )


@router.get("/pets/{pet_id}/artifacts")
async def list_artifacts(
    pet_id: uuid_mod.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(Artifact).where(
                Artifact.pet_id == pet.id, Artifact.deleted_at.is_(None)
            ).order_by(Artifact.created_at.desc()).limit(100)
        )
    ).scalars().all()
    return [
        {
            "artifact_id": str(a.id), "kind": a.kind,
            "content_type": a.content_type, "size_bytes": a.size_bytes,
            "sha256": a.sha256, "sensitive": a.sensitive,
            "created_at": a.created_at.isoformat(),
        }
        for a in rows
    ]
