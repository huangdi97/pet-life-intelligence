"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@pli/api-client";
import { useCurrentPet } from "../../../lib/hooks";
import { ErrorNote } from "../../../components/ui";

/** Surface 1: Onboarding / Create Pet (PLI-001/002). */
export default function CreatePetPage() {
  const router = useRouter();
  const { choose } = useCurrentPet();
  const [form, setForm] = useState({
    name: "",
    species: "dog",
    breed: "",
    sex: "UNKNOWN",
    birth_date: "",
    neutered: "",
    weight_note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setValidation(null);
    if (!form.name.trim()) {
      setValidation("名字必填。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const pet = await api.post<{ id: string }>("/pets", {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed,
        sex: form.sex,
        birth_date: form.birth_date || null,
        neutered: form.neutered === "" ? null : form.neutered === "yes",
        weight_note: form.weight_note,
      });
      choose(pet.id);
      window.dispatchEvent(new Event("pli-pet-changed"));
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>创建宠物档案</h1>
      <p className="sub">建立宠物唯一身份（PLI-001）。之后可在家庭中管理多宠（PLI-002）。</p>
      <div className="card">
        <label className="field">
          名字 *
          <input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            物种
            <select value={form.species} onChange={(e) => set("species", e.target.value)}>
              <option value="dog">狗</option>
              <option value="cat">猫</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label className="field">
            品种
            <input value={form.breed} onChange={(e) => set("breed", e.target.value)} />
          </label>
          <label className="field">
            性别
            <select value={form.sex} onChange={(e) => set("sex", e.target.value)}>
              <option value="FEMALE">雌性</option>
              <option value="MALE">雄性</option>
              <option value="UNKNOWN">未知</option>
            </select>
          </label>
          <label className="field">
            生日
            <input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </label>
          <label className="field">
            已绝育
            <select value={form.neutered} onChange={(e) => set("neutered", e.target.value)}>
              <option value="">未知</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </label>
          <label className="field">
            体重备注
            <input value={form.weight_note} onChange={(e) => set("weight_note", e.target.value)} placeholder="如 12kg" />
          </label>
        </div>
        {validation && <div className="alert warn">{validation}</div>}
        <ErrorNote message={error} />
        <button className="btn primary" onClick={submit} disabled={busy}>
          {busy ? "创建中…" : "创建"}
        </button>
      </div>
    </main>
  );
}
