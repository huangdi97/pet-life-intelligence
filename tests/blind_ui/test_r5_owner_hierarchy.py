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

    assert "attentionEvidenceReady" in web_page
    assert "关注状态暂时无法确认" in web_attention
    assert "不会把未知状态显示成“没有变化”" in web_attention

    # Mobile already uses hint=null as an explicit unknown state after a
    # failed/absent baseline response.
    assert 'kind: "unknown"' in mobile
    assert "今天还没有足够信息判断是否有需要关注的变化" in mobile

    assert 'healthState' in mini
    assert 'kind="unknown"' in mini
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
        "pli.companion.identity",
        "pli.me.owner",
    ):
        assert root_id in capture


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
        assert "photoFirstByDefault = Boolean(photoUri && (demo || twin === null))" in source
        assert "explicitPhotoChoice = photoView && photoView.petId ===" in source
        assert "canShow3d && !showPhoto" in source
        assert "切换为主人上传的真实照片" in source
        assert "看真实照片" in source
        assert "看 3D 形象" in source
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
    assert "life: 590" in mobile_stage  # keep Life View rail reachable without shrinking its WebView pet
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
    assert 'source_type?: string;' in life
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
    assert "小程序不使用静态贴图伪装 3D" in life
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

    assert "twin && identity && demoTwin" in web_viewer
    assert 'window.__PLI_DEMO_TWIN = ${demoTwin}' in mobile_host
    assert "injectedDemoTwin ? loadTwinGLB(identity) : Promise.resolve(null)" in mobile_runtime
    assert 'visualFidelityTier' in web_viewer
    assert 'visualFidelityTier' in mobile_runtime
    assert 'individualIdentityEvidence' in manifest
    assert 'technicalRepresentationQuality' in manifest
    assert 'const photoFirstByDefault = Boolean(photoUri && variant !== "review");' in web_stage
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
    assert '<details className="v5-timeline-tools" data-testid="pli.timeline.filters">' in web
    assert '筛选与搜索这段生活' in web
    assert 'data-testid="pli.mini.timeline.filters-toggle"' in mini
    assert 'showFilters ? (' in mini
    assert '筛选这段生活' in mini
