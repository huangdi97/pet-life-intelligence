"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Pet } from "@pli/api-client";
import { ErrorNote } from "../../../../components/ui";
import { breedLabel } from "../../../../lib/ownerLabels";

interface FormState {
  name: string;
  breed: string;
  sex: string;
  birth_date: string;
  neutered: string;
  weight_note: string;
  timezone: string;
}

const EMPTY: FormState = {
  name: "",
  breed: "",
  sex: "UNKNOWN",
  birth_date: "",
  neutered: "",
  weight_note: "",
  timezone: "Asia/Shanghai",
};

/** Owner Pet Profile edit — identity fields only; species stays immutable. */
export default function EditPetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [pet, setPet] = useState<Pet | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState("loading");
    api.get<Pet>(`/pets/${id}`)
      .then((row) => {
        if (!alive) return;
        setPet(row);
        setForm({
          name: row.name ?? "",
          breed: row.breed ?? "",
          sex: row.sex ?? "UNKNOWN",
          birth_date: row.birth_date ?? "",
          neutered: row.neutered == null ? "" : row.neutered ? "yes" : "no",
          weight_note: row.weight_note ?? "",
          timezone: row.timezone ?? "Asia/Shanghai",
        });
        setState("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!id || busy) return;
    if (!form.name.trim()) {
      setError("名字必填。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/pets/${id}`, {
        name: form.name.trim(),
        breed: form.breed.trim(),
        sex: form.sex,
        birth_date: form.birth_date || null,
        neutered: form.neutered === "" ? null : form.neutered === "yes",
        weight_note: form.weight_note.trim(),
        timezone: form.timezone.trim() || "Asia/Shanghai",
      });
      window.dispatchEvent(new Event("pli-pet-changed"));
      router.push(`/pets/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede">
        <h1>编辑宠物档案</h1>
        <p className="sub">只修改已确认的身份资料；已有生活、健康和照护记录仍属于同一只宠物。</p>
      </div>

      {state === "loading" ? <div className="v4-loading" role="status">加载中……</div> : null}
      {state === "error" ? <ErrorNote message={error} /> : null}

      {state === "ready" && pet ? (
        <section className="v5-form-surface" data-testid="pli.pet.profile.edit">
          <div className="v4-note" style={{ marginBottom: 12 }}>
            物种：{pet.species === "dog" ? "狗" : pet.species === "cat" ? "猫" : "其他"} · 创建后不在这里改动物种类。
          </div>
          <label className="field">
            名字 *
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <div className="grid2">
            <label className="field">
              品种
              <input value={form.breed} onChange={(e) => set("breed", e.target.value)} placeholder={breedLabel(pet.breed) || "未填写"} />
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
            <label className="field">
              时区
              <input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Shanghai" />
            </label>
          </div>
          <ErrorNote message={error} />
          <div className="row">
            <button className="btn primary" onClick={() => void save()} disabled={busy}>
              {busy ? "保存中…" : "保存档案"}
            </button>
            <button className="btn" onClick={() => router.back()} disabled={busy}>取消</button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
