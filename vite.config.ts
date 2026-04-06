import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendProxyTarget = env.VITE_BACKEND_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    server: {
      host: env.VITE_DEV_HOST || "0.0.0.0",
      port: Number(env.VITE_DEV_PORT || 5173),
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: backendProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: env.VITE_PREVIEW_HOST || "0.0.0.0",
      port: Number(env.VITE_PREVIEW_PORT || 4173),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
