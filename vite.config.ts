import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { federation } from "@module-federation/vite";
import moduleFederationConfig from "./module-federation.config.ts";
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const origin = env.VITE_ORIGIN ?? "http://localhost:4175";
  return {
    base: env.VITE_BASE ?? "/",
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      federation(moduleFederationConfig),
    ],
    server: {
      port: 4175,
      strictPort: true,
      origin,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      }
    }
  };
});
