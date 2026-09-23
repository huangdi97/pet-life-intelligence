"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type HealthEventDetail, type Pet } from "@pli/api-client";
import { useAsync } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/errors";
import { State } from "../../../components/ui";
import { ComplaintCard } from "./_components/ComplaintCard";
import { EvidenceCard } from "./_components/EvidenceCard";
import { IdentityCard } from "./_components/IdentityCard";
import { MedicationHistoryCard } from "./_components/MedicationHistoryCard";
import { RiskCard } from "./_components/RiskCard";
import { SourceProvenanceCard } from "./_components/SourceProvenanceCard";
import { TimelineCard } from "./_components/TimelineCard";
import { TrendCard } from "./_components/TrendCard";

const NO_HE = "NO_HEALTH_EVENT_SELECTED";

/** PRO-003 就诊摘要视图（Vet Brief）：
 *  API 限制——没有按 brief id 读取内容的已认证端点（/vet-briefs/shared/{token} 需要一次性
 *  分享 token），因此 [id] 为健康事件 id，页面用 GET /health-events/{id} + /pets/{pet_id}
 *  渲染摘要分区：Identity / 主诉 / 起病 / 趋势 / 相关时间线 / 证据 / 用药 / 病史 / 风险 /
 *  来源与溯源。「本摘要为信息整理，不是兽医诊断」声明始终可见（非仅打印）。 */
export default function VetBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const detail = useAsync<HealthEventDetail>(
    () =>
      id
        ? api.get<HealthEventDetail>(`/health-events/${id}`)
        : Promise.reject(new Error(NO_HE)),
    [id],
  );
  const pet = useAsync<Pet | null>(
    () =>
      detail.data
        ? api.get<Pet>(`/pets/${detail.data.pet_id}`)
        : Promise.resolve(null),
    [detail.data],
  );

  if (detail.state === "denied") {
    return (
      <main>
        <h1>就诊摘要 · Vet Brief</h1>
        <div className="brief-disclaimer">本摘要为信息整理，不是兽医诊断；分级建议来自独立规则引擎。</div>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const d = detail.data;
  const heId = d?.health_event_id ?? id ?? "";

  return (
    <main>
      <header className="brief-head">
        <div className="brief-title">就诊摘要 · Vet Brief</div>
        <div className="muted">由宠物生活智能整理 · 生成给专业用户查看</div>
      </header>

      {/* 免责声明：始终可见（屏幕 + 打印） */}
      <div className="brief-disclaimer" role="note">
        本摘要为信息整理，不是兽医诊断；风险分级建议来自独立 Red Flag Rule Engine。
      </div>

      <div className="row no-print" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={() => window.print()}>
          打印 / 导出 PDF
        </button>
        {heId && (
          <Link href={`/pets/${d?.pet_id ?? ""}/timeline`} className="btn">
            查看完整时间线
          </Link>
        )}
        <Link href="/vet-briefs" className="btn">
          返回列表
        </Link>
      </div>

      <State
        state={detail.state}
        error={detail.error ? mapErrorMessage(detail.error) : null}
        onRetry={detail.reload}
        empty="暂无健康事件详情。"
      >
        {d && (
          <>
            <IdentityCard pet={pet} />
            <ComplaintCard d={d} />
            <TrendCard d={d} />
            <TimelineCard d={d} />
            <EvidenceCard d={d} />
            <MedicationHistoryCard d={d} />
            <RiskCard d={d} />
            <SourceProvenanceCard d={d} />
          </>
        )}
      </State>
    </main>
  );
}
