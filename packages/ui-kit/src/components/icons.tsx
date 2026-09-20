import type { ReactElement } from "react";

/** Stroke icon names matching tokens.icon (Lucide-style, 1.5px stroke, round caps). */
export type IconName =
  | "circle"
  | "info"
  | "eye"
  | "clock"
  | "alert-triangle"
  | "siren"
  | "paw"
  | "phone"
  | "check"
  | "x";

const PATHS: Record<IconName, ReactElement> = {
  circle: <circle cx="12" cy="12" r="9" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M10.3 4 2.1 17.8A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.2L13.7 4a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </>
  ),
  siren: (
    <>
      <path d="M7 18v-5.5a5 5 0 0 1 10 0V18" />
      <path d="M5 18h14" />
      <path d="M4 21h16" />
      <path d="M12 2.5V4" />
      <path d="M4.9 5.6l1 1.2" />
      <path d="M19.1 5.6l-1 1.2" />
    </>
  ),
  paw: (
    <>
      <circle cx="6.5" cy="9.5" r="1.6" />
      <circle cx="17.5" cy="9.5" r="1.6" />
      <circle cx="9.8" cy="6" r="1.6" />
      <circle cx="14.2" cy="6" r="1.6" />
      <path d="M12 10.5c-3 0-5.2 2.4-5.2 4.6 0 1.5 1.2 2.7 2.7 2.7.9 0 1.7-.5 2.5-.5s1.6.5 2.5.5c1.5 0 2.7-1.2 2.7-2.7 0-2.2-2.2-4.6-5.2-4.6Z" />
    </>
  ),
  phone: (
    <path d="M5.5 3h3l1.6 4.5-2.1 2a12.5 12.5 0 0 0 6.5 6.5l2-2.1L21 15.5v3a2.5 2.5 0 0 1-2.7 2.5A17 17 0 0 1 3 5.7 2.5 2.5 0 0 1 5.5 3Z" />
  ),
  check: <path d="m5 13 4 4L19 7" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
};

export function TokenIcon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.paw}
    </svg>
  );
}
