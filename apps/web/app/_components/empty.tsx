"use client";

import Link from "next/link";

/** OWN-001 空宠物态（E2E 契约：还没有宠物 → 创建宠物档案）。 */
export function NoPetEmptyState() {
  return (
    <main>
      <h1>今日</h1>
      <div className="state">
        还没有宠物。先创建一只吧。
        <div style={{ marginTop: 12 }}>
          <Link href="/pets/new" className="btn primary" role="button">
            创建宠物档案
          </Link>
        </div>
      </div>
    </main>
  );
}
