import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = process.env.VITE_BACKEND_URL || "http://localhost:5000";

// In development the Vite server proxies REST and WebSocket traffic to Flask,
// so the browser only ever talks to one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": backend,
      "/socket.io": { target: backend, ws: true },
    },
  },
});
