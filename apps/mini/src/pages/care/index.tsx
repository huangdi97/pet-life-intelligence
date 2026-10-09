import { useCallback, useEffect, useState } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";

interface Grant {
  grant_id?: string;
  id?: string;
  user_id: string;
  user_label?: string;
  scopes: string[];
  expires_at: string | null;
  status: string;
}
interface HouseholdMember {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
}
interface HandoffChecklistItem {
  id: string;
  text: string;
  done: boolean;
  done_by?: string | null;
  done_at?: string | null;
}
interface Handoff {
  handoff_id: string;
  caregiver_user_id: string;
  caregiver_label?: string;
  scope: string[];
  start_at: string;
  end_at: string | null;
  status: string;
  checklist: HandoffChecklistItem[];
}
interface CareCard {
  token_id: string;
  token: string;
  expires_at: string;
}
interface HouseholdInvitation {
  invitation_id: string;
  email: string;
  role: string;
  expires_at: string;
  accept_token?: string;
}

const HANDOFF_SCOPES = ["daily:read", "daily:write", "medical:read", "medical:write", "card:read"] as const;
const SCOPE_LABELS: Record<string, string> = {
  "daily:read": "查看日常记录",
  "daily:write": "记录日常照护",
  "medical:read": "查看健康记录",
  "medical:write": "记录健康信息",
  "card:read": "查看照护卡",
};

function handoffChecklist(scopes: string[]): string[] {
  const items = ["喂食与日常安排已确认", "紧急联系人与就医方式已确认"];
  if (scopes.some((scope) => scope.startsWith("medical:"))) {
    items.splice(1, 0, "健康与用药注意事项已确认");
  }
  return items;
}
function statusLabel(status: string): string {
  if (status === "ACTIVE") return "生效中";
  if (status === "PENDING") return "待确认";
  if (status === "EXPIRED") return "已到期";
  if (status === "ENDED") return "已结束";
  if (status === "REVOKED") return "已撤销";
  return "已记录";
}
function roleLabel(role: string): string {
  if (role === "OWNER") return "主人";
  if (role === "CO_OWNER") return "共同主人";
  if (role === "FAMILY") return "家庭成员";
  if (role === "SITTER" || role === "CAREGIVER") return "临时照护人";
  if (role === "VET") return "兽医";
  if (role === "TRAINER") return "训练师";
  if (role === "GROOMER") return "美容护理";
  return "成员";
}

export default function Care() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [grants, setGrants] = useState<Grant[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [grantsState, setGrantsState] = useState<"loading" | "ready" | "error">("loading");
  const [handoffsState, setHandoffsState] = useState<"loading" | "ready" | "error">("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("FAMILY");
  const [invitation, setInvitation] = useState<HouseholdInvitation | null>(null);
  const [caregiver, setCaregiver] = useState("");
  const [scopes, setScopes] = useState<string[]>(["daily:read", "daily:write"]);
  const [hours, setHours] = useState("48");
  const [card, setCard] = useState<CareCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const load = useCallback((pid: string) => {
    setGrantsState("loading");
    setHandoffsState("loading");
    Promise.allSettled([
      api.get<Grant[]>(`/pets/${pid}/grants`),
      api.get<Handoff[]>(`/pets/${pid}/handoffs`),
    ]).then(([g, h]) => {
      if (g.status === "fulfilled") {
        setGrants(g.value);
        setGrantsState("ready");
      } else {
        setGrantsState("error");
      }
      if (h.status === "fulfilled") {
        setHandoffs(h.value);
        setHandoffsState("ready");
      } else {
        setHandoffsState("error");
      }
    });
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  useEffect(() => {
    const householdId = current?.household_id;
    if (!householdId) {
      setMembers([]);
      return;
    }
    api
      .get<HouseholdMember[]>(`/households/${householdId}/members`)
      .then((rows) => setMembers(rows.filter((member) => member.status === "ACTIVE")))
      .catch(() => setMembers([]));
  }, [current?.household_id]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">照护网络</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function inviteMember() {
    if (!current?.household_id || !inviteEmail.trim() || busy) return;
    setBusy(true);
    setInvitation(null);
    try {
      const result = await api.post<HouseholdInvitation>(
        `/households/${current.household_id}/invitations`,
        { email: inviteEmail.trim().toLowerCase(), role: inviteRole },
      );
      setInvitation(result);
      setInviteEmail("");
      const rows = await api.get<HouseholdMember[]>(`/households/${current.household_id}/members`);
      setMembers(rows.filter((member) => member.status === "ACTIVE"));
      Taro.showToast({ title: "邀请已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "邀请失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function createHandoff() {
    if (!petId || !caregiver.trim() || scopes.length === 0 || busy) return;
    setBusy(true);
    try {
      await api.post(`/pets/${petId}/handoffs`, {
        caregiver_user_id: caregiver.trim(),
        scopes,
        end_at: new Date(Date.now() + Math.max(1, Number(hours) || 48) * 3600_000).toISOString(),
        reason: "care handoff",
        checklist: handoffChecklist(scopes),
      });
      setCaregiver("");
      load(petId);
      Taro.showToast({ title: "交接已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function completeChecklist(handoffId: string, itemId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/handoffs/${handoffId}/checklist/${itemId}/complete`, {});
      if (petId) load(petId);
      Taro.showToast({ title: "已确认", icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function endHandoff(id: string) {
    try {
      await api.post(`/handoffs/${id}/end`, {});
      if (petId) load(petId);
      Taro.showToast({ title: "交接已结束", icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    }
  }

  async function revokeGrant(id: string) {
    try {
      await api.del(`/grants/${id}`);
      if (petId) load(petId);
      Taro.showToast({ title: "权限已撤销", icon: "success" });
    } catch {
      Taro.showToast({ title: "撤销失败", icon: "none" });
    }
  }

  async function issueCard() {
    if (!petId || busy) return;
    setBusy(true);
    try {
      const result = await api.post<CareCard>(`/pets/${petId}/care-cards`, { expires_in_hours: 72 });
      setCard(result);
      Taro.showToast({ title: "照护卡已生成", icon: "success" });
    } catch {
      Taro.showToast({ title: "生成失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function copyCard() {
    if (!card) return;
    await Taro.setClipboardData({ data: `/share/care-card/${card.token}` });
  }

  async function revokeCard() {
    if (!card?.token_id || busy) return;
    setBusy(true);
    try {
      await api.del(`/share-tokens/${card.token_id}`);
      setCard(null);
      Taro.showToast({ title: "分享链接已撤销", icon: "success" });
    } catch {
      Taro.showToast({ title: "撤销失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  const carePeople = new Map<string, { user_id: string; label: string; role: string }>();
  members.forEach((member) => {
    carePeople.set(member.user_id, {
      user_id: member.user_id,
      label: member.display_name || member.email || "家庭成员",
      role: roleLabel(member.role),
    });
  });
  grants.forEach((grant) => {
    if (!carePeople.has(grant.user_id)) {
      carePeople.set(grant.user_id, {
        user_id: grant.user_id,
        label: grant.user_label || "曾授权照护人",
        role: "曾授权照护人",
      });
    }
  });
  handoffs.forEach((handoff) => {
    if (!carePeople.has(handoff.caregiver_user_id)) {
      carePeople.set(handoff.caregiver_user_id, {
        user_id: handoff.caregiver_user_id,
        label: handoff.caregiver_label || "曾参与照护的人",
        role: "曾参与照护",
      });
    }
  });
  const caregiverOptions = [...carePeople.values()];
  const memberIndex = Math.max(0, caregiverOptions.findIndex((person) => person.user_id === caregiver));
  const selectedMember = caregiverOptions[memberIndex];

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name}的照护网络` : "照护网络"}</View>
      <View className="sub">家庭成员、临时交接与照护卡。权限按人、用途与时间清楚管理。</View>

      <View className="open-section">
        <View className="section-title">正在进行的交接</View>
        {handoffsState === "loading" ? (
          <View className="state">正在读取照护交接……</View>
        ) : handoffsState === "error" ? (
          <View className="state state-error">
            照护交接暂时没有加载成功；不会把未知状态显示成“没有交接”。
            <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
          </View>
        ) : handoffs.length ? handoffs.map((handoff) => (
          <View className="life-row" key={handoff.handoff_id}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{handoff.caregiver_label || "临时照护人"}</Text>
                <Text className="life-row-time">{statusLabel(handoff.status)}</Text>
              </View>
              <View className="life-row-detail">
                {handoff.scope.map((scope) => SCOPE_LABELS[scope] ?? "限定权限").join(" · ")}
              </View>
              <View className="life-row-source">至 {handoff.end_at ? fmtTime(handoff.end_at) : "手动结束"}</View>
              {handoff.checklist?.length ? (
                <View className="soft-panel">
                  <View className="section-title">交接确认</View>
                  {handoff.checklist.map((item) => (
                    <View className="life-row" key={item.id}>
                      <View className="life-row-body">
                        <View className="life-row-detail">{item.done ? "✓" : "○"} {item.text}</View>
                        {!item.done && handoff.status === "ACTIVE" ? (
                          <Button className="btn" size="mini" disabled={busy} onClick={() => void completeChecklist(handoff.handoff_id, item.id)}>
                            确认完成
                          </Button>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {handoff.status === "ACTIVE" ? (
                <Button className="btn" size="mini" onClick={() => endHandoff(handoff.handoff_id)}>提前结束</Button>
              ) : null}
            </View>
          </View>
        )) : (
          <View className="life-empty-note">目前没有进行中的照护交接。</View>
        )}
      </View>

      <View className="open-section">
        <View className="section-title">家庭成员</View>
        <View className="life-row-detail">邀请共同照护的人加入家庭；角色决定默认权限。主人角色不能通过邀请转移。</View>
        {members.length ? members.map((member) => (
          <View className="life-row" key={member.user_id}>
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{member.display_name || member.email || "家庭成员"}</Text>
                <Text className="life-row-time">{roleLabel(member.role)}</Text>
              </View>
            </View>
          </View>
        )) : <View className="life-empty-note">家庭成员暂时没有读取到。</View>}
        <View className="secondary-action" data-testid="pli.mini.care.invite.toggle" onClick={() => setInviteOpen((value) => !value)}>
          {inviteOpen ? "收起" : "＋ 邀请成员"}
        </View>
        {inviteOpen ? (
          <View className="soft-panel">
            <View className="field">
            <Text>对方邮箱</Text>
            <Input
            className="input"
            type="text"
            value={inviteEmail}
            placeholder="name@example.com"
            onInput={(e) => setInviteEmail(e.detail.value)}
            />
            </View>
            <View className="field">
            <Text>家庭角色</Text>
            <Picker
            mode="selector"
            range={["家庭成员", "共同主人", "临时照护人", "兽医", "训练师", "美容护理"]}
            value={Math.max(0, ["FAMILY", "CO_OWNER", "SITTER", "VET", "TRAINER", "GROOMER"].indexOf(inviteRole))}
            onChange={(e) => {
            const roles = ["FAMILY", "CO_OWNER", "SITTER", "VET", "TRAINER", "GROOMER"];
            setInviteRole(roles[Number(e.detail.value)] ?? "FAMILY");
            }}
            >
            <View className="input">{roleLabel(inviteRole)}</View>
            </Picker>
            </View>
            <Button
            className="btn btn-primary"
            onClick={inviteMember}
            disabled={busy || !current?.household_id || !inviteEmail.trim()}
            >
            {busy ? "处理中…" : "发送邀请"}
            </Button>
            
          </View>
        ) : null}
        {invitation ? (
          <View className="soft-panel">
            <View className="section-title">邀请已创建</View>
            <View className="life-row-detail">{invitation.email} · 至 {fmtTime(invitation.expires_at)}</View>
            {invitation.accept_token ? (
              <View className="life-row-source">当前环境未接入邮件投递；邀请码：{invitation.accept_token}</View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="open-section">
        <View className="section-title">发起临时交接</View>
        <View className="life-row-detail">默认只开放日常查看与记录权限；到期自动失效，临时照护人不能转授管理权限。</View>
        <View className="secondary-action" data-testid="pli.mini.care.handoff.toggle" onClick={() => setHandoffOpen((value) => !value)}>
          {handoffOpen ? "收起" : "＋ 发起交接"}
        </View>
        {handoffOpen ? (
          <View className="soft-panel">
            
            <View className="field">
            <Text>临时照护人</Text>
            {caregiverOptions.length ? (
            <Picker
            mode="selector"
            range={caregiverOptions.map((person) => `${person.label} · ${person.role}`)}
            value={memberIndex}
            onChange={(e) => setCaregiver(caregiverOptions[Number(e.detail.value)]?.user_id ?? "")}
            >
            <View className="input">
            {caregiver && selectedMember
            ? `${selectedMember.label} · ${selectedMember.role}`
            : "选择照护人"}
            </View>
            </Picker>
            ) : (
            <View className="life-empty-note">还没有可选择的照护人；请先完成家庭邀请。</View>
            )}
            <View className="life-row-source">新照护人请先完成家庭邀请，再从这里选择。</View>
            </View>
            <View className="field">
            <Text>授权范围</Text>
            <View className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {HANDOFF_SCOPES.map((scope) => {
            const selected = scopes.includes(scope);
            return (
            <Button
            key={scope}
            className={`btn${selected ? " btn-accent" : ""}`}
            size="mini"
            onClick={() =>
            setScopes((old) =>
            selected ? old.filter((value) => value !== scope) : [...old, scope],
            )
            }
            >
            {SCOPE_LABELS[scope]}
            </Button>
            );
            })}
            </View>
            </View>
            <View className="field">
            <Text>有效时长（小时）</Text>
            <Input className="input" type="number" value={hours} onInput={(e) => setHours(e.detail.value)} />
            </View>
            <Button data-testid="pli.mini.care.handoff.submit" className="btn btn-primary" onClick={createHandoff} disabled={busy || !caregiver.trim() || scopes.length === 0}>
            {busy ? "处理中…" : "创建交接"}
            </Button>
            
          </View>
        ) : null}
      </View>

      <View className="open-section">
        <View className="section-title">照护卡</View>
        <View className="life-row-detail">仅分享喂养、用药、行为禁忌、紧急联系人等最小必要信息，不包含完整医疗历史。</View>
        <Button className="btn btn-primary" onClick={issueCard} disabled={busy}>生成 72 小时照护卡</Button>
        {card ? (
          <View className="soft-panel">
            <View className="section-title">照护卡已生成</View>
            <View className="life-row-detail">72 小时有效，可分享给临时照护人；链接过期后自动失效。</View>
            <Button className="btn" onClick={copyCard}>复制分享路径</Button>
            <Button className="btn btn-danger" onClick={revokeCard} disabled={busy}>撤销分享链接</Button>
          </View>
        ) : null}
      </View>

      <View className="open-section">
        <View className="section-title">权限记录</View>
        {grantsState === "loading" ? (
          <View className="state">正在读取权限记录……</View>
        ) : grantsState === "error" ? (
          <View className="state state-error">权限记录暂时没有加载成功；不会把未知状态显示成“没有授权”。</View>
        ) : grants.length ? grants.map((grant) => (
          <View className="life-row" key={grant.grant_id ?? grant.id ?? grant.user_id}>
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{grant.user_label || "已授权成员"}</Text>
                <Text className="life-row-time">{statusLabel(grant.status)}</Text>
              </View>
              <View className="life-row-detail">{grant.scopes.map((scope) => SCOPE_LABELS[scope] ?? "限定权限").join(" · ")}</View>
              <View className="life-row-source">{grant.expires_at ? `到期 ${fmtTime(grant.expires_at)}` : "未设置到期时间"}</View>
              {grant.status === "ACTIVE" && (grant.grant_id ?? grant.id) ? (
                <Button className="btn btn-danger" size="mini" onClick={() => revokeGrant(String(grant.grant_id ?? grant.id))}>
                  撤销权限
                </Button>
              ) : null}
            </View>
          </View>
        )) : <View className="life-empty-note">还没有授权记录。</View>}
      </View>
    </View>
  );
}
