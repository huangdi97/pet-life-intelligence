"""Demo identity rows for ``app.seed``: users, household, members, pets,
relationships (GOAL Phase 12 / G12 demo family).
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import enums
from app.models import (
    Household,
    HouseholdMember,
    Pet,
    PetVisualModel,
    PetVisualRenderManifest,
    Relationship,
    User,
)
from app.services.visual_pipeline_meta import metadata_only_descriptor


async def insert_identity(db: AsyncSession) -> dict:
    """Create demo users/household/pets/relationships; return their raw ids.

    Ordering matters: members need user ids, pets need household + creator
    ids, relationships need pet ids — flush after each stage.
    """
    owner = User(email="owner@pli.demo", display_name="Demo Owner", is_demo=True)
    family = User(email="family@pli.demo", display_name="Demo Family Member", is_demo=True)
    sitter = User(email="sitter@pli.demo", display_name="Demo Sitter", is_demo=True)
    db.add_all([owner, family, sitter])
    await db.flush()

    hh = Household(name="Demo Family")
    db.add(hh)
    await db.flush()
    db.add_all(
        [
            HouseholdMember(household_id=hh.id, user_id=owner.id,
                            role=enums.HouseholdRole.OWNER.value, status="ACTIVE"),
            HouseholdMember(household_id=hh.id, user_id=family.id,
                            role=enums.HouseholdRole.FAMILY.value, status="ACTIVE"),
        ]
    )
    await db.flush()

    coco = Pet(household_id=hh.id, name="豆豆", species="dog", breed="Corgi",
               sex="FEMALE", birth_date=datetime(2022, 5, 1).date(),
               neutered=True, weight_note="12kg", created_by_user_id=owner.id,
               is_demo=True)
    mimi = Pet(household_id=hh.id, name="咪咪", species="cat", breed="DLH",
               sex="MALE", birth_date=datetime(2021, 11, 20).date(),
               neutered=True, weight_note="4.5kg", created_by_user_id=owner.id,
               is_demo=True)
    db.add_all([coco, mimi])
    await db.flush()
    db.add_all(
        [
            Relationship(pet_id=coco.id, user_id=owner.id,
                         role=enums.RelationshipRole.OWNER.value,
                         created_by_user_id=owner.id),
            Relationship(pet_id=mimi.id, user_id=owner.id,
                         role=enums.RelationshipRole.OWNER.value,
                         created_by_user_id=owner.id),
        ]
    )
    await db.flush()

    # Demo runtime truth: the canonical seeded owner experience includes one
    # ACTIVE bundled 3D appearance for each demo pet. These are explicitly
    # DEMO_TEMPLATE fixtures, not reconstructions of real animals. Seeding the
    # descriptor lets Web/Android exercise the same high-fidelity GLB path as
    # an activated user model instead of silently falling back to the generic
    # procedural engineering stage.
    activated_at = datetime.now(UTC)
    demo_models: list[tuple[Pet, PetVisualModel, str]] = []
    for pet, asset_key, geometry_version in (
        (coco, "doudou", "native-corgi-r5"),
        (mimi, "mimi", "demo-cat-r4"),
    ):
        desc = metadata_only_descriptor(pet)
        inferred = {region: "demo_template" for region in desc["surface"]["inferred_regions"]}
        model = PetVisualModel(
            pet_id=pet.id,
            version=1,
            source_capture_id=None,
            source_artifact_ids=[],
            provider="bundled_demo",
            provider_model_version="r5-demo-fixture",
            geometry_version=geometry_version,
            texture_version="demo-template-r5",
            rig_version="rig-anim-v2",
            status="ACTIVE",
            observed_surface_manifest={},
            inferred_surface_manifest=inferred,
            owner_verified=True,
            identity_qc={
                "result": "basic_like",
                "scope": "DEMO_FIXTURE_ONLY",
                "real_pet_identity_validation": "NOT_YET_OBSERVED",
            },
            verified_by_user_id=owner.id,
            verified_at=activated_at,
            activated_at=activated_at,
            provenance_kind="GENERATED_3D",
            artifact_map={
                "render_descriptor": desc["family"],
                "template_family": desc["family"],
                "texture_source": "demo_template",
                "twin_descriptor": {
                    "family": desc["family"],
                    "morph": desc["morph"],
                    "texture": desc["texture"],
                    "surface": desc["surface"],
                },
                "glb": f"/assets/twins/{asset_key}.glb",
                "glb_low": "",
                "poster": "",
                "turntable": "",
            },
            metadata_json={
                "demo_fixture": True,
                "media_provenance": "DEMO_TEMPLATE",
                "real_pet_identity_validation": "NOT_YET_OBSERVED",
                "owner_confirmation_scope": "DEMO_FIXTURE_ONLY",
            },
        )
        db.add(model)
        demo_models.append((pet, model, asset_key))
    await db.flush()

    for pet, model, asset_key in demo_models:
        db.add(
            PetVisualRenderManifest(
                pet_id=pet.id,
                model_id=model.id,
                render_targets={
                    "poster": "",
                    "low": "",
                    "interactive": f"/assets/twins/{asset_key}.glb",
                    "turntable": "",
                },
                lod_policy={
                    "order": ["interactive", "poster"],
                    "fallback": "real_photos",
                },
                fallback_policy={
                    "primary": "real_photos",
                    "assets": [],
                    "demo_fixture": True,
                },
                freshness_checked_at=activated_at,
            )
        )
    await db.flush()

    return {
        "owner_id": owner.id,
        "family_id": family.id,
        "sitter_id": sitter.id,
        "household_id": hh.id,
        "coco_id": coco.id,
        "mimi_id": mimi.id,
    }
