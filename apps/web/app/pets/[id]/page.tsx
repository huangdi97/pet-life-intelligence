"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Pet } from "@pli/api-client";
import { fmtDate, useAsync } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { State } from "../../../components/ui";

interface Consent {
  purpose: string;
  granted: boolean;
}

interface TodayMini {
  event_counts: Record<string, number>;
  date: string;
}

/** OWN-004 Pet Profile 详情（Stage H §19）：不是字段表——
 *  Identity / Health / Behavior / Care Network / Baseline / Devices / Consent / Data 分区组织。 */
export default function PetProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const pet = useAsync<Pet>(
    () => (id ? api.get(`/pets/${id}`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [id],
  );
  const consents = useAsync<Consent[]>(
    () => (id ? api.get(`/pets/${id}/consents`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [id],
  );
  const today = useAsync<TodayMini>(
    () => (id ? api.get(`/pets/${id}/today`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [id],
  );

  if (!id || pet.state === "denied") {
    return (
      <main>
        <h1>{t("pets.detail")}</h1>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const p = pet.data;

  return (
    <main>
      <h1>{p?.name ?? t("pets.detail")}</h1>
      <p className="sub">
        {p?.breed || p?.species} · {p?.birth_date ? `${t("pet.birthDate")} ${fmtDate(p.birth_date)}` : t("pet.ageUnknown")}
      </p>

      <div className="card">
        <h2>{t("pets2.sections.identity")}</h2>
        <State state={pet.state} error={pet.error ? mapErrorMessage(pet.error) : null} onRetry={pet.reload} empty="—">
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className="badge">种类：{p?.species}</span>
            <span className="badge">品种：{p?.breed || "—"}</span>
            <span className="badge">性别：{p?.sex}</span>
            <span className="badge">绝育：{p?.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
            <span className="badge">时区：{p?.timezone}</span>
          </div>
        </State>
      </div>

      <div className="card">
        <h2>{t("pets2.sections.health")}</h2>
        <p className="sub" style={{ margin: 0 }}>
          最近活动：{today.data?.date ?? "—"} ·{" "}
          {Object.entries(today.data?.event_counts ?? {})
            .map(([k, n]) => `${k} × ${n}`)
            .join(" · ") || "今天还没有记录"}
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/health" className="btn">
            健康全流程
          </Link>
          <Link href="/medication" className="btn">
            用药
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>{t("pets2.sections.behavior")}</h2>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/behavior" className="btn">
            行为
          </Link>
          <Link href="/training" className="btn">
            训练
          </Link>
          <Link href="/welfare" className="btn">
            福祉
          </Link>
          <Link href="/social" className="btn">
            社交
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>{t("pets2.sections.care")}</h2>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/care" className="btn">
            照护协作
          </Link>
          <Link href="/monitoring" className="btn">
            在家
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>{t("pets2.sections.consent")}</h2>
        <State
          state={consents.state}
          error={consents.error ? mapErrorMessage(consents.error) : null}
          onRetry={consents.reload}
          empty="—"
        >
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {consents.data?.map((c) => (
              <span key={c.purpose} className="badge">
                {c.purpose}: {c.granted ? "已同意" : "未同意"}
              </span>
            ))}
          </div>
        </State>
        <p className="muted" style={{ marginTop: 8 }}>
          授权按用途逐项管理；在「我的」页可调整。
        </p>
      </div>

      <div className="card">
        <h2>{t("pets2.sections.data")}</h2>
        <p className="muted" style={{ margin: 0 }}>
          所有记录围绕稳定 Pet ID 组织，带 pet_id / actor / time / source；修改不静默覆盖（record.versioned）。
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/timeline" className="btn">
            查看时间线
          </Link>
          <Link href="/pets" className="btn">
            返回列表
          </Link>
        </div>
      </div>
    </main>
  );
}
