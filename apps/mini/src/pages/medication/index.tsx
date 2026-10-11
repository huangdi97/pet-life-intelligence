import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";

interface Dose {
  dose_id: string;
  planned_at: string;
  status: string;
  given_at: string | null;
  given_by: string | null;
}

interface Plan {
  plan_id: string;
  medicine_name: string;
  dose_text: string;
  route: string;
  frequency_text: string;
  status: string;
  source_type: string;
  source_note: string;
  start_date: string;
  end_date: string | null;
  doses: Dose[];
}

function planStatusLabel(status: string): string {
  if (status === "ACTIVE") return "进行中";
  if (status === "ENDED" || status === "COMPLETED") return "已结束";
  if (status === "CANCELLED" || status === "INACTIVE") return "已停用";
  return "状态已记录";
}

function doseStatusLabel(status: string): string {
  if (status === "PENDING") return "待给药";
  if (status === "GIVEN") return "已给药";
  if (status === "SKIPPED") return "已跳过";
  if (status === "MISSED") return "已遗漏";
  return "状态已记录";
}

function sourceLabel(source: string): string {
  if (source === "PROFESSIONAL_CONFIRMED") return "兽医确认";
  if (source === "OWNER_REPORTED") return "主人记录";
  if (source === "LAB_CONFIRMED") return "检验确认";
  return "来源已记录";
}

export default function Medication() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ medicine_name: "", dose_text: "", frequency_text: "" });

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<Plan[]>(`/pets/${pid}/medication-plans`)
      .then((rows) => {
        setPlans(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">用药</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function create() {
    if (!form.medicine_name.trim() || !form.dose_text.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/medication-plans`, {
        medicine_name: form.medicine_name.trim(),
        dose_text: form.dose_text.trim(),
        frequency_text: form.frequency_text.trim(),
        source_type: "OWNER_REPORTED",
        source_note: "小程序录入",
      });
      setShowCreate(false);
      setForm({ medicine_name: "", dose_text: "", frequency_text: "" });
      load(petId);
      Taro.showToast({ title: "已添加", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    }
  }

  async function giveDose(planId: string, doseId: string) {
    try {
      await api.post(`/medication-plans/${planId}/administrations`, { planned_dose_id: doseId });
      if (petId) load(petId);
      Taro.showToast({ title: "已记录给药", icon: "success" });
    } catch {
      // The API protects duplicate administrations. Never overwrite the first
      // record from Mini; refresh so the owner sees the canonical state.
      if (petId) load(petId);
      Taro.showToast({ title: "未重复记录，请核对当前状态", icon: "none" });
    }
  }

  async function skipDose(planId: string, doseId: string) {
    try {
      await api.post(`/medication-plans/${planId}/skip`, {
        planned_dose_id: doseId,
        note: "主人通过小程序记录为本次跳过",
      });
      if (petId) load(petId);
      Taro.showToast({ title: "已记录本次跳过", icon: "success" });
    } catch {
      // GIVEN is immutable through the skip endpoint; refresh rather than
      // presenting a fake successful override.
      if (petId) load(petId);
      Taro.showToast({ title: "无法改为跳过，请核对给药记录", icon: "none" });
    }
  }

  return (
    <View className="page">
      <View className="h1">用药</View>
      <View className="sub">剂量以兽医处方为准 · 系统不自动改药</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && plans.length === 0 && <View className="state">还没有用药计划。</View>}
      {plans.map((p) => (
        <View className="soft-panel" key={p.plan_id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{p.medicine_name}</Text>
            <Text className="badge">{planStatusLabel(p.status)}</Text>
          </View>
          <View className="muted">
            {p.dose_text} · {p.frequency_text || "频次未填"}
            {p.source_type ? ` · 来源：${sourceLabel(p.source_type)}` : ""}
          </View>
          {p.doses.filter((d) => d.status === "PENDING").length > 0 && (
            <View style={{ marginTop: 12 }}>
              {p.doses
                .filter((d) => d.status === "PENDING")
                .slice(0, 3)
                .map((d) => (
                  <View className="row" key={d.dose_id} style={{ margin: "6px 0", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text className="muted" style={{ display: "block" }}>{fmtTime(d.planned_at)}</Text>
                      <Text className="muted" style={{ display: "block" }}>{doseStatusLabel(d.status)}</Text>
                    </View>
                    <View className="row" style={{ gap: 6 }}>
                      <Button className="btn" size="mini" onClick={() => giveDose(p.plan_id, d.dose_id)}>
                        记录给药
                      </Button>
                      <Button className="btn" size="mini" onClick={() => skipDose(p.plan_id, d.dose_id)}>
                        跳过本次
                      </Button>
                    </View>
                  </View>
                ))}
            </View>
          )}
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: 600 }}>最近给药记录</Text>
            {p.doses.length === 0 ? (
              <Text className="muted" style={{ display: "block", marginTop: 6 }}>还没有剂量记录。</Text>
            ) : (
              p.doses.slice(0, 6).map((d) => (
                <View className="row" key={`history-${d.dose_id}`} style={{ marginTop: 6, justifyContent: "space-between" }}>
                  <Text className="muted">{doseStatusLabel(d.status)}</Text>
                  <Text className="muted">{fmtTime(d.given_at ?? d.planned_at)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      ))}

      <View className="open-section" data-testid="pli.mini.medication.create">
        <View className="section-title">添加用药计划</View>
        <View className="life-row-source">当前计划与待给药优先；只在有明确处方或来源时录入新计划。</View>
        <Button data-testid="pli.mini.medication.create.toggle" className="btn" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "收起" : "＋ 添加用药计划"}
        </Button>
        
        {showCreate && (
        <View className="soft-panel">
        <View className="field">
        <Text>药物名称 *</Text>
        <Input className="input" value={form.medicine_name} onInput={(e) => setForm({ ...form, medicine_name: e.detail.value })} placeholder="如 阿莫西林" />
        </View>
        <View className="field">
        <Text>剂量文本 *</Text>
        <Input className="input" value={form.dose_text} onInput={(e) => setForm({ ...form, dose_text: e.detail.value })} placeholder="如 1/2 片" />
        </View>
        <View className="field">
        <Text>频次</Text>
        <Input className="input" value={form.frequency_text} onInput={(e) => setForm({ ...form, frequency_text: e.detail.value })} placeholder="如 每日 2 次" />
        </View>
        <Button data-testid="pli.mini.medication.create.submit" className="btn btn-primary" onClick={create} disabled={!form.medicine_name.trim() || !form.dose_text.trim()}>
        保存
        </Button>
        </View>
        )}
        
        
      </View>
    </View>
  );
}