import { useEffect } from "react";
import { TICKER_ITEMS } from "../../data/ticker";
import { applyVisorMotionVars } from "../../lib/visor-motion";

export function StatusBar() {
  useEffect(() => {
    applyVisorMotionVars();
  }, []);

  return (
    <div className="status-bar" role="status" aria-label="Feed ao vivo de DJs, músicas e eventos">
      <div className="status-track">
        <StatusSet items={TICKER_ITEMS} />
        <StatusSet items={TICKER_ITEMS} hidden />
      </div>
    </div>
  );
}

function StatusSet({
  items,
  hidden = false,
}: {
  items: typeof TICKER_ITEMS;
  hidden?: boolean;
}) {
  return (
    <div className="status-set" aria-hidden={hidden || undefined}>
      {items.map((item, index) => (
        <span className="status-item" data-kind={item.kind} key={`${item.label}-${index}`}>
          <strong>
            {item.kind.toUpperCase()} · {item.label}
          </strong>
          {" — "}
          {item.detail}
        </span>
      ))}
    </div>
  );
}
