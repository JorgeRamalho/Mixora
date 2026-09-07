export {};

declare global {
  interface Window {
    __mamuteMidiInject?: (bytes: number[]) => void;
    __mamuteMidiDebug?: () => unknown;
  }
}
