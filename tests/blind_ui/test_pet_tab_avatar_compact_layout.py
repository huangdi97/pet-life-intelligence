"""Pet tab avatar should be visually present on an actual small Android tab.

A 120dp PetMedia square placed into the 28dp PetAvatar parent clips the
fallback glyph, resulting in a blank dot in the verified R8G Today screenshot.
This contract covers both image and species-glyph branches.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_pet_tab_avatar_uses_compact_media_bounds_and_species_fallback() -> None:
    avatar = (ROOT / "apps/mobile/src/components/media/PetAvatar.tsx").read_text()
    media = (ROOT / "apps/mobile/src/components/media/PetMedia.tsx").read_text()
    navigation = (ROOT / "apps/mobile/src/navigation.tsx").read_text()
    assert "compactSize={size}" in avatar
    assert "const frameHeight = compactSize ?? spec.height;" in media
    assert "const frameWidth = compactSize === undefined ? undefined : compactSize;" in media
    assert "Math.max(16, Math.floor(compactSize * 0.9))" in media
    assert media.count("height: frameHeight, width: frameWidth") == 2
    assert "<PetSpeciesGlyph glyph={glyph} size={glyphSize}" in media
    assert 'if (route.name === "Pet" && current)' in navigation
    assert 'options={{ tabBarLabel: "宠物" }}' in navigation


def test_default_media_variants_remain_unchanged() -> None:
    media = (ROOT / "apps/mobile/src/components/media/PetMedia.tsx").read_text()
    assert 'square: { height: 120, radius: RADIUS.lg, glyph: 96 }' in media
    assert "const frameHeight = compactSize ?? spec.height;" in media
    assert "const glyphSize = compactSize === undefined" in media
    assert 'if (uri) {' in media
