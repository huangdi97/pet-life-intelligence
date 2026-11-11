"""Android runtime evidence must not show engineering vocabulary to the owner.

These tests exercise the two fail-closed gates added to
``scripts/r5-6/validate-android-runtime-evidence.py``. They use synthetic native
XML, no screenshots and no vision model: the point is that a capture which
renders an internal identifier as owner copy is not valid evidence of an owner
experience, no matter what the pixels look like.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "scripts" / "r5-6" / "validate-android-runtime-evidence.py"

_spec = importlib.util.spec_from_file_location("android_evidence_validator", VALIDATOR)
assert _spec is not None and _spec.loader is not None
validator = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(validator)


TODAY_OK = (
    '<resource-id="pli.today.identity"',
    '<resource-id="pli.today.living-stage"',
    '<resource-id="pli.today.pet-twin"',
    '<resource-id="pli.today.now-story"',
    '<resource-id="pli.today.change"',
    '<resource-id="pli.today.attention"',
    '<resource-id="pli.today.primary-action"',
)


def _today_xml(resource_ids: tuple[str, ...] = TODAY_OK) -> str:
    nodes = "".join(f'<node resource-id="{rid.split(chr(34))[1]}" />' for rid in resource_ids)
    return f'<hierarchy rotation="0">{nodes}</hierarchy>'


def _write(android: Path, rel: str, text: str) -> None:
    path = android / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _artifact(tmp_path: Path, today: str | None = None) -> Path:
    android = tmp_path / "android"
    _write(android, "today/ui.xml", today or _today_xml())
    return android


def test_clean_owner_copy_passes(tmp_path: Path) -> None:
    android = _artifact(tmp_path)
    _write(
        android,
        "pet/ui.xml",
        '<hierarchy><node text="豆豆 · 今天吃了 80 g" content-desc="豆豆的照片" /></hierarchy>',
    )
    validator.validate_owner_copy(android)
    validator.validate_today_canvas(android)


@pytest.mark.parametrize(
    "text",
    ["R8AS Correction 1794319059", "stageRole=today", "petId 7c8c722f", "null"],
)
def test_engineering_identifier_in_visible_text_fails(tmp_path: Path, text: str) -> None:
    android = _artifact(tmp_path)
    _write(android, "pet/ui.xml", f'<hierarchy><node text="{text}" /></hierarchy>')
    with pytest.raises(ValueError, match="owner-visible engineering identifier"):
        validator.validate_owner_copy(android)


def test_engineering_identifier_in_content_desc_fails(tmp_path: Path) -> None:
    """The real defect: an ImageView label that TalkBack reads aloud."""
    android = _artifact(tmp_path)
    _write(
        android,
        "r8-owner-correction/correction-today.xml",
        '<hierarchy><node class="android.widget.ImageView" '
        'content-desc="R8AS Correction 1794319059 箭头" /></hierarchy>',
    )
    with pytest.raises(ValueError, match="R8AS"):
        validator.validate_owner_copy(android)


def test_manifest_beacon_on_the_webview_stage_is_allowed(tmp_path: Path) -> None:
    """Documented exception: the no-vision-model manifest lives in document.title."""
    android = _artifact(tmp_path)
    _write(
        android,
        "lifeview/ui.xml",
        '<hierarchy><node class="android.webkit.WebView" '
        'text=\'PLI_MANIFEST:{"ready":true,"petId":"x"}\' /></hierarchy>',
    )
    validator.validate_owner_copy(android)


def test_manifest_exception_is_narrow(tmp_path: Path) -> None:
    """The same string on any other node class is still owner-visible noise."""
    android = _artifact(tmp_path)
    _write(
        android,
        "pet/ui.xml",
        '<hierarchy><node class="android.widget.TextView" '
        'text=\'PLI_MANIFEST:{"ready":true}\' /></hierarchy>',
    )
    with pytest.raises(ValueError, match="PLI_MANIFEST"):
        validator.validate_owner_copy(android)


def test_word_boundaries_do_not_raise_false_positives(tmp_path: Path) -> None:
    android = _artifact(tmp_path)
    _write(
        android,
        "pet/ui.xml",
        '<hierarchy><node text="annulled R80 R8x none" /></hierarchy>',
    )
    validator.validate_owner_copy(android)


def test_today_without_the_living_canvas_order_fails(tmp_path: Path) -> None:
    inverted = tuple(reversed(TODAY_OK))
    android = _artifact(tmp_path, _today_xml(inverted))
    with pytest.raises(ValueError, match="Living Canvas order"):
        validator.validate_today_canvas(android)


def test_today_with_two_attention_panels_fails(tmp_path: Path) -> None:
    doubled = TODAY_OK[:6] + ('<resource-id="pli.today.attention"',) + TODAY_OK[6:]
    android = _artifact(tmp_path, _today_xml(doubled))
    with pytest.raises(ValueError, match="exactly one Attention"):
        validator.validate_today_canvas(android)


def test_today_without_the_pet_stage_fails(tmp_path: Path) -> None:
    without_stage = tuple(r for r in TODAY_OK if "pet-twin" not in r)
    android = _artifact(tmp_path, _today_xml(without_stage))
    with pytest.raises(ValueError, match="pet visual stage"):
        validator.validate_today_canvas(android)


def test_artifact_without_any_xml_fails_closed(tmp_path: Path) -> None:
    android = tmp_path / "android"
    android.mkdir()
    with pytest.raises(ValueError, match="cannot be verified"):
        validator.validate_owner_copy(android)


def test_domain_coverage_requires_the_four_secondary_domains(tmp_path: Path) -> None:
    """§24 coverage cannot silently regress by dropping a surface."""
    android = _artifact(tmp_path)
    with pytest.raises(ValueError, match="missing §24 domain evidence surfaces"):
        validator.validate_domain_coverage(android)


def _domain_files(android: Path, screen: str) -> None:
    """Write a minimal but size-valid domain capture (gates require >=100 bytes)."""
    _write(android, f"{screen}/{screen}.png", "x" * 2048)
    _write(
        android,
        f"{screen}/ui.xml",
        f'<hierarchy rotation="0"><node resource-id="pli.{screen}.identity" />'
        f'<node text="（{screen} 说明文本，用于满足证据最小体积）" /></hierarchy>',
    )


def test_domain_coverage_passes_when_every_domain_is_captured(tmp_path: Path) -> None:
    android = _artifact(tmp_path)
    for screen in validator.REQUIRED_DOMAIN_SURFACES:
        _domain_files(android, screen)
    validator.validate_domain_coverage(android)


def test_domain_coverage_reports_every_missing_domain(tmp_path: Path) -> None:
    android = _artifact(tmp_path)
    _domain_files(android, "behavior")
    with pytest.raises(ValueError) as excinfo:
        validator.validate_domain_coverage(android)
    message = str(excinfo.value)
    assert "training" in message and "welfare" in message and "social" in message
    assert "behavior" not in message


def test_state_coverage_requires_the_empty_state(tmp_path: Path) -> None:
    """§24 state coverage cannot silently regress."""
    android = _artifact(tmp_path)
    with pytest.raises(ValueError, match="missing §24 state evidence surface"):
        validator.validate_state_coverage(android)


def test_state_coverage_rejects_a_capture_without_the_state_id(tmp_path: Path) -> None:
    """A screenshot of the wrong screen is not evidence of the state."""
    android = _artifact(tmp_path)
    _write(android, "empty/empty.png", "x" * 2048)
    _write(
        android,
        "empty/ui.xml",
        '<hierarchy>' + '<node resource-id="pli.today.identity" />' * 3 + "</hierarchy>",
    )
    _write(android, "offline/offline.png", "x" * 2048)
    _write(
        android,
        "offline/ui.xml",
        '<hierarchy><node resource-id="pli.offline.state" /></hierarchy>',
    )
    with pytest.raises(ValueError, match="does not contain pli.empty.pet"):
        validator.validate_state_coverage(android)


def test_state_coverage_passes_when_the_state_is_proven(tmp_path: Path) -> None:
    android = _artifact(tmp_path)
    for screen, root in validator.STATE_ROOT_IDS.items():
        _write(android, f"{screen}/{screen}.png", "x" * 2048)
        _write(
            android,
            f"{screen}/ui.xml",
            f'<hierarchy><node resource-id="{root}" />'
            f'<node text="{screen} 状态的说明文本，用于满足证据最小体积要求" /></hierarchy>',
        )
    validator.validate_state_coverage(android)
