"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { t } from "../../lib/i18n";
import { ControlPanel } from "./_components/ControlPanel";
import { GatePanel } from "./_components/GatePanel";
import { ObservePanel } from "./_components/ObservePanel";
import { SessionSummaryPanel } from "./_components/SessionSummaryPanel";
import { WelfareGuardPanel } from "./_components/WelfareGuardPanel";
import type { DeviceInfo, RemoteInteractionSession } from "./_components/types";
/** DESIGN CANDIDATE（Stage H §44）——后端 canonical schema 尚未批准：
 *  仅前端类型定义，不产生真实后端写入；原型数据一律标 PROTOTYPE。 */

const COMPANION_FLAG = process.env.NEXT_PUBLIC_PLI_FLAG_COMPANION === "true";

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
  const devices = useAsync<DeviceInfo[]>(
    () => (petId ? api.get(`/pets/${petId}/devices`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!COMPANION_FLAG) {
    return <GatePanel />;
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
    setSession((s) => (s ? { ...s, interaction_types: [...s.interaction_types, kind] } : s));
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

  return (
    <main>
      <h1>
        {t("companion.title")} · <span className="badge pli-tag--prototype">{t("companion.gateTitle")}</span>
      </h1>
      <p className="sub">Remote Presence & Interaction（原型）。真实硬件调用走 Feature Flag / Sandbox；未连接真实设备时不伪装执行。</p>

      <ObservePanel recent={recent} devices={devices} />

      <ControlPanel
        session={session}
        controls={controls}
        timer={timer}
        onStart={startSession}
        onEnd={endSession}
        onControl={control}
      />

      <WelfareGuardPanel nightQuiet={guard.night_quiet} />

      {session?.ended_at && <SessionSummaryPanel session={session} timer={timer} />}

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
