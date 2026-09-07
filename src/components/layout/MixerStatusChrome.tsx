import { useSyncExternalStore } from "react";
import { getMixerChromeActions, getMixerChromeSnapshot, subscribeMixerChrome } from "../../lib/mixer-chrome";
import { BrowseChip } from "../mixer/BrowseChip";
import { BrowseSourceToggle } from "../mixer/BrowseSourceToggle";
import { CabinetHeadToggle } from "../mixer/CabinetHeadToggle";

/**
 * Barra de browse da cabine, renderizada no lugar do ticker quando a rota é `/mixer`
 * e a barra interna do board está oculta.
 */
export function MixerStatusChrome() {
  const chrome = useSyncExternalStore(subscribeMixerChrome, getMixerChromeSnapshot, getMixerChromeSnapshot);
  const actions = getMixerChromeActions();

  if (!chrome.mounted || !actions || !chrome.cabinetHeadHidden) return null;

  return (
    <div className="mixer-status-chrome">
      <div className="mixer-status-chrome__source">
        <BrowseSourceToggle value={chrome.browseSource} onChange={actions.changeBrowseSource} />
      </div>
      <div className="mixer-status-chrome__center">
        {chrome.pendingLoad ? (
          <p
            className="mixer-board-message mixer-board-message--pending"
            role="status"
            title={`LOAD na DDJ-400: clique na tela para escolher o áudio do deck ${chrome.pendingLoad.toUpperCase()}.`}
          >
            LOAD deck {chrome.pendingLoad.toUpperCase()}: clique na tela
          </p>
        ) : null}
        {chrome.libraryError ? (
          <p
            className="mixer-board-message mixer-board-message--error"
            role="alert"
            title="Não foi possível listar a biblioteca remota. Confira o MusicDiscover em http://127.0.0.1:8765 ou volte ao USB de treino."
          >
            Biblioteca remota indisponível
          </p>
        ) : null}
        <BrowseChip
          track={chrome.browseTrack}
          position={chrome.browsePosition}
          total={chrome.browseTotal}
          source={chrome.browseSource}
          loading={chrome.browseLoading}
          activeDeck={chrome.activeDeck}
        />
      </div>
      <div className="mixer-status-chrome__actions">
        <CabinetHeadToggle
          hidden={chrome.cabinetHeadHidden}
          onToggle={actions.toggleCabinetHead}
          compact
        />
      </div>
    </div>
  );
}
