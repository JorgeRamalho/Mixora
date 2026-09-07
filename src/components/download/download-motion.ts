import type { CSSProperties } from "react";

export function downloadBlockClass(index: number, className: string): string {
  const motion = index % 2 === 0 ? "is-pulse" : "is-float";
  return `${className} download-block ${motion}`;
}

export function downloadBlockVars(index: number): CSSProperties {
  return { "--download-i": index } as CSSProperties;
}
