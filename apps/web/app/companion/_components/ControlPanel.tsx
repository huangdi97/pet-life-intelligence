"use client";

import { CompanionControl } from "@pli/ui-kit";
import { t } from "../../../lib/i18n";
import type { RemoteInteractionSession } from "./types";

interface ControlPanelProps {
  session: RemoteInteractionSession | null;
  controls: Array<{ kind: string; label: string }>;
  timer: number;
  onStart: () => void;
  onEnd: () => void;
  onControl: (kind: string) => void;
}

/** OWN-014 Companion — Presence / Enrichment / Learned Interaction 控制面板（原型交互）。 */
export function ControlPanel({ session, controls, timer, onStart, onEnd, onControl }: ControlPanelProps) {
  return (
    <div className="card">
      <h2>
        {t("companion.layers.presence")} / {t("companion.layers.enrichment")} / {t("companion.layers.learned")}
      </h2>
      {!session ? (
        <div className="row">
          <button className="btn primary" onClick={onStart}>
            开始互动（原型）
          </button>
        </div>
      ) : (
        <>
          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            {controls.map((c) => (
              <CompanionControl
                key={c.kind}
                label={c.label}
                prototype
                noticeText="未连接真实设备（原型）"
                onClick={() => onControl(c.kind)}
              />
            ))}
            <button className="btn" onClick={onEnd}>
              结束本次（原型）
            </button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {t("companion.sessionToday")} · {session.interaction_types.length} 次 · {Math.floor(timer / 60)} min
            {session.interaction_types.length > 0 ? ` · ${t("companion.prototypeNotice")}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
