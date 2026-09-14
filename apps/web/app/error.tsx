"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("unhandled page error", error);
  }, [error]);

  return (
    <main className="page page-center">
      <img src="/illustrations/error.png" alt="" width={200} height={140} style={{ borderRadius: 12 }} />
      <h1>页面出了点问题</h1>
      <p className="sub">请重试；如果问题持续，请联系支持。</p>
      <div className="row">
        <button className="btn primary" onClick={() => reset()}>
          刷新重试
        </button>
        <a className="btn" href="/">
          回到今日
        </a>
      </div>
    </main>
  );
}