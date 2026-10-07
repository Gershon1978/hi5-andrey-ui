import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DEV-ONLY proxy: the browser calls /andrey/* and Vite forwards to the live brain.
// In AI Studio Build, do the SAME thing server-side (a route/module on the app's
// server) so the browser never sees ANDREY_BASE and there is no CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/andrey": {
        target: "https://hi5.bike/Andrey",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/andrey/, ""),
      },
    },
  },
});
