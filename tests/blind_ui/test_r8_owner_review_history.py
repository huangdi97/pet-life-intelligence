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
