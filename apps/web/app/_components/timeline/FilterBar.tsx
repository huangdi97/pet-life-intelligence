"use client";

import { t } from "../../../lib/i18n";
import { DOMAIN_CHIPS, FILTERS, TYPE_LABELS } from "./constants";

interface FilterBarProps {
  filter: string;
  setFilter: (v: string) => void;
  domain: string;
  setDomain: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  mediaOnly: boolean;
  setMediaOnly: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
  day: string;
  setDay: (v: string) => void;
  onReload: () => void;
}

/** 来源筛选：内部枚举只用于过滤逻辑，按钮文案始终是用户语言。 */
const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部来源" },
  { value: "OWNER_REPORTED", label: "主人记录" },
  { value: "DEVICE", label: "设备记录" },
  { value: "PROFESSIONAL_REVIEWED", label: "专业人员" },
  { value: "AI_STRUCTURED", label: "AI 整理" },
];

/** OWN-003 Timeline 筛选条：先按生活域浏览，再用搜索/日期和精确来源收窄。 */
export function FilterBar({
  filter,
  setFilter,
  domain,
  setDomain,
  source,
  setSource,
  mediaOnly,
  setMediaOnly,
  search,
  setSearch,
  day,
  setDay,
  onReload,
}: FilterBarProps) {
  return (
    <section className="v4-sec v5-timeline-filter-shell" aria-label="时间线筛选">
      <div className="v5-timeline-filter-group">
        <span className="v5-timeline-filter-label">看哪一类生活</span>
        <div className="row v5-timeline-filter-rail" role="group" aria-label="按域筛选">
          {DOMAIN_CHIPS.map((c, i) => (
            <button
              key={c.id}
              className={`v4-chip${domain === c.id ? " v4-chip--brand" : ""}`}
              onClick={() => setDomain(c.id)}
              aria-pressed={domain === c.id}
              data-testid={i < 5 ? `pli.timeline.filter.${c.id || "all"}` : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Life events, not a full filter form, are the primary Timeline content.
          Keep text search directly available; put infrequent controls in
          progressive disclosure without losing source/date/type filtering. */}
      <label className="v5-timeline-field v5-timeline-search v7-timeline-search">
        <span>搜索记录</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("timeline.search")}
          aria-label={t("timeline.search")}
        />
      </label>

      <details
        className="v7-timeline-refine"
        // An active filter must never become mysteriously hidden on page load.
        key={day || source || filter || (mediaOnly ? "media" : "all")}
        defaultOpen={Boolean(day || source || filter || mediaOnly)}
      >
        <summary className="v7-timeline-refine-summary">
          <span>日期、来源和更多筛选</span>
          <span className="v7-timeline-refine-count">
            {[day, source, filter, mediaOnly ? "media" : ""].filter(Boolean).length || "展开"}
          </span>
        </summary>
        <div className="v5-timeline-primary-tools">
        <label className="v5-timeline-field v5-timeline-date">
          <span>回到某一天</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            aria-label="回到那一天"
          />
        </label>

        <label className={`v5-media-toggle${mediaOnly ? " v5-media-toggle--active" : ""}`}>
          <input
            type="checkbox"
            checked={mediaOnly}
            onChange={(e) => setMediaOnly(e.target.checked)}
          />
          <span>只看照片</span>
        </label>

        {day ? (
          <button
            className="v4-action v4-action--soft v5-timeline-utility-btn"
            onClick={() => setDay("")}
            aria-label="清除日期"
          >
            清除日期
          </button>
        ) : null}

        <button
          className="v4-action v4-action--soft v5-timeline-utility-btn"
          onClick={onReload}
          aria-label="刷新时间线"
        >
          刷新
        </button>
      </div>

      <div className="v5-timeline-precision">
        <label className="v5-timeline-field v5-timeline-event-type">
          <span>具体事件</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="按事件类型过滤"
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "" ? "全部事件" : (TYPE_LABELS[f] ?? f)}
              </option>
            ))}
          </select>
        </label>

        <div className="v5-timeline-source-block">
          <span className="v5-timeline-filter-label">记录来源</span>
          <div className="row v5-timeline-filter-rail v5-timeline-source-rail" role="group" aria-label="按来源筛选">
            {SOURCE_OPTIONS.map((o) => (
              <button
                key={o.value || "all"}
                className={`v4-chip${source === o.value ? " v4-chip--brand" : ""}`}
                onClick={() => setSource(o.value)}
                aria-pressed={source === o.value}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      </details>
    </section>
  );
}
