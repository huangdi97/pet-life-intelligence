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

/** OWN-003 Timeline 筛选条：域 chips / 事件类型 / 来源 / 媒体 / 搜索 / 回到那一天。 */
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
    <div className="v4-sec" style={{ paddingTop: 6, paddingBottom: 10 }}>
      <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 6 }} role="group" aria-label="按域筛选">
        {DOMAIN_CHIPS.map((c) => (
          <button
            key={c.id}
            className={`v4-chip${domain === c.id ? " v4-chip--brand" : ""}`}
            style={{ cursor: "pointer", minHeight: 30 }}
            onClick={() => setDomain(c.id)}
            aria-pressed={domain === c.id}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <select
          style={{ maxWidth: 260, borderRadius: 14, border: "1px solid var(--v4-divider)" }}
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
          {SOURCE_OPTIONS.map((o) => (
            <button
              key={o.value || "all"}
              className={`v4-chip${source === o.value ? " v4-chip--brand" : ""}`}
              style={{ cursor: "pointer", minHeight: 30 }}
              onClick={() => setSource(o.value)}
              aria-pressed={source === o.value}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="pet-label" style={{ cursor: "pointer", fontSize: 13, color: "var(--v4-text-tertiary)" }}>
          <input type="checkbox" checked={mediaOnly} onChange={(e) => setMediaOnly(e.target.checked)} />
          仅含照片
        </label>
        <input
          style={{ flex: 1, minWidth: 160, maxWidth: 280, borderRadius: 14, border: "1px solid var(--v4-divider)" }}
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
          style={{ maxWidth: 170, borderRadius: 14, border: "1px solid var(--v4-divider)" }}
        />
        {day && (
          <button
            className="v4-action v4-action--soft"
            style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}
            onClick={() => setDay("")}
            aria-label="清除日期"
          >
            清除日期
          </button>
        )}
        <button
          className="v4-action v4-action--soft"
          style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}
          onClick={onReload}
        >
          刷新
        </button>
      </div>
    </div>
  );
}
