"""v0.2 tests — behavior deepening + training + welfare (PLI-070/071/073/
074/075/079/084/085..088/091/092/100)."""

import io
from datetime import datetime, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


def test_behavior_templates_safe_language(client, seeded):
    r = client.get("/api/v1/behavior-templates", headers=auth(seeded["owner_id"]))
    assert r.status_code == 200
    for t in r.json()["templates"].values():
        blob = str(t)
        assert "诊断" not in blob and "焦虑症" not in blob


def test_behavior_video_binding_and_trigger_graph(client, seeded):
    """PLI-071 video binding + PLI-073 trigger graph (E2E behavior)."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    # bind a "video" artifact (mp4 signature)
    mp4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 40
    up = client.post(f"/api/v1/pets/{coco}/artifacts",
                     files={"file": ("clip.mp4", io.BytesIO(mp4), "video/mp4")},
                     headers=auth(owner))
    assert up.status_code == 201, up.text
    artifact_id = up.json()["artifact_id"]
    r = client.post(f"/api/v1/pets/{coco}/behavior-events",
                    json={"occurred_at": NOW.isoformat(),
                          "antecedent": "门铃响",
                          "behavior": "连续吠叫30秒",
                          "consequence": "安抚后停止",
                          "intensity": "MODERATE",
                          "artifact_ids": [artifact_id]},
                    headers=auth(owner))
    assert r.status_code == 201
    # trigger graph counts the antecedent
    tg = client.get(f"/api/v1/pets/{coco}/behavior/triggers", headers=auth(owner)).json()
    assert any("门铃" in k for k in tg["triggers"])
    assert "不构成因果" in tg["notice"]
    # trends
    tr = client.get(f"/api/v1/pets/{coco}/behavior/trends", headers=auth(owner)).json()
    assert "per_week" in tr and "by_intensity" in tr


def test_preferences_and_reward_library(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/preferences",
                    json={"kind": "REWARD", "subject": "冻干鸡肉",
                          "source_type": "OWNER_REPORTED"},
                    headers=auth(owner))
    assert r.status_code == 201, r.text
    r2 = client.post(f"/api/v1/pets/{coco}/preferences",
                     json={"kind": "ALLERGY_CAUTION", "subject": "鸡肉"},
                     headers=auth(owner))
    assert r2.status_code == 201
    lst = client.get(f"/api/v1/pets/{coco}/preferences", headers=auth(owner)).json()
    kinds = {p["kind"] for p in lst}
    assert {"REWARD", "ALLERGY_CAUTION"} <= kinds


def test_training_e2e_goal_session_mastery(client, seeded):
    """v0.2 Gate: Training E2E — goal → steps → sessions → mastery."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    g = client.post(f"/api/v1/pets/{coco}/training-goals",
                    json={"title": "安静应对门铃",
                          "target_behavior": "听到门铃后 3 秒内回到垫子",
                          "steps": ["门铃低音量+奖励", "正常音量+奖励", "真实来访演练"]},
                    headers=auth(owner))
    assert g.status_code == 201, g.text
    goal_id = g.json()["goal_id"]
    assert g.json()["mastery_level"] == 0
    for i, response in enumerate(["GOOD", "GOOD", "GREAT"]):
        s = client.post(f"/api/v1/pets/{coco}/training-sessions",
                        json={"goal_id": goal_id, "duration_minutes": 5,
                              "focus": f"step {i + 1}",
                              "pet_response": response,
                              "rewards_used": ["冻干鸡肉"]},
                        headers=auth(owner))
        assert s.status_code == 201
    goals = client.get(f"/api/v1/pets/{coco}/training-goals", headers=auth(owner)).json()
    assert goals[0]["mastery_level"] == 3
    # wrong-pet goal not accessible
    s = client.post(f"/api/v1/pets/{seeded['mimi_id']}/training-sessions",
                    json={"goal_id": goal_id, "duration_minutes": 5},
                    headers=auth(owner))
    assert s.status_code == 404


def test_training_tools_and_enrichment_versioned(client, seeded):
    owner = seeded["owner_id"]
    tools = client.get("/api/v1/training/tools", headers=auth(owner)).json()
    assert tools["version"] == "1.0.0"
    assert any("电击" not in t["name"] for t in tools["tools"])
    assert "禁止" in tools["banned_note"] or "惩罚" in tools["banned_note"]
    enr = client.get("/api/v1/welfare/enrichment-activities", headers=auth(owner)).json()
    assert len(enr["activities"]) >= 4


def test_behavior_advice_safety_filter_blocks_punishment(client, seeded):
    """v0.2 Gate: PLI-084 — punishment advice must be blocked & audited."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/behavior/advice",
                    json={"context": "对门铃过度吠叫"}, headers=auth(owner))
    assert r.status_code == 200, r.text
    body = r.json()
    advice_blob = " ".join(body["advice"]).lower()
    for forbidden in ("电击", "打骂", "shock collar"):
        assert forbidden.lower() not in advice_blob
    assert body["filtered_reasons"], "unsafe candidate must be recorded as filtered"
    # audit trail: advice.filtered event exists
    tl = client.get(f"/api/v1/pets/{coco}/events?event_type=advice.filtered",
                    headers=auth(owner)).json()
    assert tl["count"] >= 1
