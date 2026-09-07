import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

export function startStaticWorkspace(port: number): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    let relative = decodeURIComponent(url.pathname);
    if (relative.endsWith("/")) relative += "index.html";
    const filePath = path.normalize(path.join(ROOT, relative));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        fs.readFile(path.join(ROOT, "index.html"), (fallbackError, html) => {
          if (fallbackError) {
            res.writeHead(404);
            res.end("not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        });
        return;
      }
      const type = MIME[path.extname(filePath)] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
