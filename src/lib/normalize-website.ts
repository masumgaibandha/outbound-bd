// Shared by inquiry-schema.ts and order-schema.ts — not "server-only" since
// both are used from client-side forms too.
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
