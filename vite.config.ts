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
    // HOST-NEUTRAL BY DESIGN — the base is deliberately NOT set here. This one source tree is
    // deployed to TWO hosts with different mount points:
    //
    //   AI Studio Build (Cloud Run)   served at "/"         -> `npm run build`
    //   hi5.bike/Andrey/ (the brain)  served at /Andrey/    -> `npm run build:selfhosted`
    //                                                          (= vite build --base=/Andrey/)
    //
    // Why the production build must be /Andrey/: that host serves this bundle from the brain's
    // web/static/ and nginx strips the prefix. With ROOT-absolute asset URLs the browser resolves
    // /assets/… against the SHOP root, where the catch-all answers 200 text/html, so the module
    // script dies with a MIME-type error and the page never boots. (Measured 2026-10-13.)
    //
    // Do NOT hardcode /Andrey/ here: that silently breaks the AI Studio preview, which is served
    // from the Cloud Run ROOT. _deploy_spa.py builds with build:selfhosted and asserts the
    // artifact really carries /Andrey/assets/… before uploading, so the flag cannot be forgotten.
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

