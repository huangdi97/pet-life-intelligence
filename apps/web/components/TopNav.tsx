"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getDevUserId, setDevUserId, type Pet } from "@pli/api-client";
import { useCurrentPet } from "../lib/hooks";
import { t } from "../lib/i18n";
import { Icon, type WebIconName } from "./icons";

const NAV: Array<{ href: string; label: () => string; testId: string; icon: WebIconName }> = [
  { href: "/", label: () => t("nav.today"), testId: "pli.nav.today", icon: "sun" },
  { href: "/timeline", label: () => t("nav.timeline"), testId: "pli.nav.timeline", icon: "timeline" },
  { href: "/pets", label: () => t("nav.pet"), testId: "pli.nav.pet", icon: "paw" },
  { href: "/agent", label: () => t("nav.agent"), testId: "pli.nav.assistant", icon: "sparkles" },
  { href: "/settings", label: () => t("nav.more"), testId: "pli.nav.me", icon: "user" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { petId, choose } = useCurrentPet();
  const [pets, setPets] = useState<Pet[]>([]);
  const [user, setUser] = useState<string | null>(null);

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
    const onAuth = () => setUser(getDevUserId());
    window.addEventListener("pli-auth-changed", onAuth);
    return () => {
      window.removeEventListener("pli-pet-changed", onChange);
      window.removeEventListener("pli-auth-changed", onAuth);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    const refresh = window.localStorage.getItem("pli_refresh_token");
    if (refresh) {
      try {
        await api.post("/auth/logout", { refresh_token: refresh });
      } catch {
        /* ignore */
      }
    }
    clearSession();
    setDevUserId(null);
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="topnav" aria-label="主导航" data-pli-role="nav">
      <Link href="/" className="brand">
        <img src="/icons/icon-192.png" alt="" width={26} height={26} className="brand-icon" />
        宠物生活
      </Link>
      <div className="navlinks">
        {NAV.map((n) => {
          const label = n.href === "/pets" ? pets.find((p) => p.id === petId)?.name ?? n.label() : n.label();
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              aria-label={n.href === "/pets" ? `宠物：${label}` : label}
              data-testid={n.testId}
            >
              <span className="nav-icon" aria-hidden="true">
                <Icon name={n.icon} size={15} />
              </span>
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
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
                data-testid="pli.multipet.switch"
              >
                {pets.length === 0 && <option value="">（无）</option>}
                {pets.map((p) => (
                  <option key={p.id} value={p.id} data-testid={p.id === petId ? "pli.multipet.current" : undefined}>
                    {p.name}（{p.species === "dog" ? "犬" : p.species === "cat" ? "猫" : "宠物"}）
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" onClick={logout} aria-label="退出当前账号">
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
