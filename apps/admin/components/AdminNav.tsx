"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin IA（Stage H 冻结，INFORMATION_ARCHITECTURE §3 / NAVIGATION_MODEL §4）：
 * 恰好 11 个一级入口（侧栏），不混 Owner 页面。
 * 能力注册表 / 就诊摘要 不占一级导航：能力注册表折叠进功能开关(/flags)，
 * 就诊摘要从 AI / 概览页进入。
 */
const NAV = [
  { href: "/", label: "运营概览", en: "Overview" },
  { href: "/pilot", label: "试点", en: "Pilot" },
  { href: "/users", label: "用户", en: "Users" },
  { href: "/pets", label: "宠物档案", en: "Pets" },
  { href: "/safety", label: "医疗安全", en: "Safety" },
  { href: "/ai", label: "AI 能力", en: "AI" },
  { href: "/devices", label: "设备", en: "Devices" },
  { href: "/integrations", label: "集成", en: "Integrations" },
  { href: "/audit", label: "审计日志", en: "Audit" },
  { href: "/incidents", label: "事件追踪", en: "Incidents" },
  { href: "/flags", label: "功能开关", en: "Feature Flags" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="admin-sidebar">
      <Link href="/" className="brand">
        PLI 管理台
      </Link>
      <nav className="admin-side" aria-label="管理台导航">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              <span className="zh">{n.label}</span>
              <span className="en">{n.en}</span>
            </Link>
          );
        })}
      </nav>
      <p className="muted" style={{ padding: "0 14px 14px", fontSize: 12 }}>
        仅限授权管理员
        <br />
        不直接修改用户医疗数据
      </p>
    </aside>
  );
}
