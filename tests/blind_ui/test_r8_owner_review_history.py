"""R8AI: Cases stay visible as immutable owner memory after a hint normalizes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_today_case_history_is_independent_of_live_notable_hint_and_pet_scoped():
    today = read("apps/mobile/src/screens/TodayScreen.tsx")
    history = read("apps/mobile/src/components/life/OwnerChangeHistory.tsx")
    assert 'api.get<{ cases: LifeChangeCaseSummary[] }>(`/pets/${petId}/life-change-cases`)' in today
    assert "const ownerCases = isOwnData ? rawOwnerCases : []" in today
    assert "{petId && ownerCases.length > 0 ? (" in today
    assert "const own = cases.filter((c) => c.pet_id === petId);" in history
    assert 'testID="pli.r8.owner-history"' in history
    assert 'testID={`pli.r8.owner-history.case.${c.case_id}`}' in history
    assert "今天不再显示变化提示，不代表宠物已经恢复或没有问题" in history
    assert 'onOpenTimeline={() => tabNav.navigate("Timeline")}' in today
    assert "caseHistoryStatus(c)" in history


def test_r8ai_requires_genuine_normalized_walk_and_durable_native_case():
    capture = read("scripts/r5-6/capture-android-final.py")
    assert 'history_node = f"pli.r8.owner-history.case.{case_id}"' in capture
    assert '"durable-case-after-normalization.png"' in capture
    assert '"case-journal-truth.json"' in capture
    assert 'normalized_walk.get("notable")' in capture
    assert '"follow_up_source_valid") is not True' in capture
    assert "case_visible_in_real_native_xml" in capture
    assert "android.start_link(f\"pli-demo://nav?screen=today&pet={pet_id}\")" in capture
    assert "api_json(" in capture and '"/pets/{pet_id}/events"' not in capture
