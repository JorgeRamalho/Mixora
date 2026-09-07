import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

function run(script) {
  const child = spawn(NPM, ["run", script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
  child.on("exit", (code) => {
    console.error(`${script} encerrou (código ${code ?? 0}).`);
  });
  return child;
}

setInterval(() => {}, 60_000);

console.log("Go Live: Vite (src/ + HMR) e watch do dist/ juntos. Salve um arquivo em src/ — o Live Server recarrega.");
run("live:vite");
run("live:watch");
