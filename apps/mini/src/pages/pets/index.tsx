/**
 * 宠物 — Pet World / Pet Identity Page (Stage R.2 §28-30).
 * PetHero 第一焦点；生命视图入口；生活领域以“对这只宠物的意义”呈现，
 * 非功能宫格。数据全部来自真实 API（events / tasks），不编造。
 */
import { useEffect, useState } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent, type Pet } from "../../services/api";
import { breedLabel, speciesLabel } from "../../utils/format";
import { petAgeText, sexLabelZh, eventTypeLabel } from "../../utils/labels";
import { usePets } from "../../utils/usePets";
import { PetHero } from "../../components/pet_visual";
import { getPlatform } from "../../platform";
import { EmptyState } from "../../components/feedback/Feedback";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

interface DietProfileResponse {
  pet_id: string;
  profile: {
    current_food: string;
    allergies: string[];
    feeding_rules: string;
    vet_advised: boolean;
    source_type: string;
  } | null;
}

interface IdentifierRow {
  identifier_id: string;
  identifier_type: "CHIP" | "PASSPORT" | "TATTOO";
  value: string;
  verified: boolean;
  source_type: string;
}

const IDENTIFIER_TYPES = [
  ["CHIP", "芯片号"],
  ["PASSPORT", "宠物护照"],
  ["TATTOO", "纹身标识"],
] as const;

const LIFECYCLE_OPTIONS = [
  ["ACTIVE", "正常生活中"],
  ["LOST", "走失"],
  ["TRANSFERRED", "已转交"],
  ["DECEASED", "已离世"],
] as const;

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  algorithm: string;
  computed_at: string;
}
const BASELINE_LABELS: Record<string, { label: string; suffix: string }> = {
  meal_count_per_day: { label: "每日进食次数", suffix: " 次/天" },
  walk_minutes_per_day: { label: "每日散步", suffix: " 分钟/天" },
  sleep_minutes_per_day: { label: "每日睡眠", suffix: " 分钟/天" },
};

function identityLine(pet: Pet | undefined): string {
  if (!pet) return "宠物生活智能";
  const parts = [speciesLabel(pet.species), breedLabel(pet.breed), petAgeText(pet.birth_date), sexLabelZh(pet.sex)].filter(Boolean);
  return parts.join(" · ");
}

export default function Pets() {
  const { pets, petId, choose, refresh } = usePets();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");
  const [twinModels, setTwinModels] = useState<Array<Record<string, unknown>> | null>(null);
  const [twinState, setTwinState] = useState<"loading" | "ready" | "error">("loading");
  const [baseline, setBaseline] = useState<BaselineRow[]>([]);
  const [baselineState, setBaselineState] = useState<"loading" | "ready" | "error">("loading");
  const [baselineBusy, setBaselineBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    species: "dog",
    breed: "",
    sex: "UNKNOWN",
    birth_date: "",
    neutered: "unknown",
    weight_note: "",
  });
  const [busy, setBusy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);
  const [identifierType, setIdentifierType] = useState<IdentifierRow["identifier_type"]>("CHIP");
  const [identifierValue, setIdentifierValue] = useState("");
  const [identifierBusy, setIdentifierBusy] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState("ACTIVE");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [diet, setDiet] = useState({
    current_food: "",
    allergies: "",
    feeding_rules: "",
    vet_advised: false,
  });
  const [dietState, setDietState] = useState<"loading" | "ready" | "error">("loading");
  const [dietBusy, setDietBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    breed: "",
    sex: "UNKNOWN",
    birth_date: "",
    neutered: "unknown",
    weight_note: "",
  });

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  useEffect(() => {
    if (!current) return;
    setEditForm({
      name: current.name ?? "",
      breed: current.breed ?? "",
      sex: current.sex ?? "UNKNOWN",
      birth_date: current.birth_date ?? "",
      neutered: current.neutered == null ? "unknown" : current.neutered ? "yes" : "no",
      weight_note: current.weight_note ?? "",
    });
  }, [current?.id]);

  useEffect(() => {
    if (!current?.id) {
      setIdentifiers([]);
      setLifecycleStatus("ACTIVE");
      return;
    }
    setLifecycleStatus(current.lifecycle_status ?? "ACTIVE");
    let alive = true;
    api.get<IdentifierRow[]>(`/pets/${current.id}/identifiers`)
      .then((rows) => {
        if (alive) setIdentifiers(rows);
      })
      .catch(() => {
        if (alive) setIdentifiers([]);
      });
    setDietState("loading");
    api.get<DietProfileResponse>(`/pets/${current.id}/diet-profile`)
      .then((row) => {
        if (!alive) return;
        setDiet({
          current_food: row.profile?.current_food ?? "",
          allergies: row.profile?.allergies?.join("、") ?? "",
          feeding_rules: row.profile?.feeding_rules ?? "",
          vet_advised: row.profile?.vet_advised === true,
        });
        setDietState("ready");
      })
      .catch(() => {
        if (alive) setDietState("error");
      });
    return () => {
      alive = false;
    };
  }, [current?.id, current?.lifecycle_status]);

  useEffect(() => {
    if (!petId) return;
    setEvents(null);
    setTwinModels(null);
    setEventsState("loading");
    setTwinState("loading");
    setBaselineState("loading");
    api
      .get<{ events: LifeEvent[]; count: number }>(`/pets/${petId}/events`)
      .then((r) => {
        setEvents(r.events);
        setEventsState("ready");
      })
      .catch(() => {
        setEvents([]);
        setEventsState("error");
      });
    api
      .get<{ models: Array<Record<string, unknown>> }>(`/pets/${petId}/visual-models`)
      .then((r) => {
        setTwinModels(r.models);
        setTwinState("ready");
      })
      .catch(() => {
        setTwinModels([]);
        setTwinState("error");
      });
    api
      .get<BaselineRow[]>(`/pets/${petId}/baseline`)
      .then((rows) => {
        setBaseline(rows);
        setBaselineState("ready");
      })
      .catch(() => {
        setBaseline([]);
        setBaselineState("error");
      });
  }, [petId]);

  const lastOf = (prefix: string): LifeEvent | undefined => {
    const rows = (events ?? []).filter((e) => e.event_type.startsWith(prefix));
    return rows[0];
  };

  const healthCount7d = (events ?? []).filter(
    (e) => e.event_type.startsWith("health.") && Date.now() - new Date(e.occurred_at).getTime() < SEVEN_DAYS,
  ).length;
  const lastBehavior = lastOf("behavior.");
  const lastGoal = lastOf("training.goal_created");
  const lastWelfare = lastOf("welfare.");
  const lastSocial = lastOf("social.");
  const activeTwin = twinModels?.find((model) => model.status === "ACTIVE") ?? null;
  const latestTwin = twinModels?.[0] ?? null;
  const twinVersion = activeTwin?.version ?? activeTwin?.twin_version ?? latestTwin?.version ?? latestTwin?.twin_version;
  const twinStatusCopy =
    twinState === "loading"
      ? "正在读取 3D 形象状态…"
      : twinState === "error"
        ? "3D 形象状态暂时没有加载成功"
        : activeTwin
          ? `已启用${twinVersion ? `第 ${String(twinVersion)} 版` : "当前 3D 形象"}`
          : latestTwin
            ? "已有候选形象，等待你在支持的客户端确认"
            : "还没有启用 3D 形象";

  const recentPetEvent = (events ?? []).find((event) => event.event_type !== "today.viewed") ?? null;
  const eventDataUnavailable = eventsState === "error";
  const domains: Array<{ label: string; hint: string; url: string }> = [
    {
      label: "生活",
      hint: "此刻、趋势与生命记忆都在这里",
      url: "/pages/pets/life-view/index",
    },
    {
      label: "健康",
      hint: eventDataUnavailable ? "健康记录暂时没有加载成功" : healthCount7d ? `最近 7 天 · ${healthCount7d} 条记录` : "还没有健康记录",
      url: "/pages/health/index",
    },
    {
      label: "行为",
      hint: eventDataUnavailable ? "行为记录暂时没有加载成功" : lastBehavior ? `最近一次：${String((lastBehavior.payload as Record<string, unknown>)?.behavior ?? eventTypeLabel(lastBehavior.event_type))}` : "还没有行为记录",
      url: "/pages/behavior/index",
    },
    {
      label: "训练",
      hint: eventDataUnavailable ? "训练记录暂时没有加载成功" : lastGoal ? `当前目标：${String((lastGoal.payload as Record<string, unknown>)?.title ?? "训练目标")}` : "还没有训练目标",
      url: "/pages/training/index",
    },
    {
      label: "福祉",
      hint: eventDataUnavailable ? "福祉记录暂时没有加载成功" : lastWelfare ? `最近一次：${eventTypeLabel(lastWelfare.event_type)}` : "还没有福祉观察",
      url: "/pages/welfare/index",
    },
    {
      label: "社交",
      hint: eventDataUnavailable ? "互动记录暂时没有加载成功" : lastSocial ? `最近一次：${eventTypeLabel(lastSocial.event_type)}` : "还没有互动记录",
      url: "/pages/social/index",
    },
  ];

  async function create() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const pet = await api.post<{ id: string }>("/pets", {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed,
        sex: form.sex,
        birth_date: form.birth_date || null,
        neutered: form.neutered === "unknown" ? null : form.neutered === "yes",
        weight_note: form.weight_note,
      });
      choose(pet.id);
      refresh();
      setShowCreate(false);
      setForm({ name: "", species: "dog", breed: "", sex: "UNKNOWN", birth_date: "", neutered: "unknown", weight_note: "" });
      Taro.showToast({ title: "已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar() {
    if (!current?.id || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const platform = getPlatform();
      const paths = await platform.media.chooseImage(1);
      const filePath = paths[0];
      if (!filePath) return;
      const uploaded = await platform.uploader.uploadImage(current.id, filePath);
      await api.put(`/pets/${current.id}/avatar`, { artifact_id: uploaded.artifact_id });
      await refresh();
      Taro.showToast({ title: "头像已更新", icon: "success" });
    } catch {
      Taro.showToast({ title: "头像更新失败", icon: "none" });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function recomputeBaseline() {
    if (!petId || baselineBusy) return;
    setBaselineBusy(true);
    try {
      await api.post(`/pets/${petId}/baseline/recompute?window_days=14`, {});
      const rows = await api.get<BaselineRow[]>(`/pets/${petId}/baseline`);
      setBaseline(rows);
      setBaselineState("ready");
      Taro.showToast({ title: "常态已更新", icon: "success" });
    } catch {
      setBaselineState("error");
      Taro.showToast({ title: "暂时无法计算", icon: "none" });
    } finally {
      setBaselineBusy(false);
    }
  }

  async function addIdentifier() {
    if (!current?.id || !identifierValue.trim() || identifierBusy) return;
    setIdentifierBusy(true);
    try {
      await api.post(`/pets/${current.id}/identifiers`, {
        identifier_type: identifierType,
        value: identifierValue.trim(),
        source_type: "OWNER_REPORTED",
        verify: false,
      });
      setIdentifiers(await api.get<IdentifierRow[]>(`/pets/${current.id}/identifiers`));
      setIdentifierValue("");
      Taro.showToast({ title: "标识已记录", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法记录标识", icon: "none" });
    } finally {
      setIdentifierBusy(false);
    }
  }

  async function saveDietProfile() {
    if (!current?.id || dietBusy) return;
    setDietBusy(true);
    try {
      await api.put(`/pets/${current.id}/diet-profile`, {
        current_food: diet.current_food.trim(),
        allergies: diet.allergies.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
        feeding_rules: diet.feeding_rules.trim(),
        vet_advised: diet.vet_advised,
        source_type: "OWNER_REPORTED",
      });
      setDietState("ready");
      Taro.showToast({ title: "饮食档案已保存", icon: "success" });
    } catch {
      setDietState("error");
      Taro.showToast({ title: "暂时无法保存饮食档案", icon: "none" });
    } finally {
      setDietBusy(false);
    }
  }

  async function saveLifecycle() {
    if (!current?.id || lifecycleBusy || lifecycleStatus === current.lifecycle_status) return;
    setLifecycleBusy(true);
    try {
      await api.post(`/pets/${current.id}/status`, {
        status: lifecycleStatus,
        note: lifecycleNote.trim(),
      });
      setLifecycleNote("");
      refresh();
      Taro.showToast({ title: "生命状态已保存", icon: "success" });
    } catch {
      setLifecycleStatus(current.lifecycle_status ?? "ACTIVE");
      Taro.showToast({ title: "暂时无法保存状态", icon: "none" });
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function saveEdit() {
    if (!current?.id || !editForm.name.trim() || editBusy) return;
    setEditBusy(true);
    try {
      await api.patch(`/pets/${current.id}`, {
        name: editForm.name.trim(),
        breed: editForm.breed.trim(),
        sex: editForm.sex,
        birth_date: editForm.birth_date || null,
        neutered: editForm.neutered === "unknown" ? null : editForm.neutered === "yes",
        weight_note: editForm.weight_note.trim(),
      });
      refresh();
      setShowEdit(false);
      Taro.showToast({ title: "档案已保存", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法保存，请稍后重试", icon: "none" });
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <View className="page">
      {pets && pets.length > 1 && (
        <View className="chips" style={{ marginTop: 8 }}>
          {pets.map((p) => (
            <View
              key={p.id}
              className={`chip${p.id === petId ? " chip-active" : ""}`}
              onClick={() => choose(p.id)}
            >
              {p.name}
            </View>
          ))}
        </View>
      )}

      {!current ? (
        <EmptyState
          title="还没有宠物"
          body="为第一位家庭成员创建档案，从这里开始记录每一天。"
          actionLabel="＋ 新建宠物"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <>
          <PetHero pet={current} headline="它的生活，从这里看见" identity={identityLine(current)} />

          <View className="open-section" data-testid="pli.mini.pet.recent">
            <View className="section-title">
              {current.name}最近
              <Text className="section-caption">真实记录</Text>
            </View>
            <View className="life-row">
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">
                    {eventsState === "error"
                      ? "最近记录暂时没有加载成功"
                      : (events ?? []).length
                        ? eventTypeLabel((events ?? [])[0].event_type)
                        : "还没有生活记录"}
                  </Text>
                  <Text className="life-row-time">
                    {eventsState === "ready" && (events ?? []).length
                      ? new Date((events ?? [])[0].occurred_at).toLocaleDateString()
                      : ""}
                  </Text>
                </View>
                <View className="life-row-detail">
                  {eventsState === "error"
                    ? "不会把加载失败显示成“没有变化”。"
                    : (events ?? []).length
                      ? "从它真实发生的生活继续往下看。"
                      : "第一次进食、散步、健康或互动记录会从这里开始。"}
                </View>
              </View>
            </View>
          </View>

          <View className="open-section">
            <View className="section-title">生活</View>
            {domains.map((d) => (
              <View className="life-row" key={d.label} onClick={() => Taro.navigateTo({ url: d.url })}>
                <View className="life-dot" />
                <View className="life-row-body">
                  <View className="life-row-head">
                    <Text className="life-row-type">{d.label}</Text>
                    <Text className="life-row-time">›</Text>
                  </View>
                  <View className="life-row-detail">{d.hint}</View>
                </View>
              </View>
            ))}
          </View>

          <View className="open-section" data-testid="pli.mini.pet.avatar">
            <View className="section-title">
              头像与视觉档案
              <Text className="section-caption">{current.avatar_artifact_id ? "已设置" : "未设置"}</Text>
            </View>
            <View className="life-empty-note">
              头像只使用你明确选择并上传的图片；它与 3D 形象分开保存，不会被系统自动替换。
            </View>
            <Button className="btn" disabled={avatarBusy} onClick={() => void chooseAvatar()}>
              {avatarBusy ? "上传中…" : current.avatar_artifact_id ? "更换头像" : "选择头像"}
            </Button>
          </View>

          <View className="open-section" data-testid="pli.mini.pet.profile">
            <View className="section-title" onClick={() => setShowEdit((value) => !value)}>
              宠物档案
              <Text className="section-caption">{showEdit ? "收起" : "编辑档案"}</Text>
            </View>
            <View className="life-row-detail">物种：{speciesLabel(current.species)} · 创建后不在这里修改动物种类。</View>
            {showEdit ? (
              <View className="soft-panel">
                <View className="field">
                  <Text>名字 *</Text>
                  <Input className="input" value={editForm.name} onInput={(event) => setEditForm({ ...editForm, name: event.detail.value })} placeholder="宠物名字" />
                </View>
                <View className="field">
                  <Text>品种</Text>
                  <Input className="input" value={editForm.breed} onInput={(event) => setEditForm({ ...editForm, breed: event.detail.value })} placeholder="如 柯基" />
                </View>
                <View className="field">
                  <Text>性别</Text>
                  <Picker mode="selector" range={["雌性", "雄性", "未知"]} onChange={(event) => setEditForm({ ...editForm, sex: ["FEMALE", "MALE", "UNKNOWN"][Number(event.detail.value)] })}>
                    <View className="input">{sexLabelZh(editForm.sex) || "未知"}</View>
                  </Picker>
                </View>
                <View className="field">
                  <Text>生日</Text>
                  <Input className="input" value={editForm.birth_date} onInput={(event) => setEditForm({ ...editForm, birth_date: event.detail.value })} placeholder="YYYY-MM-DD" />
                </View>
                <View className="field">
                  <Text>已绝育</Text>
                  <Picker mode="selector" range={["未知", "是", "否"]} onChange={(event) => setEditForm({ ...editForm, neutered: ["unknown", "yes", "no"][Number(event.detail.value)] })}>
                    <View className="input">{editForm.neutered === "yes" ? "是" : editForm.neutered === "no" ? "否" : "未知"}</View>
                  </Picker>
                </View>
                <View className="field">
                  <Text>体重备注</Text>
                  <Input className="input" value={editForm.weight_note} onInput={(event) => setEditForm({ ...editForm, weight_note: event.detail.value })} placeholder="如 12kg" />
                </View>
                <Button className="btn btn-primary" disabled={editBusy || !editForm.name.trim()} onClick={() => void saveEdit()}>
                  {editBusy ? "保存中…" : "保存档案"}
                </Button>
              </View>
            ) : null}
          </View>

          <View className="open-section" data-testid="pli.mini.pet.identifiers">
            <View className="section-title">
              身份标识
              <Text className="section-caption">主人记录</Text>
            </View>
            <View className="life-empty-note">芯片、护照或纹身标识可以帮助确认身份；手工录入不会自动标记为已验证。</View>
            {identifiers.length ? identifiers.map((row) => (
              <View className="life-row" key={row.identifier_id}>
                <View className="life-row-body">
                  <View className="life-row-head">
                    <Text className="life-row-type">{IDENTIFIER_TYPES.find(([value]) => value === row.identifier_type)?.[1] ?? "身份标识"}</Text>
                    <Text className="life-row-time">{row.verified ? "已验证" : "未验证"}</Text>
                  </View>
                  <View className="life-row-detail">{row.value}</View>
                </View>
              </View>
            )) : <View className="life-empty-note">还没有记录身份标识。</View>}
            <View className="field">
              <Text>标识类型</Text>
              <Picker
                mode="selector"
                range={IDENTIFIER_TYPES.map(([, label]) => label)}
                onChange={(event) => setIdentifierType(IDENTIFIER_TYPES[Number(event.detail.value)]?.[0] ?? "CHIP")}
              >
                <View className="input">{IDENTIFIER_TYPES.find(([value]) => value === identifierType)?.[1] ?? "芯片号"}</View>
              </Picker>
            </View>
            <View className="field">
              <Text>标识内容</Text>
              <Input className="input" value={identifierValue} onInput={(event) => setIdentifierValue(event.detail.value)} placeholder="按原件或芯片读取结果填写" />
            </View>
            <Button className="btn" disabled={identifierBusy || !identifierValue.trim()} onClick={() => void addIdentifier()}>
              {identifierBusy ? "记录中…" : "记录标识"}
            </Button>
          </View>

          <View className="open-section" data-testid="pli.mini.pet.diet">
            <View className="section-title">
              饮食档案
              <Text className="section-caption">主人维护</Text>
            </View>
            <View className="life-empty-note">记录实际主食、已知过敏和家庭喂养规则；不会把主人填写的内容显示成专业确认。</View>
            {dietState === "loading" ? <View className="state">正在读取饮食档案……</View> : null}
            {dietState === "error" ? <View className="state state-error">饮食档案暂时没有加载成功；不会用默认饮食替代真实记录。</View> : null}
            <View className="field">
              <Text>当前主食</Text>
              <Input className="input" value={diet.current_food} onInput={(event) => setDiet({ ...diet, current_food: event.detail.value })} placeholder="例如：鸡肉配方犬粮" />
            </View>
            <View className="field">
              <Text>已知过敏/不耐受</Text>
              <Input className="input" value={diet.allergies} onInput={(event) => setDiet({ ...diet, allergies: event.detail.value })} placeholder="多项用逗号分隔；没有确认过就留空" />
            </View>
            <View className="field">
              <Text>喂养规则</Text>
              <Input className="input" value={diet.feeding_rules} onInput={(event) => setDiet({ ...diet, feeding_rules: event.detail.value })} placeholder="只记录当前真实执行方式" />
            </View>
            <View
              className={`chip${diet.vet_advised ? " chip-active" : ""}`}
              onClick={() => setDiet({ ...diet, vet_advised: !diet.vet_advised })}
            >
              {diet.vet_advised ? "✓ " : ""}主人记录：按兽医建议执行
            </View>
            <View className="life-row-source">此标记是主人记录，不等于平台已经获得兽医专业确认。</View>
            <Button className="btn" disabled={dietBusy || dietState === "loading"} onClick={() => void saveDietProfile()}>
              {dietBusy ? "保存中…" : "保存饮食档案"}
            </Button>
          </View>

          <View className="open-section" data-testid="pli.mini.pet.lifecycle">
            <View className="section-title">
              生命状态
              <Text className="section-caption">会写入时间线</Text>
            </View>
            <View className="life-empty-note">状态变化会保留审计；“已离世”为终态，只在确认事实后记录。</View>
            <Picker
              mode="selector"
              disabled={current.lifecycle_status === "DECEASED"}
              range={LIFECYCLE_OPTIONS.map(([, label]) => label)}
              onChange={(event) => setLifecycleStatus(LIFECYCLE_OPTIONS[Number(event.detail.value)]?.[0] ?? "ACTIVE")}
            >
              <View className="input">{LIFECYCLE_OPTIONS.find(([value]) => value === lifecycleStatus)?.[1] ?? "正常生活中"}</View>
            </Picker>
            <Input
              className="input"
              disabled={current.lifecycle_status === "DECEASED"}
              value={lifecycleNote}
              onInput={(event) => setLifecycleNote(event.detail.value)}
              placeholder="备注（可选，只写确认过的事实）"
            />
            <Button
              className="btn"
              disabled={lifecycleBusy || lifecycleStatus === current.lifecycle_status || current.lifecycle_status === "DECEASED"}
              onClick={() => void saveLifecycle()}
            >
              {current.lifecycle_status === "DECEASED" ? "已记录为离世" : lifecycleBusy ? "保存中…" : "保存生命状态"}
            </Button>
          </View>

          <View className="open-section" data-testid="pli.mini.pet.baseline">
            <View className="section-title">
              它的常态
              <Text className="section-caption">最近 14 天</Text>
            </View>
            <View className="life-empty-note">用真实生活记录形成可解释基线，只和它自己比较；没有足够记录时不会猜测。</View>
            {baselineState === "ready" && baseline.length ? baseline.map((row) => {
              const meta = BASELINE_LABELS[row.metric] ?? { label: "生活基线", suffix: "" };
              return (
                <View className="life-row" key={row.metric}>
                  <View className="life-row-body">
                    <View className="life-row-head">
                      <Text className="life-row-type">{meta.label}</Text>
                      <Text className="life-row-time">{row.value}{meta.suffix}</Text>
                    </View>
                    <View className="life-row-source">{row.sample_count} 天真实样本 · {row.window_days} 天窗口</View>
                  </View>
                </View>
              );
            }) : baselineState === "ready" ? (
              <View className="life-empty-note">还没有足够的生活记录形成常态。继续真实记录后再计算。</View>
            ) : baselineState === "error" ? (
              <View className="state state-error">常态暂时没有加载成功；不会把未知显示成正常。</View>
            ) : (
              <View className="state">正在读取常态……</View>
            )}
            <Button className="btn" disabled={baselineBusy} onClick={() => void recomputeBaseline()}>
              {baselineBusy ? "计算中…" : "重新计算常态"}
            </Button>
          </View>

          <View className="soft-panel" data-testid="pli.mini.pet.twin-status">
            <View className="section-title">
              3D 形象
              <Text className="section-caption">{twinState === "error" ? "状态未知" : activeTwin ? "已确认" : "轻量查看"}</Text>
            </View>
            <View className="life-row-detail">{twinStatusCopy}</View>
            <View className="life-row-source">
              小程序保留轻量生活视图；交互式高保真 3D 请在支持的 Web / Android 客户端查看与确认。
            </View>
            <View
              className="secondary-action"
              style={{ marginTop: 12 }}
              onClick={() => Taro.navigateTo({ url: "/pages/pets/life-view/index" })}
            >
              查看生命视图
            </View>
          </View>

          <View className="open-section">
            <View className="section-title">陪伴与在家</View>
            <View className="life-row" onClick={() => Taro.navigateTo({ url: "/pages/monitoring/index" })}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">在家</Text>
                  <Text className="life-row-time">›</Text>
                </View>
                <View className="life-row-detail">查看真实设备连接与最近一次同步状态；没有设备时不会模拟在线。</View>
              </View>
            </View>
            <View className="life-row" onClick={() => Taro.navigateTo({ url: "/pages/companion/index" })}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">陪伴</Text>
                  <Text className="life-row-time">›</Text>
                </View>
                <View className="life-row-detail">连接支持的设备后，在不打扰它的前提下观察、理解并适度互动。</View>
              </View>
            </View>
          </View>
        </>
      )}

      <View className="open-section">
        <View
          className="section-title"
          onClick={() => setShowCreate((v) => !v)}
        >
          宠物档案
          <Text className="section-caption">{showCreate ? "收起" : "＋ 新建宠物"}</Text>
        </View>
        {showCreate && (
          <View className="card">
            <View className="field">
              <Text>名字 *</Text>
              <Input className="input" value={form.name} onInput={(e) => setForm({ ...form, name: e.detail.value })} placeholder="宠物名字" />
            </View>
            <View className="field">
              <Text>物种</Text>
              <Picker mode="selector" range={["狗", "猫", "其他"]} onChange={(e) => setForm({ ...form, species: ["dog", "cat", "other"][Number(e.detail.value)] })}>
                <View className="input">{speciesLabel(form.species)}</View>
              </Picker>
            </View>
            <View className="field">
              <Text>品种</Text>
              <Input className="input" value={form.breed} onInput={(e) => setForm({ ...form, breed: e.detail.value })} placeholder="如 柯基" />
            </View>
            <View className="field">
              <Text>性别</Text>
              <Picker mode="selector" range={["雌性", "雄性", "未知"]} onChange={(e) => setForm({ ...form, sex: ["FEMALE", "MALE", "UNKNOWN"][Number(e.detail.value)] })}>
                <View className="input">{sexLabelZh(form.sex) || "未知"}</View>
              </Picker>
            </View>
            <View className="field">
              <Text>体重备注</Text>
              <Input className="input" value={form.weight_note} onInput={(e) => setForm({ ...form, weight_note: e.detail.value })} placeholder="如 12kg" />
            </View>
            <Button className="btn btn-primary" onClick={create} disabled={busy}>
              {busy ? "创建中…" : "创建"}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}
