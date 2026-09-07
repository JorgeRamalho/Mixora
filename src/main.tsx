import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { normalizeLiveServerUrl } from "./lib/base.ts";
import "./styles/index.css";

normalizeLiveServerUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
