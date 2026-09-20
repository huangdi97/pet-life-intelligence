import { useEffect, useState } from "react";
import { View, Text, Button, Input, Picker } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type Pet } from "../../services/api";
import { speciesLabel, sexLabel } from "../../utils/format";
import { getPlatform } from "../../platform/index";

export default function Pets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
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

  const load = () => {
    setState("loading");
    api
      .get<Pet[]>("/pets")
      .then((rows) => {
        setPets(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  };

  useEffect(load, []);

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
      getPlatform().storage.set("pli_current_pet", pet.id);
      setShowCreate(false);
      setForm({ name: "", species: "dog", breed: "", sex: "UNKNOWN", birth_date: "", neutered: "unknown", weight_note: "" });
      load();
      Taro.showToast({ title: "已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="page">
      <View className="h1">宠物</View>
      <View className="sub">宠物档案与家庭</View>

      <Button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "收起" : "＋ 新建宠物"}
      </Button>

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
            <Input className="input" value={form.breed} onInput={(e) => setForm({ ...form, breed: e.detail.value })} placeholder="如 金毛" />
          </View>
          <View className="field">
            <Text>性别</Text>
            <Picker mode="selector" range={["雌性", "雄性", "未知"]} onChange={(e) => setForm({ ...form, sex: ["FEMALE", "MALE", "UNKNOWN"][Number(e.detail.value)] })}>
              <View className="input">{sexLabel(form.sex)}</View>
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

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={load}>重试</Button>
        </View>
      )}
      {state === "ready" && pets.length === 0 && <View className="state">还没有宠物。</View>}
      {pets.map((p) => (
        <View className="card" key={p.id}>
          <Text style={{ fontSize: 32, fontWeight: 600 }}>{p.name}</Text>
          <View className="muted">
            {speciesLabel(p.species)}
            {p.breed ? ` · ${p.breed}` : ""}
            {p.sex ? ` · ${sexLabel(p.sex)}` : ""}
            {p.birth_date ? ` · 出生 ${p.birth_date}` : ""}
          </View>
          <Button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={() => Taro.navigateTo({ url: `/pages/pets/life-view/index` })}
          >
            生命视图
          </Button>
        </View>
      ))}
    </View>
  );
}