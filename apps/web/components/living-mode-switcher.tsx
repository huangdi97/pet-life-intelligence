"use client";

/** LivingModeSwitcher — Life View: 此刻 / 趋势 / 外观. Timeline stays first-level. */

export type LivingMode = "now" | "trend" | "appearance";

const MODES: Array<{ id: LivingMode; label: string }> = [
  { id: "now", label: "此刻" },
  { id: "trend", label: "趋势" },
  { id: "appearance", label: "外观" },
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
          data-testid={`pli.lifeview.mode.${m.id}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
