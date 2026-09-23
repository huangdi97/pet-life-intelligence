"use client";

import { useMemo, useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { Skeleton } from "@pli/ui-kit";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { State } from "../../components/ui";
import { DOMAIN_CHIPS, type VisualModelRow } from "../_components/timeline/constants";
import { DayBackCard } from "../_components/timeline/DayBackCard";
import { EventList } from "../_components/timeline/EventList";
import { FilterBar } from "../_components/timeline/FilterBar";

/** OWN-003 Timeline（Stage H §17-18）：PLI 核心资产。
 *  What/When/Who/Source/Evidence/Outcome + Filter/Search；
 *  AI 生成内容与真实记录视觉区分（tl-ai 类 + AI 徽章，非仅颜色）。
 *  E2E 契约保留：.tl / .tl-type / .tl-body / OWNER_REPORTED / 事件类型过滤 select。 */
export default function TimelinePage() {
  const { petId } = useCurrentPet();
  const [filter, setFilter] = useState("");
  const [domain, setDomain] = useState("");
  const [source, setSource] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const visual = useAsync<{ models: VisualModelRow[] }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const timeline = useAsync<{ events: LifeEvent[]; count: number }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=100${filter ? `&event_type=${filter}` : ""}`,
          )
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId, filter],
  );

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
    return rows;
  }, [timeline.data, domain, source, mediaOnly, search]);

  return (
    <main>
      <h1>{t("timeline.title")}</h1>
      <p className="sub">
        同一宠物 ID 下带来源的连续事件。点开任何记录都能看到谁记录的、来源是什么；AI 生成与真实记录有视觉区分。
      </p>
      {day && <DayBackCard day={day} models={visual.data?.models ?? []} />}

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
        <div className="card">
          <Skeleton lines={4} />
        </div>
      ) : (
        <State
          state={timeline.state}
          error={timeline.error ? mapErrorMessage(timeline.error) : null}
          onRetry={timeline.reload}
          empty="暂无事件。去 Today 快速记录一条吧。"
        >
          <EventList events={events} />
        </State>
      )}
    </main>
  );
}
