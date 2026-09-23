/**
 * Shared with `src/app/admin/leads/actions.ts` and its tests. Kept in a
 * plain module rather than exported directly from `actions.ts` because a
 * `"use server"` file may only export async functions — Next's build fails
 * the whole module (every action in it, not just the extra export) if it
 * also exports a plain constant.
 */
export const NOT_AUTHORIZED_MESSAGE = "Not authorized.";
export const ORIGIN_REJECTED_MESSAGE = "Request rejected: origin could not be verified.";
