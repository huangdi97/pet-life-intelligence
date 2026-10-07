"use client";

import Link from "next/link";
import { api, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { breedLabel } from "../../lib/ownerLabels";
import { State } from "../../components/ui";
import { Icon } from "../../components/icons";
import { PetLivingStage } from "../../components/pet-living-stage";

function speciesLabel(species: string): string {
  if (species === "dog") return "狗";
  if (species === "cat") return "猫";
  return species;
}

interface TodayMini {
  event_counts?: Record<string, number>;
  events?: Array<{ event_type: string }>;
}

interface FriendRow {
  friend_pet_id: string;
  status: string;
}
interface HealthRow { id: string }
interface BehaviorRow { behavior: string }
interface TrainingGoalRow { title: string }
interface WelfareEvidence { observation_counts?: Record<string, number> }
interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  algorithm: string;
  computed_at: string;
}

const BASELINE_LABELS: Record<string, { label: string; suffix: string }> = {
  meal_count_per_day: { label: "每日进食次数", suffix: " 次/天" },
  walk_minutes_per_day: { label: "每日散步", suffix: " 分钟/天" },
  sleep_minutes_per_day: { label: "每日睡眠", suffix: " 分钟/天" },
};

const DOMAIN_META: Array<{ id: string; label: string; href: string; icon: "sun" | "heart" | "eye" | "target" | "shield" | "users" }> = [
  { id: "life", label: "生活", href: "/timeline", icon: "sun" },
  { id: "health", label: "健康", href: "/health", icon: "heart" },
  { id: "behavior", label: "行为", href: "/behavior", icon: "eye" },
  { id: "training", label: "训练", href: "/training", icon: "target" },
  { id: "welfare", label: "福祉", href: "/welfare", icon: "shield" },
  { id: "social", label: "社交", href: "/social", icon: "users" },
];

/** OWN-002 Pets Hub — 宠物世界（当前宠物优先 + 六域含义入口，非功能宫格）。 */
export default function PetsHubPage() {
  const { petId, choose } = useCurrentPet();
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const current = pets.data?.find((p) => p.id === petId) ?? pets.data?.[0];
  const today = useAsync<TodayMini>(
    () => (current?.id ? api.get(`/pets/${current.id}/today`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const friends = useAsync<FriendRow[]>(
    () => (current?.id ? api.get(`/pets/${current.id}/friends`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const health = useAsync<HealthRow[]>(
    () => (current?.id ? api.get(`/pets/${current.id}/health-events`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const behavior = useAsync<BehaviorRow[]>(
    () => (current?.id ? api.get(`/pets/${current.id}/behavior-events`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const training = useAsync<TrainingGoalRow[]>(
    () => (current?.id ? api.get(`/pets/${current.id}/training-goals`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const welfare = useAsync<WelfareEvidence>(
    () => (current?.id ? api.get(`/pets/${current.id}/welfare-evidence`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const changeHint = useAsync<{ hints: string[]; rule: string }>(
    () =>
      current?.id
        ? api.get(`/pets/${current.id}/abnormal-day-hint`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [current?.id],
  );
  const baseline = useAsync<BaselineRow[]>(
    () =>
      current?.id
        ? api.get<BaselineRow[]>(`/pets/${current.id}/baseline`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [current?.id],
  );
  async function recomputeBaseline() {
    if (!current?.id) return;
    await api.post(`/pets/${current.id}/baseline/recompute?window_days=14`, {});
    baseline.reload();
  }

  // Individual Twin (R2P3D-R3 D): same canonical per-pet asset as Today/Life View.
  const twin = useAsync<{ models: Array<Record<string, unknown>> }>(
    () => (current?.id ? api.get(`/pets/${current.id}/visual-models`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [current?.id],
  );
  const activeTwin = twin.data?.models.find((m) => m.status === "ACTIVE") ?? null;
  const twinDescriptor = activeTwin
    ? ((activeTwin.artifact_map as Record<string, unknown>)?.twin_descriptor as import("@pli/pet-3d").TwinDescriptor | undefined) ?? null
    : null;
  const twinVersion = Number(activeTwin?.version ?? 0) || undefined;
  const observedRegions = (
    (twinDescriptor as { surface?: { observed_regions?: string[] } } | null)?.surface?.observed_regions ?? []
  ).length;

  const counts = today.data?.event_counts ?? {};
  const totalToday = Object.values(counts).reduce((a, b) => a + b, 0);
  const lastMeaningfulEvent = (today.data?.events ?? []).find((event) => event.event_type !== "today.viewed") ?? null;
  const identityParts = [breedLabel(current?.breed), speciesLabel(current?.species ?? "")].filter(Boolean).join(" · ");
  const abnormalHint = changeHint.data?.hints?.find((item) => !item.includes("无明显异常")) ?? null;
  const welfareCount = Object.values(welfare.data?.observation_counts ?? {}).reduce((sum, value) => sum + value, 0);
  const activeFriends = (friends.data ?? []).filter((friend) => friend.status === "ACTIVE" || friend.status === "ACCEPTED" || friend.status === "PENDING");
  const domainMeaning: Record<string, string> = {
    life: totalToday > 0 ? `今天已经留下 ${totalToday} 条生活记录` : "今天还没有记录，从快速记录开始",
    health:
      health.state === "ready"
        ? (health.data?.length ?? 0) > 0
          ? `已有 ${health.data?.length ?? 0} 条健康记录可回看`
          : "还没有健康记录"
        : "健康记录暂时没有可确认结果",
    behavior:
      behavior.state === "ready"
        ? behavior.data?.[0]?.behavior
          ? `最近一次：${behavior.data[0].behavior.slice(0, 26)}${behavior.data[0].behavior.length > 26 ? "…" : ""}`
          : "还没有行为观察"
        : "行为记录暂时没有可确认结果",
    training:
      training.state === "ready"
        ? training.data?.[0]?.title
          ? `当前目标：${training.data[0].title}`
          : "还没有训练目标"
        : "训练目标暂时没有可确认结果",
    welfare:
      welfare.state === "ready"
        ? welfareCount > 0
          ? `近期已有 ${welfareCount} 条福祉观察`
          : "还没有福祉观察"
        : "福祉观察暂时没有可确认结果",
    social:
      friends.state === "ready"
        ? activeFriends.length > 0
          ? `已有 ${activeFriends.length} 个已连接或待确认的关系`
          : "还没有宠物关系记录"
        : "关系记录暂时没有可确认结果",
  };

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>宠物</h1>
        <p className="v4-topline-sub">每一只宠物都有独立的档案与生命记录。</p>
      </div>

      <State state={pets.state} error={pets.error} onRetry={pets.reload} empty="还没有宠物，先创建一只吧。">
        <>
          {current ? (
            <div data-testid="pli.pet.identity" style={{ marginBottom: 16 }}>
              <PetLivingStage
                name={current.name}
                petId={current.id}
                species={current.species}
                breed={current.breed}
                variant="pet"
                headline={lastMeaningfulEvent ? "今天已经留下新的生活记录" : "今天还没有新的生活记录"}
                caption={identityParts || undefined}
                twin={twinDescriptor ? { ...twinDescriptor, version: twinVersion ?? 1 } : null}
                frameTarget={0.33}
                sourceMediaCount={observedRegions || undefined}
                stageTestId="pli.pet.hero-stage"
                twinTestId="pli.pet.pet-twin"
              />
            </div>
          ) : null}

          <div className="v4-sec" style={{ paddingTop: 6 }}>
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">它的生活</h2>
              <Link href="/pets/new" className="v4-sec-link">新建宠物</Link>
            </div>
            {DOMAIN_META.map((row) => (
              <div key={row.id} className="v4-domain">
                <Link href={row.href} className="v4-domain-main" role="button" data-testid={`pli.pet.domain.${row.id}`}>
                  <span className="v4-domain-icon">
                    <Icon name={row.icon} size={20} />
                  </span>
                  <div>
                    <div className="v4-domain-name">{row.label}</div>
                    <div className="v4-domain-desc">{domainMeaning[row.id]}</div>
                  </div>
                </Link>
                <Icon name="chevron" size={16} style={{ color: "var(--v4-text-tertiary)" }} />
              </div>
            ))}
          </div>

          <div className="v4-sec" data-testid="pli.pet.recent">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">最近 · 与它自己相比</h2>
            </div>
            {totalToday <= 0 ? (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                记下第一件事后，这里会显示它和自己的变化。
              </p>
            ) : changeHint.state === "ready" && abnormalHint ? (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                今天有 {totalToday} 条记录；当前规则标记：{abnormalHint}
              </p>
            ) : changeHint.state === "ready" ? (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                今天有 {totalToday} 条记录；按当前确定性对比，暂未标记需要特别关注的变化。
              </p>
            ) : (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                今天有 {totalToday} 条记录；与自身基线的变化判断暂时没有可确认结果。
              </p>
            )}
          </div>

          <div className="v4-sec" data-testid="pli.pet.baseline">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">它的常态</h2>
              <button type="button" className="v4-sec-link" onClick={() => void recomputeBaseline()}>
                重新计算
              </button>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 10px" }}>
              用最近 14 天真实生活记录形成可解释基线，只和它自己比较；没有足够记录时不会猜测。
            </p>
            {baseline.state === "ready" && baseline.data?.length ? (
              baseline.data.map((row) => {
                const meta = BASELINE_LABELS[row.metric] ?? { label: "生活基线", suffix: "" };
                return (
                  <div className="v4-domain" key={row.metric}>
                    <span className="v4-domain-label">{meta.label}</span>
                    <span className="v4-domain-value">
                      {row.value}{meta.suffix} · {row.sample_count} 天样本
                    </span>
                  </div>
                );
              })
            ) : baseline.state === "ready" ? (
              <p className="v4-note">还没有足够的生活记录形成常态。继续真实记录后再计算。</p>
            ) : baseline.state === "error" ? (
              <p className="v4-note">常态暂时没有加载成功；不会把未知显示成正常。</p>
            ) : (
              <p className="v4-note">正在读取常态…</p>
            )}
          </div>

          <div className="v4-sec" data-testid="pli.pet.friends">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">它的朋友</h2>
              <Link href="/social" className="v4-sec-link">管理</Link>
            </div>
            {friends.state === "ready" && (friends.data?.length ?? 0) > 0 ? (
              friends.data?.map((f) => (
                <div key={f.friend_pet_id} className="v4-domain">
                  <span className="v4-domain-label">{f.status === "ACTIVE" ? "已连接的朋友" : f.status === "PENDING" ? "待确认的朋友" : "朋友"}</span>
                  <span className="v4-domain-value">{f.status === "ACTIVE" ? "来往中" : f.status === "PENDING" ? "等待对方确认" : "朋友"}</span>
                </div>
              ))
            ) : (
              <p className="v4-note" style={{ margin: "6px 0 0" }}>还没有添加朋友。在「社交」页添加后会出现在这里。</p>
            )}
          </div>

          <div className="v4-sec" data-testid="pli.pet.caregivers">
            <div className="v4-sec-head">
              <h2 className="v4-sec-title">照护网络</h2>
              <Link href="/care" className="v4-sec-link">查看</Link>
            </div>
            <p className="v4-note" style={{ margin: "6px 0 0" }}>和家人一起记录与照护，家人的授权可以在「我的」页管理。</p>
          </div>

          <p className="v4-domain-footer" data-testid="pli.pet.entry.lifeview" style={{ marginTop: 14 }}>
            <Link href={`/pets/${current?.id}/life-view`} className="v4-action v4-action--secondary" role="button">
              打开生命视图
            </Link>
          </p>

          <div className="v4-sec" style={{ marginTop: 16, paddingTop: 6 }}>
            <h2 className="v4-sec-title">全部宠物</h2>
            {pets.data?.map((p) => {
              const active = p.id === petId;
              return (
                <div key={p.id} className="v4-domain">
                  <Link href={`/pets/${p.id}`} className="v4-domain-main" data-testid={p.id === petId ? "pli.multipet.current" : undefined}>
                    <span className="v4-domain-icon">
                      <Icon name="paw" size={20} />
                    </span>
                    <div>
                      <div className="v4-domain-name">
                        {p.name}
                        {active && (
                          <span className="v4-chip v4-chip--success" style={{ marginLeft: 8 }}>
                            当前
                          </span>
                        )}
                      </div>
                      <div className="v4-domain-desc">
                        {speciesLabel(p.species)}
                        {breedLabel(p.breed) ? ` · ${breedLabel(p.breed)}` : ""}
                        {p.sex ? ` · ${p.sex === "FEMALE" ? "雌性" : p.sex === "MALE" ? "雄性" : "未知"}` : ""}
                      </div>
                    </div>
                  </Link>
                  <div className="v4-linkrow" style={{ marginTop: 0 }}>
                    {!active && (
                      <button
                        type="button"
                        className="v4-action v4-action--soft"
                        style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}
                        onClick={() => {
                          choose(p.id);
                          window.dispatchEvent(new Event("pli-pet-changed"));
                        }}
                        data-testid={`pli.multipet.switch.${p.id}`}
                      >
                        切换
                      </button>
                    )}
                    <Link href="/health" className="v4-action v4-action--secondary" style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}>
                      健康
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      </State>
    </main>
  );
}
