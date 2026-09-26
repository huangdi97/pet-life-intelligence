import type { ReactElement, SVGProps } from "react";

/** Web owner-icon set — Stage R.2 (V4 vector icons, 1.5px stroke, round caps).
 *  Functional icons are stroke SVGs; emoji is never used as a functional icon. */
export type WebIconName =
  | "paw"
  | "sun"
  | "timeline"
  | "sparkles"
  | "user"
  | "settings"
  | "food"
  | "water"
  | "walk"
  | "play"
  | "weight"
  | "sleep"
  | "medication"
  | "note"
  | "plus"
  | "arrow"
  | "chevron"
  | "eye"
  | "clock"
  | "alert"
  | "check"
  | "camera"
  | "calendar"
  | "home"
  | "heart"
  | "search"
  | "refresh"
  | "toilet"
  | "target"
  | "shield"
  | "users";

const PATHS: Record<WebIconName, ReactElement> = {
  paw: (
    <>
      <circle cx="6.5" cy="9.5" r="1.7" />
      <circle cx="17.5" cy="9.5" r="1.7" />
      <circle cx="9.8" cy="6" r="1.7" />
      <circle cx="14.2" cy="6" r="1.7" />
      <path d="M12 10.5c-3 0-5.2 2.4-5.2 4.6 0 1.5 1.2 2.7 2.7 2.7.9 0 1.7-.5 2.5-.5s1.6.5 2.5.5c1.5 0 2.7-1.2 2.7-2.7 0-2.2-2.2-4.6-5.2-4.6Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </>
  ),
  timeline: (
    <>
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
      <circle cx="19" cy="6.5" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
      <circle cx="17" cy="17.5" r="1.4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4l1.8 4.4L18 10l-4.2 1.6L12 16l-1.8-4.4L6 10l4.2-1.6L12 4Z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
      <path d="M5.5 15.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M5 20.2c1-3.4 3.7-5 7-5s6 1.6 7 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </>
  ),
  food: (
    <>
      <path d="M4.5 10.5h15v4a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4v-4Z" />
      <path d="M7 10.5V7a2 2 0 0 1 4 0v3.5M13 10.5V7a2 2 0 0 1 4 0v3.5" />
    </>
  ),
  water: <path d="M12 3.5s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9.5 12 3.5 12 3.5Z" />,
  walk: (
    <>
      <circle cx="7.5" cy="16.5" r="1.6" />
      <circle cx="4.5" cy="11.5" r="1.2" />
      <path d="M8.4 13.8l1.6-3 3.2-1.2 2.4-3M10 10.8l2.6 2.4 3.8.6 2.2 3" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9.2v5.6l4.6-2.8L10 9.2Z" />
    </>
  ),
  weight: (
    <>
      <path d="M6 8.5h12l1.6 5a3 3 0 0 1-3 3.8H7.4a3 3 0 0 1-3-3.8L6 8.5Z" />
      <path d="M8.5 8.5c0-2 .7-3 3.5-3s3.5 1 3.5 3" />
    </>
  ),
  sleep: (
    <>
      <path d="M4 7h16M4 12h10M4 17h7" />
      <circle cx="17.5" cy="12" r="1.6" />
      <circle cx="14.5" cy="17" r="1.6" />
    </>
  ),
  medication: (
    <>
      <rect x="7" y="4.5" width="10" height="4.5" rx="1.4" />
      <path d="M9 9v6.5a3.5 3.5 0 0 0 3.5 3.5h0A3.5 3.5 0 0 0 16 15.5V9" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" />
      <path d="M7.5 9.5h9M7.5 13h9M7.5 16.5h5.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />,
  chevron: <path d="m9 6 6 6-6 6" />,
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
  alert: (
    <>
      <path d="M10.3 4 2.1 17.8A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.2L13.7 4a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.4-2h5.2L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4.5" y="5.5" width="15" height="15" rx="2" />
      <path d="M4.5 10h15M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 4.5l8 7" />
      <path d="M6.5 10v9h11v-9" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.6-7-10a3.9 3.9 0 0 1 7-2.4A3.9 3.9 0 0 1 19 10c0 5.4-7 10-7 10Z" />
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v4h-4" />
    </>
  ),
  toilet: (
    <>
      <rect x="4.5" y="8.5" width="15" height="9.5" rx="2.6" />
      <path d="M9.2 11.5v3.4M12 11.5v3.4M14.8 11.5v3.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 20 6v5.2c0 4.6-3.2 8-8 9.3-4.8-1.3-8-4.7-8-9.3V6l8-2.5Z" />
      <path d="m9 12 2.1 2.1L15.5 10" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.4M17.8 15.4c1.7.7 2.6 2 2.9 4.1" />
    </>
  ),
};

/** V4 stroke icon. Falls back to paw for unknown names. */
export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.5,
  ...rest
}: { name: WebIconName; size?: number; className?: string; strokeWidth?: number } & Omit<
  SVGProps<SVGSVGElement>,
  "children" | "width" | "height"
>) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name] ?? PATHS.paw}
    </svg>
  );
}
