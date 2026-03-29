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
        <linearGradient id="veilflow-shield" x1="16" x2="78" y1="8" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D66A2A" />
          <stop offset="1" stopColor="#7A2D10" />
        </linearGradient>
        <linearGradient id="veilflow-river" x1="22" x2="74" y1="48" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F6E3B6" />
          <stop offset="1" stopColor="#BEE3D5" />
        </linearGradient>
      </defs>

      <path
        d="M48 8c12 9 24 14 36 16v20c0 21-14 38-36 44C26 82 12 65 12 44V24c12-2 24-7 36-16Z"
        fill="url(#veilflow-shield)"
      />
      <path
        d="M31 33h34a6 6 0 0 1 6 6v9H25v-9a6 6 0 0 1 6-6Z"
        fill="#1F140C"
        opacity=".22"
      />
      <path d="M35 31a13 13 0 0 1 26 0v6h-6v-6a7 7 0 1 0-14 0v6h-6v-6Z" fill="#F7E7C0" />
      <path
        d="M22 60c8 5 14 7 20 7 11 0 15-7 24-7 5 0 10 1 22 8-8 7-18 12-30 16-16-3-28-11-36-24Z"
        fill="url(#veilflow-river)"
      />
      <path
        d="M26 56c7 4 13 6 18 6 9 0 13-6 22-6 4 0 10 1 20 6"
        stroke="#F7F0DE"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  )
}
