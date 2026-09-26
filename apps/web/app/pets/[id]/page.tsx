"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError, type Pet } from "@pli/api-client";
import { fmtDate, useAsync } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { State } from "../../../components/ui";
import { PetHero } from "../../../components/pet-hero";
import { Icon, type WebIconName } from "../../../components/icons";
import { EVENT_LABELS } from "../../_components/today/constants";

interface Consent {
  purpose: string;
  granted: boolean;
}

interface TodayMini {
  event_counts: Record<string, number>;
  date: string;
}

/** 年龄 → 用户语言：X岁X个月 / X个月 / 年龄未知。 */
function ageText(birthDate: string | null): string {
  if (!birthDate) return t("pet.ageUnknown");
  const b = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(b.getTime())) return t("pet.ageUnknown");
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months <= 0) return "不满 1 个月";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years > 0) return `${years}岁${rest > 0 ? `${rest}个月` : ""}`;
  return `${months}个月`;
}

const DOMAIN_ROWS: Array<{ id: string; href: string; name: string; icon: WebIconName }> = [
  { id: "health", href: "/health", name: "健康", icon: "heart" },
  { id: "behavior", href: "/behavior", name: "行为", icon: "eye" },
  { id: "training", href: "/training", name: "训练", icon: "target" },
  { id: "welfare", href: "/welfare", name: "福利", icon: "shield" },
  { id: "social", href: "/social", name: "社交", icon: "users" },
];

/** OWN-004 Pet World — Identity / Life Summary / Life View / 有意义的 Domain 分区（Stage R.2）。 */
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
      <main className="v4-main">
        <h1>{t("pets.detail")}</h1>
        <div className="v4-error">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  // OWN-004 not-found state: unknown pet id renders a 404 state (Stage V
  // state-space, not a generic error).
  const notFound =
    pet.state === "error" &&
    pet.error instanceof ApiError &&
    (pet.error.status === 404 || pet.error.code === "NOT_FOUND");
  if (notFound) {
    return (
      <main className="v4-main">
        <h1>404</h1>
        <div className="v4-error">{t("notFound.title")}</div>
        <div className="v4-linkrow">
          <Link href="/" className="v4-action v4-action--primary">
            {t("notFound.home")}
          </Link>
        </div>
      </main>
    );
  }

  const p = pet.data;
  const counts = today.data?.event_counts ?? {};
  const countEntries = Object.entries(counts);
  const identityLine = [
    p?.birth_date ? ageText(p.birth_date) : "",
    p?.breed || p?.species,
    p?.sex === "FEMALE" ? "雌性" : p?.sex === "MALE" ? "雄性" : p?.sex,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="v4-main">
      {p ? (
        <PetHero name={p.name} petId={p.id} title={<h1 className="v4-hero-title">{p.name}</h1>} line={identityLine} />
      ) : (
        <div className="v4-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          加载中……
        </div>
      )}

      <div className="v4-grid">
        <div>
          <div className="v4-sec">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title v4-sec-title--accent">看看它</h2>
              <Link href={`/pets/${id}/life-view`} className="v4-sec-link">
                打开生命视图
              </Link>
            </div>
            <p className="v4-sec-sub">它的 3D 形象与当前状态入口。真实照片与记录始终是基础，不依赖 3D。</p>
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">它的生活</h2>
            {DOMAIN_ROWS.map((row) => (
              <div key={row.id} className="v4-domain">
                <Link href={row.href} className="v4-domain-main">
                  <span className="v4-domain-icon">
                    <Icon name={row.icon} size={20} />
                  </span>
                  <div>
                    <div className="v4-domain-name">{row.name}</div>
                    <div className="v4-domain-desc">查看记录、趋势与它的近期变化</div>
                  </div>
                </Link>
                <Icon name="chevron" size={16} style={{ color: "var(--v4-text-tertiary)" }} />
              </div>
            ))}
          </div>
        </div>

        <div className="v4-rail">
          <div className="v4-sec" style={{ paddingTop: 18 }}>
            <h2 className="v4-sec-title">此刻</h2>
            {countEntries.length > 0 ? (
              <div className="v4-metrics">
                {countEntries.map(([et, n]) => (
                  <div key={et} className="v4-metric">
                    <span className="v4-metric-value">{n}</span>
                    <span className="v4-metric-label">{EVENT_LABELS[et] ?? et}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="v4-sec-sub">今天还没有记录。</p>
            )}
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">基本信息</h2>
            <div className="v4-statsline" style={{ marginTop: 6 }}>
              <span className="v4-chip">种类：{p?.species}</span>
              <span className="v4-chip">品种：{p?.breed || "—"}</span>
              <span className="v4-chip">性别：{p?.sex || "—"}</span>
              <span className="v4-chip">绝育：{p?.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
            </div>
            {p?.birth_date && <p className="v4-note" style={{ marginTop: 8 }}>出生日期：{fmtDate(p.birth_date)}</p>}
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">照护网络</h2>
            <div className="v4-linkrow" style={{ marginTop: 6 }}>
              <Link href="/care" className="v4-action v4-action--secondary">
                照护协作
              </Link>
              <Link href="/monitoring" className="v4-action v4-action--secondary">
                在家
              </Link>
            </div>
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">授权同意</h2>
            <State
              state={consents.state}
              error={consents.error ? mapErrorMessage(consents.error) : null}
              onRetry={consents.reload}
              empty="—"
            >
              <div className="v4-statsline" style={{ marginTop: 6 }}>
                {consents.data?.map((c) => (
                  <span key={c.purpose} className={`v4-chip${c.granted ? " v4-chip--success" : ""}`}>
                    {c.purpose}: {c.granted ? "已同意" : "未同意"}
                  </span>
                ))}
              </div>
              <p className="v4-note" style={{ marginTop: 8 }}>授权按用途逐项管理；在「我的」页可调整。</p>
            </State>
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">数据</h2>
            <p className="v4-note" style={{ marginTop: 6 }}>
              所有记录围绕同一只宠物组织，修改不会静默覆盖旧记录。
            </p>
            <div className="v4-linkrow">
              <Link href="/timeline" className="v4-action v4-action--secondary">
                查看时间线
              </Link>
              <Link href="/pets" className="v4-action v4-action--soft">
                返回列表
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
