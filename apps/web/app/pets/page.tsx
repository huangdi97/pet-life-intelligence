"use client";

import Link from "next/link";
import { api, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
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

/** 六域：每个入口都带当前含义摘要，而不是纯功能宫格。 */
const DOMAIN_ROWS: Array<{ id: string; label: string; href: string; icon: "sun" | "heart" | "eye" | "target" | "shield" | "users"; meaning: (count: number) => string }> = [
  { id: "life", label: "生活", href: "/timeline", icon: "sun", meaning: (c) => (c > 0 ? `最近有 ${c} 条关于它的记录` : "今天还没有记录，从快速记录开始") },
  { id: "health", label: "健康", href: "/health", icon: "heart", meaning: () => "近期健康记录与变化会汇总在这里" },
  { id: "behavior", label: "行为", href: "/behavior", icon: "eye", meaning: () => "最近的观察与行为模式会汇总在这里" },
  { id: "training", label: "训练", href: "/training", icon: "target", meaning: () => "当前目标与最近练习会汇总在这里" },
  { id: "welfare", label: "福利", href: "/welfare", icon: "shield", meaning: () => "舒适、活动与恢复的观察会汇总在这里" },
  { id: "social", label: "社交", href: "/social", icon: "users", meaning: () => "它和朋友的互动会汇总在这里" },
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

  const counts = today.data?.event_counts ?? {};
  const totalToday = Object.values(counts).reduce((a, b) => a + b, 0);
  const identityParts = [current?.breed || current?.species, speciesLabel(current?.species ?? "")].filter(Boolean).join(" · ");

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>宠物</h1>
        <p className="v4-topline-sub">每一只宠物都有独立的档案与生命记录。</p>
      </div>

      <div className="v4-linkrow" style={{ marginBottom: 12 }}>
        <Link href="/pets/new" className="v4-action v4-action--primary">
          <span className="v4-action-icon">
            <Icon name="plus" size={16} />
          </span>
          新建宠物
        </Link>
        <Link href="/care" className="v4-action v4-action--secondary">
          家庭协作
        </Link>
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
                headline={current.name}
                caption={identityParts || undefined}
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
            {DOMAIN_ROWS.map((row) => (
              <div key={row.id} className="v4-domain">
                <Link href={row.href} className="v4-domain-main" role="button" data-testid={`pli.pet.domain.${row.id}`}>
                  <span className="v4-domain-icon">
                    <Icon name={row.icon} size={20} />
                  </span>
                  <div>
                    <div className="v4-domain-name">{row.label}</div>
                    <div className="v4-domain-desc">{row.id === "life" ? row.meaning(totalToday) : row.meaning(0)}</div>
                  </div>
                </Link>
                <Icon name="chevron" size={16} style={{ color: "var(--v4-text-tertiary)" }} />
              </div>
            ))}
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
                        {p.breed ? ` · ${p.breed}` : ""}
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
