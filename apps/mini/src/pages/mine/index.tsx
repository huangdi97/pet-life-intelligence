import { useEffect, useState } from "react";
import { View, Text, Button, Input, Textarea } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { getPlatform } from "../../platform/index";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { consentPurposeLabel } from "../../utils/labels";

function fmtTime(value: string | null | undefined): string {
  if (!value) return "时间未记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * 我的（MIN-005）— R5.5 owner utility surface.
 *
 * Me is deliberately quieter than pet-life pages: account/session, household,
 * pets, notifications, privacy/data and device utilities live here without
 * becoming a second feature dashboard. Platform/auth implementation details
 * never appear in owner copy.
 */
const HOUSEHOLD_ENTRIES: Array<{ label: string; detail: string; url: string }> = [
  { label: "我的宠物", detail: "查看与切换家庭里的宠物", url: "/pages/pets/index" },
  { label: "照护协作", detail: "管理照护交接、范围与有效期", url: "/pages/care/index" },
];

const UTILITY_ENTRIES: Array<{ label: string; detail: string; url: string }> = [
  { label: "通知", detail: "查看需要处理的提醒", url: "/pages/notifications/index" },
  { label: "在家与设备", detail: "查看真实连接与最近同步状态", url: "/pages/monitoring/index" },
];

const FEEDBACK_CATEGORIES = [
  { key: "bug", label: "出错" },
  { key: "confusing", label: "看不懂" },
  { key: "missing", label: "缺少内容" },
  { key: "feature_request", label: "功能建议" },
  { key: "privacy", label: "隐私担忧" },
  { key: "other", label: "其他" },
] as const;

interface ConsentRow {
  purpose: string;
  granted: boolean;
  updated_at: string;
}

interface DeletionRequestRow {
  request_id: string;
  status: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
}

interface EmergencyProfile {
  owner_contact: string;
  backup_contact: string;
  vet_clinic_name: string;
  vet_clinic_phone: string;
  vet_clinic_address_text: string;
  critical_care_notes: string;
}

const EMPTY_EMERGENCY_PROFILE: EmergencyProfile = {
  owner_contact: "",
  backup_contact: "",
  vet_clinic_name: "",
  vet_clinic_phone: "",
  vet_clinic_address_text: "",
  critical_care_notes: "",
};

function EntryList({ items }: { items: Array<{ label: string; detail: string; url: string }> }) {
  return (
    <View>
      {items.map((item) => (
        <View
          className="life-row"
          key={item.url}
          onClick={() => Taro.navigateTo({ url: item.url })}
        >
          <View className="life-row-body">
            <View className="life-row-head">
              <Text className="life-row-type">{item.label}</Text>
              <Text className="life-row-time">›</Text>
            </View>
            <View className="life-row-detail">{item.detail}</View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Mine() {
  const platform = getPlatform();
  const { pets, petId } = usePets();
  const current = pets?.find((pet) => pet.id === petId) ?? pets?.[0] ?? null;
  const [accountOpen, setAccountOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]["key"]>("confusing");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [consentState, setConsentState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [consentBusy, setConsentBusy] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<EmergencyProfile>(EMPTY_EMERGENCY_PROFILE);
  const [emergencyState, setEmergencyState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequestRow[]>([]);
  const [deletionState, setDeletionState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  async function handleLogin() {
    if (!platform.auth.available) {
      Taro.showModal({
        title: "登录暂未开放",
        content: "当前客户端还不能完成平台账号登录。你仍可以浏览当前可用的演示内容。",
        showCancel: false,
      });
      return;
    }
    try {
      await platform.auth.login();
      Taro.showToast({ title: "已登录", icon: "success" });
    } catch {
      Taro.showModal({
        title: "登录失败",
        content: "暂时无法完成平台账号登录，请稍后再试。",
        showCancel: false,
      });
    }
  }

  const loggedIn = platform.auth.isLoggedIn();

  useEffect(() => {
    const pid = current?.id;
    if (!pid || !loggedIn) {
      setConsents([]);
      setConsentState("idle");
      setEmergency(EMPTY_EMERGENCY_PROFILE);
      setEmergencyState("idle");
      setDeletionRequests([]);
      setDeletionState("idle");
      return;
    }
    let alive = true;
    setConsentState("loading");
    setEmergencyState("loading");
    setDeletionState("loading");
    Promise.allSettled([
      api.get<ConsentRow[]>(`/pets/${pid}/consents`),
      api.get<EmergencyProfile>(`/pets/${pid}/emergency-profile`),
      api.get<DeletionRequestRow[]>(`/pets/${pid}/deletion-requests`),
    ]).then(([consentResult, emergencyResult, deletionResult]) => {
      if (!alive) return;
      if (consentResult.status === "fulfilled") {
        setConsents(consentResult.value);
        setConsentState("ready");
      } else {
        setConsentState("error");
      }
      if (emergencyResult.status === "fulfilled") {
        setEmergency({ ...EMPTY_EMERGENCY_PROFILE, ...emergencyResult.value });
        setEmergencyState("ready");
      } else {
        setEmergency(EMPTY_EMERGENCY_PROFILE);
        setEmergencyState("error");
      }
      if (deletionResult.status === "fulfilled") {
        setDeletionRequests(deletionResult.value);
        setDeletionState("ready");
      } else {
        setDeletionRequests([]);
        setDeletionState("error");
      }
    });
    return () => {
      alive = false;
    };
  }, [current?.id, loggedIn]);

  async function toggleConsent(row: ConsentRow) {
    if (!current?.id || consentBusy || row.purpose === "SERVICE_ESSENTIAL") return;
    setConsentBusy(row.purpose);
    try {
      await api.put(`/pets/${current.id}/consents/${row.purpose}`, { granted: !row.granted });
      setConsents((items) => items.map((item) => item.purpose === row.purpose ? { ...item, granted: !item.granted } : item));
      Taro.showToast({ title: row.granted ? "已撤回" : "已同意", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法更新，请稍后重试", icon: "none" });
    } finally {
      setConsentBusy(null);
    }
  }

  async function saveEmergencyProfile() {
    if (!current?.id || emergencyBusy) return;
    setEmergencyBusy(true);
    try {
      await api.put(`/pets/${current.id}/emergency-profile`, emergency);
      setEmergencyState("ready");
      Taro.showToast({ title: "紧急联系卡已保存", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法保存，请稍后重试", icon: "none" });
    } finally {
      setEmergencyBusy(false);
    }
  }

  async function requestDeletion() {
    if (!current?.id || deletionBusy) return;
    setDeletionBusy(true);
    try {
      await api.post(`/pets/${current.id}/deletion-requests`, { reason: deletionReason.trim() });
      setDeletionReason("");
      const rows = await api.get<DeletionRequestRow[]>(`/pets/${current.id}/deletion-requests`);
      setDeletionRequests(rows);
      setDeletionState("ready");
      Taro.showModal({
        title: "删除请求已登记",
        content: "数据不会立即自动删除；请求会保留审计记录，并在再次确认后处理。",
        showCancel: false,
      });
    } catch {
      Taro.showToast({ title: "暂时无法登记，请稍后重试", icon: "none" });
    } finally {
      setDeletionBusy(false);
    }
  }

  async function acceptHouseholdInvitation() {
    const token = inviteCode.trim();
    if (!token || inviteBusy || !loggedIn) return;
    setInviteBusy(true);
    try {
      await api.post("/invitations/accept", { token });
      setInviteCode("");
      Taro.showModal({
        title: "已加入家庭",
        content: "邀请已接受；重新进入宠物与照护页面即可看到你获得的家庭权限。",
        showCancel: false,
      });
    } catch {
      Taro.showToast({ title: "邀请码无效、已过期或不属于当前账号", icon: "none" });
    } finally {
      setInviteBusy(false);
    }
  }

  async function sendFeedback() {
    const message = feedbackMessage.trim();
    if (!message || feedbackBusy || !loggedIn) return;
    setFeedbackBusy(true);
    try {
      await api.post("/pilot/feedback", {
        category: feedbackCategory,
        message,
        page_url: "mini://mine",
        client: "mini",
        extra: { surface: "me" },
      });
      setFeedbackMessage("");
      setFeedbackOpen(false);
      Taro.showToast({ title: "反馈已提交", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法提交，请稍后重试", icon: "none" });
    } finally {
      setFeedbackBusy(false);
    }
  }

  const pendingDeletion = deletionRequests.find((row) => row.status === "PENDING") ?? null;

  return (
    <View className="page">
      <View className="h1">我的</View>
      <View className="sub">家庭、通知、设备与数据设置</View>

      <View className="soft-hero">
        <View className="section-title">账号</View>
        <View className="metric-row">
          <View className="metric-cell">
            <View className="metric-value">{loggedIn ? "已登录" : "未登录"}</View>
            <View className="metric-label">当前会话</View>
          </View>
        </View>
        {!loggedIn ? (
          <Button className="btn btn-primary" size="mini" onClick={handleLogin}>
            登录
          </Button>
        ) : null}
        {!platform.auth.available ? (
          <View className="life-empty-note">
            平台账号登录尚未在当前客户端开放；这不会影响已经可用的浏览与演示内容。
          </View>
        ) : null}
      </View>

      <View className="open-section">
        <View className="section-title">家庭</View>
        <EntryList items={HOUSEHOLD_ENTRIES} />
        <View className="soft-panel" data-testid="pli.mini.me.invitation">
          <View className="section-title">接受家庭邀请</View>
          <View className="life-empty-note">邀请码只用于加入家庭，不会授予超出邀请角色的权限。</View>
          <Input
            className="input"
            value={inviteCode}
            onInput={(event) => setInviteCode(event.detail.value)}
            placeholder="输入邀请码"
          />
          <Button
            className="btn"
            disabled={inviteBusy || !loggedIn || !inviteCode.trim()}
            onClick={() => void acceptHouseholdInvitation()}
          >
            {inviteBusy ? "处理中…" : loggedIn ? "接受邀请" : "登录后可接受"}
          </Button>
        </View>
      </View>

      <View className="open-section">
        <View className="section-title">通知与设备</View>
        <EntryList items={UTILITY_ENTRIES} />
      </View>

      <View className="open-section" data-testid="pli.mini.me.privacy">
        <View className="section-title">隐私与数据</View>
        <View className="life-empty-note">逐项管理数据用途。核心服务所需数据不可单独撤回，其余用途由你决定。</View>
        {!current ? (
          <View className="state">选择宠物后可查看数据用途设置。</View>
        ) : !loggedIn ? (
          <View className="state">登录后可查看和调整数据用途。</View>
        ) : consentState === "loading" ? (
          <View className="state">正在读取数据用途设置……</View>
        ) : consentState === "error" ? (
          <View className="state state-error">数据用途设置暂时没有加载成功；不会用默认值代替真实状态。</View>
        ) : (
          consents.map((row) => {
            const essential = row.purpose === "SERVICE_ESSENTIAL";
            const busy = consentBusy === row.purpose;
            return (
              <View className="life-row" key={row.purpose}>
                <View className="life-row-body">
                  <View className="life-row-head">
                    <Text className="life-row-type">{consentPurposeLabel(row.purpose)}</Text>
                    <Text className="life-row-time">{row.granted ? "已同意" : "未同意"}</Text>
                  </View>
                  <View className="life-row-detail">{essential ? "核心服务运行所需，不能单独撤回。" : "可随时调整；变更会保留审计记录。"}</View>
                  <Button
                    className={`btn ${row.granted ? "" : "btn-primary"}`}
                    size="mini"
                    disabled={essential || busy}
                    onClick={() => void toggleConsent(row)}
                  >
                    {essential ? "服务必需" : busy ? "处理中…" : row.granted ? "撤回" : "同意"}
                  </Button>
                </View>
              </View>
            );
          })
        )}

        <View className="soft-panel" data-testid="pli.mini.me.data">
          <View className="section-title">数据删除请求</View>
          <View className="life-empty-note">提交后先登记并保留审计记录；不会立即自动删除。</View>
          {deletionState === "loading" ? <View className="state">正在读取删除请求状态……</View> : null}
          {deletionState === "error" ? (
            <View className="state state-error">删除请求状态暂时没有加载成功；不会因此假定“没有待处理请求”。</View>
          ) : null}
          {pendingDeletion ? (
            <View className="life-row">
              <View className="life-row-body">
                <View className="life-row-type">当前有请求等待人工确认</View>
                <View className="life-row-detail">{fmtTime(pendingDeletion.created_at)}</View>
                {pendingDeletion.reason ? <View className="life-row-source">原因：{pendingDeletion.reason}</View> : null}
              </View>
            </View>
          ) : null}
          {deletionRequests.slice(0, 3).map((row) => (
            <View className="life-row" key={row.request_id}>
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{row.status === "PENDING" ? "等待人工确认" : "状态已记录"}</Text>
                  <Text className="life-row-time">{fmtTime(row.created_at)}</Text>
                </View>
              </View>
            </View>
          ))}
          <Input
            className="input"
            value={deletionReason}
            maxlength={240}
            disabled={Boolean(pendingDeletion)}
            onInput={(event) => setDeletionReason(event.detail.value)}
            placeholder="原因（可选）"
          />
          <Button
            className="btn"
            disabled={deletionBusy || !current || !loggedIn || Boolean(pendingDeletion) || deletionState === "loading"}
            onClick={() => void requestDeletion()}
          >
            {deletionBusy ? "登记中…" : pendingDeletion ? "已有待处理请求" : "登记删除请求"}
          </Button>
        </View>
      </View>

      <View className="open-section" data-testid="pli.mini.me.emergency-profile">
        <View className="section-title">紧急联系卡</View>
        <View className="life-empty-note">保存主人、备用联系人、首选医院与关键照护备注，供紧急照护场景使用。</View>
        {!current ? (
          <View className="state">选择宠物后可编辑紧急联系卡。</View>
        ) : !loggedIn ? (
          <View className="state">登录后可编辑紧急联系卡。</View>
        ) : emergencyState === "loading" ? (
          <View className="state">正在读取紧急联系卡……</View>
        ) : (
          <View className="soft-panel">
            {emergencyState === "error" ? <View className="state state-error">紧急联系卡暂时没有加载成功；你仍可重新填写并保存。</View> : null}
            <Input className="input" value={emergency.owner_contact} onInput={(event) => setEmergency((value) => ({ ...value, owner_contact: event.detail.value }))} placeholder="主人联系方式" />
            <Input className="input" value={emergency.backup_contact} onInput={(event) => setEmergency((value) => ({ ...value, backup_contact: event.detail.value }))} placeholder="备用联系人" />
            <Input className="input" value={emergency.vet_clinic_name} onInput={(event) => setEmergency((value) => ({ ...value, vet_clinic_name: event.detail.value }))} placeholder="首选医院" />
            <Input className="input" value={emergency.vet_clinic_phone} onInput={(event) => setEmergency((value) => ({ ...value, vet_clinic_phone: event.detail.value }))} placeholder="医院电话" />
            <Input className="input" value={emergency.vet_clinic_address_text} onInput={(event) => setEmergency((value) => ({ ...value, vet_clinic_address_text: event.detail.value }))} placeholder="医院地址" />
            <Textarea className="input" value={emergency.critical_care_notes} maxlength={1000} onInput={(event) => setEmergency((value) => ({ ...value, critical_care_notes: event.detail.value }))} placeholder="关键照护备注 / 行为禁忌" autoHeight />
            <Button className="btn btn-primary" disabled={emergencyBusy} onClick={() => void saveEmergencyProfile()}>
              {emergencyBusy ? "保存中…" : "保存紧急联系卡"}
            </Button>
          </View>
        )}
      </View>

      <View className="open-section" data-testid="pli.mini.me.feedback">
        <View
          className="section-title"
          onClick={() => setFeedbackOpen((value) => !value)}
        >
          试点反馈
          <Text className="section-caption">{feedbackOpen ? "收起" : "反馈问题或建议"}</Text>
        </View>
        <View className="life-empty-note">请不要填写病历全文或联系方式。反馈会进入真实试点反馈队列。</View>
        {feedbackOpen ? (
          <View className="soft-panel">
            <View className="chips">
              {FEEDBACK_CATEGORIES.map((category) => (
                <View
                  key={category.key}
                  className={`chip${feedbackCategory === category.key ? " chip-active" : ""}`}
                  onClick={() => setFeedbackCategory(category.key)}
                >
                  {category.label}
                </View>
              ))}
            </View>
            <Textarea
              className="input"
              value={feedbackMessage}
              maxlength={4000}
              onInput={(event) => setFeedbackMessage(event.detail.value)}
              placeholder="描述你遇到的问题或建议"
              autoHeight
            />
            <Button
              className="btn btn-primary"
              disabled={feedbackBusy || !feedbackMessage.trim() || !loggedIn}
              onClick={sendFeedback}
            >
              {feedbackBusy ? "提交中…" : loggedIn ? "提交反馈" : "登录后可提交"}
            </Button>
          </View>
        ) : null}
      </View>

      <View className="open-section" data-testid="pli.mini.me.about">
        <View
          className="section-title"
          onClick={() => setAccountOpen((value) => !value)}
        >
          关于
          <Text className="section-caption">{accountOpen ? "收起" : "查看"}</Text>
        </View>
        {accountOpen ? (
          <View className="soft-panel">
            <View className="life-row">
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">Pet Life Intelligence</Text>
                </View>
                <View className="life-row-detail">围绕一只具体宠物的真实生活记录、照护协作与长期理解；未开放的能力会明确说明。</View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
