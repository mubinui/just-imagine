// The Just Imagine mark ("Dream Launch"): a thought cloud launching a star
// along a projectile arc. Colours are the theme tokens from globals.css.
// The same geometry is used for app/icon.svg, favicon.ico and the PWA icons.
export function Mark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#245e4e" />
      <g fill="#f9ceb0">
        <circle cx="33.2" cy="44.5" r="1.8" />
        <circle cx="36.4" cy="40" r="1.8" />
        <circle cx="39.6" cy="36.5" r="1.8" />
        <circle cx="42.8" cy="34" r="1.8" />
        <circle cx="46" cy="32.5" r="1.8" />
        <circle cx="49.2" cy="32" r="1.8" />
        <circle cx="52.4" cy="32.5" r="1.8" />
        <circle cx="55.6" cy="34" r="1.8" />
        <circle cx="58.8" cy="36.5" r="1.8" />
      </g>
      <path
        d="M73 15.5 L76.41 24.31 L85.84 24.83 L78.52 30.79 L80.93 39.92 L73 34.8 L65.07 39.92 L67.48 30.79 L60.16 24.83 L69.59 24.31 Z"
        fill="#f7d76e"
        stroke="#f7d76e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g fill="#fff9ee">
        <circle cx="36" cy="60" r="13" />
        <circle cx="51" cy="53" r="16" />
        <circle cx="67" cy="61" r="12" />
        <rect x="23" y="61" width="56" height="13" rx="6.5" />
        <circle cx="26" cy="82" r="4.5" />
        <circle cx="17" cy="90" r="2.8" />
      </g>
      <path
        d="M88 46 l1.9 4.1 4.1 1.9 -4.1 1.9 -1.9 4.1 -1.9-4.1 -4.1-1.9 4.1-1.9z"
        fill="#f9ceb0"
      />
    </svg>
  );
}
