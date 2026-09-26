/**
 * 宠物 — Pet World / Pet Identity Page (Stage R.2 §28-30).
 * PetHero 第一焦点；生命视图入口；生活领域以“对这只宠物的意义”呈现，
 * 非功能宫格。数据全部来自真实 API（events / tasks），不编造。
 */
import { useEffect, useState } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent, type Pet } from "../../services/api";
import { speciesLabel } from "../../utils/format";
import { petAgeText, sexLabelZh, eventTypeLabel } from "../../utils/labels";
import { usePets } from "../../utils/usePets";
import { PetHero } from "../../components/pet_visual";
import { EmptyState } from "../../components/feedback/Feedback";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function identityLine(pet: Pet | undefined): string {
  if (!pet) return "宠物生活智能";
  const parts = [speciesLabel(pet.species), pet.breed, petAgeText(pet.birth_date), sexLabelZh(pet.sex)].filter(Boolean);
  return parts.join(" · ");
}

export default function Pets() {
  const { pets, petId, choose, refresh } = usePets();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
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

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  useEffect(() => {
    if (!petId) return;
    api
      .get<{ events: LifeEvent[]; count: number }>(`/pets/${petId}/events`)
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]));
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
  const lastMedication = lastOf("medication.administered");

  const domains: Array<{ label: string; hint: string; url: string }> = [
    {
      label: "健康",
      hint: healthCount7d ? `最近 7 天 · ${healthCount7d} 条记录` : "还没有健康记录",
      url: "/pages/health/index",
    },
    {
      label: "行为",
      hint: lastBehavior ? `最近一次：${String((lastBehavior.payload as Record<string, unknown>)?.behavior ?? eventTypeLabel(lastBehavior.event_type))}` : "还没有行为记录",
      url: "/pages/behavior/index",
    },
    {
      label: "训练",
      hint: lastGoal ? `当前目标：${String((lastGoal.payload as Record<string, unknown>)?.title ?? "训练目标")}` : "还没有训练目标",
      url: "/pages/training/index",
    },
    {
      label: "用药",
      hint: lastMedication ? "最近有给药记录" : "还没有用药记录",
      url: "/pages/medication/index",
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

          <View className="open-section">
            <View className="section-title">生命视图</View>
            <View className="life-row" onClick={() => Taro.navigateTo({ url: "/pages/pets/life-view/index" })}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">看看它</Text>
                  <Text className="life-row-time">›</Text>
                </View>
                <View className="life-row-detail">当前以照片与记录呈现；3D 形象尚未创建。</View>
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
            <View className="life-row" onClick={() => Taro.navigateTo({ url: "/pages/companion/index" })}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">陪伴</Text>
                  <Text className="life-row-time">›</Text>
                </View>
                <View className="life-row-detail">连接支持的设备后，可以在不打扰它的前提下观察和互动。</View>
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
