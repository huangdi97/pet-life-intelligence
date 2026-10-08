"use client";

import { useState } from "react";
import { api, type BehaviorEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

interface PreferenceRow {
  preference_id: string;
  kind: "LIKE" | "DISLIKE" | "ALLERGY_CAUTION" | "REWARD";
  subject: string;
  note: string;
  source_type: string;
}

const PREF_LABEL: Record<PreferenceRow["kind"], string> = {
  LIKE: "喜欢",
  DISLIKE: "回避",
  ALLERGY_CAUTION: "过敏/谨慎",
  REWARD: "奖励",
};

const BEHAVIOR_TEMPLATES = ["吠叫", "抓挠", "破坏物品", "追逐", "躲避", "反复舔咬"] as const;

function topObserved(values: Array<string | null | undefined>, limit = 3): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = (raw ?? "").trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-CN"))
    .slice(0, limit);
}

/** Surface 8: Behavior Event (PLI-069, E2E-07) — ABC records, observable
 *  facts only; the app never auto-converts observations into diagnoses. */
export default function BehaviorPage() {
  const { petId } = useCurrentPet();
  const preferences = useAsync<PreferenceRow[]>(
    () =>
      petId
        ? api.get<PreferenceRow[]>(`/pets/${petId}/preferences`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const list = useAsync<BehaviorEvent[]>(
    () =>
      petId
        ? api.get<BehaviorEvent[]>(`/pets/${petId}/behavior-events`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [form, setForm] = useState({
    occurred_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
    antecedent: "",
    behavior: "",
    consequence: "",
    duration_seconds: "",
    intensity: "",
    environment: "",
    owner_notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "MILD" | "MODERATE" | "SEVERE" | "UNLABELED">("all");
  const [preferenceKind, setPreferenceKind] = useState<"LIKE" | "DISLIKE" | "ALLERGY_CAUTION">("LIKE");
  const [preferenceSubject, setPreferenceSubject] = useState("");
  const [preferenceNote, setPreferenceNote] = useState("");
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [artifactIds, setArtifactIds] = useState<string[]>([]);
  const [artifactNames, setArtifactNames] = useState<string[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function attachBehaviorVideo(file?: File) {
    if (!petId || !file || videoUploading) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setError("行为视频仅支持 MP4 或 WebM。");
      return;
    }
    setVideoUploading(true);
    setError(null);
    try {
      const row = await api.upload<{ artifact_id: string; kind: string }>(`/pets/${petId}/artifacts`, file);
      if (row.kind !== "VIDEO") throw new Error("上传内容没有被识别为视频。");
      setArtifactIds((ids) => [...ids, row.artifact_id].slice(-3));
      setArtifactNames((names) => [...names, file.name || "行为视频"].slice(-3));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVideoUploading(false);
    }
  }

  async function addPreference() {
    if (!petId || !preferenceSubject.trim() || preferenceBusy) return;
    setPreferenceBusy(true);
    setError(null);
    try {
      await api.post(`/pets/${petId}/preferences`, {
        kind: preferenceKind,
        subject: preferenceSubject.trim(),
        note: preferenceNote.trim(),
        source_type: "OWNER_REPORTED",
      });
      setPreferenceSubject("");
      setPreferenceNote("");
      preferences.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreferenceBusy(false);
    }
  }

  async function submit() {
    setValidation(null);
    if (!form.behavior.trim()) {
      setValidation("“观察到的行为”必填。");
      return;
    }
    setError(null);
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date(form.occurred_at).toISOString(),
        antecedent: form.antecedent,
        behavior: form.behavior.trim(),
        consequence: form.consequence,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        intensity: form.intensity,
        environment: form.environment,
        owner_notes: form.owner_notes,
        artifact_ids: artifactIds,
      });
      setForm((f) => ({ ...f, antecedent: "", behavior: "", consequence: "" }));
      setArtifactIds([]);
      setArtifactNames([]);
      list.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const behaviorRows = list.data ?? [];
  const visibleRows = behaviorRows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "UNLABELED") return !row.intensity;
    return row.intensity === filter;
  });
  const topBehaviors = topObserved(behaviorRows.map((row) => row.behavior));
  const topAntecedents = topObserved(behaviorRows.map((row) => row.antecedent));
  const topEnvironments = topObserved(behaviorRows.map((row) => row.environment));

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.behavior.identity">
        <h1>行为记录</h1>
        <p className="sub">
          记录它当时遇到了什么、你实际看到了什么，以及之后发生了什么。系统只保存可观察事实，不会自动推断情绪、疾病或行为诊断。
        </p>
      </div>

      <section className="v4-sec" data-testid="pli.behavior.patterns">
        <h2 className="v4-sec-title">模式与倾向</h2>
        <p className="muted" style={{ margin: "0 0 10px" }}>
          只按真实观察记录做频次汇总；“出现得多”不等于性格、情绪、疾病或诊断。
        </p>
        {topBehaviors.length ? (
          <div className="v4-filter-row" aria-label="常见行为记录">
            {topBehaviors.map((item) => (
              <span className="v4-chip" key={item.label}>{item.label} · {item.count} 次</span>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>还没有足够记录形成可展示的频次。</p>
        )}
      </section>

      <section className="v4-sec" data-testid="pli.behavior.context">
        <h2 className="v4-sec-title">情境与触发</h2>
        <p className="muted" style={{ margin: "0 0 10px" }}>
          这里展示主人记录里反复出现的“发生之前”和环境，只表示共现，不表示因果。
        </p>
        {topAntecedents.length || topEnvironments.length ? (
          <div className="v4-list">
            {topAntecedents.map((item) => (
              <div className="v4-list-row" key={`antecedent-${item.label}`}>
                <span>发生之前 · {item.label}</span><span className="v4-badge">{item.count} 次记录</span>
              </div>
            ))}
            {topEnvironments.map((item) => (
              <div className="v4-list-row" key={`environment-${item.label}`}>
                <span>环境 · {item.label}</span><span className="v4-badge">{item.count} 次记录</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>补充前因或环境后，这里才会出现记录共现。</p>
        )}
      </section>

      <section className="v4-sec" data-testid="pli.behavior.preferences">
        <div className="v4-sec-head">
          <div>
            <h2 className="v4-sec-title">偏好与回避</h2>
            <p className="v4-sec-sub">只保存主人明确观察到的喜欢、回避或过敏谨慎项；不会从单次行为自动推断偏好。</p>
          </div>
        </div>
        <State state={preferences.state} error={preferences.error} onRetry={preferences.reload} empty="还没有偏好记录。">
          <div className="v4-list">
            {(preferences.data ?? []).filter((row) => row.kind !== "REWARD").map((row) => (
              <div className="v4-list-row" key={row.preference_id}>
                <div>
                  <strong>{row.subject}</strong>
                  <div className="v4-note">{row.note || "没有补充说明"}</div>
                </div>
                <span className="v4-badge">{PREF_LABEL[row.kind]} · 主人记录</span>
              </div>
            ))}
          </div>
        </State>
        <div className="v4-filter-row" style={{ marginTop: 12 }}>
          {(["LIKE", "DISLIKE", "ALLERGY_CAUTION"] as const).map((kind) => (
            <button key={kind} type="button" className={`v4-chip ${preferenceKind === kind ? "v4-chip--brand" : ""}`} onClick={() => setPreferenceKind(kind)}>
              {PREF_LABEL[kind]}
            </button>
          ))}
        </div>
        <div className="grid2" style={{ marginTop: 10 }}>
          <label className="field">
            对象
            <input value={preferenceSubject} onChange={(e) => setPreferenceSubject(e.target.value)} placeholder="例如：冻干鸡肉 / 吹风机声音" />
          </label>
          <label className="field">
            补充事实（可选）
            <input value={preferenceNote} onChange={(e) => setPreferenceNote(e.target.value)} placeholder="只写你实际观察到的情况" />
          </label>
        </div>
        <button className="btn" onClick={() => void addPreference()} disabled={preferenceBusy || !preferenceSubject.trim()}>
          {preferenceBusy ? "保存中…" : "记录偏好"}
        </button>
      </section>

      <section className="v4-sec" data-testid="pli.behavior.recent">
        <div className="v4-sec-head">
          <h2 className="v4-sec-title">最近记录</h2>
          <span className="muted">按主人标注的强度筛选</span>
        </div>
        <div className="v4-filter-row" aria-label="行为记录筛选" style={{ marginBottom: 10 }}>
          {[
            ["all", "全部"],
            ["MILD", "轻度"],
            ["MODERATE", "中度"],
            ["SEVERE", "重度"],
            ["UNLABELED", "未标注"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`v4-chip ${filter === value ? "v4-chip--brand" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </button>
          ))}
        </div>
        <State state={list.state} error={list.error} onRetry={list.reload} empty="还没有行为记录。">
          {visibleRows.length === 0 ? <p className="v4-note">当前筛选下没有行为记录。</p> : null}
          <ul className="tl" data-testid="pli.behavior.observations">
            {visibleRows.map((b) => (
              <li key={b.behavior_event_id}>
                <div className="tl-head">
                  <span className="tl-type">{b.behavior}</span>
                  {b.intensity && <span className="badge">{b.intensity === "MILD" ? "轻度" : b.intensity === "MODERATE" ? "中度" : b.intensity === "SEVERE" ? "重度" : b.intensity}（主人记录）</span>}
                  <span className="tl-time" data-testid="pli.behavior.source">{fmtTime(b.occurred_at)}</span>
                </div>
                <div className="tl-body">
                  之前：{b.antecedent || "—"} · 之后：{b.consequence || "—"} · 环境：{b.environment || "—"}
                </div>
                {b.artifact_ids?.length ? (
                  <div className="muted">已关联 {b.artifact_ids.length} 个媒体证据 · 仅作为本次行为记录的原始素材</div>
                ) : null}
              </li>
            ))}
          </ul>
        </State>
      </section>

      <div className="v5-form-surface">
        <h2>记录一次行为事件</h2>
        <label className="field">
          发生时间
          <input type="datetime-local" value={form.occurred_at} onChange={(e) => set("occurred_at", e.target.value)} />
        </label>
        <label className="field">
          发生之前（当时遇到了什么？）
          <input value={form.antecedent} onChange={(e) => set("antecedent", e.target.value)} placeholder="如：门铃响 / 陌生狗经过" />
        </label>
        <label className="field">
          你观察到的行为 *（写看到的事实，不写结论）
          <input value={form.behavior} onChange={(e) => set("behavior", e.target.value)} placeholder="如：连续吠叫约1分钟后躲到沙发下" />
        </label>
        <div className="v4-filter-row" aria-label="行为观察快捷模板">
          {BEHAVIOR_TEMPLATES.map((template) => (
            <button
              type="button"
              className="v4-chip"
              key={template}
              onClick={() => set("behavior", template)}
              aria-label={`用“${template}”作为行为记录起点`}
            >
              {template}
            </button>
          ))}
        </div>
        <p className="v4-note" style={{ marginTop: -2 }}>
          快捷模板只帮你开始填写；请继续补充这次真实看到的细节，不会把模板当作自动判断。
        </p>
        <label className="field" data-testid="pli.behavior.video">
          关联行为视频（可选，最多保留 3 个）
          <input
            type="file"
            accept="video/mp4,video/webm"
            disabled={videoUploading}
            onChange={(e) => void attachBehaviorVideo(e.target.files?.[0])}
          />
          <span className="muted">
            {videoUploading
              ? "正在上传视频……"
              : artifactNames.length
                ? `已关联：${artifactNames.join("、")}`
                : "视频只作为这条观察的原始证据；系统不会仅凭视频自动推断性格、情绪或诊断。"}
          </span>
        </label>
        <label className="field">
          发生之后（接着发生了什么？）
          <input value={form.consequence} onChange={(e) => set("consequence", e.target.value)} placeholder="如：主人安抚后自行出来" />
        </label>
        <div className="grid2">
          <label className="field">
            持续秒数
            <input type="number" min={0} value={form.duration_seconds} onChange={(e) => set("duration_seconds", e.target.value)} />
          </label>
          <label className="field">
            强度（主人主观，将标记为主人记录）
            <select value={form.intensity} onChange={(e) => set("intensity", e.target.value)}>
              <option value="">未标注</option>
              <option value="MILD">轻度</option>
              <option value="MODERATE">中度</option>
              <option value="SEVERE">重度</option>
            </select>
          </label>
          <label className="field">
            环境
            <input value={form.environment} onChange={(e) => set("environment", e.target.value)} placeholder="如：客厅" />
          </label>
        </div>
        <label className="field">
          备注
          <textarea rows={2} value={form.owner_notes} onChange={(e) => set("owner_notes", e.target.value)} />
        </label>
        {validation && <div className="alert warn">{validation}</div>}
        <ErrorNote message={error} />
        <button className="btn primary" onClick={submit} disabled={!petId} data-testid="pli.behavior.action">
          保存行为事件
        </button>
      </div>

    </main>
  );
}
