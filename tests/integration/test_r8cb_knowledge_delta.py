"""R8CB: deterministic knowledge delta between a day's own end and now.

Every assertion here is about *records and owner decisions*. Nothing may claim a
pet recovered, deteriorated, became normal, or is at risk: knowledge change is
not health change.
"""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth, create_user

PRODUCT_TZ = timezone(timedelta(hours=8))

HEALTH_CLAIMS = ("恢复", "恶化", "已经正常", "风险升高", "因为", "所以")


def _walk(client, owner, pet, *, occurred_at=None, minutes=20):
    body = {"event_type": "daily.walk", "payload": {"duration_minutes": minutes}}
    if occurred_at is not None:
        body["occurred_at"] = occurred_at.isoformat()
    response = client.post(f"/api/v1/pets/{pet}/events", json=body, headers=auth(owner))
    assert response.status_code == 201, response.text
    return response.json()["event_id"]


def _replay(client, owner, pet, day, **params):
    response = client.get(
        f"/api/v1/pets/{pet}/life-replay",
        params={"date": day, "perspective": "verified_now", **params},
        headers=auth(owner),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _kinds(delta):
    return [item["kind"] for item in delta["items"]]


def _case_pet(client, owner):
    """A pet with a real source-backed change case, same shape as R8A fixtures."""
    created = client.post(
        "/api/v1/pets", json={"name": "R8CB Delta Pet", "species": "dog"},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    pet = created.json()["id"]
    now = datetime.now(PRODUCT_TZ)
    at = now - timedelta(minutes=2)
    for days in (1, 2, 3):
        _walk(client, owner, pet, occurred_at=at - timedelta(days=days), minutes=90)
    _walk(client, owner, pet, occurred_at=at, minutes=20)
    recompute = client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14", json={},
        headers=auth(owner),
    )
    assert recompute.status_code == 201, recompute.text
    case = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert case.status_code == 201, case.text
    return pet, case.json()["case_id"]


def test_r8cb_late_backfill_is_reported_as_a_knowledge_change(client, seeded):
    """Case A: recorded on D+2 for an occurrence on D."""
    owner = seeded["owner_id"]
    pet = seeded["coco_id"]
    day_at = datetime.now(PRODUCT_TZ) - timedelta(days=2)
    occurred = day_at.replace(hour=10, minute=0, second=0, microsecond=0)
    event_id = _walk(client, owner, pet, occurred_at=occurred)

    body = _replay(client, owner, pet, occurred.date().isoformat())
    delta = body["knowledge_delta"]
    assert delta["changed"] is True
    late = [item for item in delta["items"] if item["kind"] == "LATE_RECORDED_EVENT"]
    assert [item["event_id"] for item in late] == [event_id]
    assert late[0]["occurred_at"].startswith(occurred.date().isoformat())
    assert late[0]["recorded_at"] > late[0]["occurred_at"]
    assert delta["event_delta_count"] >= 1
    # The same day, seen at its own end, still does not contain the late record.
    then = _replay(client, owner, pet, occurred.date().isoformat(),
                   perspective="as_known_then")
    assert event_id not in [row["event_id"] for row in then["events"]]


def test_r8cb_later_retraction_is_a_source_validity_change(client, seeded):
    """Case B: valid on D, retracted on D+2."""
    owner = seeded["owner_id"]
    pet = seeded["coco_id"]
    day_at = datetime.now(PRODUCT_TZ) - timedelta(days=1)
    occurred = day_at.replace(hour=9, minute=30, second=0, microsecond=0)
    event_id = _walk(client, owner, pet, occurred_at=occurred)
    cutoff_before_retraction = datetime.now(timezone.utc)

    retracted = client.post(f"/api/v1/events/{event_id}/retract", headers=auth(owner))
    assert retracted.status_code == 200, retracted.text

    body = _replay(
        client, owner, pet, occurred.date().isoformat(),
        historical_cutoff=cutoff_before_retraction.isoformat(),
    )
    delta = body["knowledge_delta"]
    withdrawn = [
        item for item in delta["items"]
        if item["kind"] == "SOURCE_RETRACTED_LATER" and item["event_id"] == event_id
    ]
    assert withdrawn, delta["items"]
    assert "撤回" in withdrawn[0]["reason"]
    assert event_id not in [row["event_id"] for row in body["events"]]


def test_r8cb_later_correction_keeps_history_and_flags_supersede(client, seeded):
    """Case C: the original stays historical truth; the correction is current."""
    owner = seeded["owner_id"]
    pet = seeded["coco_id"]
    day_at = datetime.now(PRODUCT_TZ) - timedelta(days=1)
    occurred = day_at.replace(hour=8, minute=15, second=0, microsecond=0)
    event_id = _walk(client, owner, pet, occurred_at=occurred, minutes=45)
    cutoff_before_correction = datetime.now(timezone.utc)

    corrected = client.post(
        f"/api/v1/pets/{pet}/events/{event_id}/supersede",
        json={"payload": {"duration_minutes": 25}, "idempotency_key": "r8cb-supersede-001"},
        headers=auth(owner),
    )
    assert corrected.status_code == 201, corrected.text

    body = _replay(
        client, owner, pet, occurred.date().isoformat(),
        historical_cutoff=cutoff_before_correction.isoformat(),
    )
    delta = body["knowledge_delta"]
    superseded = [
        item for item in delta["items"]
        if item["kind"] == "SOURCE_SUPERSEDED_LATER" and item["event_id"] == event_id
    ]
    assert superseded, delta["items"]
    assert "修正" in superseded[0]["reason"]

    # Append-only history: the correction never deletes the original record.
    original = client.get(f"/api/v1/events/{event_id}", headers=auth(owner))
    assert original.status_code == 200, original.text


def test_r8cb_later_review_and_outcome_are_owner_workflow_changes(client, seeded):
    """Cases D/E/F: later review, later outcome, then invalidated outcome source."""
    owner = seeded["owner_id"]
    pet, case_id = _case_pet(client, owner)
    day = datetime.now(PRODUCT_TZ).date().isoformat()

    cutoff_before_review = datetime.now(timezone.utc)
    follow_up = _walk(client, owner, pet, minutes=18)
    review = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={
            "decision": "RECORD_OBSERVATION",
            "related_event_ids": [follow_up],
            "expected_latest_review_id": None,
            "note": "私有备注-r8cb-不得出现在增量",
        },
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text
    cutoff_before_outcome = datetime.now(timezone.utc)

    outcome = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/outcomes",
        json={
            "observation_review_id": review.json()["review_id"],
            "assessment": "CONTINUE_OBSERVING",
            "expected_latest_review_id": review.json()["review_id"],
            "expected_latest_outcome_id": None,
            "idempotency_key": "r8cb-delta-outcome-001",
        },
        headers=auth(owner),
    )
    assert outcome.status_code == 201, outcome.text
    cutoff_before_retraction = datetime.now(timezone.utc)

    retracted = client.post(f"/api/v1/events/{follow_up}/retract", headers=auth(owner))
    assert retracted.status_code == 200, retracted.text

    reviewed = _replay(
        client, owner, pet, day, historical_cutoff=cutoff_before_review.isoformat(),
    )["knowledge_delta"]
    assert "REVIEW_ADDED_LATER" in _kinds(reviewed)
    review_item = next(i for i in reviewed["items"] if i["kind"] == "REVIEW_ADDED_LATER")
    assert review_item["case_id"] == case_id
    assert review_item["review_id"] == review.json()["review_id"]

    outcome_delta = _replay(
        client, owner, pet, day, historical_cutoff=cutoff_before_outcome.isoformat(),
    )["knowledge_delta"]
    assert "OUTCOME_ADDED_LATER" in _kinds(outcome_delta)
    outcome_item = next(i for i in outcome_delta["items"] if i["kind"] == "OUTCOME_ADDED_LATER")
    assert outcome_item["outcome_id"] == outcome.json()["outcome_id"]
    assert outcome_item["assessment"] == "CONTINUE_OBSERVING"

    # Case F: the outcome itself is preserved; only its evidence became invalid.
    invalidation = _replay(
        client, owner, pet, day, historical_cutoff=cutoff_before_retraction.isoformat(),
    )
    delta = invalidation["knowledge_delta"]
    assert "FOLLOWUP_BECAME_INVALID_LATER" in _kinds(delta)
    reason = next(
        item["reason"] for item in delta["items"]
        if item["kind"] == "FOLLOWUP_BECAME_INVALID_LATER"
    )
    assert reason == "后来作为该结果依据的记录被撤回"
    # The day itself is unchanged: the R8CA cutoff view still shows the Outcome
    # the owner had recorded before the evidence was withdrawn.
    then_workflow = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/workflow-replay",
        params={"knowledge_cutoff": cutoff_before_retraction.isoformat()},
        headers=auth(owner),
    )
    assert then_workflow.status_code == 200, then_workflow.text
    assert then_workflow.json()["owner_workflow_state"] == "OUTCOME_CONTINUE_OBSERVING"
    assert then_workflow.json()["latest_effective_outcome_id"] == outcome.json()["outcome_id"]

    current = _replay(client, owner, pet, day)
    current_workflow = next(
        row for row in current["owner_workflows"] if row["case_id"] == case_id
    )
    assert current_workflow["owner_workflow_state"] == "FOLLOW_UP_EVIDENCE_INVALIDATED"
    assert current_workflow["requires_new_follow_up_observation"] is True
    # The current view keeps the same Outcome ID: history is not rewritten.
    assert current_workflow["latest_effective_outcome_id"] == outcome.json()["outcome_id"]


def test_r8cb_delta_is_journal_derived_private_and_health_free(client, seeded):
    """No LLM, no private note, no health inference, no retroactive rewrite."""
    owner = seeded["owner_id"]
    pet, case_id = _case_pet(client, owner)
    day = datetime.now(PRODUCT_TZ).date().isoformat()
    cutoff = datetime.now(timezone.utc)
    follow_up = _walk(client, owner, pet, minutes=21)
    review = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={
            "decision": "RECORD_OBSERVATION",
            "related_event_ids": [follow_up],
            "expected_latest_review_id": None,
            "note": "私有备注-r8cb-隐私边界",
        },
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text

    body = _replay(client, owner, pet, day, historical_cutoff=cutoff.isoformat())
    delta = body["knowledge_delta"]
    assert delta["derived_from"] == "APPEND_ONLY_JOURNAL"
    assert delta["model_status"] == "DETERMINISTIC_NO_LLM_NO_HEALTH_INFERENCE"
    assert "不代表宠物健康状态改变" in delta["truth_note"]
    serialized = str(delta)
    assert "私有备注" not in serialized
    assert '"note"' not in serialized   # no private note field is copied over
    assert "私有" not in serialized
    for item in delta["items"]:
        for phrase in HEALTH_CLAIMS:
            assert phrase not in item["reason"], item

    # A day where nothing became knowable later must report an empty delta
    # instead of manufacturing an explanation.
    quiet_day = (datetime.now(PRODUCT_TZ) - timedelta(days=5)).date().isoformat()
    quiet = _replay(client, owner, pet, quiet_day)["knowledge_delta"]
    assert quiet["changed"] is False
    assert quiet["items"] == []
    assert quiet["event_delta_count"] == 0
    assert quiet["owner_workflow_delta_count"] == 0


def test_r8cb_delta_is_pet_scoped_and_validates_cutoffs(client, seeded):
    owner = seeded["owner_id"]
    pet = seeded["coco_id"]
    other_pet = client.post(
        "/api/v1/pets", json={"name": "R8CB Other Pet", "species": "cat"},
        headers=auth(owner),
    ).json()["id"]
    day_at = datetime.now(PRODUCT_TZ) - timedelta(days=1)
    occurred = day_at.replace(hour=11, minute=0, second=0, microsecond=0)
    other_event = _walk(client, owner, other_pet, occurred_at=occurred)

    delta = _replay(client, owner, pet, occurred.date().isoformat())["knowledge_delta"]
    assert other_event not in str(delta)

    day = occurred.date().isoformat()
    naive = client.get(
        f"/api/v1/pets/{pet}/life-replay",
        params={"date": day, "historical_cutoff": "2026-10-01T12:00:00"},
        headers=auth(owner),
    )
    assert naive.status_code == 422
    future = client.get(
        f"/api/v1/pets/{pet}/life-replay",
        params={
            "date": day,
            "historical_cutoff": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
        headers=auth(owner),
    )
    assert future.status_code == 422
    before_day = client.get(
        f"/api/v1/pets/{pet}/life-replay",
        params={
            "date": day,
            "historical_cutoff": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
        },
        headers=auth(owner),
    )
    assert before_day.status_code == 422

    outsider = create_user()
    denied = client.get(
        f"/api/v1/pets/{pet}/life-replay", params={"date": day}, headers=auth(outsider),
    )
    assert denied.status_code == 403
