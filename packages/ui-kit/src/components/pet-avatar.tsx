import { cx } from "../lib/cx";

export type AvatarSize = "sm" | "md" | "lg";

const SIZE_PX: Record<AvatarSize, number> = { sm: 24, md: 32, lg: 48 };

/** Pet avatar: image when `src` is provided, initials fallback otherwise. */
export function PetAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const initials = name.trim().slice(0, 2) || "?";
  const cls = cx("pli-avatar", `pli-avatar--${size}`, className);
  if (src) {
    return <img className={cls} src={src} alt={name} width={px} height={px} loading="lazy" />;
  }
  return (
    <span className={cls} role="img" aria-label={name}>
      {initials}
    </span>
  );
}
