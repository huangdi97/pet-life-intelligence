"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDrafts, SYNC_LABELS, syncDrafts, type Draft } from "../../lib/drafts";

const KIND_LABELS: Record<string, string> = {
  quicklog: "快速记录",
  behavior: "行为",
  health_intake: "健康异常",
  care_note: "照护备注",
};

/** OWN-020 Offline（Stage H §63）：离线 shell + 本地草稿与同步状态。 */
export default function OfflinePage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(listDrafts());
  }, []);

  async function retrySync() {
    setSyncing(true);
    setMsg(null);
    try {
      const { synced, failed } = await syncDrafts(async (kind, payload) => {
        const { api } = await import("@pli/api-client");
        if (kind === "quicklog" || kind === "behavior") {
          const petId = window.localStorage.getItem("pli_current_pet");
          if (!petId) throw new Error("NO_PET_SELECTED");
          await api.post(`/pets/${petId}/events`, payload);
        } else {
          // health_intake / care_note 草稿需要宠物上下文；无法同步时保留
          const petId = window.localStorage.getItem("pli_current_pet");
          if (!petId) throw new Error("NO_PET_SELECTED");
          await api.post(`/pets/${petId}/events`, { event_type: "diary.created", payload });
        }
      });
      setDrafts(listDrafts());
      setMsg(`已同步 ${synced} 条${failed > 0 ? `，失败 ${failed} 条（稍后重试）` : ""}`);
    } catch {
      setMsg("同步失败，请稍后重试");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="page page-center">
      <img src="/illustrations/error.png" alt="" width={200} height={140} style={{ borderRadius: 12 }} />
      <h1>当前处于离线状态</h1>
      <p className="sub">
        网络似乎不可用。已缓存的基础页面仍可使用；医疗高风险数据在上传前不会只保存在本机。
      </p>
      {msg && <div className="alert info">{msg}</div>}

      <div className="card" style={{ width: "min(92vw, 560px)", textAlign: "left" }}>
        <h2>本地草稿</h2>
        <p className="muted">离线时记录会先保存为草稿，恢复后自动同步（未同步 / 同步中 / 已同步 / 同步失败）。</p>
        {drafts.length === 0 ? (
          <div className="state">没有本地草稿。</div>
        ) : (
          <ul className="tl">
            {drafts.map((d) => (
              <li key={d.id}>
                <div className="tl-head">
                  <span className="tl-type">{KIND_LABELS[d.kind] ?? d.kind}</span>
                  <span className={`badge ${d.status === "failed" ? "EMERGENCY" : ""}`}>
                    {SYNC_LABELS[d.status]}
                  </span>
                  <span className="tl-time">{new Date(d.created_at).toLocaleString("zh-CN", { hour12: false })}</span>
                </div>
                <div className="tl-body">
                  {Object.entries(d.payload)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="row">
        <Link href="/" className="btn primary">
          回到今日
        </Link>
        <button className="btn" onClick={retrySync} disabled={syncing}>
          {syncing ? "同步中……" : "重试连接并同步"}
        </button>
      </div>
    </main>
  );
}
