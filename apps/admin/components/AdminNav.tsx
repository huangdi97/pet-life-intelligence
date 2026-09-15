"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "运营概览" },
  { href: "/flags", label: "Feature Flags" },
  { href: "/capabilities", label: "能力注册表" },
  { href: "/audit", label: "审计日志" },
  { href: "/vet-briefs", label: "就诊摘要" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-topnav" aria-label="管理台导航">
      <Link href="/" className="brand">
        PLI 管理台
      </Link>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={pathname === n.href ? "active" : ""}
          aria-current={pathname === n.href ? "page" : undefined}
        >
          {n.label}
        </Link>
      ))}
      <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
        仅限授权管理员 · 不直接修改用户医疗数据
      </span>
    </nav>
  );
}