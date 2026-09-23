"use client";

import Link from "next/link";

interface RealPhotoCardProps {
  petId: string;
}

/** 真实照片 fallback：3D 不可用时核心信息始终可用。 */
export function RealPhotoCard({ petId }: RealPhotoCardProps) {
  return (
    <div className="card">
      <h2>真实照片</h2>
      <p className="sub" style={{ margin: 0 }}>
        3D 不可用或失败时，这里始终展示它的真实照片与记录（照片上传功能见健康证据与 Quick Log）。
      </p>
      <div className="row" style={{ marginTop: 10 }}>
        <Link href={`/pets/${petId}`} className="btn">
          宠物档案
        </Link>
        <Link href="/timeline" className="btn">
          查看时间线
        </Link>
        <Link href="/monitoring" className="btn">
          看看它
        </Link>
      </div>
    </div>
  );
}
