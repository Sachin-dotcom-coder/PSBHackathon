/**
 * PHANTOM Logo Icon — High-precision SVG representation of the Bank Pediment + Phantom Mask logo
 */
export function PhantomLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Bank Roof / Pediment */}
      <path d="M 200 45 L 300 110 L 100 110 Z" fill="#FFFFFF" />
      <rect x="115" y="118" width="170" height="10" fill="#FFFFFF" rx="1" />

      {/* Pillars */}
      <rect x="130" y="136" width="18" height="75" fill="#FFFFFF" rx="1" />
      <rect x="191" y="136" width="18" height="75" fill="#FFFFFF" rx="1" />
      <rect x="252" y="136" width="18" height="75" fill="#FFFFFF" rx="1" />

      {/* Phantom Mask / Curved Shield overlay on left */}
      <path
        d="M 100 136 C 100 240 180 320 215 340 C 180 260 140 220 215 220 C 130 200 120 160 100 136 Z"
        fill="#FFFFFF"
      />
      {/* Eye cutout in mask */}
      <path
        d="M 125 220 C 145 205 175 220 190 252 C 160 252 135 240 125 220 Z"
        fill="#0A0A0A"
      />

      {/* Vertical bars on right */}
      <rect x="235" y="270" width="7" height="40" fill="#FFFFFF" rx="1.5" />
      <rect x="250" y="240" width="7" height="70" fill="#FFFFFF" rx="1.5" />
      <rect x="265" y="210" width="7" height="100" fill="#FFFFFF" rx="1.5" />
      <rect x="280" y="195" width="7" height="115" fill="#FFFFFF" rx="1.5" />
    </svg>
  );
}
