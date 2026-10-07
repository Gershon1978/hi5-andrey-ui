import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DEV-ONLY proxy: the browser calls /andrey/* and Vite forwards to the live brain.
// In AI Studio Build, do the SAME thing server-side (a route/module on the app's
// server) so the browser never sees ANDREY_BASE and there is no CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/andrey": {
        target: process.env.ANDREY_BASE || "https://hi5.bike/Andrey",
        changeOrigin: true,
        secure: true,
        timeout: 120000,
        proxyTimeout: 120000,
        rewrite: (p) => p.replace(/^\/andrey/, ""),
        headers: process.env.ANDREY_TOKEN
          ? { "X-Andrey-Token": process.env.ANDREY_TOKEN }
          : undefined,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/andrey": {
        target: process.env.ANDREY_BASE || "https://hi5.bike/Andrey",
        changeOrigin: true,
        secure: true,
        timeout: 120000,
        proxyTimeout: 120000,
        rewrite: (p) => p.replace(/^\/andrey/, ""),
        headers: process.env.ANDREY_TOKEN
          ? { "X-Andrey-Token": process.env.ANDREY_TOKEN }
          : undefined,
      },
    },
  },
});
