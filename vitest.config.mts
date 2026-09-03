import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // See tests/helpers/server-only-stub.ts for why.
      "server-only": path.resolve(dirname, "./tests/helpers/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    // Component tests (registration form, admin UI) render real DOM and
    // need jsdom + React Testing Library; every other suite (API routes,
    // lib functions) stays on the lighter default "node" environment above.
    // Vitest 4 removed `environmentMatchGlobs` (a v1-3 option) — per-file
    // `// @vitest-environment jsdom` docblocks are the current mechanism,
    // so each component test file opts in individually instead of a glob
    // here switching the whole suite.
    setupFiles: ["./tests/helpers/component-test-setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // DB-backed tests spin up their own mongodb-memory-server instance and
    // can take a few seconds to download/start the binary on first run.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
