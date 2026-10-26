import { useId } from "react";

/**
 * A lit, striped club shirt with the number on it: the stand-in for a player photo. Stripes in the two club
 * colours, then a highlight down the chest and shade towards the sides and sleeves so it reads as fabric.
 */
export function Kit({ main, trim, number, logo, className }: { main: string; trim: string; number: number | null; logo?: string | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const shirt = "M128 40 L168 22 Q200 44 232 22 L272 40 L352 86 L326 166 L284 150 L284 400 Q200 414 116 400 L116 150 L74 166 L48 86 Z";
  return (
    <svg viewBox="0 0 400 430" className={className} role="img" aria-label={number != null ? `Shirt number ${number}` : "Club shirt"}>
      <defs>
        <pattern id={`${id}-stripes`} width="56" height="10" patternUnits="userSpaceOnUse" x="4">
          <rect width="28" height="10" fill={main} />
          <rect x="28" width="28" height="10" fill={trim} />
        </pattern>
        <linearGradient id={`${id}-shade`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.72" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`${id}-drop`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={shirt} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="400" height="430" fill={`url(#${id}-stripes)`} />
        <rect width="400" height="430" fill={`url(#${id}-shade)`} />
        <rect width="400" height="430" fill={`url(#${id}-drop)`} />
        {/* sleeve cuffs and seams */}
        <path d="M48 86 L74 166 L116 150" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="10" />
        <path d="M352 86 L326 166 L284 150" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="10" />
        <path d="M116 150 L116 400 M284 150 L284 400" stroke="#000" strokeOpacity="0.25" strokeWidth="3" />
      </g>
      {/* collar */}
      <path d="M168 22 Q200 44 232 22 Q226 54 200 58 Q174 54 168 22 Z" fill={trim} stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
      <path d={shirt} fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" />
      {/* crest on the left chest, like a real home shirt */}
      {logo && <image href={logo} x="228" y="92" width="44" height="44" preserveAspectRatio="xMidYMid meet" />}
      {number != null && (
        <text
          x="200"
          y="246"
          textAnchor="middle"
          fontFamily="var(--font-grotesk), sans-serif"
          fontWeight="600"
          fontSize="86"
          letterSpacing="-4"
          fill="#fff"
          fillOpacity="0.94"
        >
          {number}
        </text>
      )}
    </svg>
  );
}
