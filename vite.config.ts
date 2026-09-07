import fs from "node:fs";
import path from "node:path";
import netlify from "@netlify/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function liveBundleStamp(): Plugin {
  return {
    name: "live-bundle-stamp",
    apply: "build",
    closeBundle() {
      const stamp = { builtAt: new Date().toISOString() };
      fs.mkdirSync("dist", { recursive: true });
      fs.writeFileSync(path.join("dist", "live-bundle.json"), JSON.stringify(stamp), "utf8");
      fs.writeFileSync(path.join("dist", "_redirects"), "/*    /index.html   200\n", "utf8");
    },
  };
}

function injectViteEntry(): Plugin {
  return {
    name: "inject-vite-entry",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const next = html
          .replaceAll("./public/", "./")
          .replace(/<link[^>]+href=["'][^"']*dist\/assets\/[^"']+["'][^>]*>\s*/g, "")
          .replace(/<script[^>]+src=["'][^"']*dist\/assets\/main\.js[^"']*["'][^>]*>\s*<\/script>\s*/g, "");

        if (next.includes('src="./src/main.tsx"')) return next;

        return next.replace(
          "</body>",
          '    <script type="module" src="./src/main.tsx"></script>\n  </body>',
        );
      },
    },
  };
}

function stripLiveBootFromBuild(): Plugin {
  return {
    name: "strip-live-boot-from-build",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(/<script\s+data-mamute-live-boot>[\s\S]*?<\/script>\s*/i, "");
      },
    },
  };
}

const liveFrontend = process.env.MAMUTE_LIVE_VITE === "1";

export default defineConfig({
  plugins: [
    react(),
    // Keep platform env/config, but do not intercept /api/* — Vite proxies DJ APIs to netlify dev (8888 + local DB).
    ...(liveFrontend ? [] : [netlify({ middleware: false })]),
    injectViteEntry(),
    stripLiveBootFromBuild(),
    liveBundleStamp(),
    {
      name: "ensure-bundle-in-html",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          if (/<script[^>]+src=["'][^"']*\/assets\/main\.js/.test(html)) return html;
          return html.replace(
            "</body>",
            '    <script type="module" src="./assets/main.js"></script>\n  </body>',
          );
        },
      },
    },
  ],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    origin: "http://127.0.0.1:5173",
    cors: true,
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
      clientPort: 5173,
    },
    proxy: {
      "/api/dj": {
        target: "http://localhost:8888",
        changeOrigin: true,
      },
      "/api/deezer": {
        target: "https://api.deezer.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deezer/, ""),
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "assets/main.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
