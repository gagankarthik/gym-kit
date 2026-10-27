// Small custom icon set (24x24, stroke = currentColor), decorative by default.
import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  skip: (
    <>
      <path d="M5.5 5.5v13l9.5-6.5z" fill="currentColor" stroke="none" />
      <path d="M18 5.5v13" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />,
  back: <path d="M15 18l-6-6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  shuffle: <path d="M4 7h3.5c4 0 5 10 9 10H20M17 14l3 3-3 3M4 17h3.5c1.5 0 2.5-1.4 3.3-3M13.2 10c.8-1.6 1.8-3 3.3-3H20M17 4l3 3-3 3" />,
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  redo: <path d="M19 8a8 8 0 1 0 1 6M19 3.5V8h-4.5" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  kettlebell: (
    <>
      <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
      <circle cx="12" cy="14.5" r="5.5" />
    </>
  ),
  band: <path d="M5 8c0-2 2-3 3.5-3S12 6 12 8s1.5 3 3.5 3S19 12 19 14v2c0 2-2 3-3.5 3S12 18 12 16s-1.5-3-3.5-3S5 12 5 10z" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.5 10c4.5 2 10.5 2 15 0" />
    </>
  ),
  medball: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M3 12h4M17 12h4" />
    </>
  ),
  rope: <path d="M5 4v4M19 4v4M5 8c0 9 14 9 14 0" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  // levels: signal bars, filled up to the level
  bars1: <BarsPath filled={1} />,
  bars2: <BarsPath filled={2} />,
  bars3: <BarsPath filled={3} />,
  home: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  gym: (
    <>
      <path d="M7 7v10M17 7v10M7 12h10" />
      <path d="M4 9.5v5M20 9.5v5" />
    </>
  ),
  full: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M5 9l7 1.5L19 9M12 10.5V15M12 15l-3 5.5M12 15l3 5.5" />
    </>
  ),
  upper: <path d="M8 4.5h8l4 4.5-3 2-1-1.5V20H8V9.5L7 11 4 9z" />,
  lower: <path d="M6 4h12l1.2 16h-5L12 11l-2.2 9h-5z" />,
  core: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
};

function BarsPath({ filled }: { filled: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={4.5 + i * 5.5} y={14 - i * 4.5} width="4" height={6 + i * 4.5} rx="1"
          fill={i < filled ? "currentColor" : "none"} />
      ))}
    </>
  );
}

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 22, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className="icon"
    >
      {PATHS[name]}
    </svg>
  );
}
