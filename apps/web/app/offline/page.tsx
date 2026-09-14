"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page page-center">
      <img src="/illustrations/error.png" alt="" width={200} height={140} style={{ borderRadius: 12 }} />
      <h1>当前处于离线状态</h1>
      <p className="sub">
        网络似乎不可用。已缓存的基础页面仍可使用；医疗高风险数据在上传前不会只保存在本机。
      </p>
      <div className="row">
        <Link href="/" className="btn primary">
          回到今日
        </Link>
        <button className="btn" onClick={() => window.location.reload()}>
          重试连接
        </button>
      </div>
    </main>
  );
}