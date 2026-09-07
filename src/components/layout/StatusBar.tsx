import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router";
import { TICKER_ITEMS } from "../../data/ticker";
import { getMixerChromeSnapshot, subscribeMixerChrome } from "../../lib/mixer-chrome";
import { isMixerRoute } from "../../lib/mixer-route";
import { applyVisorMotionVars } from "../../lib/visor-motion";
import { MixerStatusChrome } from "./MixerStatusChrome";

export function StatusBar() {
  const location = useLocation();
  const mixerMode = isMixerRoute(location.pathname);
  const chrome = useSyncExternalStore(subscribeMixerChrome, getMixerChromeSnapshot, getMixerChromeSnapshot);
  const showMixerChrome = mixerMode && chrome.mounted && chrome.cabinetHeadHidden;

  useEffect(() => {
    applyVisorMotionVars();
  }, []);

  return (
    <div
      className={showMixerChrome ? "status-bar status-bar--mixer" : "status-bar"}
      role="status"
      aria-label={
        showMixerChrome
          ? "Controles de browse da cabine CDJ"
          : "Feed ao vivo de DJs, músicas e eventos"
      }
    >
      {showMixerChrome ? (
        <MixerStatusChrome />
      ) : mixerMode ? null : (
        <div className="status-track">
          <StatusSet items={TICKER_ITEMS} />
          <StatusSet items={TICKER_ITEMS} hidden />
        </div>
      )}
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
