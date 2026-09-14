import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
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

export default function Medication() {
  const { petId } = usePets();
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
      Taro.showToast({ title: "记录失败", icon: "none" });
    }
  }

  return (
    <View className="page">
      <View className="h1">用药</View>
      <View className="sub">剂量以兽医处方为准 · 系统不自动改药</View>

      <Button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "收起" : "＋ 添加用药计划"}
      </Button>

      {showCreate && (
        <View className="card">
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
          <Button className="btn btn-primary" onClick={create} disabled={!form.medicine_name.trim() || !form.dose_text.trim()}>
            保存
          </Button>
        </View>
      )}

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && plans.length === 0 && <View className="state">还没有用药计划。</View>}
      {plans.map((p) => (
        <View className="card" key={p.plan_id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{p.medicine_name}</Text>
            <Text className="badge">{p.status}</Text>
          </View>
          <View className="muted">
            {p.dose_text} · {p.frequency_text || "频次未填"}
            {p.source_type === "PROFESSIONAL_CONFIRMED" ? " · 来源：兽医确认" : ""}
          </View>
          {p.doses.filter((d) => d.status === "PENDING").length > 0 && (
            <View style={{ marginTop: 12 }}>
              {p.doses
                .filter((d) => d.status === "PENDING")
                .slice(0, 3)
                .map((d) => (
                  <View className="row" key={d.dose_id} style={{ margin: "6px 0", justifyContent: "space-between" }}>
                    <Text className="muted">{fmtTime(d.planned_at)}</Text>
                    <Button className="btn" size="mini" onClick={() => giveDose(p.plan_id, d.dose_id)}>
                      记录给药
                    </Button>
                  </View>
                ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}