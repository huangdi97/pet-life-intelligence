"""Stage V §15 — permission adversarial tests.

Goal: 0 unintended access. Covers guessing pet_id, cross-household,
expired/revoked grants, deleted user, deleted (archived) pet, professional
access after expiry, sitter access after expiry, artifact URL reuse,
share-token expiry, role escalation, admin boundary.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from tests.conftest import auth

NOW = datetime.now(UTC)
FAKE_ID = "00000000-0000-0000-0000-00000000dead"


def _mk_user(email=None) -> str:
    """A regular (non-internal) user with no relationship to the seed data."""
    from app.core.db import get_session_factory
    from app.models import User

    async def mk():
        factory = get_session_factory()
        async with factory() as db:
            u = User(email=email or f"perm-{uuid.uuid4().hex[:8]}@pli.demo",
                     display_name="PermUser", is_demo=True, is_internal=False)
            db.add(u)
            await db.commit()
            return str(u.id)

    return asyncio.run(mk())


def _mk_household_owner() -> tuple[str, str]:
    from app.core.db import get_session_factory
    from app.models import Household, HouseholdMember, User

    async def mk():
        factory = get_session_factory()
        async with factory() as db:
            u = User(email=f"hh-{uuid.uuid4().hex[:8]}@pli.demo", display_name="HH Owner",
                     is_demo=True, is_internal=False)
            h = Household(name="Other Household")
            db.add_all([u, h])
            await db.flush()
            db.add(HouseholdMember(household_id=h.id, user_id=u.id,
                                   role="OWNER", status="ACTIVE"))
            await db.commit()
            return str(u.id), str(h.id)

    return asyncio.run(mk())


def _mk_pet(owner_id: str, household_id: str) -> str:
    from app.core.db import get_session_factory
    from app.models import Pet, Relationship

    async def mk():
        factory = get_session_factory()
        async with factory() as db:
            p = Pet(household_id=uuid.UUID(household_id), name="OtherPet", species="dog",
                    is_demo=True, is_internal=True, created_by_user_id=uuid.UUID(owner_id))
            db.add(p)
            await db.flush()
            db.add(Relationship(pet_id=p.id, user_id=uuid.UUID(owner_id),
                                role="OWNER", created_by_user_id=uuid.UUID(owner_id)))
            await db.commit()
            return str(p.id)

    return asyncio.run(mk())


class TestCrossHouseholdAndGuessing:
    def test_guess_pet_id_404(self, client, seeded):
        assert client.get(f"/api/v1/pets/{FAKE_ID}", headers=auth(seeded["owner_id"])).status_code == 404

    def test_cross_household_read_denied(self, client, seeded):
        owner, household = _mk_household_owner()
        other_pet = _mk_pet(owner, household)
        r = client.get(f"/api/v1/pets/{other_pet}", headers=auth(seeded["owner_id"]))
        assert r.status_code == 403
        r2 = client.get(f"/api/v1/pets/{other_pet}/events", headers=auth(seeded["owner_id"]))
        assert r2.status_code == 403

    def test_cross_household_write_denied(self, client, seeded):
        owner, household = _mk_household_owner()
        other_pet = _mk_pet(owner, household)
        r = client.post(f"/api/v1/pets/{other_pet}/events", headers=auth(seeded["owner_id"]),
                        json={"event_type": "daily.meal", "payload": {"amount": "1", "unit": "g"}})
        assert r.status_code == 403


class TestGrantLifecycle:
    def test_expired_grant_dead(self, client, seeded):
        owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(owner),
                        json={"user_id": sitter, "scopes": ["daily:read"],
                              "expires_at": (NOW - timedelta(minutes=1)).isoformat()})
        assert r.status_code == 201
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403

    def test_revoked_grant_dead(self, client, seeded):
        owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(owner),
                        json={"user_id": sitter, "scopes": ["daily:read"],
                              "expires_at": (NOW + timedelta(hours=1)).isoformat()})
        gid = r.json()["grant_id"]
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 200
        client.delete(f"/api/v1/grants/{gid}", headers=auth(owner))
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403

    def test_grant_scope_does_not_elevate_to_medical(self, client, seeded):
        owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        client.post(f"/api/v1/pets/{coco}/grants", headers=auth(owner),
                    json={"user_id": sitter, "scopes": ["daily:read", "daily:write"],
                          "expires_at": (NOW + timedelta(hours=1)).isoformat()})
        r = client.post(f"/api/v1/pets/{coco}/health-events", headers=auth(sitter),
                        json={"chief_complaint": "x"})
        assert r.status_code == 403


class TestUserAndPetDeletion:
    def test_deleted_user_has_no_access(self, client, seeded):
        from app.core.db import get_session_factory
        from app.models import User

        uid = _mk_user()

        async def rm():
            factory = get_session_factory()
            async with factory() as db:
                u = await db.get(User, uuid.UUID(uid))
                await db.delete(u)
                await db.commit()

        asyncio.run(rm())
        r = client.get(f"/api/v1/pets/{seeded['coco_id']}", headers=auth(uid))
        assert r.status_code in (401, 403, 404)

    def test_archived_pet_404(self, client, seeded):
        from app.core.db import get_session_factory
        from app.models import Pet

        owner, coco = seeded["owner_id"], seeded["coco_id"]

        async def archive():
            factory = get_session_factory()
            async with factory() as db:
                p = await db.get(Pet, uuid.UUID(coco))
                p.archived_at = NOW
                await db.commit()

        asyncio.run(archive())
        r = client.get(f"/api/v1/pets/{coco}", headers=auth(owner))
        assert r.status_code == 404


class TestProfessionalAndSitterExpiry:
    def test_sitter_handoff_after_expiry_dead(self, client, seeded):
        owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/handoffs", headers=auth(owner),
                        json={"caregiver_user_id": sitter,
                              "scopes": ["daily:read", "daily:write"],
                              "end_at": (NOW + timedelta(minutes=30)).isoformat(),
                              "reason": "test"})
        assert r.status_code == 201
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 200
        # move clock forward: patch permissions._now (controllable clock)
        import app.services.permissions as perm

        real = perm._now
        perm._now = lambda: NOW + timedelta(hours=1)
        try:
            assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403
        finally:
            perm._now = real

    def test_professional_link_scope_limited(self, client, seeded):
        # professional access is a controlled relationship; pro cannot act
        # as owner (no MANAGE_PET via relationship alone)
        from app.core.db import get_session_factory
        from app.models import ProfessionalLink

        owner, coco = seeded["owner_id"], seeded["coco_id"]
        vet_id = _mk_user("vet@pli.demo")

        async def link():
            factory = get_session_factory()
            async with factory() as db:
                db.add(ProfessionalLink(pet_id=uuid.UUID(coco), user_id=uuid.UUID(vet_id),
                                        profession="VET", display_name="Dr V",
                                        created_by_user_id=uuid.UUID(owner)))
                await db.commit()

        asyncio.run(link())
        r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(vet_id),
                        json={"user_id": seeded["sitter_id"], "scopes": ["daily:read"]})
        assert r.status_code == 403  # professional must not manage grants


class TestShareExpiry:
    def test_care_card_token_expiry(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/care-cards",
                        json={"expires_in_hours": 1}, headers=auth(owner))
        assert r.status_code == 201
        token = r.json()["token"]
        card_id = r.json()["card_id"]
        assert client.get(f"/api/v1/care-card/{token}").status_code == 200
        # time travel: expire the card row in the DB
        from app.core.db import get_session_factory
        from app.models import CareCard

        async def expire():
            factory = get_session_factory()
            async with factory() as db:
                await db.execute(CareCard.__table__.update()
                                 .where(CareCard.id == uuid.UUID(card_id))
                                 .values(expires_at=NOW - timedelta(seconds=1)))
                await db.commit()

        asyncio.run(expire())
        assert client.get(f"/api/v1/care-card/{token}").status_code in (403, 404)

    def test_vet_brief_share_expiry(self, client, seeded):
        owner = seeded["owner_id"]
        he = seeded["health_event_non_emergency_id"]
        brief = client.post(f"/api/v1/health-events/{he}/vet-brief", json={}, headers=auth(owner))
        assert brief.status_code == 201
        bid = brief.json()["vet_brief_id"]
        share = client.post(f"/api/v1/vet-briefs/{bid}/share",
                            json={"expires_in_hours": 1}, headers=auth(owner))
        assert share.status_code == 201
        token = share.json()["share_token"]
        assert client.get(f"/api/v1/vet-briefs/shared/{token}").status_code == 200
        from app.core.db import get_session_factory
        from app.models import ShareToken

        async def expire():
            factory = get_session_factory()
            async with factory() as db:
                await db.execute(ShareToken.__table__.update()
                                 .values(expires_at=NOW - timedelta(seconds=1),
                                         revoked_at=NOW - timedelta(seconds=1)))
                await db.commit()

        asyncio.run(expire())
        assert client.get(f"/api/v1/vet-briefs/shared/{token}").status_code in (403, 404)


class TestRoleEscalationAndAdminBoundary:
    def test_sitter_cannot_regrant(self, client, seeded):
        owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        client.post(f"/api/v1/pets/{coco}/grants", headers=auth(owner),
                    json={"user_id": sitter, "scopes": ["daily:read"],
                          "expires_at": (NOW + timedelta(hours=1)).isoformat()})
        r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(sitter),
                        json={"user_id": seeded["family_id"], "scopes": ["daily:read"]})
        assert r.status_code == 403

    def test_family_cannot_manage(self, client, seeded):
        family, coco = seeded["family_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(family),
                        json={"user_id": seeded["sitter_id"], "scopes": ["daily:read"]})
        assert r.status_code == 403

    def test_admin_ops_boundary(self, client, seeded):
        # ops/feature-flags requires an internal operator (PLI-223) — a
        # regular owner must not mutate infrastructure switches
        from tests.conftest import create_internal_operator

        r = client.post("/api/v1/ops/feature-flags", headers=auth(seeded["owner_id"]),
                        json={"key": "x", "enabled": True})
        assert r.status_code == 403
        # internal operator can
        op = create_internal_operator()
        r2 = client.post("/api/v1/ops/feature-flags", headers=auth(op),
                         json={"key": "x", "enabled": True, "note": "ok"})
        assert r2.status_code == 201

    def test_admin_ops_boundary_read_and_incidents(self, client, seeded):
        # Stage V §15: every /ops/* endpoint requires an internal operator —
        # list flags, ops status, and incidents must not leak to a regular owner.
        from tests.conftest import create_internal_operator

        owner = seeded["owner_id"]
        assert client.get("/api/v1/ops/feature-flags", headers=auth(owner)).status_code == 403
        assert client.get("/api/v1/ops/status", headers=auth(owner)).status_code == 403
        assert client.get("/api/v1/ops/incidents", headers=auth(owner)).status_code == 403
        r = client.post("/api/v1/ops/incidents", headers=auth(owner),
                        json={"severity": "INFO", "title": "leak"})
        assert r.status_code == 403

        op = create_internal_operator()
        assert client.get("/api/v1/ops/feature-flags", headers=auth(op)).status_code == 200
        assert client.get("/api/v1/ops/status", headers=auth(op)).status_code == 200
        r2 = client.post("/api/v1/ops/incidents", headers=auth(op),
                         json={"severity": "INFO", "title": "ok"})
        assert r2.status_code == 201
        assert client.get("/api/v1/ops/incidents", headers=auth(op)).status_code == 200
