"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type Pet } from "@pli/api-client";
import { ErrorNote } from "../../../../components/ui";
import { breedLabel } from "../../../../lib/ownerLabels";

interface DietProfile {
  current_food: string;
  allergies: string[];
  feeding_rules: string;
  vet_advised: boolean;
  source_type: string;
}
interface DietProfileResponse {
  pet_id: string;
  profile: DietProfile | null;
}

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
  const [diet, setDiet] = useState({
    current_food: "",
    allergies: "",
    feeding_rules: "",
    vet_advised: false,
  });
  const [dietState, setDietState] = useState<"loading" | "ready" | "error">("loading");
  const [dietBusy, setDietBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

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
    setDietState("loading");
    api.get<DietProfileResponse>(`/pets/${id}/diet-profile`)
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
        if (!alive) return;
        setDietState("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !pet?.avatar_artifact_id) {
      setAvatarUri(null);
      return;
    }
    let alive = true;
    api
      .get<{ avatar_artifact_id: string | null; data_url: string | null }>(`/pets/${id}/avatar`)
      .then((row) => {
        if (alive) setAvatarUri(row.data_url ?? null);
      })
      .catch(() => {
        if (alive) setAvatarUri(null);
      });
    return () => {
      alive = false;
    };
  }, [id, pet?.avatar_artifact_id]);

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

  async function setAvatarFile(file: File | null) {
    if (!id || !file || avatarBusy) return;
    if (!file.type.startsWith("image/")) {
      setError("头像必须是图片文件。");
      return;
    }
    setAvatarBusy(true);
    setError(null);
    try {
      const uploaded = await api.upload<{ artifact_id: string }>(`/pets/${id}/artifacts`, file);
      const updated = await api.put<Pet>(`/pets/${id}/avatar`, { artifact_id: uploaded.artifact_id });
      setPet(updated);
      const avatar = await api.get<{ data_url: string | null }>(`/pets/${id}/avatar`);
      setAvatarUri(avatar.data_url ?? null);
      window.dispatchEvent(new Event("pli-pet-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAvatarBusy(false);
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

  async function saveDietProfile() {
    if (!id || dietBusy) return;
    setDietBusy(true);
    setError(null);
    try {
      await api.put(`/pets/${id}/diet-profile`, {
        current_food: diet.current_food.trim(),
        allergies: diet.allergies
          .split(/[、,，]/)
          .map((item) => item.trim())
          .filter(Boolean),
        feeding_rules: diet.feeding_rules.trim(),
        vet_advised: diet.vet_advised,
        source_type: "OWNER_REPORTED",
      });
      setDietState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDietState("error");
    } finally {
      setDietBusy(false);
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
          <section className="v4-card" style={{ marginTop: 20 }} data-testid="pli.pet.profile.avatar">
            <h2>头像与视觉档案</h2>
            <p className="sub">头像只使用你明确选择并上传的图片；它与 3D 形象分开保存，不会被系统自动替换。</p>
            <div className="row" style={{ alignItems: "center", gap: 16 }}>
              <div
                role="img"
                aria-label={`${pet.name}的头像`}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 28,
                  overflow: "hidden",
                  background: "var(--v4-brand-soft)",
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 auto",
                }}
              >
                {avatarUri ? (
                  <img src={avatarUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="v4-note">{pet.species === "cat" ? "猫" : pet.species === "dog" ? "犬" : "宠物"}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p className="v4-note">
                  {pet.avatar_artifact_id ? "当前头像保存在这只宠物的受保护媒体中。" : "还没有设置真实头像。"}
                </p>
                <label className="btn" style={{ display: "inline-flex", cursor: avatarBusy ? "default" : "pointer" }}>
                  {avatarBusy ? "上传中…" : pet.avatar_artifact_id ? "更换头像" : "选择头像"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={avatarBusy}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      void setAvatarFile(file);
                      event.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                    data-testid="pli.pet.profile.avatar-input"
                  />
                </label>
              </div>
            </div>
          </section>

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

          <section className="v4-card" style={{ marginTop: 20 }} data-testid="pli.pet.profile.diet">
            <h2>饮食档案</h2>
            <p className="sub">
              记录它实际在吃什么、已知过敏和家庭喂养规则。这里是主人维护的事实档案，不做商品推荐，也不会把“按兽医建议执行”冒充专业确认。
            </p>
            {dietState === "loading" ? <p className="v4-note">正在读取饮食档案……</p> : null}
            {dietState === "error" ? <p className="v4-note">饮食档案暂时没有加载成功；不会用默认饮食替代真实记录。</p> : null}
            <label className="field">
              当前主食
              <input value={diet.current_food} onChange={(e) => setDiet({ ...diet, current_food: e.target.value })} placeholder="例如：鸡肉配方犬粮" />
            </label>
            <label className="field">
              已知过敏/不耐受
              <input value={diet.allergies} onChange={(e) => setDiet({ ...diet, allergies: e.target.value })} placeholder="多项用逗号分隔；没有确认过就留空" />
            </label>
            <label className="field">
              喂养规则
              <textarea value={diet.feeding_rules} onChange={(e) => setDiet({ ...diet, feeding_rules: e.target.value })} rows={3} placeholder="例如：每日两次；只记录当前真实执行方式" />
            </label>
            <label className="v4-check">
              <input
                type="checkbox"
                checked={diet.vet_advised}
                onChange={(e) => setDiet({ ...diet, vet_advised: e.target.checked })}
              />
              <span>主人记录：当前方案是按兽医建议执行</span>
            </label>
            <p className="v4-note">勾选只表示主人这样记录，不等于平台已取得兽医专业确认。</p>
            <button className="btn" onClick={() => void saveDietProfile()} disabled={dietBusy || dietState === "loading"}>
              {dietBusy ? "保存中…" : "保存饮食档案"}
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
