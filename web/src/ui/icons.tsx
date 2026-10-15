import type { ReactElement } from "react";

/** Line icons for the sidebar. 20×20, stroke only, currentColor. */
const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS: Record<string, ReactElement> = {
  lobby: <path {...P} d="M3.5 9.5 10 4l6.5 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-4V17H4.5a1 1 0 0 1-1-1V9.5Z" />,
  sunday: (
    <g {...P}>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </g>
  ),
  poker: <path {...P} d="M10 3.5c2.5 3 5.5 4.6 5.5 7.4A2.9 2.9 0 0 1 10.6 13l1.4 3.5H8l1.4-3.5a2.9 2.9 0 0 1-4.9-2.1C4.5 8.1 7.5 6.5 10 3.5Z" />,
  monopoly: (
    <g {...P}>
      <rect x="3.5" y="3.5" width="13" height="13" rx="1.5" />
      <path d="M3.5 7h13M3.5 13h13M7 3.5v13M13 3.5v13" />
    </g>
  ),
  "blue-or-orange": (
    <g {...P}>
      <circle cx="6" cy="12.5" r="2.8" />
      <circle cx="14" cy="12.5" r="2.8" />
      <circle cx="10" cy="6" r="2.8" />
    </g>
  ),
  symposium: <path {...P} d="M3 7h14c0 3.2-3.1 5-7 5S3 10.2 3 7Zm7 5v3.5M6.5 16.5h7M3 7c-1.2 0-1.5 1.8 0 2.2M17 7c1.2 0 1.5 1.8 0 2.2" />,
  arena: <path {...P} d="M4 4l8 8M4 4v3M4 4h3M16 4l-8 8M16 4v3M16 4h-3M7 13l-2.5 2.5M13 13l2.5 2.5M10.5 14.5l-1 1M9.5 14.5l1 1" />,
  spirits: (
    <g {...P}>
      <rect x="5.5" y="3" width="9" height="14" rx="1.5" />
      <circle cx="10" cy="9" r="2.2" />
      <path d="M8 13.5h4" />
    </g>
  ),
  quests: <path {...P} d="M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v11.5L12.5 15 10 16.5 7.5 15l-3 1.5V5A1.5 1.5 0 0 1 6 3.5Zm1.5 5 1.7 1.7 3.3-3.4" />,
  chat: <path {...P} d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6.5a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H5.5A1.5 1.5 0 0 1 4 12V5.5Z" />,
  minecraft: (
    <g {...P}>
      <path d="M10 2.8 16.3 6.4v7.2L10 17.2l-6.3-3.6V6.4L10 2.8Z" />
      <path d="M3.7 6.4 10 10l6.3-3.6M10 10v7.2" />
    </g>
  ),
  news: (
    <g {...P}>
      <path d="M4 4.5h10.5v11A1.5 1.5 0 0 1 13 17H5.5A1.5 1.5 0 0 1 4 15.5v-11Z" />
      <path d="M14.5 7.5H16v8a1.5 1.5 0 0 1-1.5 1.5M6.5 7.5h5.5M6.5 10.5h5.5M6.5 13.5h3.5" />
    </g>
  ),
  treasury: <path {...P} d="M3 7.5 10 4l7 3.5M4.5 8.5v6M8 8.5v6M12 8.5v6M15.5 8.5v6M3 16.5h14" />,
  ideas: <path {...P} d="M7.5 13.5c0-1.6-2.5-2.6-2.5-5.5a5 5 0 0 1 10 0c0 2.9-2.5 3.9-2.5 5.5M7.8 15.5h4.4M8.5 17.5h3" />,
  wallet: (
    <g {...P}>
      <rect x="3" y="5.5" width="14" height="10.5" rx="1.5" />
      <path d="M3 8.5h14M13 12h1.5" />
    </g>
  ),
  profile: (
    <g {...P}>
      <circle cx="10" cy="7.5" r="3" />
      <path d="M4.5 16.5c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2" />
    </g>
  ),
  leaderboard: <path {...P} d="M4 16.5V11h3v5.5M8.5 16.5V7h3v9.5M13 16.5V9.5h3v7M3 16.5h14" />,
  bell: <path {...P} d="M6 13V9a4 4 0 0 1 8 0v4l1.5 1.5h-11L6 13Zm2.5 3a1.5 1.5 0 0 0 3 0" />,
  menu: <path {...P} d="M3.5 6h13M3.5 10h13M3.5 14h13" />,
  voice: <path {...P} d="M4 8v4h3l4 3V5L7 8H4Zm10 0a3 3 0 0 1 0 4m2-6a6 6 0 0 1 0 8" />,
  hash: <path {...P} d="M7.5 3.5 6 16.5M14 3.5l-1.5 13M3.5 7.5h13M3 12.5h13" />,
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="icon">
      {PATHS[name] ?? PATHS.lobby}
    </svg>
  );
}
