// Drop-in fake for src/lib/blob-storage.ts, wired up per test file via
// `vi.mock("@/lib/blob-storage", () => import("../fakes/blob-storage-fake"))`.
// Tests must never call the real Vercel Blob API — that would require a
// real token, real network access, and would leave real (if harmless)
// objects behind in whatever store the token points at. This keeps proof
// storage fully in-memory and inspectable, including which pathnames were
// deleted, so orphan-cleanup behavior (requirement 3) can be asserted
// directly.
import { randomUUID } from "node:crypto";

type StoredProof = {
  pathname: string;
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

export const blobStore = new Map<string, StoredProof>();
export const deletedPathnames: string[] = [];

export function resetBlobFake() {
  blobStore.clear();
  deletedPathnames.length = 0;
}

export async function uploadPaymentProof(
  orderId: string,
  file: File,
): Promise<{ pathname: string; fileName: string; contentType: string; sizeBytes: number }> {
  const safeName = (file.name || "proof").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(-100);
  const pathname = `payment-proofs/${orderId}/${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  blobStore.set(pathname, {
    pathname,
    buffer,
    contentType: file.type || "application/octet-stream",
    fileName: file.name || "proof",
  });

  return {
    pathname,
    fileName: file.name || "proof",
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export async function readPaymentProof(
  pathname: string,
): Promise<{ statusCode: number; stream: ReadableStream } | null> {
  const stored = blobStore.get(pathname);
  if (!stored) return null;

  const buffer = stored.buffer;
  return {
    statusCode: 200,
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    }),
  };
}

export async function deleteOrphanedPaymentProof(pathname: string): Promise<void> {
  blobStore.delete(pathname);
  deletedPathnames.push(pathname);
}
