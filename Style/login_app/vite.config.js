import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "sesha-local-diagnostics",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use("/__sesha-client-error", (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 4096) req.destroy();
          });
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              server.config.logger.error(
                "[SESHA interfaz] " +
                  String(data.message).slice(0, 1000) +
                  "\n" +
                  String(data.stack || "").slice(0, 2000),
              );
            } catch {
              /* Solo diagnóstico local; no se persisten datos. */
            }
            res.statusCode = 204;
            res.end();
          });
        });
      },
    },
  ],
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: {
    entries: ["index.html"],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "axios",
      "lucide-react",
    ],
  },
  server: {
    watch: {
      ignored: [
        "**/.legacy_node_modules/**",
        "**/.npm-cache/**",
        "**/.qa/**",
        "**/.mongodb-binaries/**",
      ],
    },
    // Usa la misma resolución de localhost que el navegador (IPv4 o IPv6).
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
  build: { outDir: "dist", sourcemap: false },
  test: {
    include: ["src/tests/**/*.test.{js,jsx}"],
    globals: true,
    environment: "jsdom",
    maxWorkers: 2,
    setupFiles: ["./src/setupTests.js"],
    css: false,
  },
});
