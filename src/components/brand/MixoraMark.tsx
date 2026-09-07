import { useId } from "react";

type MixoraMarkProps = {
  className?: string;
};

export function MixoraMark({ className }: MixoraMarkProps) {
  const uid = useId().replace(/:/g, "");
  const ring = `${uid}-ring`;
  const disc = `${uid}-disc`;
  const label = `${uid}-label`;
  const gleam = `${uid}-gleam`;
  const clip = `${uid}-clip`;

  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ring} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--cyan-hot)" />
          <stop offset="0.5" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--magenta)" />
        </linearGradient>
        <radialGradient id={disc} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#2a2430" />
          <stop offset="42%" stopColor="#0c0b10" />
          <stop offset="100%" stopColor="#05040a" />
        </radialGradient>
        <radialGradient id={label} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor="var(--cyan-hot)" />
          <stop offset="48%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--magenta)" />
        </radialGradient>
        <linearGradient id={gleam} x1="18" y1="8" x2="46" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#8ff5ea" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="30.2" />
        </clipPath>
      </defs>

      <circle cx="32" cy="32" r="30.2" fill={`url(#${disc})`} />
      <g className="brand-vinyl-disc" clipPath={`url(#${clip})`}>
        <circle cx="32" cy="32" r="30.2" fill={`url(#${disc})`} />
        <circle cx="32" cy="32" r="27.4" stroke="rgba(243,239,230,0.07)" strokeWidth="0.45" />
        <circle cx="32" cy="32" r="24.6" stroke="rgba(212,196,160,0.16)" strokeWidth="0.4" />
        <circle cx="32" cy="32" r="21.8" stroke="rgba(62,232,214,0.12)" strokeWidth="0.4" />
        <circle cx="32" cy="32" r="19" stroke="rgba(243,239,230,0.08)" strokeWidth="0.38" />
        <circle cx="32" cy="32" r="16.2" stroke="rgba(232,90,168,0.14)" strokeWidth="0.38" />
        <circle cx="32" cy="32" r="13.6" stroke="rgba(212,196,160,0.18)" strokeWidth="0.4" />
        <path d="M32 32 L22 3.4 A30.2 30.2 0 0 1 46 6.2 Z" fill={`url(#${gleam})`} />
        <circle cx="32" cy="32" r="10.4" fill={`url(#${label})`} />
        <circle cx="32" cy="32" r="8.35" fill="#100e16" />
        <circle cx="32" cy="32" r="7.15" fill="none" stroke="var(--gold)" strokeWidth="0.55" opacity="0.7" />
        <circle cx="38.6" cy="24.4" r="1.15" fill="var(--cyan-hot)" />
        <circle cx="32" cy="32" r="2.05" fill="#07060c" />
        <circle cx="32" cy="32" r="2.05" stroke="var(--gold-hot)" strokeWidth="0.7" />
      </g>
      <circle cx="32" cy="32" r="30.2" stroke={`url(#${ring})`} strokeWidth="1.55" />
    </svg>
  );
}
