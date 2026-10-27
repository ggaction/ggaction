import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export function assetDigest(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error("Asset oracle requires bytes.");
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertAsset(bytes, { sha256, byteLength }) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0 || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid expected asset metadata.");
  assert.equal(assetDigest(bytes), sha256, "Asset digest mismatch.");
  assert.equal(bytes.byteLength, byteLength, "Asset size mismatch.");
}
