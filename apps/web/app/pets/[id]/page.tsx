"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError, type Pet } from "@pli/api-client";
import { fmtDate, useAsync } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { breedLabel, consentPurposeLabel } from "../../../lib/ownerLabels";
import { State } from "../../../components/ui";
import { PetLivingStage } from "../../../components/pet-living-stage";
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

const DOMAIN_ROWS: Array<{ id: string; label: string; href: string; desc: string; icon: WebIconName }> = [
  { id: "life", label: "生活", href: "/timeline", desc: "此刻、趋势与外观", icon: "sun" },
  { id: "health", label: "健康", href: "/health", desc: "最近记录与近期变化", icon: "heart" },
  { id: "behavior", label: "行为", href: "/behavior", desc: "最近一次观察与行为模式", icon: "eye" },
  { id: "training", label: "训练", href: "/training", desc: "当前目标与最近练习", icon: "target" },
  { id: "welfare", label: "福祉", href: "/welfare", desc: "近期观察：舒适、活动与恢复", icon: "shield" },
  { id: "social", label: "社交", href: "/social", desc: "最近互动与它的朋友", icon: "users" },
];

/** OWN-004 Pet World — 宠物舞台 + 生命侧面叙事（R2-P §7.2）。 */
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
  const petsList = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const friends = useAsync<Array<{ friend_pet_id: string; status: string }>>(
    () => (id ? api.get(`/pets/${id}/friends`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [id],
  );
  // R4: same canonical individual twin as Today / Life View. Declared with
  // the other hooks BEFORE any early return: a data error below (404/denied)
  // must not change hook count or React will hit the error boundary instead
  // of the dedicated not-found state (STAGE-V-VISUAL-02 regression).
  const twinModels = useAsync<{ models: Array<Record<string, unknown>> }>(
    () => (id ? api.get(`/pets/${id}/visual-models`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [id],
  );
  const activeTwin = twinModels.data?.models.find((m) => m.status === "ACTIVE") ?? null;
  const twinDescriptor = activeTwin
    ? ((activeTwin.artifact_map as Record<string, unknown>)?.twin_descriptor as
        import("@pli/pet-3d").TwinDescriptor | undefined) ?? null
    : null;
  const twinMeta = (activeTwin?.metadata_json as Record<string, unknown> | undefined) ?? {};
  const demoTwin = twinMeta.demo_fixture === true;

  if (!id || pet.state === "denied") {
    return (
      <main className="v4-main">
        <h1>{t("pets.detail")}</h1>
        <div className="v4-error">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

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
  const ANCHOR_ICONS: Record<string, WebIconName> = {
    "daily.meal": "food",
    "daily.drink": "water",
    "daily.walk": "walk",
    "daily.play": "play",
    "daily.sleep": "sleep",
    "daily.weight": "weight",
  };
  const anchors = countEntries
    .filter(([et]) => et !== "today.viewed")
    .slice(0, 4)
    .map(([et, n]) => ({
      id: et,
      label: EVENT_LABELS[et] ?? "状态",
      value: `${n} 次`,
      icon: ANCHOR_ICONS[et] ?? "paw",
      href: "/timeline",
    }));


  const identityLine = [
    p?.birth_date ? ageText(p.birth_date) : "",
    breedLabel(p?.breed) || p?.species,
    p?.sex === "FEMALE" ? "雌性" : p?.sex === "MALE" ? "雄性" : p?.sex === "UNKNOWN" ? "性别未知" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const meaningfulTodayCount = countEntries
    .filter(([eventType]) => eventType !== "today.viewed")
    .reduce((sum, [, count]) => sum + count, 0);
  const petHeadline =
    meaningfulTodayCount > 0
      ? `今天留下了 ${meaningfulTodayCount} 条生活记录`
      : "今天还没有新的生活记录";
  const visibleRelationships = (friends.data ?? []).filter(
    (friend) => friend.status === "ACTIVE" || friend.status === "ACCEPTED" || friend.status === "PENDING",
  );
  const relationshipStatusLabel = (status: string) =>
    status === "PENDING" ? "待确认" : status === "ACTIVE" || status === "ACCEPTED" ? "已连接" : "已记录";

  return (

    <main className="v4-main">
      {p ? (
        <div data-testid="pli.pet.identity">
          <PetLivingStage
            name={p.name}
            petId={p.id}
            species={p.species}
            breed={p.breed}
            variant="pet"
            stageRole="pet"
            realityField="warm-living"
            demo={demoTwin || process.env.NEXT_PUBLIC_PLI_DEMO_ENV === "1"}
            twin={twinDescriptor}
            frameTarget={0.34}
            anchors={anchors.length ? anchors : undefined}
            headline={petHeadline}
            caption={identityLine || undefined}
            stageTestId="pli.pet.hero-stage"
            twinTestId="pli.pet.pet-twin"
          />
        </div>
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
              <h2 className="v4-sec-title v4-sec-title--accent">生命视图</h2>
              <Link href={`/pets/${id}/life-view`} className="v4-sec-link" data-testid="pli.pet.entry.lifeview">
                打开生命视图
              </Link>
            </div>
            <p className="v4-sec-sub">查看它的此刻、趋势与外观；完整生命轨迹仍在一级时间线。真实照片与记录始终是基础，不依赖 3D。</p>
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">它的生活</h2>
            {DOMAIN_ROWS.map((row) => (
              <div key={row.id} className="v4-domain">
                <Link href={row.id === "life" ? `/pets/${id}/life-view` : row.href} className="v4-domain-main" role="button" data-testid={`pli.pet.domain.${row.id}`}>
                  <span className="v4-domain-icon">
                    <Icon name={row.icon} size={20} />
                  </span>
                  <div>
                    <div className="v4-domain-name">{row.label}</div>
                    <div className="v4-domain-desc">{row.desc}</div>
                  </div>
                </Link>
                <Icon name="chevron" size={16} style={{ color: "var(--v4-text-tertiary)" }} />
              </div>
            ))}
          </div>

          <div className="v4-sec" data-testid="pli.pet.friends">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">它的关系</h2>
              <Link href="/social" className="v4-sec-link">管理</Link>
            </div>
            {friends.state === "loading" ? (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>正在读取已记录的宠物关系……</p>
            ) : friends.state === "error" || friends.state === "denied" ? (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>关系记录暂时没有加载成功；进入「社交」页可以重试。</p>
            ) : visibleRelationships.length > 0 ? (
              visibleRelationships.map((f) => (
                <div key={f.friend_pet_id} className="v4-domain">
                  <span className="v4-domain-label">{petsList.data?.find((x) => x.id === f.friend_pet_id)?.name ?? "宠物朋友"}</span>
                  <span className="v4-domain-value">{relationshipStatusLabel(f.status)}</span>
                </div>
              ))
            ) : (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>还没有已连接或待确认的宠物关系；在「社交」页记录真实关系与互动后会出现在这里。</p>
            )}
          </div>
        </div>

        <div className="v4-rail">
          <div className="v4-sec" style={{ paddingTop: 18 }}>
            <h2 className="v4-sec-title">今天</h2>
            <div className="v5-observation-list" style={{ marginTop: 6 }}>
              <div className="v5-observation-row">
                <span className="v5-observation-label">生活记录</span>
                <span className="v5-observation-value">
                  {meaningfulTodayCount > 0 ? `${meaningfulTodayCount} 条` : "还没有"}
                </span>
              </div>
              <div className="v5-observation-row">
                <span className="v5-observation-label">完整轨迹</span>
                <Link href="/timeline" className="v4-sec-link">查看时间线</Link>
              </div>
            </div>
          </div>

          <div className="v4-sec">
            <h2 className="v4-sec-title">基本信息</h2>
            <div className="v4-statsline" style={{ marginTop: 6 }}>
              <span className="v4-chip">种类：{p?.species === "dog" ? "犬" : p?.species === "cat" ? "猫" : p?.species || "—"}</span>
              <span className="v4-chip">品种：{breedLabel(p?.breed) || "—"}</span>
              <span className="v4-chip">性别：{p?.sex === "FEMALE" ? "雌性" : p?.sex === "MALE" ? "雄性" : p?.sex === "UNKNOWN" ? "未知" : "—"}</span>
              <span className="v4-chip">绝育：{p?.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
            </div>
            {p?.birth_date && <p className="v4-note" style={{ marginTop: 8 }}>出生日期：{fmtDate(p.birth_date)}</p>}
          </div>

          <div className="v4-sec" data-testid="pli.pet.caregivers">
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
                    {consentPurposeLabel(c.purpose)} · {c.granted ? "已同意" : "未同意"}
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