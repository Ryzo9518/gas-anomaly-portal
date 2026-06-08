import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Vite config for GAS Anomaly Portal.
//
// Phase 1 (current) — mock adapter only, no backend reachable. No proxy
// is needed because no requests leave the SPA: data lives in
// src/features/audit/audit.fixture.ts and the auth adapter is
// open-session.
//
// Phase 2 (when FastAPI lands) — uncomment the proxy entry below so
// "/api/" forwards to the FastAPI URL (default http://localhost:8000).
// Then flip VITE_ADAPTER=bff and the SPA starts hitting real endpoints.
// No other config changes required.

export default defineConfig({
  base: "./", // relative paths so index.html works when opened directly from file://
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5174,
    allowedHosts: true,
    // proxy: {
    //   "/api/": {
    //     target: "http://localhost:8000",
    //     changeOrigin: true,
    //   },
    // },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
