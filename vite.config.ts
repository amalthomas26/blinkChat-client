import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
  output: {
    manualChunks: (id) => {
      if (
        id.includes("node_modules/react/") ||
        id.includes("node_modules/react-dom/") ||
        id.includes("node_modules/zustand/") ||
        id.includes("node_modules/react-router-dom/")
      ) {
        return "vendor";
      }
    },
  },
},
  },
  server: {
    allowedHosts: [".ngrok-free.dev"],
    proxy: {
      // Routes standard HTTP requests to your backend.
      // changeOrigin: rewrites the Host header so Express sees localhost:5000.
      // cookieDomainRewrite: ensures Set-Cookie headers from Express (domain:
      // localhost:5000) are rewritten to "" so the browser stores them for
      // localhost:5173 — without this the refresh token cookie is silently
      // dropped and every page refresh triggers a 401 on /auth/refresh.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
      // Routes real-time WebSocket traffic to your backend.
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        cookieDomainRewrite: "",
        ws: true,
      },
    },
  },
});

