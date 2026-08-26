export const ROLES = ["ADMIN", "CLIENT"] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "CLIENT";
