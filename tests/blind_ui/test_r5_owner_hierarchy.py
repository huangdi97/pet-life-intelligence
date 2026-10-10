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
    # R7: the prior 0.33 projected-area budget left the actual pet thumbnail-sized.\n    # Preserve an explicit pet-first camera contract; clip safety is still measured\n    # independently by the runtime projected-bounds acceptance gate.\n    assert 'frameTarget={0.57}' in source
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


def test_household_invitation_flow_exists_across_owner_clients() -> None:
    web = read("apps/web/app/care/page.tsx")
    mobile = read("apps/mobile/src/screens/CareScreen.tsx")
    mini = read("apps/mini/src/pages/care/index.tsx")

    for source in (web, mobile, mini):
        assert "/invitations" in source
        assert "发送邀请" in source
        assert "家庭角色" in source
        assert "共同主人" in source
        assert "主人角色不能通过邀请转移" in source
        assert "accept_token" in source
        assert "内部用户 ID" not in source


def test_household_invitation_acceptance_exists_in_me() -> None:
    web = read("apps/web/app/settings/page.tsx")
    mobile = read("apps/mobile/src/screens/MeScreen.tsx")
    mini = read("apps/mini/src/pages/mine/index.tsx")
    route = read("services/api/app/api/routes/care_members.py")

    for source in (web, mobile, mini):
        assert '"/invitations/accept"' in source
        assert "接受家庭邀请" in source
        assert "输入邀请码" in source
        assert "不会授予超出邀请角色的权限" in source

    assert '@router.post("/invitations/accept")' in route
    assert "Invitation was issued to a different account." in route


def test_handoff_checklist_is_actionable_across_owner_clients() -> None:
    web = read("apps/web/app/care/page.tsx")
    mobile = read("apps/mobile/src/screens/CareScreen.tsx")
    mini = read("apps/mini/src/pages/care/index.tsx")
    route = read("services/api/app/api/routes/care_handoffs.py")

    for source in (web, mobile, mini):
        assert "handoffChecklist" in source
        assert "交接确认" in source
        assert "确认完成" in source
        assert "/checklist/" in source
        assert "紧急联系人与就医方式已确认" in source

    assert '@router.post("/handoffs/{handoff_id}/checklist/{item_id}/complete")' in route
    assert "care.handoff_checklist_completed" in route


def test_deletion_request_lifecycle_is_visible_across_owner_clients() -> None:
    web = read("apps/web/app/settings/_components/DeletionRequestCard.tsx")
    settings = read("apps/web/app/settings/page.tsx")
    mobile = read("apps/mobile/src/screens/MeScreen.tsx")
    mini = read("apps/mini/src/pages/mine/index.tsx")
    route = read("services/api/app/api/routes/care_account.py")

    for source in (settings, mobile, mini):
        assert "/deletion-requests" in source
    for source in (web, mobile, mini):
        assert "等待人工确认" in source
        assert "已有待处理请求" in source
        assert "不会因此假定" in source

    assert '@router.get("/pets/{pet_id}/deletion-requests")' in route
    assert "A deletion request is already pending for this pet." in route


def test_health_outcome_choices_match_validated_domain_values() -> None:
    web = read("apps/web/app/_components/health/OutcomeCard.tsx")
    mobile = read("apps/mobile/src/screens/HealthDetailScreen.tsx")
    mini = read("apps/mini/src/pages/health/detail/index.tsx")

    expected = {
        "RECOVERED",
        "IMPROVED",
        "UNCHANGED",
        "WORSENED",
        "RELAPSED",
        "REFERRED",
        "UNRESOLVED",
    }
    for source in (web, mobile, mini):
        for value in expected:
            assert value in source
        assert "已恢复" in source
        assert "有改善" in source
        assert "仍未解决" in source
        assert "outcome.trim()" not in source


def test_vet_brief_sharing_is_revocable_across_owner_clients() -> None:
    web_page = read("apps/web/app/health/[id]/page.tsx")
    web_card = read("apps/web/app/_components/health/VetBriefCard.tsx")
    mobile = read("apps/mobile/src/screens/HealthDetailScreen.tsx")
    mini = read("apps/mini/src/pages/health/detail/index.tsx")
    route = read("services/api/app/api/routes/health_vet_brief.py")

    for source in (web_page, mobile, mini):
        assert "/share-tokens/" in source
        assert "token_id" in source
    for source in (web_card, mobile, mini):
        assert "撤销分享链接" in source
    assert '"token_id": str(st.id)' in route


def test_self_baseline_is_visible_and_explainable_across_owner_clients() -> None:
    web = read("apps/web/app/pets/page.tsx")
    mobile = read("apps/mobile/src/screens/PetScreen.tsx")
    mini = read("apps/mini/src/pages/pets/index.tsx")
    route = read("services/api/app/api/routes/v02_identity_daily_baseline.py")

    for source in (web, mobile, mini):
        assert "/baseline" in source
        assert "/baseline/recompute?window_days=14" in source
        assert "它的常态" in source
        assert "只和它自己比较" in source
        assert "没有足够" in source

    assert "trimmed_mean_v1" in route
    assert "drop min/max when >=4 samples" in route


def test_text_diary_is_real_and_available_across_owner_clients() -> None:
    web = read("apps/web/app/timeline/page.tsx")
    mobile = read("apps/mobile/src/screens/TimelineScreen.tsx")
    mini = read("apps/mini/src/pages/timeline/index.tsx")
    route = read("services/api/app/api/routes/v02_identity_daily_diary.py")

    for source in (web, mobile, mini):
        assert "/diary" in source
        assert "今天想记下什么" in source
        assert "保存日记" in source
        assert "最近日记" in source
        assert "真实发生" in source

    assert '@router.post("/pets/{pet_id}/diary"' in route
    assert '@router.get("/pets/{pet_id}/diary")' in route
    assert 'event_type="diary.created"' in route
    assert "SourceType.OWNER_REPORTED" in route


def test_daily_review_is_ai_labeled_and_source_grounded_across_owner_clients() -> None:
    web = read("apps/web/app/timeline/page.tsx")
    mobile = read("apps/mobile/src/screens/TimelineScreen.tsx")
    mini = read("apps/mini/src/pages/timeline/index.tsx")
    route = read("services/api/app/api/routes/v02_identity_daily_diary.py")

    for source in (web, mobile, mini):
        assert "/daily-summary" in source
        assert "/daily-summaries" in source
        assert "今日回顾" in source
        assert "AI 自动整理" in source
        assert "只整理已经记录的事实" in source
        assert "不会替代原始时间线" in source

    assert 'event_type="summary.generated"' in route
    assert "SourceType.AI_DERIVED" in route
    assert '@router.get("/pets/{pet_id}/daily-summaries")' in route


def test_pet_identifiers_and_lifecycle_are_real_across_owner_clients() -> None:
    web = read("apps/web/app/pets/[id]/edit/page.tsx")
    mobile = read("apps/mobile/src/screens/PetProfileScreen.tsx")
    mini = read("apps/mini/src/pages/pets/index.tsx")
    route = read("services/api/app/api/routes/v02_identity_daily_identity.py")
    profile = read("services/api/app/api/routes/pets_profile.py")

    for source in (web, mobile, mini):
        assert "/identifiers" in source
        assert "/status" in source
        for label in ("芯片", "未验证", "生命状态", "已离世"):
            assert label in source
        for value in ("ACTIVE", "LOST", "TRANSFERRED", "DECEASED"):
            assert value in source

    # Owner entry cannot silently self-verify an identifier.
    for source in (web, mobile, mini):
        assert "verify: false" in source

    # The canonical pet DTO exposes the lifecycle fact all clients render.
    assert "lifecycle_status: str" in profile
    assert '@router.post("/pets/{pet_id}/identifiers"' in route
    assert '@router.get("/pets/{pet_id}/identifiers")' in route
    assert '@router.post("/pets/{pet_id}/status"' in route
    assert "DECEASED is terminal" in route


def test_today_never_labels_unavailable_attention_evidence_as_calm() -> None:
    web_page = read("apps/web/app/page.tsx")
    web_attention = read("apps/web/app/_components/today/AttentionCard.tsx")
    mobile = read("apps/mobile/src/screens/TodayScreen.tsx")
    mini = read("apps/mini/src/pages/index/index.tsx")

    # CHANGE and health ATTENTION are separate truth channels. Unknown health
    # evidence must never be rendered as calm/no-risk.
    assert 'health.state !== "ready"' in web_page
    assert 'kind: "unknown"' in web_page
    assert "健康关注状态暂时无法确认" in web_attention
    assert "不会把未知状态显示成“没有风险”" in web_page
    assert "不会把未知状态显示成“没有变化”" in web_page

    assert 'healthState !== "ready"' in mobile
    assert 'kind: "unknown"' in mobile
    assert "健康关注状态暂时无法确认" in mobile
    assert "不会把未知状态显示成“没有风险”" in mobile
    assert "与它自己相比：今天还没有足够的基线信息。" in mobile

    assert 'healthState !== "ready"' in mini
    assert 'kind="unknown"' in mini
    assert "健康关注状态暂时无法确认" in mini
    assert "不会把未知状态显示成“没有风险”" in mini
    assert "不会把未知状态显示成“没有变化”" in mini


def test_recovery_plan_and_trend_are_real_owner_flows_across_clients() -> None:
    backend = read("services/api/app/api/routes/v02_care_health_medical.py")
    web = read("apps/web/app/_components/health/RecoveryCard.tsx")
    mobile = read("apps/mobile/src/screens/HealthDetailScreen.tsx")
    mini = read("apps/mini/src/pages/health/detail/index.tsx")

    assert '@router.get("/health-events/{health_event_id}/recovery-plans")' in backend
    assert '@router.post("/health-events/{health_event_id}/recovery-plan"' in backend
    assert '@router.patch("/recovery-plans/{plan_id}/items/{index}")' in backend
    assert '@router.get("/health-events/{health_event_id}/trend")' in backend

    for source in (web, mobile, mini):
        assert "/recovery-plan" in source
        assert "/recovery-plans/" in source
        assert "/trend" in source
        assert "恢复与复盘" in source
        assert "不会自动生成治疗方案" in source
        assert "非医学判断" in (source + backend)


def test_milestones_and_memories_are_real_cross_client_timeline_flows() -> None:
    web = read("apps/web/app/timeline/page.tsx")
    mobile = read("apps/mobile/src/screens/TimelineScreen.tsx")
    mini = read("apps/mini/src/pages/timeline/index.tsx")
    backend = read("services/api/app/api/routes/v02_social_platform_daily.py")

    for source in (web, mobile, mini):
        assert "/milestones" in source
        assert "/memories?years_back=10" in source
        assert "里程碑" in source
        assert "往年今日" in source
        assert "不会用生成内容补齐" in source
        # Memory samples come from canonical LifeEvent.event_type values. They
        # must be localized before owner presentation, never rendered raw.
        assert ".map(eventTypeLabel)" in source

    assert '@router.post("/pets/{pet_id}/milestones"' in backend
    assert '@router.get("/pets/{pet_id}/milestones")' in backend
    assert '@router.get("/pets/{pet_id}/memories")' in backend
    assert 'source_type=enums.SourceType.OWNER_REPORTED' in backend


def test_diet_profile_is_real_and_truthful_across_owner_clients() -> None:
    web = read("apps/web/app/pets/[id]/edit/page.tsx")
    mobile = read("apps/mobile/src/screens/PetProfileScreen.tsx")
    mini = read("apps/mini/src/pages/pets/index.tsx")
    backend = read("services/api/app/api/routes/v02_social_platform_daily.py")

    for source in (web, mobile, mini):
        assert "/diet-profile" in source
        assert "饮食档案" in source
        assert "当前主食" in source
        assert "已知过敏" in source
        assert "喂养规则" in source
        assert 'source_type: "OWNER_REPORTED"' in source
        assert "不等于平台" in source
        assert "专业确认" in source

    assert '@router.put("/pets/{pet_id}/diet-profile")' in backend
    assert '@router.get("/pets/{pet_id}/diet-profile")' in backend
    assert "enums.PROVENANCE_LEVELS" in backend


def test_preventive_reminders_are_real_cross_client_health_flows() -> None:
    web = read("apps/web/app/health/page.tsx")
    mobile = read("apps/mobile/src/screens/HealthScreen.tsx")
    mini = read("apps/mini/src/pages/health/index.tsx")
    backend = read("services/api/app/api/routes/v02_care_health_care.py")

    for source in (web, mobile, mini):
        assert "/reminders" in source
        assert "/done" in source
        for label in ("疫苗", "驱虫", "体检", "添加预防提醒", "标记完成"):
            assert label in source
        assert "到期不等于异常" in source
        assert "不会自动推断已经完成" in source

    assert '@router.post("/pets/{pet_id}/reminders"' in backend
    assert '@router.get("/pets/{pet_id}/reminders")' in backend
    assert '@router.post("/reminders/{reminder_id}/done")' in backend
    assert 'event_type="reminder.created"' in backend
    assert 'event_type="reminder.completed"' in backend


def test_preferences_and_rewards_are_real_cross_client_owner_flows() -> None:
    behavior_web = read("apps/web/app/behavior/page.tsx")
    behavior_mobile = read("apps/mobile/src/screens/BehaviorScreen.tsx")
    behavior_mini = read("apps/mini/src/pages/behavior/index.tsx")
    training_web = read("apps/web/app/training/page.tsx")
    training_mobile = read("apps/mobile/src/screens/TrainingScreen.tsx")
    training_mini = read("apps/mini/src/pages/training/index.tsx")
    backend = read("services/api/app/api/routes/v02_behavior_training_training.py")

    for source in (behavior_web, behavior_mobile, behavior_mini):
        assert "/preferences" in source
        for label in ("偏好与回避", "喜欢", "回避", "过敏/谨慎", "主人记录"):
            assert label in source
        assert 'source_type: "OWNER_REPORTED"' in source
        assert "不会从单次行为自动推断偏好" in source

    for source in (training_web, training_mobile, training_mini):
        assert "/preferences" in source
        assert "奖励偏好" in source
        assert 'kind: "REWARD"' in source
        assert 'source_type: "OWNER_REPORTED"' in source
        assert 'selectedReward ? [selectedReward] : []' in source
        assert 'rewards_used: ["零食"]' not in source
        assert "不会自动写" in source

    assert '@router.post("/pets/{pet_id}/preferences"' in backend
    assert '@router.get("/pets/{pet_id}/preferences")' in backend
    assert 'pattern="^(LIKE|DISLIKE|ALLERGY_CAUTION|REWARD)$"' in backend
    assert 'await write_audit(db, action="preference.add"' in backend


def test_role_targeted_notifications_are_membership_scoped_and_owner_visible() -> None:
    care_account = read("services/api/app/api/routes/care_account.py")
    role_feed = read("services/api/app/api/routes/v02_care_health_care.py")
    web = read("apps/web/app/notifications/page.tsx")
    mobile = read("apps/mobile/src/screens/NotificationsScreen.tsx")
    mini = read("apps/mini/src/pages/notifications/index.tsx")

    # Household notification reads must respect both explicit recipients and
    # the caller's ACTIVE household role. A generic household membership alone
    # is not sufficient to read another role/member's notification.
    assert "Notification.recipient_user_id.is_(None)" in care_account
    assert "Notification.recipient_user_id == user.id" in care_account
    assert "Notification.target_role == membership.role" in care_account
    assert 'row.target_role not in (None, "", "ALL", membership.role)' in care_account
    assert "Notification is addressed to another household role." in care_account

    # The legacy role-specific route is now bound to the caller's membership,
    # not an arbitrary role path supplied by the client.
    assert "HouseholdMember.role == role" in role_feed
    assert "membership.role != role" in role_feed
    assert "Cannot read notifications targeted to another household role." in role_feed

    for source in (web, mobile, mini):
        assert "roleAudienceLabel" in source
        assert "仅家庭主人" in source
        assert "仅指定家庭角色" in source


def test_behavior_video_binding_uses_real_artifacts_across_owner_clients() -> None:
    artifacts = read("services/api/app/api/routes/artifacts.py")
    behavior_api = read("services/api/app/api/routes/behavior.py")
    web = read("apps/web/app/behavior/page.tsx")
    mobile = read("apps/mobile/src/screens/BehaviorScreen.tsx")
    mini = read("apps/mini/src/pages/behavior/index.tsx")
    mini_upload = read("apps/mini/src/platform/upload.ts")
    mobile_api = read("apps/mobile/src/api.ts")

    assert '"video/mp4": ("VIDEO", None)' in artifacts
    assert '"video/webm": ("VIDEO"' in artifacts
    assert '@router.post("/pets/{pet_id}/artifacts"' in artifacts
    assert "artifact_ids: list[uuid.UUID]" in behavior_api
    assert "artifact_ids=[str(a) for a in body.artifact_ids]" in behavior_api
    assert "artifact_ids=body.artifact_ids" in behavior_api

    for source in (web, mobile, mini):
        assert "artifact_ids: artifactIds" in source
        assert "关联行为视频" in source
        assert "原始证据" in source
        assert "不会仅凭视频自动推断性格、情绪或诊断" in source

    assert "api.upload" in web
    assert "ImagePicker.MediaTypeOptions.Videos" in mobile
    assert "api.upload" in mobile
    assert "media.chooseVideo()" in mini
    assert "uploader.uploadVideo" in mini
    assert "uploadVideo" in mini_upload
    assert "async function uploadArtifact" in mobile_api


def test_android_runtime_capture_uses_unique_surface_truth_ids() -> None:
    capture = read("scripts/r5-6/capture-android-final.py")
    # Pet identity also appears as context on Today, so only the Pet hero stage
    # can certify that a capture really landed on the Pet tab.
    assert '"pet": "pli.pet.hero-stage"' in capture
    assert '"pet": "pli.pet.identity"' not in capture
    for root_id in (
        "pli.today.living-stage",
        "pli.timeline.identity",
        "pli.lifeview.identity",
        "pli.twinreview.identity",
        "pli.health.identity",
        "pli.assistant.identity",
        "pli.companion.living-stage",
        "pli.me.owner",
    ):
        assert root_id in capture


def test_android_demo_stack_deeplink_resets_to_requested_surface() -> None:
    """Evidence deep links must not remain on the prior tab surface."""
    source = read("apps/mobile/src/demoNav.ts")
    assert "deterministic.resetRoot" in source
    assert 'routes: [{ name: "Tabs" }, { name: stack }]' in source
    assert source.index("const tab = TAB_SCREENS[screen]") < source.index("const stack = STACK_SCREENS[screen]")


def test_android_demo_authenticates_before_owner_twin_mount() -> None:
    """The 401→generic GLB regression must fail blind checks, not be blessed."""
    app = read("apps/mobile/App.tsx")
    context = read("apps/mobile/src/context.tsx")
    twin = read("apps/mobile/src/hooks/usePetTwin.ts")

    assert "<PetsProvider deferInitialLoad={DEMO_ENV}>" in app
    assert "await devLogin(email)" in app
    assert "authenticated.current = true" in app
    assert "return ready ? <AppNavigation /> : null" in app
    assert "if (deferInitialLoad && tick === 0) return;" in context
    assert "if (requestVersion.current !== version) return;" in twin
    assert "result?.petId === petId" in twin
    # No code change may reclassify a generic demo GLB as a verified individual.
    runner = read("scripts/r5-6/capture-android-final.py")
    assert 'manifest.get("generic") is not True' in runner


def test_android_activity_does_not_count_sleep_or_medication_duration() -> None:
    helper = read("apps/mobile/src/screens/today_helpers.ts")
    today = read("apps/mobile/src/screens/TodayScreen.tsx")
    assert 'new Set(["daily.walk", "daily.play"])' in helper
    assert "Number.isFinite(minutes)" in helper
    assert "observedActivityMinutes(todayEvents)" in today
    assert "todayEvents.reduce(" not in today


def test_review_orbit_controls_are_first_screen_and_mobile_viewports_do_not_overflow() -> None:
    """A working GLB is not sufficient if camera controls are below the fold."""
    android = read("apps/mobile/src/screens/PetTwinReviewScreen.tsx")
    web = read("apps/web/app/pets/[id]/twin/review/page.tsx")
    css = read("apps/web/app/globals.css")

    assert 'testID="pli.twinreview.camera-controls"' in android
    assert android.index('testID="pli.twinreview.camera-controls"') < android.index('variant="review"')
    assert 'testID={`pli.twinreview.view.${v.key}`}' in android
    assert web.index('data-testid={`pli.twinreview.view.${v.id}`}') < web.index('data-testid="pli.twinreview.stage"')
    assert ".v4-main > .r5-life-stage-shell" in css
    assert ".r5-life-stage-shell > .r2p-stage" in css
    assert ".v5-review-page > .v5-segmented" in css
    assert "grid-template-columns:repeat(3,minmax(0,1fr))" in css


def test_web_life_view_never_mislabels_unrelated_durations_as_activity() -> None:
    """Medication/sleep/training durations are not measured physical activity."""
    life = read("apps/web/app/pets/[id]/life-view/page.tsx")
    activity = read("apps/web/app/_components/today/activity.ts")
    assert 'import { observedActivityMinutes } from "../../../_components/today/activity"' in life
    assert 'anchorValue(activityMinutes, "分钟")' in life
    assert 'new Set(["daily.walk", "daily.play"])' in activity
    assert "minutes > 24 * 60" in activity
    assert 'events.reduce((s, e) => s + (Number(e.payload?.duration_minutes)' not in life


def test_android_twin_review_never_exposes_previous_pet_candidate_or_activation() -> None:
    review = read("apps/mobile/src/screens/PetTwinReviewScreen.tsx")
    assert "candidateRequestVersion = useRef(0)" in review
    assert "candidatePetId === petId ? candidate : null" in review
    assert "candidateRequestVersion.current !== requestVersion" in review
    assert "setCandidatePetId(petId)" in review
    assert "if (!petId || !activeCandidate || resolvedVersion <= 0 || !selected) return;" in review
    assert "twin={activeCandidate}" in review
    assert "return () => { candidateRequestVersion.current += 1; };" in review


def test_android_life_view_activity_and_provenance_are_from_the_same_events() -> None:
    """If play is counted as activity it must also appear in the open fact sheet."""
    life = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    shared = read("apps/mobile/src/screens/today_helpers.ts")
    assert 'import { observedActivityMinutes } from "./today_helpers"' in life
    assert "const activityMinutes = observedActivityMinutes(petEvents);" in life
    assert 'activityMinutes > 0 ? `${activityMinutes} 分钟`' in life
    assert 'e.event_type === "daily.walk" || e.event_type === "daily.play"' in life
    assert 'const evs = id === "activity"' in life
    assert 'new Set(["daily.walk", "daily.play"])' in shared


def test_owner_identity_review_shows_real_photo_when_available() -> None:
    """The candidate has to be compared with an uploaded reference, not believed."""
    android = read("apps/mobile/src/screens/PetTwinReviewScreen.tsx")
    web = read("apps/web/app/pets/[id]/twin/review/page.tsx")
    css = read("apps/web/app/globals.css")
    for source in (android, web):
        assert "/avatar" in source
        assert "reference-photo" in source
        assert "真实照片对照" in source
        assert "petId:" in source
    assert "referencePhoto?.petId === pet.id" in android
    assert "realPhoto?.petId === petId" in web
    assert "if (!pet?.avatar_artifact_id) return;" in web
    assert ".v5-review-reference img" in css


def test_uploaded_photo_can_replace_the_demo_3d_without_cross_pet_leakage() -> None:
    """Living Canvas keeps the owner-controlled photo/3D choice, never forges media."""
    native = read("apps/mobile/src/components/life/PetLivingStage.tsx")
    web = read("apps/web/components/pet-living-stage.tsx")
    css = read("apps/web/app/globals.css")
    for source in (native, web):
        assert "const [photoView, setPhotoView]" in source
        assert "photoUri" in source
        assert "explicitPhotoChoice = photoView && photoView.petId ===" in source
        assert "canShow3d && !showPhoto" in source
        assert "切换为主人上传的真实照片" in source
        assert "看真实照片" in source
        assert "看 3D 形象" in source
    assert 'photoFirstByDefault = Boolean(photoUri && variant !== "review")' in native
    assert "photoFirstByDefault = Boolean(photoUri);" in web
    assert "if (!petId) return;" in web
    assert "if (!petId || twin || demo) return;" not in web
    assert ".r2p-stage-photo-toggle" in css


def test_companion_is_pet_first_across_owner_clients_and_final_evidence() -> None:
    android = read("apps/mobile/src/screens/CompanionScreen.tsx")
    web = read("apps/web/app/companion/page.tsx")
    mini = read("apps/mini/src/pages/companion/index.tsx")
    android_capture = read("scripts/r5-6/capture-android-final.py")
    web_capture = read("scripts/r5-6/capture-web-final.mjs")

    # Companion is a relationship surface: the current pet must lead before
    # devices/capability explanation on every owner client.
    assert "PetLivingStage" in android
    assert 'stageRole="companion"' in android
    assert android.index("<PetLivingStage") < android.index('title="真实设备状态"')
    assert 'stageTestId="pli.companion.living-stage"' in android

    assert "PetLivingStage" in web
    assert 'stageRole="companion"' in web
    assert web.index("<PetLivingStage") < web.index('data-testid="pli.companion.device-status"')
    assert 'stageTestId="pli.companion.living-stage"' in web

    assert "PetHero" in mini
    assert mini.index("<PetHero") < mini.index("真实设备状态")
    assert "不会模拟在线" in mini

    # Final runtime evidence must prove Companion uses the same real Twin
    # runtime rather than silently falling back to a device-only page.
    assert '("companion", True, "companion")' in android_capture
    assert '"companion"' in web_capture
    assert 'companion: "companion"' in web_capture
    assert '"today", "pet", "lifeview", "twinreview", "companion"' in web_capture


def test_living_field_is_warm_cream_with_restrained_projection_presence() -> None:
    palette = read("packages/pet-3d/src/palette.ts")
    tokens = read("apps/mobile/src/tokens.ts")
    stage = read("apps/mobile/src/components/life/PetLivingStage.tsx")
    web_css = read("apps/web/app/globals.css")

    # The owner stage is lifestyle-first cream/beige. Sage remains an accent;
    # it must not become the full-screen room/background again.
    for value in ("#F4E9D8", "#E7D5BC", "#FFF7E9", "#EFE0C8"):
        assert value in palette
    assert 'stageWarmBase: "#F4E9D8"' in tokens
    assert 'stageWarmDeep: "#E7D5BC"' in tokens
    assert "backgroundColor: COLORS.stageWarmBase" in stage
    assert "projectionPlane" in stage
    assert "projectionGlow" in stage
    assert "R7.2 warm-lifestyle correction" in web_css
    assert "#FBF6EC" in web_css and "#F2E6D5" in web_css and "#E7D4B9" in web_css


def test_android_embedded_twin_runtime_preserves_companion_stage_role() -> None:
    entry = read("apps/mobile/scripts/pet-stage-entry.ts")
    capture = read("scripts/r5-6/capture-android-final.py")
    assert 'window.__PLI_STAGE_ROLE === "companion"' in entry
    assert '("companion", True, "companion")' in capture


def test_mini_pet_world_is_life_first_before_profile_administration() -> None:
    source = read("apps/mini/src/pages/pets/index.tsx")
    hero = source.index('headline="它的生活，从这里看见"')
    recent = source.index('data-testid="pli.mini.pet.recent"')
    domains = source.index('<View className="section-title">生活</View>')
    avatar = source.index('data-testid="pli.mini.pet.avatar"')
    profile = source.index('data-testid="pli.mini.pet.profile"')
    identifiers = source.index('data-testid="pli.mini.pet.identifiers"')

    assert hero < recent < domains < avatar < profile < identifiers
    assert "从它真实发生的生活继续往下看。" in source
    assert 'event.event_type !== "today.viewed"' in source
    assert "eventTypeLabel(recentPetEvent.event_type)" in source


def test_shared_pet_scene_uses_soft_grounding_and_dimensional_warm_light() -> None:
    scene = read("packages/pet-3d/src/scene.ts")
    palette = read("packages/pet-3d/src/palette.ts")

    assert "createSoftContactAlphaMap" in scene
    assert "alphaMap: createSoftContactAlphaMap()" in scene
    assert "new THREE.HemisphereLight(" in scene
    assert "LIGHTS.hemisphereSky" in scene
    assert "LIGHTS.hemisphereGround" in scene
    assert "hemisphereIntensity: 0.62" in palette
    for warm_light in ("0xfffbf4", "0xdccbb5", "0xf1e7d8", "0xfff6e8"):
        assert warm_light in palette
    for stale_green_light in ("0xf8fff4", "0xc7d4c4", "0xe7efe7", "0xf5fff0"):
        assert stale_green_light not in palette
    # No owner-facing cyberpunk/blue projection light was introduced.
    assert "0x00ffff" not in scene.lower()
    assert "0x00aaff" not in scene.lower()


def test_web_pet_stage_releases_gpu_geometry_and_texture_resources() -> None:
    viewer = read("apps/web/components/three/pet3d-viewer.tsx")
    for token in (
        "material.map?.dispose()",
        "material.alphaMap?.dispose()",
        "material.normalMap?.dispose()",
        "material.roughnessMap?.dispose()",
        "mesh.geometry?.dispose()",
        "renderer?.dispose()",
    ):
        assert token in viewer


def test_companion_living_stage_stays_pet_first_without_hiding_device_reality() -> None:
    mobile_stage = read("apps/mobile/src/components/life/PetLivingStage.tsx")
    mobile = read("apps/mobile/src/screens/CompanionScreen.tsx")
    web_stage = read("apps/web/components/pet-living-stage.tsx")
    web = read("apps/web/app/companion/page.tsx")
    css = read("apps/web/app/globals.css")

    assert "compact?: boolean" in mobile_stage
    assert "const height = compact ? 470 : HEIGHTS[variant];" in mobile_stage
    assert "life: 520" in mobile_stage  # keep Life View rail first-viewport reachable while preserving a larger-than-Today stage
    assert "compact" in mobile
    assert "frameTarget={0.48}" in mobile
    assert 'role === "companion" ? "r2p-stage--companion" : ""' in web_stage
    assert "frameTarget={0.48}" in web
    assert ".r2p-stage--companion.r2p-stage--3d" in css
    assert "min-height:470px" in css


def test_life_view_restores_canonical_four_way_mode_rail_without_copying_timeline() -> None:
    mobile_switcher = read("apps/mobile/src/components/life/LivingModeSwitcher.tsx")
    mobile_view = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    navigation = read("apps/mobile/src/navigation.tsx")
    web_switcher = read("apps/web/components/living-mode-switcher.tsx")

    assert "此刻 / 趋势 / 时间线 / 外观" in mobile_switcher
    assert 'testID="pli.lifeview.mode.timeline"' in mobile_switcher
    assert 'navigation.navigate("Tabs", { screen: "Timeline" })' in mobile_view
    assert "NavigatorScreenParams<TabParamList>" in navigation

    assert "此刻 / 趋势 / 时间线 / 外观" in web_switcher
    assert 'href="/timeline"' in web_switcher
    assert 'data-testid="pli.lifeview.mode.timeline"' in web_switcher


def test_assistant_and_me_close_canonical_owner_context_across_clients() -> None:
    web_assistant = read("apps/web/app/agent/page.tsx")
    mini_assistant = read("apps/mini/src/pages/agent/index.tsx")
    web_me = read("apps/web/app/settings/page.tsx")
    mini_me = read("apps/mini/src/pages/mine/index.tsx")

    assert "正在帮助你理解" in web_assistant
    assert "最近记录、变化与证据" in web_assistant
    assert "正在帮助你理解：" in mini_assistant
    assert 'data-testid="pli.mini.assistant.context"' in mini_assistant

    assert 'data-testid="pli.me.about"' in web_me
    assert "<h2>关于</h2>" in web_me
    assert '"我的宠物"' in mini_me
    assert 'data-testid="pli.mini.me.about"' in mini_me
    assert "关于" in mini_me


def test_domain_home_forms_are_secondary_across_owner_clients() -> None:
    """R.2 §46.11 / V4 §47.3: understand first, act second, edit third."""
    social_web = read("apps/web/app/social/page.tsx")
    social_mobile = read("apps/mobile/src/screens/SocialScreen.tsx")
    social_mini = read("apps/mini/src/pages/social/index.tsx")
    behavior_web = read("apps/web/app/behavior/page.tsx")
    training_web = read("apps/web/app/training/page.tsx")

    for source in (social_web, social_mobile, social_mini):
        assert "formOpen" in source
        assert "补充一次互动" in source
    assert 'data-testid="pli.social.action.toggle"' in social_web
    assert 'testID="pli.social.action"' in social_mobile
    assert 'data-testid="pli.mini.social.action"' in social_mini

    for source in (behavior_web, training_web):
        assert "formOpen" in source
        assert "aria-expanded={formOpen}" in source
    assert 'data-testid="pli.behavior.action.submit"' in behavior_web
    assert 'data-testid="pli.training.action.submit"' in training_web


def test_health_preventive_editor_is_secondary_across_owner_clients() -> None:
    """Preventive reminders stay readable by default; creation is explicit."""
    web = read("apps/web/app/health/page.tsx")
    mobile = read("apps/mobile/src/screens/HealthScreen.tsx")
    mini = read("apps/mini/src/pages/health/index.tsx")

    for source in (web, mobile, mini):
        assert "reminderFormOpen" in source
        assert "添加预防提醒" in source
    assert 'data-testid="pli.health.reminder.toggle"' in web
    assert 'data-testid="pli.health.reminder.submit"' in web
    assert 'testID="pli.health.reminder.toggle"' in mobile
    assert 'testID="pli.health.reminder.submit"' in mobile
    assert 'data-testid="pli.mini.health.reminder.toggle"' in mini
    assert 'data-testid="pli.mini.health.reminder.submit"' in mini


def test_welfare_observation_capture_is_secondary_across_owner_clients() -> None:
    web = read("apps/web/app/_components/welfare/EvidenceCard.tsx")
    mobile = read("apps/mobile/src/screens/WelfareScreen.tsx")
    mini = read("apps/mini/src/pages/welfare/index.tsx")

    assert "recordOpen" in web and 'data-testid="pli.welfare.record.toggle"' in web
    assert 'data-testid="pli.welfare.record.submit"' in web
    assert "recordOpen" in mobile and 'testID="pli.welfare.action"' in mobile
    assert 'testID="pli.welfare.action.submit"' in mobile
    assert "recordOpen" in mini and 'data-testid="pli.mini.welfare.action"' in mini
    assert 'data-testid="pli.mini.welfare.action.submit"' in mini


def test_behavior_preferences_and_training_rewards_edit_third_across_clients() -> None:
    behavior = (
        read("apps/web/app/behavior/page.tsx"),
        read("apps/mobile/src/screens/BehaviorScreen.tsx"),
        read("apps/mini/src/pages/behavior/index.tsx"),
    )
    training = (
        read("apps/web/app/training/page.tsx"),
        read("apps/mobile/src/screens/TrainingScreen.tsx"),
        read("apps/mini/src/pages/training/index.tsx"),
    )

    for source in behavior:
        assert "preferenceOpen" in source
    assert 'data-testid="pli.behavior.preference.toggle"' in behavior[0]
    assert 'data-testid="pli.behavior.preference.submit"' in behavior[0]
    assert 'testID="pli.behavior.preference.toggle"' in behavior[1]
    assert 'testID="pli.behavior.preference.submit"' in behavior[1]
    assert 'data-testid="pli.mini.behavior.preference.toggle"' in behavior[2]
    assert 'data-testid="pli.mini.behavior.preference.submit"' in behavior[2]

    for source in training:
        assert "rewardOpen" in source
    assert 'data-testid="pli.training.reward.toggle"' in training[0]
    assert 'data-testid="pli.training.reward.submit"' in training[0]
    assert 'testID="pli.training.reward.toggle"' in training[1]
    assert 'testID="pli.training.reward.submit"' in training[1]
    assert 'data-testid="pli.mini.training.reward.toggle"' in training[2]
    assert 'data-testid="pli.mini.training.reward.submit"' in training[2]


def test_medication_tasks_and_care_mutations_are_secondary() -> None:
    medication_web = read("apps/web/app/medication/page.tsx")
    medication_mobile = read("apps/mobile/src/screens/MedicationScreen.tsx")
    medication_mini = read("apps/mini/src/pages/medication/index.tsx")
    tasks_web = read("apps/web/app/tasks/page.tsx")
    tasks_mini = read("apps/mini/src/pages/tasks/index.tsx")
    care_web = read("apps/web/app/care/page.tsx")
    care_mobile = read("apps/mobile/src/screens/CareScreen.tsx")
    care_mini = read("apps/mini/src/pages/care/index.tsx")

    assert "formOpen" in medication_web
    assert 'data-testid="pli.medication.create.toggle"' in medication_web
    assert 'data-testid="pli.medication.create.submit"' in medication_web
    assert "formOpen" in medication_mobile
    assert "showCreate" in medication_mini
    assert 'data-testid="pli.mini.medication.create.toggle"' in medication_mini
    assert 'data-testid="pli.mini.medication.create.submit"' in medication_mini

    assert "createOpen" in tasks_web
    assert tasks_web.index("当前任务") < tasks_web.index('data-testid="pli.tasks.create.toggle"')
    assert 'data-testid="pli.tasks.create.submit"' in tasks_web
    assert "createOpen" in tasks_mini
    assert tasks_mini.index("当前任务") < tasks_mini.index('data-testid="pli.mini.tasks.create"')
    assert 'data-testid="pli.mini.tasks.create.submit"' in tasks_mini

    for source in (care_web, care_mobile, care_mini):
        assert "inviteOpen" in source
        assert "handoffOpen" in source
    assert 'data-testid="pli.care.invite.toggle"' in care_web
    assert 'data-testid="pli.care.handoff.toggle"' in care_web
    assert 'testID="pli.care.invite.toggle"' in care_mobile
    assert 'testID="pli.care.handoff.toggle"' in care_mobile
    assert 'data-testid="pli.mini.care.invite.toggle"' in care_mini
    assert 'data-testid="pli.mini.care.handoff.toggle"' in care_mini


def test_web_life_view_state_anchors_expose_truthful_fact_details() -> None:
    stage = read("apps/web/components/pet-living-stage.tsx")
    life = read("apps/web/app/pets/[id]/life-view/page.tsx")

    assert "onPress?: () => void;" in stage
    assert "r2p-anchor--button" in stage
    assert "查看${a.label}详情" in stage
    # Life View must consume the canonical API event contract rather than
    # maintaining a lossy local event shape just to expose provenance.
    assert 'api, type LifeEvent' in life
    assert 'events?: LifeEvent[];' in life
    assert 'provenanceLabel(event.source_type)' in life
    assert "compare: comparisonFor(baselineMetric, current)" in life
    assert "/baseline" in life
    assert "row.sample_count < 3" in life
    assert '"meal_count_per_day"' in life
    assert '"sleep_minutes_per_day"' in life
    assert '"暂无（当前没有同口径常态）"' in life
    assert 'data-testid="pli.lifeview.anchor-detail"' in life
    for label in ("事实", "与自己相比", "来源", "更新时间", "证据"):
        assert label in life
    assert '["daily.walk", "daily.play"]' in life


def test_mini_life_view_is_photo_first_and_uses_canonical_four_way_rail() -> None:
    life = read("apps/mini/src/pages/pets/life-view/index.tsx")

    assert 'import { PetHero }' in life
    assert "<PetHero" in life
    assert 'data-testid="pli.mini.lifeview.meta"' in life
    assert 'data-testid="pli.mini.lifeview.anchors"' in life
    assert 'data-testid="pli.mini.lifeview.modebar"' in life
    now = life.index('>此刻</View>')
    trend = life.index('>趋势</View>')
    timeline = life.index('>时间线</View>')
    appearance = life.index('>外观</View>')
    assert now < trend < timeline < appearance
    assert 'Taro.switchTab({ url: "/pages/timeline/index" })' in life
    assert 'data-testid="pli.mini.lifeview.anchor-detail"' in life
    assert "真实照片优先" in life
    assert "小程序不使用静态贴图" in life
    assert "伪装历史 3D" in life
    assert "/visual/status" not in life
    assert "/visual-models" in life
    assert "/baseline" in life
    assert "comparisonFor(baselineMetric, current)" in life
    assert "row.sample_count < 3" in life
    assert '"sleep_minutes_per_day"' in life
    assert 'new Set(["daily.walk", "daily.play"])' in life
    assert "minutes > 24 * 60" in life


def test_mini_today_activity_does_not_absorb_unrelated_event_durations() -> None:
    today = read("apps/mini/src/pages/index/index.tsx")
    assert 'event.event_type === "daily.walk" || event.event_type === "daily.play"' in today
    assert "Number.isFinite(minutes)" in today
    assert "minutes > 24 * 60" in today
    assert "(acc, e) => acc + (Number(" not in today


def test_timeline_pet_identity_precedes_the_stream_across_owner_clients() -> None:
    web = read("apps/web/app/timeline/page.tsx")
    mobile = read("apps/mobile/src/screens/TimelineScreen.tsx")
    mini = read("apps/mini/src/pages/timeline/index.tsx")

    assert web.index('data-testid="pli.timeline.identity"') < web.index('<div className="v4-grid">')
    assert '${pet.name}的时间线' in mobile
    assert '<PetContextHeader pet={current ?? null} title="时间线"' in mini


def test_android_life_view_uses_real_personal_baseline_only_for_matching_metrics() -> None:
    life = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    assert "/baseline" in life
    assert "baselinePetId === pet?.id" in life
    assert "comparisonFor(baselineMetric, current)" in life
    assert "row.sample_count < 3" in life
    assert '"meal_count_per_day"' in life
    assert '"sleep_minutes_per_day"' in life
    assert '"暂无（当前没有同口径常态）"' in life
    assert "sleepMinutes > 0" in life


def test_web_pet_detail_preserves_pet_first_twin_framing() -> None:
    detail = read("apps/web/app/pets/[id]/page.tsx")
    assert "frameTarget={0.56}" in detail
    assert "twinSourceMediaCount" in detail
    assert "sourceMediaCount={twinSourceMediaCount}" in detail
    # The secondary detail route must not regress to the old thumbnail-sized
    # 0.34 framing while the primary Pet world uses a pet-first Living Canvas.
    assert "frameTarget={0.34}" not in detail


def test_health_surfaces_replace_unfinished_vet_placeholder_with_real_records() -> None:
    mobile = read("apps/mobile/src/screens/HealthScreen.tsx")
    web = read("apps/web/app/health/page.tsx")
    mini = read("apps/mini/src/pages/health/index.tsx")

    for source in (mobile, web, mini):
        assert "/health-records" in source
        assert "就医与专业记录" in source
        assert "专业确认" in source
        assert "签名已记录" in source
        assert "当前页面未汇总" not in source
        assert "不会把未知显示成“没有记录”" in source


def test_shared_3d_living_palette_matches_warm_lifestyle_canvas() -> None:
    palette = read("packages/pet-3d/src/palette.ts")
    web_css = read("apps/web/app/globals.css")
    mobile_tokens = read("apps/mobile/src/tokens.ts")
    mobile_stage = read("apps/mobile/src/components/life/PetLivingStage.tsx")

    # The actual WebGL fog/background must belong to the same warm living
    # space as its host. Sage stays an accent, never a full-screen room.
    for token in ("#F4E9D8", "#E7D5BC", "#FFF7E9", "#EFE0C8"):
        assert token in palette
    assert 'stageWarmBase: "#F4E9D8"' in mobile_tokens
    assert "backgroundColor: COLORS.stageWarmBase" in mobile_stage
    assert "R7.2 warm-lifestyle correction" in web_css
    assert "#FBF6EC" in web_css and "#F2E6D5" in web_css and "#E7D4B9" in web_css
    for stale in ("#E3EBDF", "#D2DFD2", "#F7FBF3", "#E3ECDF"):
        assert stale not in palette


def test_web_3d_review_keeps_neutral_theme_and_role_dependencies() -> None:
    viewer = read("apps/web/components/three/pet3d-viewer.tsx")
    assert "STAGE_THEMES.review" in viewer
    assert 'stageRole === "review"' in viewer
    assert "stageRole, realityField" in viewer
    assert "frameTarget, stageRole" in viewer


def test_mini_shell_matches_r7_living_canvas_and_five_tabs() -> None:
    config = read("apps/mini/src/app.config.ts")
    for token in ('"#F6F7F1"', '"#365F49"', '"#FFFEFA"'):
        assert token in config
    for label in ("今天", "时间线", "宠物", "助手", "我的"):
        assert f'text: "{label}"' in config
    assert config.count("pagePath:") >= 5
    assert 'selectedColor: "#4E6349"' not in config
    assert 'backgroundColor: "#F6F1E9"' not in config


def test_assistant_provider_outage_is_complete_degraded_state() -> None:
    mobile = read("apps/mobile/src/screens/AssistantScreen.tsx")
    web = read("apps/web/app/agent/_components/AskPanel.tsx")
    mini = read("apps/mini/src/pages/agent/index.tsx")
    for source in (mobile, web, mini):
        assert "当前无法连接 AI 服务" in source
        assert "暂未开放" not in source


def test_settings_missing_emergency_profile_is_unconfigured_not_404() -> None:
    """Legacy/demo pets must render an editable empty emergency card, never a 404."""
    backend = read("services/api/app/api/routes/pets_consent.py")
    settings_types = read("apps/web/app/settings/_components/types.ts")
    assert 'raise NotFound("Emergency profile not initialized.")' not in backend
    assert '"owner_contact": ""' in backend
    assert '"critical_care_notes": ""' in backend
    assert '"updated_at": None' in backend
    assert "updated_at: string | null;" in settings_types
    page = read("apps/web/app/settings/page.tsx")
    assert "setForm(null);" in page
    assert "f ?? profile.data ??" in page
    assert "useEffect(() => {" in page


def test_mobile_me_touch_targets_meet_44dp_floor() -> None:
    source = read("apps/mobile/src/screens/MeScreen.tsx")
    assert 'smallButton: { minHeight: 44' in source
    assert 'smallButton: { minHeight: 40' not in source


def test_today_keeps_change_separate_from_health_attention_across_owner_clients() -> None:
    mobile = read("apps/mobile/src/screens/TodayScreen.tsx")
    web = read("apps/web/app/page.tsx")
    mini = read("apps/mini/src/pages/index/index.tsx")

    assert "ChangeNarrative" in mobile
    assert mobile.index('testID="pli.today.change"') < mobile.index('testID="pli.today.attention"')
    assert mobile.index('testID="pli.today.attention"') < mobile.index('testID="pli.today.primary-action"')
    assert 'evidenceState={healthState}' in mobile
    assert "总体稳定" not in read("apps/mobile/src/screens/today_sections.tsx")

    assert "ChangeCard" in web
    assert web.index("<NowCard") < web.index("<ChangeCard")
    assert web.index("<ChangeCard") < web.index("<AttentionCard")
    assert web.index("<AttentionCard") < web.index("<ActionCard")
    assert 'health-events' in web
    assert 'headlineTestId="pli.today.now-headline"' in web

    assert "ChangeNarrative" in mini
    assert mini.index("<LifeSignal") < mini.index("<ChangeNarrative")
    assert mini.index("<ChangeNarrative") < mini.index('healthState !== "ready"')
    for metric in ("meal", "drink", "activity", "sleep"):
        assert f'id: "{metric}"' in mini
    assert "abnormal-day-hint" in mini


def test_mini_pet_world_keeps_life_primary_and_crud_progressive() -> None:
    source = read("apps/mini/src/pages/pets/index.tsx")
    assert '进入生命视图' in source
    assert '看时间线' in source
    assert '更多档案与管理' in source
    assert 'showMoreProfile ? (' in source
    assert source.index('headline="它的生活，从这里看见"') < source.index('进入生命视图')
    assert source.index('进入生命视图') < source.index('更多档案与管理')
    assert source.index('更多档案与管理') < source.index('pli.mini.pet.avatar')
    assert 'onPress={() => Taro.navigateTo({ url: "/pages/pets/life-view/index" })}' in source


def test_owner_3d_never_swaps_individual_descriptor_for_bundled_demo_glb() -> None:
    web_viewer = read("apps/web/components/three/pet3d-viewer.tsx")
    mobile_host = read("apps/mobile/src/components/three/Pet3DViewer.tsx")
    mobile_runtime = read("apps/mobile/scripts/pet-stage-entry.ts")
    web_stage = read("apps/web/components/pet-living-stage.tsx")
    mobile_stage = read("apps/mobile/src/components/life/PetLivingStage.tsx")
    manifest = read("packages/pet-3d/src/manifest.ts")
    loader = read("packages/pet-3d/src/loader.ts")

    assert "canPersonalizeTwinGLB(identity, twin)" in web_viewer
    assert "twin && (demoTwin || supportsIndividualGlb)" in web_viewer
    assert 'window.__PLI_DEMO_TWIN = ${demoTwin}' in mobile_host
    assert "canPersonalizeTwinGLB(identity, twinDescriptor)" in mobile_runtime
    assert "productGlbRequested = injectedDemoTwin || supportsIndividualGlb" in mobile_runtime
    assert "loadTwinGLB(identity, injectedDemoTwin ? null : twinDescriptor)" in mobile_runtime
    assert 'visualFidelityTier' in web_viewer
    assert 'visualFidelityTier' in mobile_runtime
    assert 'individualIdentityEvidence' in manifest
    assert 'technicalRepresentationQuality' in manifest
    # Rendering form and identity fidelity are deliberately separate truths.
    # A bundled/skinned demo GLB may be technically complete while remaining
    # TEMPLATE_PROVISIONAL / STYLIZED_REFERENCE.
    assert '"rigged-glb-twin"' in web_viewer
    assert '"rigged-glb-twin"' in mobile_runtime
    assert '"high-fidelity-glb-twin"' not in web_viewer
    assert '"high-fidelity-glb-twin"' not in mobile_runtime
    capture = read("scripts/r5-6/capture-android-final.py")
    validator = read("scripts/r5-6/validate-final-evidence.py")
    for gate in (capture, validator):
        assert '"rigged-glb-twin"' in gate
        assert '"RIGGED_PBR_SKINNED"' in gate
        assert '"STYLIZED_REFERENCE"' in gate
    assert '"high-fidelity-glb-twin"' not in capture
    assert '"high-fidelity-glb-twin"' not in validator
    assert 'const photoFirstByDefault = Boolean(photoUri);' in web_stage
    assert 'const photoFirstByDefault = Boolean(photoUri && variant !== "review");' in mobile_stage
    assert "geo.computeVertexNormals()" in loader
    assert "material.flatShading = false" in loader

    for name in ("doudou", "mimi"):
        asset = read(f"packages/pet-3d/assets/twins/{name}.glb.manifest.json")
        assert '"visualFidelityTier": "STYLIZED_REFERENCE"' in asset
        assert '"individualIdentityEvidence": false' in asset


def test_pet_world_keeps_life_view_primary_and_management_progressive_on_web_android() -> None:
    mobile = read("apps/mobile/src/screens/PetScreen.tsx")
    web = read("apps/web/app/pets/[id]/page.tsx")
    css = read("apps/web/app/globals.css")

    assert mobile.index('testID="pli.pet.entry.lifeview"') < mobile.index('title={`${pet?.name ?? "宠物"}最近`}')
    assert 'testID="pli.pet.management.toggle"' in mobile
    assert 'accessibilityState={{ expanded: showManagement }}' in mobile
    assert mobile.index('testID="pli.pet.management.toggle"') < mobile.index('testID="pli.pet.caregivers"')

    assert '<details className="v5-pet-management" data-testid="pli.pet.management">' in web
    assert web.index('打开生命视图') < web.index('更多档案与管理')
    assert web.index('更多档案与管理') < web.index('基本信息')
    assert '.v5-pet-management > summary' in css


def test_timeline_keeps_retrieval_tools_progressive_across_owner_clients() -> None:
    mobile = read("apps/mobile/src/screens/TimelineScreen.tsx")
    web = read("apps/web/app/timeline/page.tsx")
    mini = read("apps/mini/src/pages/timeline/index.tsx")

    assert 'testID="pli.timeline.filters.toggle"' in mobile
    assert 'accessibilityState={{ expanded: showFilters }}' in mobile
    assert 'showFilters ? (' in mobile
    filter_bar = read("apps/web/app/_components/timeline/FilterBar.tsx")
    # Web keeps search/domain visible and only the secondary controls behind
    # one disclosure. A second outer <details> would hide the entire R7 filter
    # experience and the real Life Stream behind a closed legacy wrapper.
    assert '<details className="v5-timeline-tools" data-testid="pli.timeline.filters">' not in web
    assert '<FilterBar' in web
    assert 'className="v7-timeline-search' in filter_bar
    assert 'className="v7-timeline-refine"' in filter_bar
    assert '日期、来源和更多筛选' in filter_bar
    assert 'data-testid="pli.mini.timeline.filters-toggle"' in mini
    assert 'showFilters ? (' in mini
    assert '筛选这段生活' in mini


def test_cross_client_living_twin_keeps_pose_grounding_and_motion_safety() -> None:
    web_stage = read("apps/web/components/pet-living-stage.tsx")
    web_today = read("apps/web/app/page.tsx")
    web_life = read("apps/web/app/pets/[id]/life-view/page.tsx")
    web_viewer = read("apps/web/components/three/pet3d-viewer.tsx")
    android_entry = read("apps/mobile/scripts/pet-stage-entry.ts")

    # Web and Android must both present the Twin as part of the living space,
    # not a floating viewer object.
    assert 'floor.name = "pliAmbientFloor"' in web_viewer
    assert 'projectionGlow.name = "pliAmbientGlow"' in web_viewer
    assert 'floor.name = "pliAmbientFloor"' in android_entry
    assert 'glow.name = "pliAmbientGlow"' in android_entry

    # Recent life evidence drives the same representative pose chain on Web
    # that Android already uses; the component must actually pass it to WebGL.
    assert "pose?: PoseName | null" in web_stage
    assert web_stage.count("pose={pose}") == 2
    assert "poseForEvent" in web_today
    assert "representativePose" in web_today
    assert "pose={twinDescriptor ? representativePose : null}" in web_today
    assert "poseForEvent" in web_life
    assert "pose={displayDescriptor ? representativePose : null}" in web_life

    # Auto-fit establishes safe zoom bounds. Pinch zoom must use them, and
    # ambient motion must respect the OS reduced-motion preference.
    assert "orbitZoom(orbit, factor, zoomBounds)" in android_entry
    assert "reduceMotionQuery" in android_entry
    assert '"Stand" : (activePose ?? "Idle")' in android_entry


def test_behavior_domains_read_observations_before_patterns_across_clients() -> None:
    mobile = read("apps/mobile/src/screens/BehaviorScreen.tsx")
    web = read("apps/web/app/behavior/page.tsx")

    assert mobile.index('title="最近观察"') < mobile.index('title="模式与情境"')
    assert mobile.index('title="模式与情境"') < mobile.index('title="当前情境"')
    assert web.index('data-testid="pli.behavior.recent"') < web.index('data-testid="pli.behavior.patterns"')
    assert web.index('data-testid="pli.behavior.patterns"') < web.index('data-testid="pli.behavior.context"')
    assert web.index('data-testid="pli.behavior.context"') < web.index('className="v4-sec v5-domain-create"')


def test_quicklog_primary_and_secondary_information_architecture_matches_master() -> None:
    web_types = read("apps/web/app/_components/today/constants.ts")
    web_sheet = read("packages/ui-kit/src/components/quick-log-sheet.tsx")
    mobile = read("apps/mobile/src/screens/quicklog_sections.tsx")
    mini = read("apps/mini/src/pages/index/_lib.ts")

    # Canonical primary row is deliberately only the four highest-frequency
    # life events; everything else stays secondary or routes to a governed
    # domain surface.
    for event_type in ("daily.meal", "daily.drink", "daily.elimination", "daily.walk"):
        assert event_type in web_types
        assert event_type in mini
    assert 'const TILE_KEY: Record<string, string>' in web_sheet
    assert 'export const PRIMARY_TILES: QuickLogTile[] = ["meal", "drink", "elimination", "walk"]' in mobile
    assert 'export const QUICK_LEVEL1 = ["daily.meal", "daily.drink", "daily.elimination", "daily.walk"]' in mini

    # Secondary canonical actions include health on all three clients. Health,
    # medication and behavior are navigation actions rather than fabricated
    # generic event writes.
    assert '{ type: "health", label: "健康", href: "/health" }' in web_types
    assert '"health"' in mobile and '"medication"' in mobile and '"behavior"' in mobile
    assert '{ label: "健康", url: "/pages/health/index" }' in mini
    assert '{ label: "用药", url: "/pages/medication/index" }' in mini
    assert '{ label: "行为", url: "/pages/behavior/index" }' in mini


def test_health_and_welfare_keep_read_before_write_owner_order() -> None:
    health = read("apps/web/app/health/page.tsx")
    welfare = read("apps/web/app/welfare/page.tsx")

    assert health.index('data-testid="pli.health.overview"') < health.index('data-testid="pli.health.changes"')
    assert health.index('data-testid="pli.health.changes"') < health.index('data-testid="pli.health.records"')
    assert health.index('data-testid="pli.health.records"') < health.index('data-testid="pli.health.medication"')
    assert health.index('data-testid="pli.health.medication"') < health.index('data-testid="pli.health.compose"')

    # Pet-specific observed evidence and trend precede generic enrichment ideas.
    assert welfare.index('data-testid="pli.welfare.observable"') < welfare.index("<WelfareTrendCard")
    assert welfare.index("<WelfareTrendCard") < welfare.index('data-testid="pli.welfare.enrichment"')
    assert "最近喜欢的活动" not in welfare
    assert "不能从事件频次自动推断" in welfare


def test_web_pet_world_domain_rows_are_current_pet_meanings_not_static_menu_copy() -> None:
    web = read("apps/web/app/pets/[id]/page.tsx")
    mobile = read("apps/mobile/src/screens/PetScreen.tsx")
    mini = read("apps/mini/src/pages/pets/index.tsx")

    for endpoint in ("health-events", "behavior-events", "training-goals", "welfare-evidence"):
        assert endpoint in web
    assert "{domainRows.map((row) => (" in web
    assert "healthMeaning.data.length" in web
    assert "behaviorMeaning.data?.[0]" in web
    assert "activeTrainingGoal.title" in web
    assert "Array.isArray(trainingMeaning.data)" in web
    assert "welfareObservationCount" in web
    assert "关系记录暂时没有加载成功" in web

    # Android and mini already use per-pet facts; keep all three clients on
    # the same meaning-row model rather than a feature-grid menu.
    assert "const healthMeaning" in mobile
    assert "const behaviorMeaning" in mobile
    assert "const trainingMeaning" in mobile
    assert "const welfareMeaning" in mobile
    assert "const domains:" in mini
    assert "healthCount7d" in mini
    assert "lastBehavior" in mini and "lastGoal" in mini and "lastWelfare" in mini


def test_final_web_runtime_evidence_reseeds_after_visual_chain() -> None:
    """Final visual evidence must not inherit model mutations from visual specs."""
    workflow = read(".github/workflows/ci.yml")
    reset = "Reset demo data (final runtime evidence isolation)"
    capture = "R5.6 Web final runtime evidence"
    assert reset in workflow
    assert workflow.index(reset) < workflow.index(capture)
    between = workflow[workflow.index(reset):workflow.index(capture)]
    assert "python -m app.seed" in between


def test_web_product_glb_ready_means_product_asset_is_really_mounted() -> None:
    viewer = read("apps/web/components/three/pet3d-viewer.tsx")
    assert 'setStatus("boot");' in viewer
    assert "canPersonalizeTwinGLB(identity, twin)" in viewer
    assert "const requiresProductGlb = Boolean(" in viewer
    assert "twin && (demoTwin || supportsIndividualGlb)" in viewer
    assert 'if (!requiresProductGlb) {' in viewer
    load = viewer.index("loadTwinGLB(identity, demoTwin ? null : twin)")
    ready = viewer.index('setStatus("ready");', load)
    mounted = viewer.index("hdTwin = twin3d;", load)
    assert mounted < ready
    failed = viewer.index('setStatus("failed");', load)
    assert failed > load


def test_today_living_canvas_reserves_phone_first_fold_for_action_without_small_pet_regression() -> None:
    stage = read("apps/mobile/src/components/life/PetLivingStage.tsx")
    today = read("apps/mobile/src/screens/TodayScreen.tsx")
    change = read("apps/mobile/src/components/life/ChangeNarrative.tsx")
    action = read("apps/mobile/src/components/actions/QuickAction.tsx")
    web_stage = read("apps/web/components/pet-living-stage.tsx")
    css = read("apps/web/app/globals.css")

    assert "today: 440" in stage
    assert "PET_WIDTHS" in stage and "today: 326" in stage
    assert "<ChangeNarrative" in today and "compact" in today
    assert 'label="快速记录"' in today and 'compact />' in today
    assert "blockCompact" in change
    assert "primaryCompact" in action
    assert 'variant === "today" ? "r2p-stage--today"' in web_stage
    assert "R7.8 Today first-fold closure" in css
    assert '[data-testid="pli.today.now"]' in css
    assert ".r2p-stage--today.r2p-stage--3d" in css


def test_owner_editors_stay_secondary_to_life_reading_across_clients() -> None:
    """R.2 §46.11: understand first, act second, edit third."""
    mobile_timeline = read("apps/mobile/src/screens/TimelineScreen.tsx")
    web_timeline = read("apps/web/app/timeline/page.tsx")
    mini_timeline = read("apps/mini/src/pages/timeline/index.tsx")
    web_training = read("apps/web/app/training/page.tsx")

    assert 'testID="pli.timeline.milestones.compose"' in mobile_timeline
    assert 'testID="pli.timeline.diary.compose"' in mobile_timeline
    assert "showMilestoneComposer ? (" in mobile_timeline
    assert "showDiaryComposer ? (" in mobile_timeline

    assert web_timeline.count('className="v7-timeline-compose"') >= 2
    assert "<summary>记录一个里程碑</summary>" in web_timeline
    assert "<summary>写一段日记</summary>" in web_timeline

    assert 'data-testid="pli.mini.timeline.milestones.compose"' in mini_timeline
    assert 'data-testid="pli.mini.timeline.diary.compose"' in mini_timeline
    assert "showMilestoneComposer ? (" in mini_timeline
    assert "showDiaryComposer ? (" in mini_timeline

    # Web now matches Android/Mini: new-goal creation comes after current
    # progress, recent sessions, rewards/safe tools and the suggested next step.
    create_at = web_training.index('data-testid="pli.training.action"')
    assert web_training.index('data-testid="pli.training.recent"') < create_at
    assert web_training.index('data-testid="pli.training.reward"') < create_at
    assert web_training.index('data-testid="pli.training.next"') < create_at


def test_today_uses_a_compact_phone_living_canvas_without_shrinking_inspection_views() -> None:
    stage = read("apps/mobile/src/components/life/PetLivingStage.tsx")
    css = read("apps/web/app/globals.css")

    assert "today: 440" in stage
    assert "pet: 580" in stage
    assert "life: 520" in stage
    assert "petSlotToday" in stage
    assert "R7.9 Today first-fold truth" in css
    assert '[data-testid="pli.today.living-stage"].r2p-stage' in css
    assert "min-height:410px" in css


def test_owner_life_view_copy_hides_model_versions_and_provider_language() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/index.tsx")

    for source in (mobile, web):
        assert "个体形象 · 已确认" in source
        assert "示例形象 · 仅用于体验" in source
        assert "3D v${" not in source
        assert "示例 3D · v${" not in source

    assert "已启用个体 3D 形象" in mini
    assert "已启用${twinVersion" not in mini

    # Version/provenance remains in data plumbing; only owner-facing copy
    # is simplified. Dedicated TwinVersion management is the audit surface.
    assert "displayVersion" in web


def test_frequent_walk_quicklog_is_two_step_without_invented_duration() -> None:
    mobile = read("apps/mobile/src/screens/QuickLogScreen.tsx")
    mobile_ui = read("apps/mobile/src/screens/quicklog_sections.tsx")
    web = read("apps/web/app/_components/today/constants.ts")
    mini = read("apps/mini/src/pages/index/_lib.ts")

    assert 't.event_type === "daily.walk"' in mobile
    assert 'payload = duration > 0 ? { duration_minutes: duration } : {};' in mobile
    assert '时长（分钟，可选）' in mobile_ui
    assert 'label: "时长（分钟，可选)"' not in web  # guard malformed copy
    assert 'label: "时长（分钟，可选）"' in web
    assert 'label: "时长（分钟，可选）"' in mini
    assert 'type: "daily.walk"' in web and 'type: "daily.walk"' in mini


def test_mini_life_view_hides_model_versions_from_owner_copy() -> None:
    source = read("apps/mini/src/pages/pets/life-view/index.tsx")
    assert "3D v${" not in source
    assert "第 ${activeTwin.version" not in source
    assert "个体形象 · 已确认" in source
    assert "示例形象 · 仅用于体验" in source


def test_android_evidence_fails_session_errors_before_3d_manifest_checks() -> None:
    runner = read("scripts/r5-6/capture-android-final.py")
    assert "demo owner session failed before Today/3D mounted" in runner
    assert 'if "pli.today.living-stage" not in primary_select_xml' in runner
    assert runner.index("demo owner session failed before Today/3D mounted") < runner.index("primary_manifest = android.read_runtime_manifest")


def test_android_evidence_debug_apk_disables_metro_devsupport() -> None:
    patcher = read("scripts/r5-6/enable-debug-bundle.py")
    workflow = read(".github/workflows/android.yml")
    assert "debuggableVariants = []" in patcher
    assert "getUseDeveloperSupport(): Boolean = false" in patcher
    assert "public boolean getUseDeveloperSupport() { return false; }" in patcher
    assert "assets/index.android.bundle" in workflow


def test_android_evidence_api_reverse_is_real_and_post_install() -> None:
    """The Android evidence app must be able to reach the host API itself."""
    runner = read("scripts/r5-6/run-android-emulator-evidence.sh")

    # A previous regression wrote literal "\\n" text into a comment, which
    # commented out the tcp:8800 reverse command while host-side API probes
    # still passed. Lock the actual shell command and ordering.
    assert r"hosted-emulator\n" not in runner
    assert r"deterministic.\n" not in runner
    reverse = '"$ADB" -s "$SERIAL" reverse tcp:8800 tcp:8800'
    install_gate = 'if [[ "$installed" -ne 1 ]]; then'
    assert reverse in runner
    assert runner.index(reverse) > runner.index(install_gate)
    assert 'grep -q "tcp:8800 tcp:8800" /tmp/pli-adb-reverse.txt' in runner


def test_timeline_secondary_tools_stay_in_open_journal_flow() -> None:
    """Milestones, memories and diary extend the life story instead of a card wall."""
    mobile = read("apps/mobile/src/screens/TimelineScreen.tsx")
    mini = read("apps/mini/src/pages/timeline/index.tsx")
    mini_css = read("apps/mini/src/app.scss")
    web = read("apps/web/app/timeline/page.tsx")
    web_css = read("apps/web/app/globals.css")

    for style in ("memorySection", "diarySection", "summarySection"):
        block = mobile.split(f"{style}: {{", 1)[1].split("},", 1)[0]
        assert "backgroundColor" not in block
        assert "borderRadius" not in block
        assert "borderTop" in block

    assert 'className="soft-panel"' not in mini
    assert mini.count('className="timeline-journal-list"') == 4
    assert ".timeline-journal-list {" in mini_css
    assert "background: transparent" in mini_css

    assert 'className="v7-timeline-journal-item" key={row.years_ago}' in web
    assert "v7-timeline-journal-summary" in web
    assert ".v7-timeline-journal-item{" in web_css
    assert "background:transparent" in web_css


def test_living_canvas_runtime_manifest_reports_real_shadow_depth() -> None:
    manifest = read("packages/pet-3d/src/manifest.ts")
    web = read("apps/web/components/three/pet3d-viewer.tsx")
    mobile = read("apps/mobile/scripts/pet-stage-entry.ts")

    assert "realTimeShadows?: boolean;" in manifest
    assert "shadowTechnique?: string | null;" in manifest
    assert "realTimeShadows: input.realTimeShadows ?? false" in manifest
    for source in (web, mobile):
        assert "renderer.shadowMap.enabled = true" in source
        assert "THREE.PCFSoftShadowMap" in source
        assert 'shadowTechnique: renderer.shadowMap.enabled ? "PCFSoftShadowMap+ShadowMaterial" : null' in source


def test_android_domains_read_before_write() -> None:
    """Canonical domain hierarchy: understand first, act second, edit third."""
    health = read("apps/mobile/src/screens/HealthScreen.tsx")
    behavior = read("apps/mobile/src/screens/BehaviorScreen.tsx")
    training = read("apps/mobile/src/screens/TrainingScreen.tsx")
    welfare = read("apps/mobile/src/screens/WelfareScreen.tsx")
    social = read("apps/mobile/src/screens/SocialScreen.tsx")

    assert health.index('testID="pli.health.overview"') < health.index('testID="pli.health.records"') < health.index('testID="pli.health.action"')
    assert behavior.index('testID="pli.behavior.observations"') < behavior.index('testID="pli.behavior.patterns"') < behavior.index('testID="pli.behavior.action"')
    assert training.index('testID="pli.training.goal"') < training.index('testID="pli.training.recent"') < training.index('testID="pli.training.action"')
    assert welfare.index('testID="pli.welfare.observable"') < welfare.index('testID="pli.welfare.enrichment"') < welfare.index('testID="pli.welfare.action"')
    assert social.index('testID="pli.social.friends"') < social.index('testID="pli.social.interactions"') < social.index('testID="pli.social.action"')


def test_mobile_assistant_owner_copy_has_no_internal_ai_terms() -> None:
    source = read("apps/mobile/src/screens/assistant_panels.tsx")
    for forbidden in (
        "NOT_AVAILABLE",
        "Personal Baseline",
        "AI provider",
        "Red Flag Rule Engine",
        "Inference & Uncertainty",
        "Next step",
    ):
        assert forbidden not in source
    for owner_copy in ("与它自己相比", "推断与不确定", "AI 深度分析", "安全规则：独立运行"):
        assert owner_copy in source


def test_pet_world_uses_life_event_pose_and_web_lifeview_routing() -> None:
    """Pet World must feel alive and its life domain must open the canonical Life View."""
    mobile = read("apps/mobile/src/screens/PetScreen.tsx")
    web = read("apps/web/app/pets/[id]/page.tsx")

    assert 'import { poseForEvent } from "@pli/pet-3d";' in mobile
    assert 'poseForEvent(lastActivity?.event_type ?? null) ?? "Idle"' in mobile
    assert 'pose={twin ? representativePose : null}' in mobile

    assert 'import { poseForEvent } from "@pli/pet-3d";' in web
    assert 'poseForEvent(latestLifeEvent?.event_type ?? null) ?? "Idle"' in web
    assert 'pose={twinDescriptor ? representativePose : null}' in web
    assert 'href: `/pets/${id}/life-view`' in web

    # The Pet World stage uses the same four human-facing life anchors as Today
    # instead of whichever event-count keys happen to arrive first from the API.
    for label in ("进食", "饮水", "活动", "睡眠"):
        assert f'label: "{label}"' in web
    assert 'event.event_type === "daily.walk" || event.event_type === "daily.play"' in web


def test_assistant_answers_continue_into_records_sources_and_self_comparison() -> None:
    """Master §46.12: an answer must remain connected to evidence and the pet."""
    web = read("apps/web/app/agent/_components/AnswerPanel.tsx")
    mobile = read("apps/mobile/src/screens/AssistantScreen.tsx")
    mini = read("apps/mini/src/pages/agent/_components/ask_panel.tsx")

    for source in (web, mobile, mini):
        for label in ("查看记录", "查看来源", "与它自己相比"):
            assert label in source

    assert 'href={`${basePath()}/timeline`}' in web
    assert 'href={`${basePath()}/pets/${petId}/life-view`}' in web
    assert 'onOpenTimeline={() => tabNav.navigate("Timeline")}' in mobile
    assert 'onOpenLifeView={() => stackNav.navigate("LifeView")}' in mobile
    assert 'Taro.switchTab({ url: "/pages/timeline/index" })' in mini
    assert 'Taro.navigateTo({ url: "/pages/pets/life-view/index" })' in mini


def test_android_evidence_navigation_binds_twin_review_to_current_pet() -> None:
    runner = read("scripts/r5-6/capture-android-final.py")
    # A review deep link must carry the expected pet identity in the SAME
    # navigation event; otherwise late Today retries can leave the evidence
    # harness on the previous surface after a pet switch.
    assert 'screen=twinreview&pet={expected_pet_id}' in runner
    assert 'screen=twinreview&pet={secondary_id}' in runner
    assert "required_secondary_controls" in runner
    assert "missing_secondary" in runner


def test_life_view_exposes_real_secondary_state_across_owner_clients() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/life-view/index.tsx")

    for source in (mobile, web, mini):
        assert "/tasks" in source
        assert "/devices" in source
        assert "weight_note" in source
        for label in ("体重", "任务", "设备"):
            assert label in source

    for test_id in (
        "pli.lifeview.support.weight",
        "pli.lifeview.support.tasks",
        "pli.lifeview.support.devices",
    ):
        assert test_id in mobile
        assert test_id in web

    for test_id in (
        "pli.mini.lifeview.support.weight",
        "pli.mini.lifeview.support.tasks",
        "pli.mini.lifeview.support.devices",
    ):
        assert test_id in mini

    # Unknown / unavailable device data must remain explicit, never inferred online.
    for source in (mobile, web, mini):
        assert "暂不可用" in source
        assert "状态待确认" in source


def test_life_view_keeps_core_mode_rail_ahead_of_secondary_support_facts() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/life-view/index.tsx")

    assert mobile.index('testID="pli.lifeview.control.modes"') < mobile.index('testID="pli.lifeview.support-facts"')
    assert web.index("<LivingModeSwitcher") < web.index('className="v7-life-support"')
    assert mini.index('className="life-view-modes"') < mini.index('className="life-view-support"')


def test_life_view_never_reinterprets_failed_support_requests_as_zero() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/life-view/index.tsx")

    assert 'taskSupportState === "error"' in mobile
    assert 'deviceSupportState === "error"' in mobile
    assert 'tasks.state !== "ready"' in web
    assert 'devices.state !== "ready"' in web
    assert 'taskSupportState === "error"' in mini
    assert 'deviceSupportState === "error"' in mini
    for source in (mobile, web, mini):
        assert '"暂不可用"' in source
        assert '"暂无待办"' in source
        assert '"未连接"' in source


def test_life_view_health_support_is_real_and_never_claims_unknown_normal() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/life-view/index.tsx")

    for source in (mobile, web, mini):
        assert "/health-events" in source
        assert '"需立即关注"' in source
        assert '"有健康记录"' in source
        assert '"暂无记录"' in source
        assert '"暂不可用"' in source
        assert '"健康正常"' not in source

    assert 'pli.lifeview.support.health' in mobile
    assert 'pli.lifeview.support.health' in web
    assert 'pli.mini.lifeview.support.health' in mini


def test_web_day_back_uses_historical_model_active_interval_not_current_model() -> None:
    source = read("apps/web/app/_components/timeline/DayBackCard.tsx")
    assert "activated <= dayEnd" in source
    assert "retired >= dayStart" in source
    assert "当天有效的 3D 形象" in source
    assert "当天没有可确认的 3D 版本" in source
    assert "不会用现在的 3D 形象补画过去" in source
    assert 'm.activated_at.slice(0, 10) === day' not in source


def test_life_view_time_scrubber_is_truthful_across_owner_clients() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/life-view/index.tsx")
    web_stage = read("apps/web/components/pet-living-stage.tsx")
    mini_visual = read("apps/mini/src/components/pet_visual.tsx")

    for source in (mobile, web, mini):
        for label in ("现在", "今天", "7天", "30天", "某一天"):
            assert label in source
        assert "/today?date=" in source
        assert "/events?limit=200" in source
        assert "activated <= dayEnd" in source
        assert "retired >= dayStart" in source
        assert "历史常态未版本化，不用当前常态解释过去" in source
        assert "不会" in source

    assert 'testID="pli.lifeview.time-scrubber"' in mobile
    assert 'data-testid="pli.lifeview.time-scrubber"' in web
    assert 'data-testid="pli.mini.lifeview.time-scrubber"' in mini

    # Historical scopes must never backfill current owner media or current state.
    assert "avatar_artifact_id: null" in mobile
    assert "allowOwnerPhoto={currentFactScope}" in web
    assert "allowOwnerPhoto={currentFactScope}" in mini
    assert "allowOwnerPhoto" in web_stage
    assert "allowOwnerPhoto" in mini_visual
    assert 'testID="pli.lifeview.history-truth"' in mobile
    assert 'data-testid="pli.lifeview.history-truth"' in web
    assert 'data-testid="pli.mini.lifeview.history-truth"' in mini

    # Multi-day scopes intentionally refuse to use today's 3D as a historical proxy.
    assert 'timeScope === "7d" || timeScope === "30d"' in mobile
    assert 'timeScope === "7d" || timeScope === "30d"' in web
    assert 'timeScope === "7d" || timeScope === "30d"' in mini
    assert "时间范围汇总不使用当前 3D" in mobile
    assert "时间范围汇总不使用当前 3D" in web
    assert "时间范围汇总 · 不使用当前 3D" in mini


def test_twin_review_refits_each_real_camera_angle_without_cross_view_shrink() -> None:
    """Front/back silhouettes must not inherit the widest side-view radius."""
    web = read("apps/web/components/three/pet3d-viewer.tsx")
    android = read("apps/mobile/scripts/pet-stage-entry.ts")

    assert "reviewFitRef" in web
    assert "{ fitYaws: [yaw], canvasRect: wrap.getBoundingClientRect() }" in web
    assert "if (fitReview) fitReview(yaw);" in web
    assert 'injectedStageRole === "review" ? [reviewPresetYaw ?? orbit.yaw]' in android
    review_set = android[android.index("window.__PLI_SET_VIEW ="):android.index("const controls =")]
    assert "applyFit();" in review_set
    assert "post({ type: \"manifest\", manifest: buildManifest(), force: true });" in review_set


def test_android_runtime_evidence_rejects_tiny_review_pet_presence() -> None:
    runner = read("scripts/r5-6/capture-android-final.py")
    assert 'area_ratio < 0.20 and height_ratio < 0.68' in runner
    assert 'Twin Review pet too small at {view}' in runner


def test_android_runtime_evidence_requires_first_viewport_life_mode_rail() -> None:
    runner = read("scripts/r5-6/capture-android-final.py")
    assert 'screen == "lifeview"' in runner
    assert 'pli.lifeview.modebar' in runner
    assert 'visible_height < 44' in runner


def test_timeline_days_open_truthful_historical_life_view_across_clients() -> None:
    android_stream = read("apps/mobile/src/components/timeline/LifeStream.tsx")
    android_group = read("apps/mobile/src/components/timeline/lifeStreamUtils.ts")
    android_timeline = read("apps/mobile/src/screens/TimelineScreen.tsx")
    android_nav = read("apps/mobile/src/navigation.tsx")
    android_life = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web_stream = read("apps/web/app/_components/timeline/EventList.tsx")
    web_timeline = read("apps/web/app/timeline/page.tsx")
    web_life = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini_stream = read("apps/mini/src/components/timeline/LifeStream.tsx")
    mini_timeline = read("apps/mini/src/pages/timeline/index.tsx")
    mini_life = read("apps/mini/src/pages/pets/life-view/index.tsx")

    # Android keeps the existing local-day grouping id for presentation, but
    # carries an explicit ISO day into the historical navigation contract.
    assert "date?: string;" in android_stream
    assert "occurred_at?.slice(0, 10)" in android_group
    assert 'onOpenDay={(date) => navigation.navigate("LifeView", { date })}' in android_timeline
    assert 'LifeView: { date?: string; anchor?: "water" | "meal" | "activity" | "sleep" } | undefined;' in android_nav
    assert 'useRoute<RouteProp<StackParamList, "LifeView">>()' in android_life
    assert 'requestedDate ? "date" : "now"' in android_life

    # Web and Mini day headers directly enter the matching historical date.
    assert '/life-view?date=${encodeURIComponent(day)}' in web_stream
    assert "petId={current?.id}" in web_timeline
    assert "searchParams: Promise<{ date?: string | string[] }>" in web_life
    assert 'requestedDate ? "date" : "now"' in web_life
    assert "onOpenDay" in mini_stream
    assert '/pages/pets/life-view/index?date=${encodeURIComponent(date)}' in mini_timeline
    assert "Taro.getCurrentInstance().router?.params?.date" in mini_life
    assert 'requestedDate ? "date" : "now"' in mini_life

    # Historical truth is a data boundary, not just a date label.
    for source in (android_life, web_life, mini_life):
        assert "currentFactScope" in source
        assert "historicalTwin" in source
    assert "avatar_artifact_id: null" in android_life
    assert "allowOwnerPhoto={currentFactScope}" in web_life
    assert "allowOwnerPhoto={currentFactScope}" in mini_life


def test_today_change_explains_facts_without_ai_or_medical_inference() -> None:
    mobile = read("apps/mobile/src/components/life/ChangeNarrative.tsx")
    web = read("apps/web/app/_components/today/ChangeCard.tsx")
    mini = read("apps/mini/src/components/life/ChangeNarrative.tsx")
    mobile_today = read("apps/mobile/src/screens/TodayScreen.tsx")

    for source in (mobile, web, mini):
        for label in ("事实", "与它自己相比", "不确定性", "下一步"):
            assert label in source
        assert "不能据此判断疾病、疼痛或情绪" in source
        assert "继续记录饮水、进食、活动和睡眠" in source

    # Android used to route Why to Timeline; the explanation now stays beside
    # the fact so the owner does not lose context.
    assert 'onWhy={() => tabNav.navigate("Timeline")}' not in mobile_today
    assert 'testID="pli.today.change.explain"' in mobile
    assert 'data-testid="pli.today.change.explain"' in web
    assert 'data-testid="pli.mini.today.change.explain"' in mini
    assert "minHeight: 44" in mobile
    assert "min-height:44px" in read("apps/web/app/globals.css")
    assert "min-height:44px" in read("apps/mini/src/app.scss")
    # The product explanation must consume the backend's structured same-clock
    # facts. Repeating a summary under "事实" is not sufficient.
    web_today = read("apps/web/app/page.tsx")
    mini_today = read("apps/mini/src/pages/index/index.tsx")
    for source in (mobile_today, web_today, mini_today):
        assert "explanations" in source
        assert "INSUFFICIENT" in source
        assert ".fact" in source
        assert ".comparison" in source
        assert ".uncertainty" in source
        assert ".next_step" in source
        assert "暂时不能判断变化" in source
    backend = read("services/api/app/api/routes/v10_extras_services.py")
    assert '"mode": "duration"' in backend
    assert "duration_minutes" in backend
    assert "same_time_baseline" in backend
    assert "clock_seconds" in backend
    assert "RECORDED_LIFE_EVENTS" in backend


def test_historical_life_view_exposes_that_days_original_media_across_clients() -> None:
    mobile = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    web = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini = read("apps/mini/src/pages/pets/life-view/index.tsx")

    assert 'testID="pli.lifeview.history-events"' in mobile
    assert 'onOpenMedia={(artifactIds) => navigation.navigate("MediaMemory", { artifactIds })}' in mobile
    assert 'data-testid="pli.lifeview.history-events"' in web
    assert "<EventList events={events} petName={name} />" in web
    assert "mediaCount: e.artifact_ids?.length ?? 0" in mini
    assert "artifactIds: e.artifact_ids ?? []" in mini
    assert "openHistoricalMedia" in mini
    assert "getPlatform().media.openArtifact" in mini

    for source in (mobile, web, mini):
        assert "那一天" in source or "历史" in source


def test_today_sleep_anchor_is_observed_duration_across_owner_clients() -> None:
    """Living state says how long the pet slept, never how many log rows exist."""
    android = read("apps/mobile/src/screens/TodayScreen.tsx")
    android_helper = read("apps/mobile/src/screens/today_helpers.ts")
    web = read("apps/web/app/page.tsx")
    web_helper = read("apps/web/app/_components/today/activity.ts")
    mini = read("apps/mini/src/pages/index/index.tsx")

    assert 'observedDurationMinutes(todayEvents, "daily.sleep")' in android
    assert 'formatObservedDuration(sleepMins)' in android
    assert 'counts["daily.sleep"] ? `${counts["daily.sleep"]} 次`' not in android
    assert "export function observedDurationMinutes" in android_helper
    assert "export function formatObservedDuration" in android_helper

    assert 'observedDurationMinutes(today.data?.events ?? [], "daily.sleep")' in web
    assert 'formatObservedDuration(sleepMinutes)' in web
    assert 'anchorValue(counts["daily.sleep"] ?? 0, "次")' not in web
    assert "export function observedDurationMinutes" in web_helper
    assert "export function formatObservedDuration" in web_helper

    assert 'event.event_type === "daily.sleep"' in mini
    assert "formatDuration(sleepMinutes)" in mini
    assert 'value: `${counts["daily.sleep"] ?? 0} 次`' not in mini
    for source in (android_helper, web_helper, mini):
        assert "minutes > 24 * 60" in source


def test_today_life_anchors_open_canonical_fact_details_across_clients() -> None:
    """Ambient Today facts must be evidence entry points, not decorative KPIs."""
    mobile_today = read("apps/mobile/src/screens/TodayScreen.tsx")
    mobile_life = read("apps/mobile/src/screens/LifeViewScreen.tsx")
    mobile_nav = read("apps/mobile/src/navigation.tsx")
    web_today = read("apps/web/app/page.tsx")
    web_life = read("apps/web/app/pets/[id]/life-view/page.tsx")
    mini_today = read("apps/mini/src/pages/index/index.tsx")
    mini_signal = read("apps/mini/src/components/life/LifeSignal.tsx")
    mini_life = read("apps/mini/src/pages/pets/life-view/index.tsx")

    assert 'anchor?: "water" | "meal" | "activity" | "sleep"' in mobile_nav
    assert 'stackNav.navigate("LifeView", { anchor: detail })' in mobile_today
    for detail in ("meal", "water", "activity", "sleep"):
        assert f'detail: "{detail}" as const' in mobile_today
    assert "const requestedAnchor = route.params?.anchor ?? null;" in mobile_life
    assert "target.onPress();" in mobile_life

    for detail in ("meal", "water", "activity", "sleep"):
        assert f"life-view?anchor={detail}" in web_today
    assert "anchor?: string | string[]" in web_life
    assert '["water", "meal", "activity", "sleep"].includes(rawRequestedAnchor)' in web_life
    assert "requestedDate ? null : requestedAnchor" in web_life

    assert "onPress?: () => void;" in mini_signal
    for detail in ("meal", "water", "activity", "sleep"):
        assert f"life-view/index?anchor={detail}" in mini_today
    assert 'counts["daily.meal"] ?' in mini_today
    assert 'counts["daily.drink"] ?' in mini_today
    assert ' : "—"' in mini_today
    assert "const routeAnchorRaw = routeParams?.anchor;" in mini_life
    assert "initialAnchorRef" in mini_life


def test_mini_living_canvas_uses_warm_room_not_green_flood() -> None:
    css = read("apps/mini/src/app.scss")
    block = css[css.index("/* R7 Owner living canvas"):css.index("// R7.2 Mini Life View")]
    assert "#FBF6EC" in block
    assert "#F2E6D5" in block
    assert "#E6D2B7" in block
    assert "#EFF3E8" not in block
    assert "#DBE8D7" not in block
    assert "no fictitious Mini 3D runtime" in block
