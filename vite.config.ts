import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = "http://37.237.229.213"; // <-- غيّرها

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": { target: API_TARGET, changeOrigin: true },
            "/swagger": { target: API_TARGET, changeOrigin: true },
            "/uploads": { target: API_TARGET, changeOrigin: true },
        },
    },
});
