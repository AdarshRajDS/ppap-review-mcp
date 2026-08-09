import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname);
const isDevelopment = process.env.NODE_ENV === "development";
const mockMode = process.env.VITE_MOCK_MODE === "true";

export default defineConfig({
  // Serve from ui/ so http://localhost:5173/ resolves (not /ui/index.html).
  root: path.join(projectRoot, "ui"),
  plugins: [react(), ...(mockMode ? [] : [viteSingleFile()])],
  define: {
    "import.meta.env.VITE_MOCK_MODE": JSON.stringify(
      mockMode ? "true" : "false",
    ),
  },
  build: {
    sourcemap: isDevelopment ? "inline" : false,
    cssMinify: !isDevelopment,
    minify: !isDevelopment,
    rollupOptions: {
      input: path.join(projectRoot, "ui/index.html"),
    },
    outDir: path.join(projectRoot, "dist"),
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: "/",
  },
});
