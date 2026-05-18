import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [".ngrok-free.dev"],
    proxy: {
      // Routes standard HTTP requests to your backend
      "/api": "http://localhost:5000",
      // Routes real-time WebSocket traffic to your backend
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
      },
    },
  },
});
