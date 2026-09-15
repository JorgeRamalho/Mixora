import { useEffect, useRef, useState } from "react";

import { drawCollectionWavePreview } from "../../lib/waveform-draw-waves";



type TrackWaveformPreviewProps = {

  /** Amplitudes normalizadas 0–1 vindas da API. */

  samples: readonly number[] | null | undefined;

  /** Cor de destaque, em geral o tom Camelot da faixa. */

  accentColor?: string;

  /** Código Camelot para nuance A/B na paleta espectral. */

  camelotKey?: string | null;

  /** Adia o canvas até a célula entrar no viewport da collection. */

  lazy?: boolean;

};



/**

 * Pinta a mini waveform quando o host fica visível no scroll da collection.

 *

 * @param host Elemento que envolve o canvas.

 */

function paintTrackWaveformPreview(host: HTMLElement, props: TrackWaveformPreviewProps): void {

  const canvas = host.querySelector("canvas");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;



  const width = canvas.clientWidth;

  const height = canvas.clientHeight;

  if (width <= 0 || height <= 0) return;



  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.floor(width * dpr));

  canvas.height = Math.max(1, Math.floor(height * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);



  drawCollectionWavePreview(ctx, props.samples, width, height, props.camelotKey, props.accentColor);

}



/**

 * Mini waveform estática para a tabela da collection.

 *

 * @param props Amostras compactas da faixa e opção de montagem tardia.

 */

export function TrackWaveformPreview({

  samples,

  accentColor,

  camelotKey,

  lazy = true,

}: TrackWaveformPreviewProps) {

  const hostRef = useRef<HTMLSpanElement>(null);

  const [mounted, setMounted] = useState(!lazy);



  useEffect(() => {

    if (!lazy) return;



    const host = hostRef.current;

    if (!host) return;



    const scrollRoot = host.closest(".collection-tracks-scroll");

    const observer = new IntersectionObserver(

      (entries) => {

        if (entries.some((entry) => entry.isIntersecting)) {

          setMounted(true);

        }

      },

      { root: scrollRoot, rootMargin: "48px 0px", threshold: 0 },

    );



    observer.observe(host);

    return () => observer.disconnect();

  }, [lazy]);



  useEffect(() => {

    if (!mounted) return;

    const host = hostRef.current;

    if (!host) return;



    const paint = () => paintTrackWaveformPreview(host, { samples, accentColor, camelotKey });

    paint();



    const resizeObserver = new ResizeObserver(() => paint());

    resizeObserver.observe(host);

    return () => resizeObserver.disconnect();

  }, [mounted, samples, camelotKey, accentColor]);



  return (

    <span ref={hostRef} className="collection-track-wave-host">

      {mounted ? (

        <canvas className="collection-track-wave" aria-hidden="true" />

      ) : (

        <span className="collection-track-wave collection-track-wave--placeholder" aria-hidden="true" />

      )}

    </span>

  );

}


