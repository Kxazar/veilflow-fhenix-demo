type LogoMarkProps = {
  className?: string
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="noctra-arc" x1="18" x2="78" y1="18" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF8354" />
          <stop offset="1" stopColor="#FFCA7A" />
        </linearGradient>
        <linearGradient id="noctra-core" x1="32" x2="66" y1="28" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1D4" />
          <stop offset="1" stopColor="#79EAD2" />
        </linearGradient>
      </defs>

      <path
        d="M77 18c7 7 11 17 11 29 0 27-18 45-45 45-12 0-23-4-32-11l10-13c7 5 15 8 24 8 18 0 31-11 31-29 0-8-3-16-9-22l10-7Z"
        fill="url(#noctra-arc)"
      />
      <path
        d="M18 78C11 71 8 61 8 49 8 22 26 4 53 4c11 0 21 3 30 10L72 27c-6-5-14-7-22-7-18 0-31 11-31 28 0 8 3 15 9 21L18 78Z"
        fill="#151A23"
        stroke="#2A3443"
        strokeOpacity="0.42"
      />
      <path
        d="M48 24 68 48 48 72 28 48 48 24Z"
        fill="#11161F"
        stroke="url(#noctra-arc)"
        strokeWidth="4"
      />
      <path d="M48 31 61 48 48 65 35 48 48 31Z" fill="url(#noctra-core)" />
      <path d="M36 48h24" stroke="#11161F" strokeLinecap="round" strokeWidth="4" />
      <circle cx="48" cy="48" fill="#11161F" r="5" />
    </svg>
  )
}
