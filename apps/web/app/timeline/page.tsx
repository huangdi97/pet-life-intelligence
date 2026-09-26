"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/i18n";
import { State } from "../../components/ui";
import { PetHero } from "../../components/pet-hero";
import { Icon } from "../../components/icons";
import { DOMAIN_CHIPS, type VisualModelRow } from "../_components/timeline/constants";
import { DayBackCard } from "../_components/timeline/DayBackCard";
import { EventList } from "../_components/timeline/EventList";
import { FilterBar } from "../_components/timeline/FilterBar";

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
    return rows;
  }, [timeline.data, domain, source, mediaOnly, search, day]);

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
              <EventList events={events} />
            </State>
          )}
        </div>

        <div className="v4-rail">
          {current ? (
            <PetHero
              name={current.name}
              petId={current.id}
              compact
              line={`${current.breed || current.species} · 持续记录中`}
            />
          ) : (
            <div className="v4-calm" style={{ marginTop: 12 }}>
              <span className="v4-calm-icon">
                <Icon name="paw" size={18} />
              </span>
              <p className="v4-calm-body">请先在顶部选择一只宠物。</p>
            </div>
          )}
          {day && <DayBackCard day={day} models={visual.data?.models ?? []} />}
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
