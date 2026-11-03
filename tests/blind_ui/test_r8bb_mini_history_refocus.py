"""R8BB: Mini owner history must refresh on real page-stack return."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCREEN = ROOT / "apps/mini/src/pages/observations/index.tsx"


def test_mini_history_hides_cached_records_when_page_is_hidden_or_refocused():
    source = SCREEN.read_text(encoding="utf-8")
    assert 'import Taro, { useDidHide, useDidShow } from "@tarojs/taro";' in source
    assert "const [returnEpoch, setReturnEpoch] = useState(0);" in source
    assert "const scopeKey = JSON.stringify([petId, metric, validity, returnEpoch]);" in source
    assert "const scopeReady = isPageVisible && resultScopeKey === scopeKey;" in source
    assert "useDidShow(() => {" in source
    assert "setReturnEpoch((current) => current + 1)" in source
    assert "useDidHide(() => {" in source
    assert "scopeEpoch.current += 1;" in source
    assert "setPageVisible(false);" in source
    assert "setResultScopeKey(null);" in source


def test_mini_history_remains_server_scoped_and_rejects_late_pages_after_hide():
    source = SCREEN.read_text(encoding="utf-8")
    assert "if (scopeEpoch.current !== epoch) return;" in source
    assert "const own = page.cases.filter((item) => item.pet_id === petId);" in source
    assert "moreInFlight.current = false;" in source
    assert "if (petId) load(null, false);" in source
    assert "[load, petId]" in source
    assert "visibleRows.map((row)" in source
    assert "visibleHasMore" in source
