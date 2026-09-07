import { CamelotWheel } from "./CamelotWheel";
import { HarmonyKeyCard } from "./HarmonyKeyCard";

interface HarmonyVisorProps {
  selected: string;
  onSelect: (code: string) => void;
}

/** Roda Camelot + cartão de tom — painel interativo compartilhado. */
export function HarmonyVisor({ selected, onSelect }: HarmonyVisorProps) {
  return (
    <div className="harmony-stage">
      <CamelotWheel selected={selected} onSelect={onSelect} />
      <HarmonyKeyCard selected={selected} onSelect={onSelect} />
    </div>
  );
}
