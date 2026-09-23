"""Pet Living Model (PLM) request/response schemas.

Shared by the visual_capture / visual_model / visual_overlay route modules.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CaptureCreate(BaseModel):
    artifact_ids: list[uuid.UUID] = Field(default_factory=list)
    capture_type: str = "PHOTO_SET"  # PHOTO_SET | VIDEO
    consent_visual_model_training: bool = False


class CaptureOut(BaseModel):
    capture_id: uuid.UUID
    pet_id: uuid.UUID
    artifact_ids: list
    capture_type: str
    qc_result: dict
    qc_passed: bool | None
    privacy_scan: dict
    status: str
    created_at: datetime


class ModelCreate(BaseModel):
    capture_id: uuid.UUID | None = None
    opts: dict = Field(default_factory=dict)


class VerifyIn(BaseModel):
    result: str  # like | basic_like | not_like
    issues: list[str] = Field(default_factory=list)  # face/ear/coat/pattern/body/tail/legs/unique_marks/other
    notes: str = ""


class ModelOut(BaseModel):
    model_id: uuid.UUID
    pet_id: uuid.UUID
    version: int
    source_capture_id: uuid.UUID | None
    provider: str
    provider_model_version: str
    geometry_version: str
    texture_version: str
    rig_version: str
    status: str
    failure_reason: str | None
    owner_verified: bool | None
    identity_qc: dict
    provenance_kind: str
    created_at: datetime
    activated_at: datetime | None
    retired_at: datetime | None
    artifact_map: dict
    metadata_json: dict


class ManifestOut(BaseModel):
    pet_id: uuid.UUID
    model_id: uuid.UUID
    version: int
    render_targets: dict
    lod_policy: dict
    fallback_policy: dict
    freshness_checked_at: datetime


class StateOverlayOut(BaseModel):
    pet_id: uuid.UUID
    provenance_kind: str  # GENERATED_3D | RECORDED | LIVE
    provider_real: bool
    model_status: str | None
    metrics: list[dict]  # [{key,label,current,baseline_range,delta,freshness,source}]
    note: str
