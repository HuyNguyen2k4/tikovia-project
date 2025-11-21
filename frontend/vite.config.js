import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// <-- BƯỚC 1: IMPORT
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  let apiBase =
    env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || "http://localhost:3000/api";

  if (apiBase.endsWith("/api")) {
    apiBase = apiBase.slice(0, -4);
  }

  return {
    base: "/", // Giữ nguyên
    plugins: [react(), tailwindcss()],
    resolve: {
      // BƯỚC 2: SỬA LẠI TOÀN BỘ ALIAS
      alias: {
        "@src": path.resolve(process.cwd(), "src"),
        "@assets": path.resolve(process.cwd(), "src/assets"),
        "@components": path.resolve(process.cwd(), "src/components"),
        "@configs": path.resolve(process.cwd(), "src/configs"),
        "@contexts": path.resolve(process.cwd(), "src/contexts"),
        "@hooks": path.resolve(process.cwd(), "src/hooks"),
        "@pages": path.resolve(process.cwd(), "src/pages"),
        "@routes": path.resolve(process.cwd(), "src/routes"),
        "@services": path.resolve(process.cwd(), "src/services"),
        "@utils": path.resolve(process.cwd(), "src/utils"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  };
});
