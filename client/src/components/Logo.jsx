export function Logo({ size = 36, className = "", showText = false, variant = "mark" }) {
  const logoMark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="64" cy="64" r="60" fill="url(#grad)" filter="url(#glow)" />
      <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

      <path
        d="M38 64 A26 26 0 1 1 90 64 A26 26 0 1 1 38 64"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="140 20"
        transform="rotate(-15 64 64)"
      />

      <g transform="translate(20, 0)">
        <path d="M54 38 V90" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <path
          d="M54 42 C74 42 86 54 86 68 C86 82 74 94 54 94"
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <path d="M78 58 L86 64 L78 70" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="86" cy="64" r="3" fill="#ec4899" />
    </svg>
  );

  const logoHorizontal = (
    <svg
      width={showText ? size * 4.375 : size}
      height={size}
      viewBox="0 0 280 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      <g transform="translate(4, 2)">
        <circle cx="30" cy="30" r="28" fill="url(#grad)" />
        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        <path
          d="M16 30 A14 14 0 1 1 44 30 A14 14 0 1 1 16 30"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="70 12"
          transform="rotate(-12 30 30)"
        />

        <g transform="translate(6, 0)">
          <path d="M36 18 V42" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <path
            d="M36 21 C45 21 51 27 51 34 C51 41 45 47 36 47"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <path d="M45 26 L50 30 L45 34" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="30" r="1.8" fill="#ec4899" />
      </g>

      {showText && (
        <text x="72" y="42" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="28" fill="url(#textGrad)" letterSpacing="-0.5">
          OptiProspect
        </text>
      )}
    </svg>
  );

  if (variant === "horizontal") return logoHorizontal;
  if (variant === "mark") return logoMark;
  return showText ? logoHorizontal : logoMark;
}

export default Logo;