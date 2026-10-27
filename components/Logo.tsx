// Gym Kit mark: a kettlebell with a play button cut into it ("press start on your workout").
// Same drawing as app/icon.svg (the browser tab icon). `onPlate` inverts it for yellow backgrounds,
// where the yellow tile would disappear.
const PLATE = "#FFCE1F";
const IRON = "#1E2328";

export function LogoMark({ size = 32, onPlate = false }: { size?: number; onPlate?: boolean }) {
  const [tile, mark] = onPlate ? [IRON, PLATE] : [PLATE, IRON];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={tile} />
      <path d="M22 28v-7a10 10 0 0 1 20 0v7" fill="none" stroke={mark} strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="38" r="15" fill={mark} />
      <path d="M28.5 31.5 39 38l-10.5 6.5z" fill={tile} />
    </svg>
  );
}

export default function Logo({ onPlate = false }: { onPlate?: boolean }) {
  return (
    <span className="logo">
      <LogoMark onPlate={onPlate} />
      <span>Gym Kit</span>
    </span>
  );
}
