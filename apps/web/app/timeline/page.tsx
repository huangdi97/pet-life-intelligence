"use client";

import { useMemo, useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { PetCollectionGate } from "../../components/pet-collection-gate";
import { mapErrorMessage } from "../../lib/i18n";
import { breedLabel, eventTypeLabel } from "../../lib/ownerLabels";
import { State } from "../../components/ui";

import { Icon } from "../../components/icons";
import { DOMAIN_CHIPS, type VisualModelRow } from "../_components/timeline/constants";
import { DayBackCard } from "../_components/timeline/DayBackCard";
import { EventList } from "../_components/timeline/EventList";
import { ArtifactMemory } from "../_components/timeline/ArtifactMemory";
import { FilterBar } from "../_components/timeline/FilterBar";

interface DiaryRow {
  diary_id: string;
  entry_at: string;
  text: string;
  has_audio: boolean;
  audio_artifact_id: string | null;
}
interface MilestoneRow {
  milestone_id: string;
  title: string;
  kind: string;
  occurred_at: string;
}
interface MemoryRow {
  years_ago: number;
  window: string;
  events: number;
  sample: string[];
}
interface DailySummaryRow {
  summary_id: string;
  date: string;
  summary: string;
  fact_count: number;
  provider: string;
  model: string;
  prompt_version: string;
  source_type: string;
  disclaimer: string;
}

/** OWN-003 Timeline — Life Stream（Stage R.2）：Day Group + time spine + 双栏桌面布局。 */
export default function TimelinePage() {
  const { petId } = useCurrentPet();
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), [petId]);
  const [filter, setFilter] = useState("");
  const [domain, setDomain] = useState("");
  const [source, setSource] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [diaryText, setDiaryText] = useState("");
  const [diaryAudio, setDiaryAudio] = useState<File | null>(null);
  const [diaryBusy, setDiaryBusy] = useState(false);
  const [diaryError, setDiaryError] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneBusy, setMilestoneBusy] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const milestones = useAsync<MilestoneRow[]>(
    () =>
      petId
        ? api.get<MilestoneRow[]>(`/pets/${petId}/milestones`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );
  const memories = useAsync<MemoryRow[]>(
    () =>
      petId
        ? api.get<MemoryRow[]>(`/pets/${petId}/memories?years_back=10`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );
  const diary = useAsync<DiaryRow[]>(
    () =>
      petId
        ? api.get<DiaryRow[]>(`/pets/${petId}/diary?limit=5`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );
  const dailySummaries = useAsync<DailySummaryRow[]>(
    () =>
      petId
        ? api.get<DailySummaryRow[]>(`/pets/${petId}/daily-summaries?limit=7`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );
  const visual = useAsync<{ models: VisualModelRow[] }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const timeline = useAsync<{ events: LifeEvent[]; count: number }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=200${filter ? `&event_type=${filter}` : ""}`,
          )
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId, filter],
  );

  const current = pets.data?.find((p) => p.id === petId) ?? pets.data?.[0];

  const events = useMemo(() => {
    let rows = timeline.data?.events ?? [];
    if (day) {
      const target = day; // yyyy-mm-dd
      rows = rows.filter((e) => (e.occurred_at ?? "").slice(0, 10) === target);
    }
    if (domain) {
      const chip = DOMAIN_CHIPS.find((c) => c.id === domain);
      if (chip) rows = rows.filter((e) => chip.match(e.event_type));
    }
    if (source) rows = rows.filter((e) => e.source_type === source);
    if (mediaOnly) rows = rows.filter((e) => (e.artifact_ids ?? []).length > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (e) =>
          e.event_type.toLowerCase().includes(q) ||
          Object.entries(e.payload).some(([k, v]) => `${k}: ${String(v)}`.toLowerCase().includes(q)) ||
          (e.actor_name ?? e.actor_id).toLowerCase().includes(q),
      );
    }
    // 不把「今日查看」这类系统噪音当作生活记录展示（blind-UI 契约）。
    return rows.filter((e) => e.event_type !== "today.viewed");
  }, [timeline.data, domain, source, mediaOnly, search, day]);

  async function addMilestone() {
    if (!petId || !milestoneTitle.trim() || !milestoneDate || milestoneBusy) return;
    setMilestoneBusy(true);
    setMilestoneError(null);
    try {
      await api.post(`/pets/${petId}/milestones`, {
        title: milestoneTitle.trim(),
        kind: "OTHER",
        occurred_at: new Date(`${milestoneDate}T12:00:00`).toISOString(),
        note: "",
      });
      setMilestoneTitle("");
      setMilestoneDate("");
      milestones.reload();
      timeline.reload();
      memories.reload();
    } catch (e) {
      setMilestoneError(e instanceof Error ? e.message : String(e));
    } finally {
      setMilestoneBusy(false);
    }
  }

  async function generateDailySummary() {
    if (!petId || summaryBusy) return;
    setSummaryBusy(true);
    setSummaryError(null);
    try {
      await api.post(`/pets/${petId}/daily-summary`, {});
      dailySummaries.reload();
      timeline.reload();
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : String(e));
    } finally {
      setSummaryBusy(false);
    }
  }

  async function addDiary() {
    const text = diaryText.trim();
    if (!petId || (!text && !diaryAudio) || diaryBusy) return;
    setDiaryBusy(true);
    setDiaryError(null);
    try {
      let audioArtifactId: string | null = null;
      if (diaryAudio) {
        const uploaded = await api.upload<{ artifact_id: string; kind: string }>(
          `/pets/${petId}/artifacts`,
          diaryAudio,
        );
        if (uploaded.kind !== "AUDIO") {
          throw new Error("上传内容没有被识别为声音文件。");
        }
        audioArtifactId = uploaded.artifact_id;
      }
      await api.post(`/pets/${petId}/diary`, {
        text,
        audio_artifact_id: audioArtifactId,
      });
      setDiaryText("");
      setDiaryAudio(null);
      diary.reload();
      timeline.reload();
    } catch (e) {
      setDiaryError(e instanceof Error ? e.message : String(e));
    } finally {
      setDiaryBusy(false);
    }
  }

  if (pets.state !== "ready") {
    return <PetCollectionGate surface="timeline" state={pets.state} onRetry={pets.reload} />;
  }

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>时间线</h1>
        <p className="v4-topline-sub">记录每一天真实发生的事情，每条都带有时间与来源。</p>
      </div>

      {current ? (
        <div data-testid="pli.timeline.identity">
          <div className="v4-life-identity">
            <span className="v4-life-identity-overline">这段生活属于</span>
            <div className="v4-life-identity-name">{current.name}</div>
            <p className="v4-life-identity-desc">
              {breedLabel(current.breed) || (current.species === "dog" ? "犬" : current.species === "cat" ? "猫" : "宠物")} · 每一条记录都可以回看
            </p>
          </div>
        </div>
      ) : (
        <div className="v4-calm" style={{ marginTop: 12 }}>
          <span className="v4-calm-icon">
            <Icon name="paw" size={18} />
          </span>
          <p className="v4-calm-body">请先在顶部选择一只宠物。</p>
        </div>
      )}

      <div className="v4-grid">
        <div>
          <FilterBar
            filter={filter}
            setFilter={setFilter}
            domain={domain}
            setDomain={setDomain}
            source={source}
            setSource={setSource}
            mediaOnly={mediaOnly}
            setMediaOnly={setMediaOnly}
            search={search}
            setSearch={setSearch}
            day={day}
            setDay={setDay}
            onReload={timeline.reload}
          />

          {timeline.state === "loading" ? (
            <div className="v4-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              加载中……
            </div>
          ) : (
            <State
              state={timeline.state}
              error={timeline.error ? mapErrorMessage(timeline.error) : null}
              onRetry={timeline.reload}
              empty="暂无事件。去 Today 快速记录一条吧。"
            >
              <EventList events={events} petName={current?.name} />
            </State>
          )}
        </div>

        <div className="v4-rail">
          {day && <DayBackCard day={day} models={visual.data?.models ?? []} />}
          <div className="v4-sec" data-testid="pli.timeline.milestones">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">里程碑</h2>
              <span className="v4-sec-link">主人记录</span>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 8px" }}>
              只记录真实发生、值得长期保留的节点；保存后会进入同一条生命时间线。
            </p>
            <div className="grid2">
              <label className="field">
                发生日期
                <input type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} />
              </label>
              <label className="field">
                里程碑
                <input value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} placeholder="例如：第一次完成长途徒步" />
              </label>
            </div>
            <button className="btn" disabled={milestoneBusy || !milestoneDate || !milestoneTitle.trim()} onClick={() => void addMilestone()}>
              {milestoneBusy ? "保存中…" : "记录里程碑"}
            </button>
            {milestoneError ? <p className="v4-note">暂时没有保存成功：{milestoneError}</p> : null}
            {milestones.state === "ready" && milestones.data?.length ? (
              <div style={{ marginTop: 10 }}>
                {milestones.data.slice(0, 3).map((row) => (
                  <div className="v4-domain" key={row.milestone_id}>
                    <div>
                      <div className="v4-domain-name">{row.title}</div>
                      <div className="v4-domain-desc">{new Date(row.occurred_at).toLocaleDateString("zh-CN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : milestones.state === "error" ? (
              <p className="v4-note">里程碑暂时没有加载成功；不会把未知状态显示成空。</p>
            ) : null}
          </div>

          <div className="v4-sec" data-testid="pli.timeline.memories">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">往年今日</h2>
              <span className="v4-sec-link">真实记录回看</span>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 8px" }}>
              这里只回看历史上同一日期附近真实存在的事件；没有记录就不生成“回忆”。
            </p>
            {memories.state === "ready" && memories.data?.length ? memories.data.slice(0, 3).map((row) => (
              <div className="v4-calm" key={row.years_ago} style={{ marginTop: 8 }}>
                <div>
                  <p className="v4-calm-title">{row.years_ago} 年前 · {row.events} 条记录</p>
                  <p className="v4-calm-body">{row.sample.slice(0, 3).map(eventTypeLabel).join(" · ")}</p>
                </div>
              </div>
            )) : memories.state === "error" ? (
              <p className="v4-note">历史回忆暂时没有读取到；不会用生成内容补齐。</p>
            ) : (
              <p className="v4-note">往年今天附近还没有真实记录。</p>
            )}
          </div>

          <div className="v4-sec" data-testid="pli.timeline.diary">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">今天想记下什么</h2>
              <span className="v4-sec-link">生活日记</span>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 8px" }}>
              可以写文字，也可以附一段真实录音。声音作为原始媒体保存，并与日记事件一起进入时间线。
            </p>
            <textarea
              className="input"
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="例如：今天散步时第一次主动去闻路边的花。"
              style={{ width: "100%", resize: "vertical" }}
            />
            <label className="field" style={{ marginTop: 10 }}>
              语音日记（可选）
              <input
                type="file"
                accept="audio/mpeg,audio/mp4"
                onChange={(e) => setDiaryAudio(e.target.files?.[0] ?? null)}
              />
              <span className="v4-note">
                {diaryAudio ? `已选择：${diaryAudio.name}` : "支持 MP3 / M4A；不会自动把录音解释成情绪或健康结论。"}
              </span>
            </label>
            <button className="btn primary" onClick={() => void addDiary()} disabled={(!diaryText.trim() && !diaryAudio) || diaryBusy}>
              {diaryBusy ? "保存中…" : "保存日记"}
            </button>
            {diaryError ? <p className="v4-note">日记暂时没有保存成功：{diaryError}</p> : null}
            {diary.state === "ready" && diary.data?.length ? (
              <div style={{ marginTop: 12 }}>
                <div className="muted">最近日记</div>
                {diary.data.slice(0, 3).map((entry) => (
                  <div className="v4-domain" key={entry.diary_id}>
                    <div>
                      <div className="v4-domain-name">{entry.text || "语音日记"}</div>
                      <div className="v4-domain-desc">{new Date(entry.entry_at).toLocaleString("zh-CN")}{entry.has_audio ? " · 含原始录音" : ""}</div>
                      {entry.audio_artifact_id ? <ArtifactMemory artifactId={entry.audio_artifact_id} compact /> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : diary.state === "error" ? (
              <p className="v4-note">最近日记暂时没有加载成功；不会把未知状态显示成空。</p>
            ) : null}
          </div>
          <div className="v4-sec" data-testid="pli.timeline.daily-summary">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">今日回顾</h2>
              <button type="button" className="v4-sec-link" onClick={() => void generateDailySummary()} disabled={summaryBusy}>
                {summaryBusy ? "整理中…" : dailySummaries.data?.[0]?.date === new Date().toISOString().slice(0, 10) ? "重新整理" : "自动整理"}
              </button>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 8px" }}>
              AI 只整理已经记录的事实；不会把推测写成生活记录，也不会替代原始时间线。
            </p>
            {dailySummaries.state === "ready" && dailySummaries.data?.length ? (
              <div className="v4-calm">
                <p className="v4-calm-body">{dailySummaries.data[0].summary}</p>
                <p className="v4-note" style={{ margin: "6px 0 0" }}>
                  AI 自动整理 · {dailySummaries.data[0].fact_count} 条已记录事实 · {dailySummaries.data[0].date}
                </p>
                <p className="v4-note" style={{ margin: "4px 0 0" }}>{dailySummaries.data[0].disclaimer}</p>
              </div>
            ) : dailySummaries.state === "error" ? (
              <p className="v4-note">今日回顾暂时没有加载成功；原始记录仍以时间线为准。</p>
            ) : (
              <p className="v4-note">还没有生成今日回顾。</p>
            )}
            {summaryError ? <p className="v4-note">暂时无法整理：{summaryError}</p> : null}
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">关于时间线</h2>
            <p className="v4-note" style={{ margin: "6px 0 0" }}>
              所有记录都围绕同一只宠物，带时间、记录人与来源。AI 生成的内容会单独标注，不会与真实记录混淆。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
