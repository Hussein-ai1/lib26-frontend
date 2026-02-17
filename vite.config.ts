import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "37.237.229.213",
        changeOrigin: true,
        secure: false
      }
    }
  }
});
