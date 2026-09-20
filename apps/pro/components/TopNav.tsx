"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getDevUserId, type Pet } from "@pli/api-client";
import { useCurrentPet, useProRole, type ProRole } from "../lib/hooks";

/** PRO-001: 角色驱动的导航入口（Vet / Trainer / Service）。 */
const ROLE_NAV: Record<ProRole, Array<{ href: string; label: string }>> = {
  vet: [
    { href: "/vet-briefs", label: "就诊摘要 Vet Brief" },
    { href: "/behavior", label: "行为观察" },
  ],
  trainer: [
    { href: "/behavior", label: "行为观察" },
    { href: "/training", label: "训练目标" },
  ],
  service: [
    { href: "/care-cards", label: "照护执行 Care Cards" },
    { href: "/tasks", label: "任务" },
  ],
};

const ROLE_LABELS: Record<ProRole, string> = {
  vet: "兽医 Vet",
  trainer: "训导师 Trainer",
  service: "上门服务 Service",
};

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { petId, choose } = useCurrentPet();
  const { role, choose: chooseRole } = useProRole();
  const [pets, setPets] = useState<Pet[]>([]);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    setUser(getDevUserId());
    api
      .get<Pet[]>("/pets")
      .then(setPets)
      .catch(() => setPets([]));
    const onAuth = () => setUser(getDevUserId());
    window.addEventListener("pli-auth-changed", onAuth);
    return () => window.removeEventListener("pli-auth-changed", onAuth);
  }, []);

  async function logout() {
    clearSession();
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="topnav" aria-label="专业工作台导航">
      <Link href="/" className="brand">
        专业工作台
      </Link>
      <div className="role-chips" role="group" aria-label="切换角色视图">
        {(Object.keys(ROLE_LABELS) as ProRole[]).map((r) => (
          <button
            key={r}
            className={`chip${role === r ? " active" : ""}`}
            onClick={() => chooseRole(r)}
            aria-pressed={role === r}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      <div className="navlinks">
        {ROLE_NAV[role].map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              {n.label}
            </Link>
          );
        })}
      </div>
      <div className="petswitch">
        {user ? (
          <>
            <label className="pet-label">
              患者：
              <select
                value={petId ?? ""}
                onChange={(e) => {
                  choose(e.target.value);
                  router.push(`/pets/${e.target.value}`);
                }}
                aria-label="切换当前患者"
              >
                {pets.length === 0 && <option value="">（无）</option>}
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.species}）
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" onClick={logout}>
              退出登录
            </button>
          </>
        ) : (
          <Link href="/login" className="btn primary">
            登录
          </Link>
        )}
      </div>
    </nav>
  );
}
