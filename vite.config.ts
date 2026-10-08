import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// DEV-ONLY proxy: the browser calls /andrey/* and Vite forwards to the live brain.
// In AI Studio Build, do the SAME thing server-side (a route/module on the app's
// server) so the browser never sees ANDREY_BASE and there is no CORS.
//
// The brain gates EVERY /api/* route behind `X-Andrey-Token` (401 without it), so a
// token is REQUIRED for local dev — .env.example / README saying "leave empty" is stale.
// Vite does NOT expose .env to process.env inside the config file, so we must load it
// explicitly with loadEnv(), otherwise a .env token is silently ignored.
// Accepted names: ANDREY_TOKEN (this app) or ANDREY_API_TOKEN (the brain's own name).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const target = env.ANDREY_BASE || "https://hi5.bike/Andrey";
  const token = env.ANDREY_TOKEN || env.ANDREY_API_TOKEN || "";

  const andreyProxy = {
    target,
    changeOrigin: true,
    secure: true,
    timeout: 120000,
    proxyTimeout: 120000,
    rewrite: (p: string) => p.replace(/^\/andrey/, ""),
    headers: token ? { "X-Andrey-Token": token } : undefined,
  };

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: { "/andrey": andreyProxy },
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      proxy: { "/andrey": andreyProxy },
    },
  };
});

