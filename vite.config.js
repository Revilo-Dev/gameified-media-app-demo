import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
var rootDir = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 4000,
        strictPort: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "./src"),
        },
    },
});
