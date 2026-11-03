"""R8AM: the Web and Mini follow-up loops must stay real-event, same-pet only."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_mini_detail_hands_over_a_validated_followup_intent():
    detail = read("apps/mini/src/pages/observations/detail/index.tsx")
    helper = read("apps/mini/src/utils/caseFollowUp.ts")
    assert "rememberFollowUpTarget({" in detail
    assert "followUpEventType(row.metric)" in detail
    assert 'Taro.switchTab({ url: "/pages/index/index" })' in detail
    assert "pli.r8.mini-followup-record" in detail
    assert "pli.r8.mini-followup-linked" in detail
    # Tampered storage must be discarded, never used as a Case capability.
    assert "const eventType = followUpEventType(raw.metric);" in helper
    assert "if (!eventType) return null;" in helper
    assert 'const METRIC_EVENT: Record<string, string>' in helper


def test_mini_today_links_only_the_saved_same_metric_event():
    index = read("apps/mini/src/pages/index/index.tsx")
    helper = read("apps/mini/src/utils/caseFollowUp.ts")
    assert "consumeFollowUpTarget()" in index
    assert "followUpTarget.petId !== petId" in index
    assert "choose(followUpTarget.petId)" in index
    assert "QUICK_TYPES.find((item) => item.type === followUpTarget.eventType)" in index
    assert "savedEventId = created?.event_id ?? null;" in index
    assert "isFollowUpEvent(followUpTarget, target, sheetType.type)" in index
    assert "linkFollowUpObservation(followUpTarget, savedEventId)" in index
    assert "linkedEvent=${savedEventId}" in index
    # Unknown metric never invents an event type.
    assert 'walk_minutes_per_day: "daily.walk"' in helper
    assert "meal_count_per_day: \"daily.meal\"" in helper
    assert "sleep_minutes_per_day: \"daily.sleep\"" in helper


def test_web_and_mini_share_the_same_append_only_review_semantics():
    web = read("apps/web/lib/caseFollowUp.ts")
    mini = read("apps/mini/src/utils/caseFollowUp.ts")
    for source in (web, mini):
        assert '"RECORD_OBSERVATION"' in source
        assert "expected_latest_review_id" in source
        assert "source_valid" in source
        assert "related_event_ids: [eventId]" in source
        assert "decision" in source
    assert "r8-web-observation-" in web
    assert "r8-mini-observation-" in mini


def test_owner_ia_still_has_no_sixth_tab():
    nav = read("apps/mobile/src/navigation.tsx")
    mini_config = read("apps/mini/src/app.config.ts")
    assert "createBottomTabNavigator<TabParamList>" in nav
    assert '"pages/observations/index"' in mini_config
    tab_block = mini_config.split("tabBar:", 1)[1]
    assert tab_block.count("pagePath:") == 5
