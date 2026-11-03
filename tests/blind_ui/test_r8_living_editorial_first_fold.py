"""R8L Living Editorial: pet imagery is unobscured and facts are not doubled."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_pet_hero_keeps_identity_and_event_text_out_of_the_animal_canvas() -> None:
    pet = read("apps/mobile/src/screens/PetScreen.tsx")
    assert "headline={undefined}" in pet
    assert "caption={undefined}" in pet
    assert 'testID="pli.pet.identity-subline"' in pet
    assert "identityLine ? (" in pet
    assert pet.index('testID="pli.pet.identity-subline"') < pet.index('testID="pli.pet.entry.lifeview"')
    assert 'testID="pli.pet.recent"' in pet
    assert "最近一次记录" in pet


def test_today_short_explanation_does_not_repeat_identical_source_comparison() -> None:
    narrative = read("apps/mobile/src/components/life/ChangeNarrative.tsx")
    assert "compact && evidenceHint && summary.includes(evidenceHint.trim())" in narrative
    assert "evidenceHint && !repeatedEvidence" in narrative
    assert "(onWhy || evidenceHint) && compact" in narrative
    assert "pli.today.change.explain" in narrative
    assert "comparison ?? evidenceHint" in narrative
