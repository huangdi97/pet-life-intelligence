"use client";

import Link from "next/link";

interface LifeViewCardProps {
  petId: string;
  name: string;
  species: string;
  breed: string;
}

/** OWN-001 Living Canvas 主轴入口：Pet → Now → Change → Attention → Action（GOAL PHASE C）。
 *  3D 生命视图入口始终可用；真实照片/记录是基础，不依赖 3D。 */
export function LifeViewCard({ petId, name, species, breed }: LifeViewCardProps) {
  return (
    <div className="card">
      {/* v3.3 §34.2: clicking the pet visual enters the 3D Life View.
          Without a live 3D engine the whole card acts as that entry; the
          real-photo/state view never depends on 3D (graceful fallback). */}
      <Link
        href={`/pets/${petId}/life-view`}
        className="row"
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10, textDecoration: "none", cursor: "pointer" }}
        aria-label={`打开 ${name} 的生命视图`}
      >
        <div>
          <h2 style={{ margin: 0 }}>{name} · 生命视图</h2>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            {species}{breed ? ` · ${breed}` : ""} · 3D 形象与当前状态
          </p>
        </div>
        <span className="btn primary" role="button" onClick={(e) => e.stopPropagation()}>
          打开生命视图
        </span>
      </Link>
      <p className="muted" style={{ margin: "10px 0 0" }}>
        3D 形象由真实照片生成并经你确认；它只描述外观，不推断任何健康信息。
      </p>
    </div>
  );
}
