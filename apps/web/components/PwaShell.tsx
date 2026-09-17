"use client";

import { useEffect, useState } from "react";

/** PWA 壳注册 + 安装提示（不强制，尊重用户）。
 *  basePath 由服务端 layout 传入（Stage F path-prefix 部署感知）。 */
export function PwaShell({ basePath = "" }: { basePath?: string }) {
  const [installEvt, setInstallEvt] = useState<unknown>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${basePath}/sw.js`)
        .catch(() => {
          /* 不支持则静默降级 */
        });
    }
    const onOnline = () => setOffline(!navigator.onLine);
    const onOffline = () => setOffline(!navigator.onLine);
    setOffline(!navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const onBf = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", onBf);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBf);
    };
  }, []);

  async function install() {
    const evt = installEvt as { prompt: () => Promise<void> } | null;
    if (!evt) return;
    await evt.prompt();
    setInstallEvt(null);
  }

  if (offline)
    return (
      <div className="pwa-banner offline" role="status">
        <span>当前离线 · 仅可查看已缓存页面</span>
        <button className="btn" onClick={() => window.location.reload()}>
          重试
        </button>
      </div>
    );
  if (installEvt)
    return (
      <div className="pwa-banner" role="region" aria-label="安装应用">
        <span>可安装为应用，更快速地记录宠物生活。</span>
        <button className="btn primary" onClick={install}>
          安装
        </button>
      </div>
    );
  return null;
}