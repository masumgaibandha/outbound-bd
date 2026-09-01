// Used by inquiry-schema.ts — not "server-only" since it's also used
// directly from the client-side contact form.
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
