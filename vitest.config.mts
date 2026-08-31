import { defineConfig } from "vitest/config";
import path from "node:path";

const dirname = import.meta.dirname;

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // See tests/noop-server-only.ts.
      "server-only": path.resolve(dirname, "tests/noop-server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    // Route handlers connect to one shared in-memory MongoDB instance
    // (started in global-setup.ts); running test files in parallel worker
    // pools is fine since each uses its own users/orders, but keep it
    // single-threaded to avoid flakiness from Mongoose's global connection
    // cache (src/lib/mongoose.ts caches one connection on globalThis).
    fileParallelism: false,
  },
});
