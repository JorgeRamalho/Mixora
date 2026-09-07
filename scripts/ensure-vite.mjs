import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

async function viteServesSrc() {
  try {
    const client = await fetch(`${ORIGIN}/@vite/client`, { cache: "no-store" });
    const clientType = client.headers.get("content-type") ?? "";
    if (!client.ok || /html/i.test(clientType)) return false;
    const main = await fetch(`${ORIGIN}/src/main.tsx`, { cache: "no-store" });
    const mainType = main.headers.get("content-type") ?? "";
    if (!main.ok || /html/i.test(mainType)) return false;
    return /javascript|typescript|ecmascript|module/i.test(mainType) || mainType === "";
  } catch {
    return false;
  }
}

function keepAlive() {
  setInterval(() => {}, 60_000);
}

if (await viteServesSrc()) {
  console.log(`Vite já lê src/ em ${ORIGIN} — o Go Live (5500) pode montar o app a partir da fonte.`);
  keepAlive();
} else {
  console.log(`Subindo Vite em ${PORT} para o Go Live ler src/ (não dist/)…`);

  const child = spawn(
    NPX,
    ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, MAMUTE_LIVE_VITE: "1" },
    },
  );

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await viteServesSrc()) {
      console.log(`Vite pronto em ${ORIGIN}. Go Live na porta 5500 passa a usar src/.`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  if (!(await viteServesSrc())) {
    console.error("Vite não respondeu em src/ a tempo. Abra o terminal e rode npm run dev.");
    child.kill();
    process.exit(1);
  }

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
