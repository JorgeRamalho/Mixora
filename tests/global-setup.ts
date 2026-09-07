import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export default async function globalSetup(): Promise<void> {
  spawnSync("node", ["scripts/bootstrap.mjs", "--migrate", "--skip-env-copy"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}
