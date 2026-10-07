"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Pet } from "@pli/api-client";
import { ErrorNote } from "../../../../components/ui";
import { breedLabel } from "../../../../lib/ownerLabels";

interface IdentifierRow {
  identifier_id: string;
  identifier_type: "CHIP" | "PASSPORT" | "TATTOO";
  value: string;
  verified: boolean;
  source_type: string;
}

const IDENTIFIER_LABEL: Record<IdentifierRow["identifier_type"], string> = {
  CHIP: "芯片号",
  PASSPORT: "宠物护照",
  TATTOO: "纹身标识",
};

const LIFECYCLE_OPTIONS = [
  ["ACTIVE", "正常生活中"],
  ["LOST", "走失"],
  ["TRANSFERRED", "已转交"],
  ["DECEASED", "已离世"],
] as const;

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
  const [identifiers, setIdentifiers] = useState<IdentifierRow[]>([]);
  const [identifierType, setIdentifierType] = useState<IdentifierRow["identifier_type"]>("CHIP");
  const [identifierValue, setIdentifierValue] = useState("");
  const [identifierBusy, setIdentifierBusy] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState("ACTIVE");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

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
        setLifecycleStatus(row.lifecycle_status ?? "ACTIVE");
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

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api.get<IdentifierRow[]>(`/pets/${id}/identifiers`)
      .then((rows) => {
        if (alive) setIdentifiers(rows);
      })
      .catch(() => {
        if (alive) setIdentifiers([]);
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

  async function addIdentifier() {
    if (!id || identifierBusy || !identifierValue.trim()) return;
    setIdentifierBusy(true);
    setError(null);
    try {
      await api.post(`/pets/${id}/identifiers`, {
        identifier_type: identifierType,
        value: identifierValue.trim(),
        source_type: "OWNER_REPORTED",
        verify: false,
      });
      setIdentifiers(await api.get<IdentifierRow[]>(`/pets/${id}/identifiers`));
      setIdentifierValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIdentifierBusy(false);
    }
  }

  async function saveLifecycle() {
    if (!id || lifecycleBusy || !pet || lifecycleStatus === pet.lifecycle_status) return;
    const target = lifecycleStatus;
    setLifecycleBusy(true);
    setError(null);
    try {
      await api.post(`/pets/${id}/status`, {
        status: target,
        note: lifecycleNote.trim(),
      });
      setPet({ ...pet, lifecycle_status: target });
      setLifecycleNote("");
      window.dispatchEvent(new Event("pli-pet-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLifecycleStatus(pet.lifecycle_status ?? "ACTIVE");
    } finally {
      setLifecycleBusy(false);
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
          <section className="v4-card" style={{ marginTop: 20 }} data-testid="pli.pet.profile.identifiers">
            <h2>身份标识</h2>
            <p className="sub">这里记录主人提供的芯片号、护照号或纹身标识；“已验证”只代表已有可信验证来源，不会因为手工录入自动变成已验证。</p>
            {identifiers.length ? (
              <div className="v4-list">
                {identifiers.map((row) => (
                  <div className="v4-list-row" key={row.identifier_id}>
                    <div>
                      <strong>{IDENTIFIER_LABEL[row.identifier_type]}</strong>
                      <div className="v4-note">{row.value}</div>
                    </div>
                    <span className="v4-badge">{row.verified ? "已验证" : "主人录入 · 未验证"}</span>
                  </div>
                ))}
              </div>
            ) : <div className="v4-note">还没有记录身份标识。</div>}
            <div className="grid2" style={{ marginTop: 12 }}>
              <label className="field">
                标识类型
                <select value={identifierType} onChange={(e) => setIdentifierType(e.target.value as IdentifierRow["identifier_type"])}>
                  <option value="CHIP">芯片号</option>
                  <option value="PASSPORT">宠物护照</option>
                  <option value="TATTOO">纹身标识</option>
                </select>
              </label>
              <label className="field">
                标识内容
                <input value={identifierValue} onChange={(e) => setIdentifierValue(e.target.value)} placeholder="按原件或芯片读取结果填写" />
              </label>
            </div>
            <button className="btn" onClick={() => void addIdentifier()} disabled={identifierBusy || !identifierValue.trim()}>
              {identifierBusy ? "记录中…" : "记录标识"}
            </button>
          </section>

          <section className="v4-card" style={{ marginTop: 20 }} data-testid="pli.pet.profile.lifecycle">
            <h2>生命状态</h2>
            <p className="sub">状态变化会进入时间线并保留审计。选择“已离世”后不能在产品内恢复，请只在确认事实后使用。</p>
            <label className="field">
              当前状态
              <select value={lifecycleStatus} onChange={(e) => setLifecycleStatus(e.target.value)} disabled={pet.lifecycle_status === "DECEASED"}>
                {LIFECYCLE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              备注（可选）
              <input value={lifecycleNote} onChange={(e) => setLifecycleNote(e.target.value)} placeholder="只记录你确认过的事实" />
            </label>
            <button
              className="btn"
              onClick={() => void saveLifecycle()}
              disabled={lifecycleBusy || lifecycleStatus === pet.lifecycle_status || pet.lifecycle_status === "DECEASED"}
            >
              {lifecycleBusy ? "保存中…" : pet.lifecycle_status === "DECEASED" ? "已记录为离世" : "保存生命状态"}
            </button>
          </section>

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
