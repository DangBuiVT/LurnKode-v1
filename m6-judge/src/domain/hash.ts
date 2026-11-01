import { createHash } from "node:crypto";

function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as object)
        .sort()
        .map((k) => [k, canonicalize((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

/** Stable SHA-256 of a JSON value, independent of object key order. */
export function canonicalHash(v: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(v))).digest("hex");
}
