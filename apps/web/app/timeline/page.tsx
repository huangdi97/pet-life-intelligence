"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/i18n";
import { breedLabel } from "../../lib/ownerLabels";
import { State } from "../../components/ui";
import { PetHero } from "../../components/pet-hero";
import { Icon } from "../../components/icons";
import { DOMAIN_CHIPS, type VisualModelRow } from "../_components/timeline/constants";
import { DayBackCard } from "../_components/timeline/DayBackCard";
import { EventList } from "../_components/timeline/EventList";
import { FilterBar } from "../_components/timeline/FilterBar";

interface DiaryRow {
  diary_id: string;
  entry_at: string;
  text: string;
  has_audio: boolean;
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
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [filter, setFilter] = useState("");
  const [domain, setDomain] = useState("");
  const [source, setSource] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [diaryText, setDiaryText] = useState("");
  const [diaryBusy, setDiaryBusy] = useState(false);
  const [diaryError, setDiaryError] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
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

  useEffect(() => {
    api
      .get<Pet[]>("/pets")
      .then(setPets)
      .catch(() => setPets([]));
  }, [petId]);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

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
    if (!petId || !text || diaryBusy) return;
    setDiaryBusy(true);
    setDiaryError(null);
    try {
      await api.post(`/pets/${petId}/diary`, { text });
      setDiaryText("");
      diary.reload();
      timeline.reload();
    } catch (e) {
      setDiaryError(e instanceof Error ? e.message : String(e));
    } finally {
      setDiaryBusy(false);
    }
  }

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>时间线</h1>
        <p className="v4-topline-sub">记录每一天真实发生的事情，每条都带有时间与来源。</p>
      </div>

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
          {current ? (
            <div data-testid="pli.timeline.identity">
              <PetHero
                name={current.name}
                petId={current.id}
                compact
                line={`${breedLabel(current.breed) || (current.species === "dog" ? "犬" : current.species === "cat" ? "猫" : "宠物")} · 持续记录中`}
              />
            </div>
          ) : (
            <div className="v4-calm" style={{ marginTop: 12 }}>
              <span className="v4-calm-icon">
                <Icon name="paw" size={18} />
              </span>
              <p className="v4-calm-body">请先在顶部选择一只宠物。</p>
            </div>
          )}
          {day && <DayBackCard day={day} models={visual.data?.models ?? []} />}
          <div className="v4-sec" data-testid="pli.timeline.diary">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">今天想记下什么</h2>
              <span className="v4-sec-link">生活日记</span>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 8px" }}>
              写下真实发生的事情。文字会作为主人记录保存，并在时间线留下来源明确的日记事件。
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
            <button className="btn primary" onClick={() => void addDiary()} disabled={!diaryText.trim() || diaryBusy}>
              {diaryBusy ? "保存中…" : "保存日记"}
            </button>
            {diaryError ? <p className="v4-note">日记暂时没有保存成功：{diaryError}</p> : null}
            {diary.state === "ready" && diary.data?.length ? (
              <div style={{ marginTop: 12 }}>
                <div className="muted">最近日记</div>
                {diary.data.slice(0, 3).map((entry) => (
                  <div className="v4-domain" key={entry.diary_id}>
                    <div>
                      <div className="v4-domain-name">{entry.text}</div>
                      <div className="v4-domain-desc">{new Date(entry.entry_at).toLocaleString("zh-CN")}</div>
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
