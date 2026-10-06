"use client";

import Link from "next/link";
import { Icon } from "../../../components/icons";

interface ActionCardProps {
  petId: string;
  onMore: () => void;
}

/** OWN-001 Action — one primary action, two lightweight peer secondary actions. */
export function ActionCard({ petId, onMore }: ActionCardProps) {
  return (
    <section className="v4-sec" data-pli-type="section" data-testid="pli.today.action">
      <div className="v4-sec-head">
        <div>
          <h2 className="v4-sec-title">下一步</h2>
          <p className="v4-sec-sub">先记录事实；需要时再查看生命视图或询问助手。</p>
        </div>
      </div>
      <button
        type="button"
        className="v4-action v4-action--primary v5-today-primary"
        onClick={onMore}
        aria-haspopup="dialog"
        data-testid="pli.today.primary-action"
      >
        <span className="v4-action-icon"><Icon name="note" size={17} /></span>
        快速记录
      </button>
      <div className="v4-linkrow v5-today-secondary">
        <Link href={`/pets/${petId}/life-view`} className="v4-action v4-action--secondary">
          <span className="v4-action-icon"><Icon name="eye" size={16} /></span>
          看看它
        </Link>
        <Link href="/agent" className="v4-action v4-action--secondary">
          <span className="v4-action-icon"><Icon name="chat" size={16} /></span>
          问助手
        </Link>
      </div>
      <p className="v4-sec-foot">记录会保留来源与时间，方便之后追溯。</p>
    </section>
  );
}
