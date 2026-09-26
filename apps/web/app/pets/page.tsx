"use client";

import Link from "next/link";
import { api, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { State } from "../../components/ui";
import { Icon } from "../../components/icons";

function speciesLabel(species: string): string {
  if (species === "dog") return "狗";
  if (species === "cat") return "猫";
  return species;
}

/** OWN-002 Pets Hub — 宠物列表（Stage R.2：照片/物种视觉优先，不是功能宫格）。 */
export default function PetsHubPage() {
  const { petId, choose } = useCurrentPet();
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);

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
        <div className="v4-sec" style={{ paddingTop: 6 }}>
          {pets.data?.map((p) => {
            const active = p.id === petId;
            return (
              <div key={p.id} className="v4-domain">
                <Link href={`/pets/${p.id}`} className="v4-domain-main">
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
      </State>
    </main>
  );
}
