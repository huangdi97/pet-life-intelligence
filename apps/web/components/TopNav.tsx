"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getDevUserId, setDevUserId, type Pet } from "@pli/api-client";
import { useCurrentPet } from "../lib/hooks";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/timeline", label: "Timeline" },
  { href: "/tasks", label: "Tasks" },
  { href: "/care", label: "Care" },
  { href: "/behavior", label: "Behavior" },
  { href: "/health", label: "Health" },
  { href: "/medication", label: "Medication" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings", label: "More" },
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
    return () => window.removeEventListener("pli-pet-changed", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    setDevUserId(null);
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="topnav">
      <Link href="/" className="brand">
        🐾 PLI
      </Link>
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className={pathname === n.href ? "active" : ""}>
          {n.label}
        </Link>
      ))}
      <div className="petswitch">
        {user ? (
          <>
            <span>
              宠物：
              <select
                value={petId ?? ""}
                onChange={(e) => {
                  choose(e.target.value);
                }}
                aria-label="切换当前宠物"
              >
                {pets.length === 0 && <option value="">（无）</option>}
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.species}）
                  </option>
                ))}
              </select>
            </span>
            <button className="btn" onClick={logout}>
              退出
            </button>
          </>
        ) : (
          <Link href="/login" className="btn primary" role="button">
            登录（Dev）
          </Link>
        )}
      </div>
    </nav>
  );
}
