/**
 * Pure country-code classification, shared by `proxy.ts` (region cookie) and
 * by anything server-side that needs the same UK/EU/EEA boundary. No
 * external dependencies, safe to import from Node (proxy.ts runs on the
 * Node.js runtime) or a client bundle alike.
 */

// EU member states (27) + EEA-only additions (Iceland, Liechtenstein,
// Norway) + the United Kingdom (GB is the ISO 3166-1 alpha-2 code Vercel's
// x-vercel-ip-country header uses — "UK" is not a valid code and never
// appears there).
const EEA_UK_COUNTRY_CODES = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA (non-EU)
  "IS", "LI", "NO",
  // United Kingdom
  "GB",
]);

export function isEeaOrUkCountry(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return EEA_UK_COUNTRY_CODES.has(countryCode.trim().toUpperCase());
}
