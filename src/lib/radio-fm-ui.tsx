import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { radioMp3Station } from "./radio-mp3-station";

/** Estado visual do visor flutuante da Mamute FM. */
export type RadioFmShell = "expanded" | "mini" | "docked";

type RadioFmUiContextValue = {
  shell: RadioFmShell;
  minimize: () => void;
  close: () => void;
  expand: () => void;
  openFromDock: () => void;
};

const RadioFmUiContext = createContext<RadioFmUiContextValue | null>(null);

/**
 * Expõe o estado do chrome da rádio flutuante para o balão e o header.
 *
 * @param children Árvore da aplicação dentro do router.
 */
export function RadioFmUiProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [shell, setShell] = useState<RadioFmShell>("expanded");

  useEffect(() => {
    if (location.pathname !== "/mixer") return;
    radioMp3Station.pause();
    setShell("docked");
  }, [location.pathname]);

  const minimize = useCallback(() => {
    setShell("mini");
  }, []);

  const close = useCallback(() => {
    radioMp3Station.pause();
    setShell("docked");
  }, []);

  const expand = useCallback(() => {
    setShell("expanded");
  }, []);

  const openFromDock = useCallback(() => {
    setShell("expanded");
    void radioMp3Station.start();
  }, []);

  const value = useMemo(
    () => ({ shell, minimize, close, expand, openFromDock }),
    [shell, minimize, close, expand, openFromDock],
  );

  return <RadioFmUiContext.Provider value={value}>{children}</RadioFmUiContext.Provider>;
}

/**
 * Lê o estado compartilhado do chrome da Mamute FM.
 */
export function useRadioFmUi(): RadioFmUiContextValue {
  const ctx = useContext(RadioFmUiContext);
  if (!ctx) {
    throw new Error("useRadioFmUi deve ser usado dentro de RadioFmUiProvider");
  }
  return ctx;
}

/**
 * Ícone de eject para reabrir a rádio minimizada ou no header.
 */
export function RadioFmEjectIcon() {
  return (
    <svg className="radio-fm-eject-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 4.5 6.5 10h11L12 4.5z"
        fill="currentColor"
      />
      <rect x="5" y="14" width="14" height="2.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}
