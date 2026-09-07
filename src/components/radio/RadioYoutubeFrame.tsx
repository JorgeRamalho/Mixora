import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { buildYoutubeEmbedSrc, postYoutubeCommand } from "../../lib/youtube-embed";

type RadioYoutubeFrameProps = {
  videoId: string;
  title: string;
  autoplay: boolean;
  paused?: boolean;
  className?: string;
  unavailableAfterMs?: number;
  onEnded: () => void;
  onUnavailable?: () => void;
  onReady?: () => void;
  onPlaying?: () => void;
  ariaHidden?: boolean;
};

export type RadioYoutubeFrameHandle = {
  playNow: (videoId?: string) => void;
};

type YoutubeMessagePayload = {
  event?: string;
  info?: number | {
    playerState?: number;
    currentTime?: number;
    duration?: number;
  };
};

function parseYoutubeMessage(data: unknown): YoutubeMessagePayload | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as YoutubeMessagePayload;
    } catch {
      return null;
    }
  }

  if (typeof data === "object" && data !== null) {
    return data as YoutubeMessagePayload;
  }

  return null;
}

function readInfo(payload: YoutubeMessagePayload): {
  playerState?: number;
  currentTime?: number;
  duration?: number;
} {
  if (typeof payload.info === "number") return {};
  return payload.info ?? {};
}

export const RadioYoutubeFrame = forwardRef<RadioYoutubeFrameHandle, RadioYoutubeFrameProps>(
  function RadioYoutubeFrame(
    {
      videoId,
      title,
      autoplay,
      paused = false,
      className,
      unavailableAfterMs = 8_000,
      onEnded,
      onUnavailable,
      onReady,
      onPlaying,
      ariaHidden = false,
    },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const frameId = useId().replace(/:/g, "");
    const onEndedRef = useRef(onEnded);
    const onUnavailableRef = useRef(onUnavailable);
    const onReadyRef = useRef(onReady);
    const onPlayingRef = useRef(onPlaying);
    const autoplayRef = useRef(autoplay);
    const pausedRef = useRef(paused);
    const videoIdRef = useRef(videoId);
    const readyRef = useRef(false);
    const endedRef = useRef(false);
    const unavailableRef = useRef(false);
    const wasPlayingRef = useRef(false);
    const trackStartedAtRef = useRef(Date.now());
    const [embedSrc, setEmbedSrc] = useState(() =>
      buildYoutubeEmbedSrc(videoId, { autoplay: false, enableJsApi: true, nocookie: true }),
    );

    onEndedRef.current = onEnded;
    onUnavailableRef.current = onUnavailable;
    onReadyRef.current = onReady;
    onPlayingRef.current = onPlaying;
    autoplayRef.current = autoplay;
    pausedRef.current = paused;

    const markUnavailable = () => {
      if (unavailableRef.current || endedRef.current) return;
      unavailableRef.current = true;
      onUnavailableRef.current?.();
    };

    const armTrack = (nextId: string) => {
      endedRef.current = false;
      unavailableRef.current = false;
      wasPlayingRef.current = false;
      trackStartedAtRef.current = Date.now();
      videoIdRef.current = nextId;
    };

    const applySrc = (nextId: string, shouldAutoplay: boolean) => {
      readyRef.current = false;
      armTrack(nextId);
      const src = buildYoutubeEmbedSrc(nextId, {
        autoplay: shouldAutoplay,
        enableJsApi: true,
        nocookie: true,
      });
      setEmbedSrc(src);
      const iframe = iframeRef.current;
      if (iframe) iframe.src = src;
    };

    useImperativeHandle(ref, () => ({
      playNow(nextId) {
        pausedRef.current = false;
        applySrc(nextId ?? videoIdRef.current, true);
      },
    }));

    useEffect(() => {
      if (videoId === videoIdRef.current) return;
      applySrc(videoId, autoplayRef.current && !pausedRef.current);
    }, [videoId]);

    useEffect(() => {
      if (paused) return;
      const timer = window.setTimeout(() => {
        if (!wasPlayingRef.current) markUnavailable();
      }, unavailableAfterMs);
      return () => window.clearTimeout(timer);
    }, [paused, unavailableAfterMs, videoId]);

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== "https://www.youtube.com" && event.origin !== "https://www.youtube-nocookie.com") {
          return;
        }

        const iframe = iframeRef.current;
        if (!iframe) return;

        const payload = parseYoutubeMessage(event.data);
        if (!payload) return;

        if (payload.event === "onError") {
          markUnavailable();
          return;
        }

        if (payload.event !== "infoDelivery" && payload.event !== "onStateChange") return;

        const { playerState } = readInfo(payload);
        const state = typeof payload.info === "number" ? payload.info : playerState;

        if (state === 1) {
          if (!wasPlayingRef.current) onPlayingRef.current?.();
          wasPlayingRef.current = true;
          unavailableRef.current = false;
          return;
        }

        const playedLongEnough = Date.now() - trackStartedAtRef.current >= 2_000;
        if (state === 0 && wasPlayingRef.current && playedLongEnough && !endedRef.current) {
          endedRef.current = true;
          onEndedRef.current();
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, []);

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const applyPaused = () => {
        if (!readyRef.current) return;
        postYoutubeCommand(iframe, pausedRef.current ? "pauseVideo" : "playVideo");
      };

      const armListener = () => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "listening", id: frameId }),
          "https://www.youtube.com",
        );
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "listening", id: frameId }),
          "https://www.youtube-nocookie.com",
        );
        readyRef.current = true;
        onReadyRef.current?.();
        window.setTimeout(applyPaused, 200);
      };

      iframe.addEventListener("load", armListener);
      return () => iframe.removeEventListener("load", armListener);
    }, [frameId]);

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe || !readyRef.current) return;
      postYoutubeCommand(iframe, paused ? "pauseVideo" : "playVideo");
    }, [paused]);

    return (
      <iframe
        ref={iframeRef}
        id={frameId}
        title={title}
        className={className ? `radio-dj-youtube-frame ${className}` : "radio-dj-youtube-frame"}
        src={embedSrc}
        aria-hidden={ariaHidden ? true : undefined}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen={!ariaHidden}
      />
    );
  },
);
