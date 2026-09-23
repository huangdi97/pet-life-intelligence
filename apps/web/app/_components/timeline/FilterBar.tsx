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

/** OWN-003 Timeline 筛选条：域 chips / 事件类型 select / 来源 / 媒体 / 搜索 / 回到那一天。 */
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
    <>
      {/* Filter chips（域） */}
      <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 6 }} role="group" aria-label="按域筛选">
        {DOMAIN_CHIPS.map((c) => (
          <button
            key={c.id}
            className={`btn ${domain === c.id ? "primary" : ""}`}
            style={{ fontSize: 13, minHeight: 32 }}
            onClick={() => setDomain(c.id)}
            aria-pressed={domain === c.id}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <select
          style={{ maxWidth: 260 }}
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
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }} role="group" aria-label="按来源筛选">
          {["", "OWNER_REPORTED", "SYSTEM_CALCULATED", "PROFESSIONAL_REVIEWED", "DEVICE"].map((s) => (
            <button
              key={s || "all"}
              className={`btn ${source === s ? "primary" : ""}`}
              style={{ fontSize: 12, minHeight: 30 }}
              onClick={() => setSource(s)}
              aria-pressed={source === s}
            >
              {s === "" ? "全部来源" : s}
            </button>
          ))}
        </div>
        <label className="pet-label" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={mediaOnly} onChange={(e) => setMediaOnly(e.target.checked)} />
          仅含媒体证据
        </label>
        <input
          style={{ flex: 1, minWidth: 160, maxWidth: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("timeline.search")}
          aria-label={t("timeline.search")}
        />
        <input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="回到那一天"
          style={{ maxWidth: 170 }}
        />
        {day && (
          <button className="btn" onClick={() => setDay("")} aria-label="清除日期">
            清除日期
          </button>
        )}
        <button className="btn" onClick={onReload}>
          刷新
        </button>
      </div>
    </>
  );
}
