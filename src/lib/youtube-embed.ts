type YoutubeEmbedOptions = {
  loop?: boolean;
  autoplay?: boolean;
  enableJsApi?: boolean;
  nocookie?: boolean;
};

/** URL de embed com origin — reprodução completa na rádio Mamute FM. */
export function buildYoutubeEmbedSrc(videoId: string, options: YoutubeEmbedOptions = {}): string {
  const host = options.nocookie ? "www.youtube-nocookie.com" : "www.youtube.com";
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    controls: "0",
    fs: "0",
    iv_load_policy: "3",
    disablekb: "1",
  });

  if (options.enableJsApi) {
    params.set("enablejsapi", "1");
  }

  if (typeof window !== "undefined" && window.location.origin !== "null") {
    params.set("origin", window.location.origin);
  }

  if (options.autoplay) {
    params.set("autoplay", "1");
  }

  if (options.loop) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }

  return `https://${host}/embed/${videoId}?${params.toString()}`;
}

export type YoutubePlayerCommand =
  | "playVideo"
  | "pauseVideo"
  | "stopVideo"
  | "loadVideoById"
  | "cueVideoById";

export function postYoutubeCommand(
  iframe: HTMLIFrameElement,
  func: YoutubePlayerCommand,
  args: unknown[] = [],
): void {
  const win = iframe.contentWindow;
  if (!win) return;
  const payload = JSON.stringify({ event: "command", func, args });
  win.postMessage(payload, "https://www.youtube.com");
  win.postMessage(payload, "https://www.youtube-nocookie.com");
}
