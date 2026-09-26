"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icons";

interface PetHeroProps {
  name: string;
  /** Heading rendered inside the hero (an h1). Defaults to the pet name. */
  title?: ReactNode;
  /** Identity / status line under the title (e.g. "3岁2个月 · 柯基 · 雌性"). */
  line?: ReactNode;
  /** Optional pet id — the visual becomes a link to that pet's Life View. */
  petId?: string;
  /** "warm" canvas hero (Today/Pet) or "dark" immersive stage (Life View). */
  tone?: "warm" | "dark";
  /** Optional compact mode for rail/context cards. */
  compact?: boolean;
}

/** V4 Pet-first hero: a large graceful species visual + pet name.
 *  The primary identity is the pet visual + name — never a letter-circle avatar. */
export function PetHero({ name, title, line, petId, tone = "warm", compact = false }: PetHeroProps) {
  const art = (
    <div className="v4-art" aria-hidden="true">
      <span className="v4-art-blob v4-art-blob--a" />
      <span className="v4-art-blob v4-art-blob--b" />
      <Icon name="paw" size={compact ? 44 : 96} strokeWidth={1.2} className="v4-art-paw" />
    </div>
  );

  const copy = (
    <div className="v4-hero-copy">
      {title ?? <h1 className="v4-hero-title">{name}</h1>}
      {line ? <p className="v4-hero-line">{line}</p> : null}
    </div>
  );

  if (petId) {
    return (
      <Link
        href={`/pets/${petId}/life-view`}
        className={`v4-hero v4-hero--${tone}${compact ? " v4-hero--compact" : ""}`}
        aria-label={`打开 ${name} 的生命视图`}
      >
        {art}
        {copy}
      </Link>
    );
  }
  return (
    <div className={`v4-hero v4-hero--${tone}${compact ? " v4-hero--compact" : ""}`}>
      {art}
      {copy}
    </div>
  );
}
