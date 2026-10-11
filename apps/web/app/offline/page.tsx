"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDrafts, resolveDraftRequest, SYNC_LABELS, syncDrafts, type Draft } from "../../lib/drafts";

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
        const request = resolveDraftRequest(kind, payload);
        await api.post(request.path, request.body);
      });
      setDrafts(listDrafts());
      setMsg(`已同步 ${synced} 条${failed > 0 ? `，${failed} 条保留待处理（身份缺失或提交失败；不会改写到当前宠物）` : ""}`);
    } catch {
      setMsg("同步失败，请稍后重试");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="page page-center">
      <img src="/illustrations/error.png" alt="" width={200} height={140} style={{ borderRadius: 12 }} />
      <h1 data-testid="pli.offline.state">当前处于离线状态</h1>
      <p className="sub">
        网络似乎不可用。已缓存的基础页面仍可使用；医疗高风险数据在上传前不会只保存在本机。
      </p>
      <p className="muted" data-testid="pli.offline.last-sync">最近同步：{syncing ? "同步中…" : msg ? msg : "尚未同步，请在网络恢复后手动点击重试"}</p>
      {msg && <div className="alert info">{msg}</div>}

      <div className="card" style={{ width: "min(92vw, 560px)", textAlign: "left" }} data-testid="pli.offline.cached">
        <h2>本地草稿</h2>
        <p className="muted">离线草稿不会自动转移到其他宠物。恢复网络后请手动同步；旧版缺少宠物归属或不支持的草稿将安全保留（未同步 / 同步中 / 已同步 / 同步失败）。</p>
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
                  {typeof d.payload.pet_id === "string"
                    ? `记录对象：${d.payload.pet_id}`
                    : "未核验宠物归属：不会自动上传"} · {d.kind === "quicklog" && typeof d.payload.text === "string"
                    ? "备注草稿已保留"
                    : typeof d.payload.event_type === "string"
                      ? `事件类型：${d.payload.event_type}`
                      : "待人工处理"}
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
        <button className="btn" onClick={retrySync} disabled={syncing} data-testid="pli.offline.retry">
          {syncing ? "同步中……" : "重试连接并同步"}
        </button>
      </div>
    </main>
  );
}
