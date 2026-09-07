import { useId } from "react";
import { publicAsset } from "../../lib/base";

type MamuteMascotVariant = "portrait" | "mark";

type MamuteMascotProps = {
  className?: string;
  variant?: MamuteMascotVariant;
  caption?: boolean;
  decorative?: boolean;
};

export function MamuteMascot({
  className,
  variant = "portrait",
  caption = false,
  decorative = false,
}: MamuteMascotProps) {
  if (variant === "mark") {
    return <MamuteMascotMark className={className} decorative={decorative} />;
  }

  const alt = decorative
    ? ""
    : "Mixar, o mamute DJ da cabine MixarPlayerDJ — dois decks, uma harmonia";

  return (
    <figure className={className}>
      <img
        src={publicAsset("mascote-mamute.png")}
        alt={alt}
        width={1024}
        height={1024}
        decoding="async"
      />
      {caption ? <figcaption>Mixar · mascote da cabine</figcaption> : null}
    </figure>
  );
}

function MamuteMascotMark({
  className,
  decorative,
}: {
  className?: string;
  decorative: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const ring = `${uid}-ring`;
  const fur = `${uid}-fur`;
  const tusk = `${uid}-tusk`;
  const disc = `${uid}-disc`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Mixar, mascote mamute DJ"}
    >
      <defs>
        <linearGradient id={ring} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--cyan-hot)" />
          <stop offset="0.5" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--magenta)" />
        </linearGradient>
        <radialGradient id={fur} cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#3a3244" />
          <stop offset="48%" stopColor="#1a1624" />
          <stop offset="100%" stopColor="#07060c" />
        </radialGradient>
        <linearGradient id={tusk} x1="18" y1="28" x2="28" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--gold-hot)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
        <radialGradient id={disc} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#2a2430" />
          <stop offset="100%" stopColor="#05040a" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="30.2" fill="var(--void)" />
      <circle cx="32" cy="32" r="30.2" fill={`url(#${fur})`} opacity="0.55" />

      <circle cx="18" cy="46" r="7.2" fill={`url(#${disc})`} stroke={`url(#${ring})`} strokeWidth="1.15" />
      <circle cx="46" cy="46" r="7.2" fill={`url(#${disc})`} stroke={`url(#${ring})`} strokeWidth="1.15" />
      <circle cx="18" cy="46" r="2.15" fill={`url(#${ring})`} />
      <circle cx="46" cy="46" r="2.15" fill={`url(#${ring})`} />
      <text x="18" y="47.35" textAnchor="middle" fill="var(--void)" fontSize="3.2" fontFamily="Syne, sans-serif" fontWeight="800">
        A
      </text>
      <text x="46" y="47.35" textAnchor="middle" fill="var(--void)" fontSize="3.2" fontFamily="Syne, sans-serif" fontWeight="800">
        B
      </text>

      <ellipse cx="32" cy="40" rx="13.2" ry="10.4" fill={`url(#${fur})`} />
      <ellipse cx="32" cy="26.2" rx="11.6" ry="10.2" fill={`url(#${fur})`} />
      <ellipse cx="32" cy="18.6" rx="8.4" ry="5.2" fill="#2a2430" />

      <path d="M14 24c-1.2-7.4 8.2-12.4 16.6-11.2" stroke={`url(#${ring})`} strokeWidth="2.35" strokeLinecap="round" />
      <rect x="10.2" y="21.6" width="8.4" height="11.2" rx="4.1" fill="var(--magenta)" />
      <rect x="45.4" y="21.6" width="8.4" height="11.2" rx="4.1" fill="var(--magenta)" />
      <circle cx="14.4" cy="27.2" r="2.7" fill={`url(#${disc})`} stroke="var(--cyan-hot)" strokeWidth="0.7" />
      <circle cx="49.6" cy="27.2" r="2.7" fill={`url(#${disc})`} stroke="var(--gold)" strokeWidth="0.7" />
      <circle cx="51.8" cy="21.2" r="1.15" fill="var(--lime)" />

      <path d="M22.2 34c-2.4 8.2-2.8 14.4-0.4 18.6" stroke={`url(#${tusk})`} strokeWidth="2.35" strokeLinecap="round" />
      <path d="M41.8 34c2.4 8.2 2.8 14.4 0.4 18.6" stroke={`url(#${tusk})`} strokeWidth="2.35" strokeLinecap="round" />

      <rect x="21.6" y="26.4" width="8.2" height="4.6" rx="1.4" fill="var(--void)" />
      <rect x="34.2" y="26.4" width="8.2" height="4.6" rx="1.4" fill="var(--void)" />
      <rect x="23.2" y="27.7" width="5" height="1.7" rx="0.7" fill="var(--cyan-hot)" />
      <rect x="35.8" y="27.7" width="5" height="1.7" rx="0.7" fill="var(--cyan-hot)" />

      <ellipse cx="32" cy="37.6" rx="5.6" ry="4.2" fill="#241e30" />
      <path d="M32 35.4c1.6 2.8 1.2 6.4-0.4 8.2" stroke="var(--gold)" strokeWidth="1.15" strokeLinecap="round" />

      <circle cx="32" cy="32" r="30.2" stroke={`url(#${ring})`} strokeWidth="1.55" />
    </svg>
  );
}
