"use client";

import Link from "next/link";
import { Icon } from "../../../../../components/icons";

interface RealPhotoCardProps {
  petId: string;
}

/** 真实照片 fallback：3D 不可用时核心信息始终可用（graceful fallback）。 */
export function RealPhotoCard({ petId }: RealPhotoCardProps) {
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">真实照片与记录</h2>
        <span className="v4-chip">
          <span className="v4-chip-icon">
            <Icon name="camera" size={13} />
          </span>
          始终可用
        </span>
      </div>
      <p className="v4-sec-sub">3D 不可用或失败时，这里始终展示它的真实照片与记录（照片上传见健康证据与快速记录）。</p>
      <div className="v4-linkrow">
        <Link href={`/pets/${petId}`} className="v4-action v4-action--secondary">
          宠物档案
        </Link>
        <Link href="/timeline" className="v4-action v4-action--secondary">
          查看时间线
        </Link>
        <Link href="/monitoring" className="v4-action v4-action--soft">
          看看它
        </Link>
      </div>
    </div>
  );
}
