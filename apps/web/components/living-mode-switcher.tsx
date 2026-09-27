"use client";

/** LivingModeSwitcher — Life View mode bar (R2-P §7.3). 此刻 default. */

export type LivingMode = "now" | "trend" | "timeline" | "look";

const MODES: Array<{ id: LivingMode; label: string }> = [
  { id: "now", label: "此刻" },
  { id: "trend", label: "趋势" },
  { id: "timeline", label: "时间线" },
  { id: "look", label: "外观" },
];

export function LivingModeSwitcher({ value, onChange }: { value: LivingMode; onChange: (m: LivingMode) => void }) {
  return (
    <div className="r2p-modes" role="tablist" aria-label="生命视图模式">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={m.id === value}
          onClick={() => onChange(m.id)}
          className="r2p-mode"
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}