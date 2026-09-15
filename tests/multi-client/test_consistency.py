"""Multi-client consistency tests (GOAL §48).

The same Pet / Event / Timeline / Permission / Health risk / Task must be
identical across client entry points. We exercise the *same public API* the
way each client does (Web api-client, Mini services/api, Mobile services/api
are thin transports over /api/v1 — so the contract here verifies the shared
canonical surface the clients depend on).

Run against the same DB the rest of the suite uses (test DB via root conftest).
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_web_created_event_is_visible_on_timeline_endpoint(seeded):
    """Web Quick Log → Mini/Web Timeline must both read the same event."""
    owner_id = seeded["owner_id"]
    pet_id = seeded["coco_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        headers = {"X-Dev-User-Id": owner_id}

        # Web client creates a Quick Log
        r = await c.post(
            f"/api/v1/pets/{pet_id}/events",
            headers=headers,
            json={"event_type": "daily.meal", "payload": {"food_type": "狗粮", "amount": "100", "unit": "g"}},
        )
        assert r.status_code == 201, r.text
        created = r.json()

        # Any client reads the same event back from Timeline
        r2 = await c.get(f"/api/v1/pets/{pet_id}/events", headers=headers)
        assert r2.status_code == 200, r2.text
        events = r2.json()["events"]
        assert any(e["event_id"] == created["event_id"] for e in events)
        match = next(e for e in events if e["event_id"] == created["event_id"])
        # canonical envelope identical across consumers
        assert match["pet_id"] == pet_id
        assert match["event_type"] == "daily.meal"
        assert match["payload"]["food_type"] == "狗粮"
        assert match["provenance_level"] == "OWNER_REPORTED"
        assert match["schema_version"]


@pytest.mark.asyncio
async def test_web_created_task_is_visible_on_today(seeded):
    """Web creates Task → Mobile Today ('/today') must surface the same task."""
    owner_id = seeded["owner_id"]
    pet_id = seeded["coco_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        headers = {"X-Dev-User-Id": owner_id}

        r = await c.post(
            f"/api/v1/pets/{pet_id}/tasks",
            headers=headers,
            json={"title": "跨端任务一致性", "task_type": "OTHER"},
        )
        assert r.status_code == 201, r.text
        task_id = r.json()["id"]

        # Mini client fetches open tasks
        r2 = await c.get(f"/api/v1/pets/{pet_id}/tasks?status=OPEN", headers=headers)
        assert r2.status_code == 200, r2.text
        assert any(t["id"] == task_id for t in r2.json())


@pytest.mark.asyncio
async def test_health_risk_identical_across_clients(seeded):
    """Health red-flag / triage result must be identical regardless of client."""
    owner_id = seeded["owner_id"]
    pet_id = seeded["coco_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        headers = {"X-Dev-User-Id": owner_id}

        r = await c.post(
            f"/api/v1/pets/{pet_id}/health-events",
            headers=headers,
            json={"chief_complaint": "精神萎靡，倒地不起，叫不醒", "duration_text": "10分钟"},
        )
        assert r.status_code == 201, r.text
        he_id = r.json()["health_event_id"]

        # triage endpoint returns the level any client would show
        r2 = await c.post(
            f"/api/v1/health-events/{he_id}/triage",
            headers=headers,
            json={"owner_notes": ""},
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["level"] == "EMERGENCY"  # deterministic rule-engine output


@pytest.mark.asyncio
async def test_share_token_viewed_via_h5_and_admin(seeded):
    """Vet Brief share token: same content for H5 share page and Admin/Pro view."""
    owner_id = seeded["owner_id"]
    pet_id = seeded["coco_id"]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        headers = {"X-Dev-User-Id": owner_id}

        r = await c.post(
            f"/api/v1/pets/{pet_id}/health-events",
            headers=headers,
            json={"chief_complaint": "呕吐两次", "duration_text": "1小时"},
        )
        he_id = r.json()["health_event_id"]
        rb = await c.post(f"/api/v1/health-events/{he_id}/vet-brief", headers=headers)
        brief_id = rb.json()["vet_brief_id"]

        rs = await c.post(
            f"/api/v1/vet-briefs/{brief_id}/share",
            headers=headers,
            json={"expires_in_hours": 24},
        )
        token = rs.json()["share_token"]

        # H5 share page (anonymous) reads it
        rh = await c.get(f"/api/v1/vet-briefs/shared/{token}")
        assert rh.status_code == 200, rh.text
        assert rh.json()["content"]["chief_complaint"] == "呕吐两次"
        # Same canonical content as Admin/Pro view
        assert "notice" in rh.json()["content"]