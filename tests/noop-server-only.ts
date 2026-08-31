// Test-only stand-in for the `server-only` package. In a real Next.js build,
// bundler config makes importing "server-only" from a Client Component fail
// at build time; outside of Next's bundler (i.e. under Vitest) the package's
// default export throws unconditionally, which would break every server
// module under test. This no-op keeps the *intent* of "server-only" (never
// used from a "use client" file) enforced by Next's real build/lint, while
// letting the same modules load in tests.
export {};
