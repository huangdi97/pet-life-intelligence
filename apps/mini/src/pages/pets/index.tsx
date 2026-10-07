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
import { EmptyState } from "../../components/feedback/Feedback";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

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
