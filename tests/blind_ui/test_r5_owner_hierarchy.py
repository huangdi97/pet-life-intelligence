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


def test_mini_assistant_preserves_structured_answer_contract() -> None:
    panel = read("apps/mini/src/pages/agent/_components/ask_panel.tsx")
    contract = read("apps/mini/src/pages/agent/_lib.ts")
    for key in ("facts", "inference", "sources", "uncertainty", "action"):
        assert key in contract
    for label in ("事实", "推断（非事实）", "来源", "不确定性", "下一步"):
        assert label in panel


def test_mobile_primary_navigation_is_exactly_five_owner_destinations() -> None:
    source = read("apps/mobile/src/navigation.tsx")
    assert source.count('<Tab.Screen name=') == 5
    for name in ("Today", "Timeline", "Pet", "Assistant", "Me"):
        assert f'<Tab.Screen name="{name}"' in source
    for label in ("今天", "时间线", "助手", "我的"):
        assert f'tabBarLabel: "{label}"' in source


def test_mini_primary_navigation_is_exactly_five_owner_destinations() -> None:
    source = read("apps/mini/src/app.config.ts")
    tab_block = source.split("tabBar:", 1)[1]
    for page_path in (
        "pages/index/index",
        "pages/timeline/index",
        "pages/pets/index",
        "pages/agent/index",
        "pages/mine/index",
    ):
        assert tab_block.count(page_path) == 1
    assert tab_block.count("pagePath:") == 5


def test_web_pet_change_narrative_is_grounded_and_identity_localized() -> None:
    source = read("apps/web/app/pets/page.tsx")
    assert "abnormal-day-hint" in source
    assert "按当前确定性对比" in source
    assert "变化判断暂时没有可确认结果" in source
    assert "相比它自己的日常，目前没有明显变化" not in source
    assert "breedLabel(current?.breed)" in source
    assert "breedLabel(p.breed)" in source


def test_mini_training_follows_goal_session_progress_contract() -> None:
    source = read("apps/mini/src/pages/training/index.tsx")
    assert "goal_id" in source
    assert "/training-sessions" in source
    assert "mastery_level" in source
    assert "掌握度只由已经提交的训练会话更新" in source
    for label in ("当前目标", "进展", "记录这次训练", "下一步"):
        assert label in source
    assert 'className="card"' not in source


def test_twin_review_uses_stable_stand_pose_on_capable_clients() -> None:
    web = read("apps/web/app/pets/[id]/twin/review/page.tsx")
    mobile = read("apps/mobile/src/screens/PetTwinReviewScreen.tsx")
    assert 'pose="Stand"' in web
    assert 'pose="Stand"' in mobile
    assert 'pose="Idle"' not in mobile.split('variant="review"', 1)[1].split("/>", 1)[0]


def test_training_clients_read_real_sessions_for_progress_and_outcome() -> None:
    web = read("apps/web/app/training/page.tsx")
    mobile = read("apps/mobile/src/screens/TrainingScreen.tsx")
    mini = read("apps/mini/src/pages/training/index.tsx")
    for source in (web, mobile, mini):
        assert "/training-sessions?limit=8" in source
        assert "最近会话与结果" in source
        assert "掌握度只由已经提交的训练会话更新" in source
    assert "fmtTime(session.session_at)" in web
    assert "sessionTimeLabel(session.session_at)" in mobile
    assert "fmtTime(session.session_at)" in mini


def test_care_owner_copy_and_roles_stay_human_readable_across_clients() -> None:
    web = read("apps/web/app/care/page.tsx")
    mobile = read("apps/mobile/src/screens/CareScreen.tsx")
    mini = read("apps/mini/src/pages/care/index.tsx")
    for source in (web, mobile, mini):
        assert "内部用户 ID" not in source
        assert 'role === "SITTER"' in source
        for label in ("临时照护人", "兽医", "训练师", "美容护理"):
            assert label in source
    assert '<option value="">选择照护人</option>' in web


def test_training_status_language_is_truthful_and_cross_client() -> None:
    web = read("apps/web/app/training/page.tsx")
    mobile = read("apps/mobile/src/screens/TrainingScreen.tsx")
    mini = read("apps/mini/src/pages/training/index.tsx")
    for source in (web, mobile, mini):
        assert "COMPLETED" in source
        assert "ACHIEVED" in source
        assert "ARCHIVED" in source
        assert "状态已记录" in source
        assert "已归档" in source


def test_monitoring_does_not_collapse_degraded_or_unknown_into_online() -> None:
    web = read("apps/web/app/monitoring/page.tsx")
    mobile = read("apps/mobile/src/screens/MonitoringScreen.tsx")
    companion = read("apps/mobile/src/screens/CompanionScreen.tsx")
    for source in (web, mobile):
        assert 'status === "permission_required"' in source
        assert 'status === "degraded"' in source
        assert "连接不稳定" in source
        assert "状态待确认" in source
    for source in (mobile, companion):
        assert 'normalized === "connected" || normalized === "online"' in source
        assert 'normalized === "permission_required"' in source


def test_social_declined_state_is_localized_across_clients() -> None:
    web = read("apps/web/app/social/_components/FriendsPanel.tsx")
    mobile = read("apps/mobile/src/screens/SocialScreen.tsx")
    mini = read("apps/mini/src/pages/social/index.tsx")
    for source in (web, mobile, mini):
        assert "DECLINED" in source
        assert "已拒绝" in source


def test_me_privacy_and_emergency_are_real_cross_client_controls() -> None:
    mobile = read("apps/mobile/src/screens/MeScreen.tsx")
    mini = read("apps/mini/src/pages/mine/index.tsx")
    mobile_api = read("apps/mobile/src/api.ts")

    # PLI-215: consent state is read from the API and non-essential purposes
    # can be changed; owner copy never hard-codes a fake privacy summary.
    for source in (mobile, mini):
        assert "/consents" in source
        assert "/emergency-profile" in source
        assert "/deletion-requests" in source
        assert "SERVICE_ESSENTIAL" in source
        assert "不会用默认值代替真实状态" in source
        assert "可随时导出" not in source
    assert "put: <T>" in mobile_api


def test_web_pet_world_uses_pet_specific_domain_narratives() -> None:
    source = read("apps/web/app/pets/page.tsx")
    assert "DOMAIN_META" in source
    for endpoint in (
        "/health-events",
        "/behavior-events",
        "/training-goals",
        "/welfare-evidence",
        "/friends",
    ):
        assert endpoint in source
    assert "headline={current.name}" not in source
    assert 'frameTarget={0.33}' in source
    assert "domainMeaning[row.id]" in source


def test_notifications_are_actionable_and_never_leak_raw_type_enums() -> None:
    web = read("apps/web/app/notifications/page.tsx")
    mobile = read("apps/mobile/src/screens/NotificationsScreen.tsx")
    mini = read("apps/mini/src/pages/notifications/index.tsx")
    api_route = read("services/api/app/api/routes/care_account.py")

    for source in (web, mobile, mini):
        assert "/notifications/" in source
        assert "read-all" in source
        assert "标为已读" in source
        assert "需要处理" in source
    assert "return map[type] ?? type" not in mobile
    assert "{n.type}" not in mini
    assert '@router.post("/notifications/{notification_id}/read")' in api_route
    assert '@router.post("/households/{household_id}/notifications/read-all")' in api_route


def test_pet_profile_create_edit_is_real_across_owner_clients() -> None:
    web_edit = read("apps/web/app/pets/[id]/edit/page.tsx")
    web_detail = read("apps/web/app/pets/[id]/page.tsx")
    mobile_profile = read("apps/mobile/src/screens/PetProfileScreen.tsx")
    mobile_nav = read("apps/mobile/src/navigation.tsx")
    mini = read("apps/mini/src/pages/pets/index.tsx")

    assert 'api.patch(`/pets/${id}`' in web_edit
    assert "编辑档案" in web_detail
    assert 'api.post<Pet>("/pets"' in mobile_profile
    assert 'api.patch<Pet>(`/pets/${current!.id}`' in mobile_profile
    assert 'PetProfile: { mode: "create" | "edit" }' in mobile_nav
    assert 'api.patch(`/pets/${current.id}`' in mini
    assert "保存档案" in mini


def test_web_me_exposes_real_field_privacy_and_export_controls() -> None:
    settings = read("apps/web/app/settings/page.tsx")
    controls = read("apps/web/app/settings/_components/DataControlsCard.tsx")
    route = read("services/api/app/api/routes/v10_platform_identity.py")

    assert "DataControlsCard" in settings
    assert "/field-privacy" in controls
    assert "/export" in controls
    assert "不会用默认设置覆盖真实状态" in controls
    assert '@router.get("/pets/{pet_id}/field-privacy")' in route


def test_behavior_secondary_filter_exists_across_owner_clients() -> None:
    web = read("apps/web/app/behavior/page.tsx")
    mobile = read("apps/mobile/src/screens/BehaviorScreen.tsx")
    mini = read("apps/mini/src/pages/behavior/index.tsx")

    for source in (web, mobile, mini):
        assert "UNLABELED" in source
        assert "当前筛选下没有行为记录" in source
        assert "轻度" in source
        assert "中度" in source
        assert "重度" in source
