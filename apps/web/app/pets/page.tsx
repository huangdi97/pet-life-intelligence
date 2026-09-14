"use client";

import Link from "next/link";
import { api, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { State } from "../../components/ui";

export default function PetsHubPage() {
  const { petId, choose } = useCurrentPet();
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);

  return (
    <main>
      <h1>宠物</h1>
      <p className="sub">管理宠物档案与家庭（PLI-001 / PLI-002）。</p>

      <div className="row" style={{ marginBottom: 8 }}>
        <Link href="/pets/new" className="btn primary">
          ＋ 新建宠物
        </Link>
        <Link href="/care" className="btn">
          家庭协作
        </Link>
      </div>

      <State state={pets.state} error={pets.error} onRetry={pets.reload} empty="还没有宠物，先创建一只吧。">
        <div className="grid2">
          {pets.data?.map((p) => {
            const active = p.id === petId;
            return (
              <div className="card" key={p.id}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h2 style={{ margin: 0 }}>
                    <img
                      src="/default-pet-avatar.png"
                      alt=""
                      width={40}
                      height={40}
                      style={{ borderRadius: 10, marginRight: 8, verticalAlign: "middle" }}
                    />
                    {p.name}
                  </h2>
                  {active && <span className="badge status-COMPLETED">当前</span>}
                </div>
                <p className="muted">
                  {p.species === "dog" ? "狗" : p.species === "cat" ? "猫" : p.species}
                  {p.breed ? ` · ${p.breed}` : ""}
                  {p.sex ? ` · ${p.sex === "FEMALE" ? "雌性" : p.sex === "MALE" ? "雄性" : "未知"}` : ""}
                </p>
                <div className="row">
                  {!active && (
                    <button
                      className="btn"
                      onClick={() => {
                        choose(p.id);
                        window.dispatchEvent(new Event("pli-pet-changed"));
                      }}
                    >
                      切换到此宠物
                    </button>
                  )}
                  <Link href={`/health`} className="btn">
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