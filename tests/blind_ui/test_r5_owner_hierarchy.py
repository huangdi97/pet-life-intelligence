from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_web_today_preserves_living_hierarchy() -> None:
    now = read("apps/web/app/_components/today/NowCard.tsx")
    action = read("apps/web/app/_components/today/ActionCard.tsx")
    recent = read("apps/web/app/_components/today/RecentCard.tsx")
    page = read("apps/web/app/page.tsx")

    # NOW is a factual narrative, not a duplicate KPI dashboard.
    assert "v4-metrics" not in now
    assert "最近发生" in now
    # ACTION has exactly one primary CTA and the two canonical peer actions.
    assert action.count("v4-action--primary") == 1
    for label in ("快速记录", "看看它", "问助手"):
        assert label in action
    # MEMORY remains quiet; contextual CTAs live in ACTION above it.
    assert "看看它" not in recent
    assert "陪伴" not in recent
    # Dead unavailable-feature chrome must not occupy the owner homepage.
    assert "服务暂未开放" not in page


def test_web_me_uses_open_owner_sections() -> None:
    settings = read("apps/web/app/settings/page.tsx")
    assert "v5-me-page" in settings
    assert 'className="v5-utility-surface"' not in settings

    for path in (
        "apps/web/app/settings/_components/ConsentsCard.tsx",
        "apps/web/app/settings/_components/EmergencyProfileCard.tsx",
        "apps/web/app/settings/_components/DeletionRequestCard.tsx",
        "apps/web/app/settings/_components/AccountSecurityCard.tsx",
    ):
        source = read(path)
        assert 'className="card"' not in source
        assert "v5-me-section" in source


def test_owner_surfaces_do_not_render_raw_consent_enums() -> None:
    labels = read("apps/web/lib/ownerLabels.ts")
    settings = read("apps/web/app/settings/_components/ConsentsCard.tsx")
    pet = read("apps/web/app/pets/[id]/page.tsx")

    assert "consentPurposeLabel" in labels
    assert "consentPurposeLabel(c.purpose)" in settings
    assert "consentPurposeLabel(c.purpose)" in pet
    assert "{c.purpose}:" not in settings
    assert "{c.purpose}:" not in pet


def test_life_view_copy_stays_product_facing() -> None:
    source = read("apps/web/app/pets/[id]/life-view/page.tsx")
    for forbidden in ("简化形象（开发环境）", "真实服务接通后", "演示资产（开发环境）"):
        assert forbidden not in source


def test_mobile_assistant_keeps_ask_primary() -> None:
    source = read("apps/mobile/src/screens/AssistantScreen.tsx")
    # Ask is the dominant owner job; the other four modes are contextual tools,
    # not a five-way equal-weight tab strip.
    assert 'const TOOLS:' in source
    assert '{ id: "ask", label: "问" }' not in source
    assert "先问一件和" in source
    assert "更多帮助" in source
    for label in ("摘要", "找记录", "计划", "解释"):
        assert label in source


def test_mobile_health_empty_state_is_truthful_and_actionable() -> None:
    source = read("apps/mobile/src/screens/HealthScreen.tsx")
    assert "先记录事实，再判断变化" in source
    assert "不会把未知状态显示成“正常”" in source
    assert "记录第一条健康事件" in source
    assert "不替代诊断" in source


def test_mobile_pet_world_uses_six_narrative_domains() -> None:
    source = read("apps/mobile/src/screens/PetScreen.tsx")
    for key in ("life", "health", "behavior", "training", "welfare", "social"):
        assert f'key: "{key}"' in source
    assert "domainIcon" in source
    assert "feature grid" in source.lower()


def test_mini_assistant_keeps_ask_primary() -> None:
    source = read("apps/mini/src/pages/agent/index.tsx")
    assert "const assistantTools:" in source
    assert "mode-row" not in source
    assert "agent-primary-lead" in source
    assert "更多帮助" in source
    for label in ("摘要", "找记录", "计划", "解释"):
        assert label in source


def test_mini_pet_identity_localizes_common_breeds() -> None:
    source = read("apps/mini/src/pages/pets/index.tsx")
    formatting = read("apps/mini/src/utils/format.ts")
    assert "breedLabel(pet.breed)" in source
    assert 'return "柯基"' in formatting
    assert 'return "长毛家猫"' in formatting


def test_web_assistant_keeps_ask_primary() -> None:
    source = read("apps/web/app/agent/page.tsx")
    assert "v4-tabs" not in source
    assert "v5-assistant-primary-lead" in source
    assert "先问一件和" in source
    assert "更多帮助" in source
    assert "contextualTools" in source
    assert '"找记录"' in source


def test_web_timeline_pet_identity_localizes_catalogue_breed() -> None:
    source = read("apps/web/app/timeline/page.tsx")
    assert "breedLabel(current.breed)" in source
    assert "current.breed || current.species" not in source


def test_web_primary_navigation_is_exactly_five_owner_destinations() -> None:
    source = read("apps/web/components/TopNav.tsx")
    for test_id in (
        "pli.nav.today",
        "pli.nav.timeline",
        "pli.nav.pet",
        "pli.nav.assistant",
        "pli.nav.me",
    ):
        assert source.count(test_id) == 1
    assert "MORE_LINKS" not in source
    assert "more-menu" not in source
    assert 'p.species === "dog" ? "犬"' in source
