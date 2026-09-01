// Vitest has no equivalent of Next's "react-server" bundler resolve
// condition, so the real `server-only` package (which throws unless that
// condition is set) would throw in every test. Tests run these modules in
// a plain Node/server-like context, so this stub — aliased in
// vitest.config.mts — replaces it with a no-op, matching what actually
// happens when Next builds the real server graph.
export {};
