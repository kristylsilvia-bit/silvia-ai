import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: "es2021",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@google/genai")) return "genai";
          if (id.includes("firebase")) return "firebase";
          if (id.includes("react")) return "react";
          if (id.includes("highlight.js") || id.includes("marked") || id.includes("dompurify")) {
            return "markdown";
          }
          return "vendor";
        },
      },
    },
  },
});
