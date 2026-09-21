"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { State } from "../../components/ui";
import { CompanionControl } from "@pli/ui-kit";
/** DESIGN CANDIDATE（Stage H §44）——后端 canonical schema 尚未批准：
 *  仅前端类型定义，不产生真实后端写入；原型数据一律标 PROTOTYPE。 */
interface RemoteInteractionSession {
  session_id: string; // DESIGN CANDIDATE
  pet_id: string;
  actor_id: string;
  device_id: string | null;
  started_at: string;
  ended_at: string | null;
  interaction_types: string[];
  pet_observations: string[];
  owner_feedback: string[];
  safety_events: string[];
  outcome: string | null;
}

const COMPANION_FLAG = process.env.NEXT_PUBLIC_PLI_FLAG_COMPANION === "true";

const GUARD_ITEMS = [
  "刚结束休息，可短时互动",
  "互动间隔 ≥30 分钟",
  "每日零食上限 3 次",
  "单次 ≤15 分钟",
  "音量已限制",
  "夜间静默模式（22:00-07:00）",
];

interface GuardState {
  rest: boolean;
  cooldown: boolean;
  treat_limit: boolean;
  session_duration: boolean;
  noise: boolean;
  night_quiet: boolean;
}

/** OWN-014 Companion（Stage H §34-44，Prototype C）：Remote Presence & Interaction。
 *  原则：Zero-cognition / Observation / Welfare / Privacy / Human-in-Control。
 *  无真实 provider 时显示 PROTOTYPE，绝不伪装硬件执行成功。 */
export default function CompanionPage() {
  const { petId } = useCurrentPet();
  const [session, setSession] = useState<RemoteInteractionSession | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recent = useAsync<{ events: LifeEvent[] }>(
    () => (petId ? api.get(`/pets/${petId}/events?limit=5`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const devices = useAsync<Array<{ device_id: string; provider: string; display_name: string; status: string }>>(
    () => (petId ? api.get(`/pets/${petId}/devices`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!COMPANION_FLAG) {
    return (
      <main>
        <h1>{t("companion.title")}</h1>
        <div className="state">
          <div className="pli-state-title">
            <span className="badge pli-tag--prototype">{t("companion.gateTitle")}</span>
          </div>
          <p className="pli-state-desc" style={{ marginTop: 8 }}>
            {t("companion.gateDesc")}
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            现在看到的是 <strong>GENERATED_3D / 原型</strong>，不是实时画面（LIVE）也不是录像（RECORDED）。3D 形象只描述外观，不包含任何健康信息。
          </p>
          <div style={{ marginTop: 12 }}>
            <Link href="/" className="btn primary" role="button">
              {t("companion.gateBack")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  function startSession() {
    if (!petId || session) return;
    const s: RemoteInteractionSession = {
      session_id: `prototype-${Date.now()}`,
      pet_id: petId,
      actor_id: "owner",
      device_id: null,
      started_at: new Date().toISOString(),
      ended_at: null,
      interaction_types: [],
      pet_observations: [],
      owner_feedback: [],
      safety_events: [],
      outcome: null,
    };
    setSession(s);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer((x) => x + 1), 1000);
  }

  function endSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    setSession((s) => (s ? { ...s, ended_at: new Date().toISOString() } : s));
  }

  function control(kind: string) {
    if (!session) return;
    setSession((s) =>
      s ? { ...s, interaction_types: [...s.interaction_types, kind] } : s,
    );
  }

  const guard: GuardState = {
    rest: true,
    cooldown: true,
    treat_limit: true,
    session_duration: timer < 15 * 60,
    noise: true,
    night_quiet: new Date().getHours() >= 22 || new Date().getHours() < 7,
  };

  const controls: Array<{ kind: string; label: string }> = [
    { kind: "voice", label: t("companion.speak") },
    { kind: "audio", label: t("companion.audio") },
    { kind: "treat", label: t("companion.treat") },
    { kind: "play", label: t("companion.play") },
    { kind: "cue", label: t("companion.cue") },
    { kind: "button", label: t("companion.button") },
  ];

  const lastSeen = recent.data?.events?.[0];

  return (
    <main>
      <h1>
        {t("companion.title")} · <span className="badge pli-tag--prototype">{t("companion.gateTitle")}</span>
      </h1>
      <p className="sub">Remote Presence & Interaction（原型）。真实硬件调用走 Feature Flag / Sandbox；未连接真实设备时不伪装执行。</p>

      {/* Observe 层：宠物什么都不用理解 */}
      <div className="card">
        <h2>{t("companion.layers.observe")}</h2>
        <State
          state={recent.state}
          error={recent.error ? mapErrorMessage(recent.error) : null}
          onRetry={recent.reload}
          empty="还没有最近活动。"
        >
          {lastSeen ? (
            <p className="sub" style={{ margin: 0 }}>
              {fmtTime(lastSeen.occurred_at)} · {lastSeen.event_type}
            </p>
          ) : (
            <p className="sub" style={{ margin: 0 }}>
              还没有最近活动。
            </p>
          )}
        </State>
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
          {(devices.data ?? []).length === 0 ? (
            <span className="badge pli-tag--prototype">设备接入暂未开放</span>
          ) : (
            (devices.data ?? []).map((d) => (
              <span key={d.device_id} className="badge">
                {d.display_name || d.provider}：{d.status}
              </span>
            ))
          )}
        </div>
        <div
          className="state"
          style={{ marginTop: 12, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}
          role="img"
          aria-label={t("companion.liveView")}
        >
          [ {t("companion.liveView")} · PROTOTYPE ]
        </div>
      </div>

      {/* Presence / Enrichment / Learned Interaction 控制 */}
      <div className="card">
        <h2>{t("companion.layers.presence")} / {t("companion.layers.enrichment")} / {t("companion.layers.learned")}</h2>
        {!session ? (
          <div className="row">
            <button className="btn primary" onClick={startSession}>
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
                  onClick={() => control(c.kind)}
                />
              ))}
              <button className="btn" onClick={endSession}>
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

      {/* Interaction Welfare Guard */}
      <div className="card">
        <h2>{t("companion.welfareGuard")}</h2>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {GUARD_ITEMS.map((g) => (
            <span key={g} className="badge">
              {g}
            </span>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          {t("companion.suggestion")}：
          {guard.night_quiet ? "夜间静默模式中，仅观察" : "刚结束休息，可短时互动"}
        </p>
      </div>

      {/* Session Summary */}
      {session?.ended_at && (
        <div className="card">
          <h2>{t("companion.summary")}</h2>
          <ul className="tl">
            <li>
              <div className="tl-head">
                <span className="tl-type">原型会话</span>
                <span className="badge pli-tag--prototype">{t("companion.gateTitle")}</span>
                <span className="tl-time">{fmtTime(session.started_at)}</span>
              </div>
              <div className="tl-body">
                互动 {session.interaction_types.length} 次 · 时长 {Math.floor(timer / 60)} min · 未连接真实设备（不产生后端写入）
              </div>
            </li>
          </ul>
        </div>
      )}

      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/" className="btn">
          {t("companion.gateBack")}
        </Link>
        <Link href="/monitoring" className="btn">
          在家
        </Link>
      </div>
    </main>
  );
}
