import path from "path"
import { readFileSync } from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: '127.0.0.1',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer", "iconv-lite"],
  },
});
