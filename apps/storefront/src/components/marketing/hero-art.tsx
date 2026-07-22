/**
 * Editorial hero illustration — a custom, self-contained SVG (no stock photo, no external
 * asset). Layered organic forms + a botanical sprig in the Saludlink palette. Scales
 * perfectly at any size via viewBox, so it is fully responsive by construction.
 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 600"
      role="img"
      aria-label="Abstract botanical illustration representing metabolic health"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dbe7de" />
          <stop offset="0.55" stopColor="#f0e9dd" />
          <stop offset="1" stopColor="#f5dccf" />
        </linearGradient>
        <linearGradient id="sl-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e8a6e" />
          <stop offset="1" stopColor="#2e5540" />
        </linearGradient>
      </defs>

      {/* backdrop */}
      <rect width="480" height="600" fill="url(#sl-bg)" />

      {/* soft organic blobs */}
      <circle cx="120" cy="140" r="150" fill="#8fb29a" opacity="0.35" />
      <circle cx="380" cy="430" r="180" fill="#c56b4e" opacity="0.18" />
      <circle cx="330" cy="150" r="70" fill="#c99a4e" opacity="0.35" />

      {/* central vessel / seed form */}
      <path
        d="M240 470c-70 0-120-55-120-130 0-90 70-170 120-210 50 40 120 120 120 210 0 75-50 130-120 130Z"
        fill="#fbf8f3"
        opacity="0.85"
      />

      {/* botanical sprig (growth = health) */}
      <path
        d="M240 440V200"
        stroke="url(#sl-leaf)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M240 300c-34 4-58-14-64-46 34-4 58 14 64 46Z"
        fill="url(#sl-leaf)"
      />
      <path
        d="M240 340c34 4 58-14 64-46-34-4-58 14-64 46Z"
        fill="url(#sl-leaf)"
      />
      <path
        d="M240 250c-26 2-44-12-48-36 26-2 44 12 48 36Z"
        fill="#5e8a6e"
      />
      <circle cx="240" cy="196" r="12" fill="#c56b4e" />
    </svg>
  )
}
