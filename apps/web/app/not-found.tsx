"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page page-center">
      <img src="/illustrations/error.png" alt="" width={200} height={140} style={{ borderRadius: 12 }} />
      <h1>页面不存在</h1>
      <p className="sub">您访问的页面不存在或已被移除。</p>
      <Link href="/" className="btn primary">
        回到今日
      </Link>
    </main>
  );
}