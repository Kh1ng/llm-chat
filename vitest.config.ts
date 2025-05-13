import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup/mock-server.cjs",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      exclude: ["src-tauri/target/**", "**/__global-api-script.js"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
