"""Pet Living Model (PLM) visual models — Stage H.2 (GOAL PHASE D).

PetVisualCapture            — owner-collected source media (photos / short video).
PetVisualModel              — a versioned generated 3D representation of ONE pet
                              (identity-verified, provider-agnostic artifacts).
PetVisualRenderManifest     — resolved render targets (LOD / texture / rig) for
                              the active model; clients render from this, never
                              from the model row directly.

Rules (GOAL PHASE D/F/G/H):
- State overlay NEVER duplicates business facts; it only references
  Observation / Baseline / Event / Inference.
- Owner verification gates activation: "不像" cannot become active.
- Generated 3D is GENERATED_3D provenance, never LIVE / RECORDED.
- Source media for 3D is NOT for general model training unless separately
  consented (consent purpose: VISUAL_MODEL_TRAINING).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk, utcnow

# Provenance kinds for visual representation (GOAL PHASE L1).
VISUAL_PROVENANCE = ("GENERATED_3D", "RECORDED", "LIVE")

# Identity QC attributes (GOAL PHASE O6 / G2).
IDENTITY_QC_ATTRIBUTES = (
    "face",
    "ear",
    "coat",
    "pattern",
    "body",
    "tail",
    "legs",
    "unique_marks",
)


class PetVisualCapture(UUIDPk, CreatedAt, Base):
    """Raw source media for one pet's 3D representation (GOAL PHASE D2/E).

    Each capture holds a group of artifact ids (front/left/right/back/full
    body/head shots, or a short surround video) plus deterministic QC results.
    """

    __tablename__ = "pet_visual_captures"
    __table_args__ = (Index("ix_pvc_pet_created", "pet_id", "created_at"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    # artifact_ids → app.models.events.Artifact
    artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    capture_type: Mapped[str] = mapped_column(String(20), default="PHOTO_SET")  # PHOTO_SET|VIDEO
    # deterministic QC results (blur/exposure/coverage/privacy/duplicates…)
    qc_result: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    qc_passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # None = not run
    provider: Mapped[str] = mapped_column(String(60), default="sandbox", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="UPLOADED")  # UPLOADED|QC_PASSED|QC_FAILED|USED
    privacy_scan: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)  # face/child/plate…
    consent_visual_model_training: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )


class PetVisualModel(UUIDPk, CreatedAt, Base):
    """A versioned generated 3D representation of one pet (GOAL PHASE D2/G4).

    Identity verification is owner-controlled: `identity_qc` stores per-attribute
    feedback; a model with owner_verified=False or identity_qc result "not_like"
    must NOT become active.
    """

    __tablename__ = "pet_visual_models"
    __table_args__ = (
        UniqueConstraint("pet_id", "version"),
        Index("ix_pvm_pet_active", "pet_id", "activated_at"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    source_capture_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pet_visual_captures.id"), nullable=True
    )
    source_artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    provider: Mapped[str] = mapped_column(String(60), default="sandbox", nullable=False)
    provider_model_version: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    geometry_version: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    texture_version: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    rig_version: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="GENERATING")  # QUEUED|GENERATING|READY|FAILED|VERIFYING|ACTIVE|RETIRED|DELETED
    failure_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # identity verification (GOAL PHASE G)
    owner_verified: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    identity_qc: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    verified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # provenance: GENERATED_3D (generated) | RECORDED | LIVE — never mixed with business facts
    provenance_kind: Mapped[str] = mapped_column(String(20), default="GENERATED_3D", nullable=False)
    provider_job_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # artifacts: glb / textures / thumbnails keyed by kind
    artifact_map: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)


class PetVisualRenderManifest(UUIDPk, CreatedAt, Base):
    """Resolved render targets for an active visual model (GOAL PHASE D2/H).

    Client policy: poster first → low LOD → interactive if capable → fallback
    turntable / 2D. Never blocks Today (GOAL PHASE H3/H4).
    """

    __tablename__ = "pet_visual_render_manifests"
    __table_args__ = (
        UniqueConstraint("pet_id", "model_id"),
        Index("ix_pvrm_pet", "pet_id"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pet_visual_models.id"), nullable=False
    )
    # render targets per client capability tier
    render_targets: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    # { "poster": url, "low": url, "interactive": url, "turntable": url }
    lod_policy: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    fallback_policy: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    freshness_checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
