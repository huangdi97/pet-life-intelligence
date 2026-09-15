"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getDevUserId, setDevUserId, type Pet } from "@pli/api-client";
import { useCurrentPet } from "../lib/hooks";
import { t } from "../lib/i18n";

const NAV = [
  { href: "/", label: () => t("nav.today"), icon: "◉" },
  { href: "/timeline", label: () => t("nav.timeline"), icon: "≡" },
  { href: "/pets", label: () => t("nav.pet"), icon: "◯" },
  { href: "/search", label: () => t("nav.agent"), icon: "✳" },
  { href: "/settings", label: () => t("nav.more"), icon: "☰" },
];

/** 次级入口（桌面端显示在 More 下拉/移动端"我的"页内） */
export const MORE_LINKS = [
  { href: "/tasks", label: "任务" },
  { href: "/care", label: "照护协作" },
  { href: "/behavior", label: "行为" },
  { href: "/health", label: "健康" },
  { href: "/training", label: "训练" },
  { href: "/medication", label: "用药" },
  { href: "/notifications", label: "通知" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { petId, choose } = useCurrentPet();
  const [pets, setPets] = useState<Pet[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setUser(getDevUserId());
    api
      .get<Pet[]>("/pets")
      .then((rows) => {
        setPets(rows);
        const stored = window.localStorage.getItem("pli_current_pet");
        if (rows.length && (!stored || !rows.some((r) => r.id === stored))) {
          choose(rows[0].id);
        }
      })
      .catch(() => setPets([]));
    const onChange = () => api.get<Pet[]>("/pets").then(setPets).catch(() => {});
    window.addEventListener("pli-pet-changed", onChange);
    return () => window.removeEventListener("pli-pet-changed", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    setDevUserId(null);
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="topnav" aria-label="主导航">
      <Link href="/" className="brand">
        <img src="/icons/icon-192.png" alt="" width={26} height={26} className="brand-icon" />
        宠物生活
      </Link>
      <div className="navlinks">
        {NAV.map((n) => {
          const label = n.label();
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">
                {n.icon}
              </span>
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
        <div className="more-wrap">
          <button
            className={`btn more-btn ${moreOpen ? "active" : ""}`}
            onClick={() => setMoreOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={moreOpen}
          >
            更多 ▾
          </button>
          {moreOpen && (
            <div className="more-menu" role="menu">
              {MORE_LINKS.map((l) => (
                <Link key={l.href} href={l.href} role="menuitem" onClick={() => setMoreOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="petswitch">
        {user ? (
          <>
            <label className="pet-label">
              宠物：
              <select
                value={petId ?? ""}
                onChange={(e) => {
                  choose(e.target.value);
                }}
                aria-label={t("pet.switch")}
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
              {t("nav.logout")}
            </button>
          </>
        ) : (
          <Link href="/login" className="btn primary">
            {t("nav.login")}
          </Link>
        )}
      </div>
    </nav>
  );
}