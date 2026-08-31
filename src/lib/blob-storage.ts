import "server-only";

import { randomUUID } from "node:crypto";

import { del, get, put } from "@vercel/blob";

import { blobEnv } from "@/lib/blob-env";

/**
 * All payment proof files live under this prefix in the (private-access)
 * Blob store, keyed by order id so they're easy to audit/browse per order.
 * `access: "private"` means the returned URL alone grants nothing — every
 * read goes through `getPaymentProof` below, which is itself gated by
 * ownership/admin checks in the API routes that call it.
 */
function buildProofPathname(orderId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(-100);
  return `payment-proofs/${orderId}/${randomUUID()}-${safeName}`;
}

export async function uploadPaymentProof(
  orderId: string,
  file: File,
): Promise<{ pathname: string; fileName: string; contentType: string; sizeBytes: number }> {
  const pathname = buildProofPathname(orderId, file.name || "proof");

  const result = await put(pathname, file, {
    access: "private",
    contentType: file.type || "application/octet-stream",
    token: blobEnv.BLOB_READ_WRITE_TOKEN,
  });

  return {
    pathname: result.pathname,
    fileName: file.name || "proof",
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export async function readPaymentProof(pathname: string) {
  return get(pathname, {
    access: "private",
    token: blobEnv.BLOB_READ_WRITE_TOKEN,
  });
}

/**
 * Best-effort cleanup for a proof file that was just uploaded in the current
 * request but whose owning database write then failed — e.g. the
 * PaymentAttempt insert throws after `uploadPaymentProof` already succeeded.
 * Only ever call this with a pathname from *this request's own* upload,
 * never anything derived from an existing stored attempt/payment — deleting
 * a proof that belongs to a successfully stored record would destroy real
 * audit evidence.
 *
 * Never throws: a cleanup failure must not mask the original database error
 * that triggered it, and the caller has nothing useful to do with a second
 * error here beyond logging it. The token is never included in what's
 * logged.
 */
export async function deleteOrphanedPaymentProof(pathname: string): Promise<void> {
  try {
    await del(pathname, { token: blobEnv.BLOB_READ_WRITE_TOKEN });
  } catch (cleanupError) {
    console.error("Failed to clean up orphaned payment proof blob", {
      pathname,
      cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
    });
  }
}
