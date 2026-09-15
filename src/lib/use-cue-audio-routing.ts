import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "./audio-engine";
import {
  isCueLeakOutputLabel,
  isCueOutputPickerSupported,
  isCueSinkRoutingSupported,
  listAudioOutputLabels,
  listDdj400AudioOutputLabels,
  loadStoredCueSinkId,
  pickDdj400PhonesDevice,
  resolveAudioOutputDevice,
  saveStoredCueSinkId,
  type CueAudioRoutingStatus,
} from "./cue-audio-routing";

/** Snapshot do roteamento de cue exposto à cabine. */
export interface CueAudioRoutingSnapshot {
  status: CueAudioRoutingStatus;
  deviceLabel: string | null;
  detail: string | null;
  canChooseOutput: boolean;
  retry: () => void;
  chooseOutput: () => void;
}

/**
 * Aplica o roteamento do cue para um `deviceId` e atualiza o estado da UI.
 *
 * @param deviceId Saída escolhida pelo usuário ou detectada automaticamente.
 * @param label Rótulo legível para o chip de status.
 */
async function routeCueToDevice(
  deviceId: string,
  label: string,
): Promise<{ ok: boolean; detail: string | null }> {
  const ok = await engine.setCueSinkId(deviceId);
  if (!ok) {
    saveStoredCueSinkId(null);
    return {
      ok: false,
      detail:
        "O Chrome recusou o roteamento. Clique em Escolher saída e selecione DDJ-400 WASAPI : PHONES.",
    };
  }

  saveStoredCueSinkId(deviceId);
  return {
    ok: true,
    detail:
      "Mix de cue no PHONES da DDJ-400. O master RCA continua no destino padrão do PC.",
  };
}

/**
 * Roteia o bus de cue para o endpoint PHONES da DDJ-400 quando o MIDI conecta.
 *
 * O master permanece em `ctx.destination`. O cue vai a um contexto separado via
 * `setSinkId`. Enquanto o PHONES não aparece, o bus de fone é isolado do master,
 * senão o PFL vaza no RCA quando a DDJ-400 é o dispositivo padrão do Windows.
 *
 * @param midiConnected True quando a sessão Web MIDI da DDJ-400 está ativa.
 */
export function useCueAudioRouting(midiConnected: boolean): CueAudioRoutingSnapshot {
  const [status, setStatus] = useState<CueAudioRoutingStatus>(() =>
    isCueSinkRoutingSupported() ? "default" : "unsupported",
  );
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const attemptRef = useRef(0);

  const applyDefaultRoute = useCallback(async () => {
    await engine.setCueSinkId(null);
    setDeviceLabel(null);
    setDetail(null);
    setStatus(isCueSinkRoutingSupported() ? "default" : "unsupported");
  }, []);

  /**
   * Corta o bus de fone do destination do master enquanto o PHONES não está pronto.
   */
  const isolateCueFromMaster = useCallback(async () => {
    await engine.setCueSinkId(null, { isolate: true });
  }, []);

  const applyRouteResult = useCallback(
    async (deviceId: string, label: string) => {
      if (isCueLeakOutputLabel(label)) {
        saveStoredCueSinkId(null);
        await isolateCueFromMaster();
        setDeviceLabel(label);
        setStatus("error");
        setDetail(
          "Essa saída é o master da DDJ-400. Clique em Escolher saída e selecione PHONES.",
        );
        return false;
      }

      const result = await routeCueToDevice(deviceId, label);
      if (!result.ok) {
        await isolateCueFromMaster();
        setDeviceLabel(label);
        setStatus("error");
        setDetail(result.detail);
        return false;
      }

      setDeviceLabel(label);
      setStatus("routed");
      setDetail(result.detail);
      return true;
    },
    [isolateCueFromMaster],
  );

  const attemptRoute = useCallback(async () => {
    const attemptId = ++attemptRef.current;

    if (!isCueSinkRoutingSupported()) {
      setStatus("unsupported");
      setDeviceLabel(null);
      setDetail("Este browser não expõe setSinkId para o fone.");
      return;
    }

    if (!midiConnected) {
      await applyDefaultRoute();
      return;
    }

    const alreadyRouted = engine.cueSinkDeviceId() !== null;

    if (!alreadyRouted) {
      setStatus("searching");
      setDetail("Procurando saída PHONES da DDJ-400…");
      await isolateCueFromMaster();
    }

    try {
      await engine.ensure();
      const ctx = engine.audioContext();
      if (ctx?.state === "suspended") {
        await ctx.resume();
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      if (attemptId !== attemptRef.current) return;

      const storedId = loadStoredCueSinkId();
      const stored = storedId ? resolveAudioOutputDevice(devices, storedId) : null;
      const storedSafe =
        stored && !isCueLeakOutputLabel(stored.label ?? "") ? stored : null;
      if (stored && !storedSafe) {
        saveStoredCueSinkId(null);
      }
      const auto = pickDdj400PhonesDevice(devices);
      const candidate = storedSafe ?? auto;

      if (!candidate?.deviceId) {
        const ddjSeen = listDdj400AudioOutputLabels(devices);
        const allOutputs = listAudioOutputLabels(devices);
        setDeviceLabel(null);
        setStatus("unavailable");
        setDetail(
          isCueOutputPickerSupported()
            ? ddjSeen.length > 0
              ? `Visto: ${ddjSeen.join(" · ")}. Clique em Escolher saída e selecione PHONES.`
              : allOutputs.length > 0
                ? `Saídas: ${allOutputs.join(" · ")}. Clique em Escolher saída e selecione DDJ-400 WASAPI : PHONES.`
                : "Nenhuma saída listada. Clique em Escolher saída após conectar a DDJ-400."
            : "Atualize o Chrome (110+) para escolher a saída de fone manualmente.",
        );
        await isolateCueFromMaster();
        return;
      }

      const label = candidate.label?.trim() || "DDJ-400 PHONES";
      const ok = await applyRouteResult(candidate.deviceId, label);
      if (!ok || attemptId !== attemptRef.current) return;
    } catch {
      if (attemptId !== attemptRef.current) return;
      await isolateCueFromMaster();
      setStatus("error");
      setDetail("Falha ao enumerar ou rotear o fone. Clique em Escolher saída.");
    }
  }, [applyDefaultRoute, applyRouteResult, isolateCueFromMaster, midiConnected]);

  const chooseOutput = useCallback(() => {
    void (async () => {
      if (!isCueSinkRoutingSupported()) return;

      setStatus("searching");
      setDetail("Aguardando escolha da saída de fone…");

      try {
        await engine.ensure();
        const ctx = engine.audioContext();
        if (ctx?.state === "suspended") {
          await ctx.resume();
        }

        if (!isCueOutputPickerSupported()) {
          setStatus("unavailable");
          setDetail("Este Chrome não tem selectAudioOutput. Atualize para 110 ou superior.");
          return;
        }

        const picked = await navigator.mediaDevices.selectAudioOutput();
        if (!picked?.deviceId) {
          setStatus("unavailable");
          setDetail("Nenhuma saída escolhida.");
          await isolateCueFromMaster();
          return;
        }

        const label = picked.label?.trim() || "Saída de fone";
        await applyRouteResult(picked.deviceId, label);
      } catch {
        await isolateCueFromMaster();
        setStatus("error");
        setDetail("Seleção cancelada ou bloqueada. Tente de novo.");
      }
    })();
  }, [applyRouteResult, isolateCueFromMaster]);

  const retry = useCallback(() => {
    void attemptRoute();
  }, [attemptRoute]);

  useEffect(() => {
    void attemptRoute();
  }, [attemptRoute]);

  useEffect(() => {
    if (!isCueSinkRoutingSupported()) return undefined;

    const onDeviceChange = () => {
      void attemptRoute();
    };
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    };
  }, [attemptRoute]);

  const canChooseOutput = midiConnected && isCueSinkRoutingSupported() && status !== "searching";

  return {
    status,
    deviceLabel,
    detail,
    canChooseOutput,
    retry,
    chooseOutput,
  };
}
