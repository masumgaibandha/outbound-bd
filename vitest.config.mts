import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // See tests/helpers/server-only-stub.ts for why.
      "server-only": path.resolve(dirname, "./tests/helpers/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // DB-backed tests spin up their own mongodb-memory-server instance and
    // can take a few seconds to download/start the binary on first run.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
