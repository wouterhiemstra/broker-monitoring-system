import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ mode }) => {
  const isDev = mode === "development";
  const plugins = [react()];

  if (isDev) {
    try {
      const cartographer = (await import("@replit/vite-plugin-cartographer")).default;
      const errorModal = (await import("@replit/vite-plugin-runtime-error-modal")).default;
      plugins.push(cartographer(), errorModal());
    } catch {
      // ignore if plugins not installed in prod
    }
  }

  return {
    root: path.resolve(__dirname, "client"),
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    build: {
      outDir: path.resolve(__dirname, "dist", "public"),
      emptyOutDir: true,
    },
    server: { port: 5173, strictPort: false },
    preview: { port: 5173, strictPort: false },
  };
});
