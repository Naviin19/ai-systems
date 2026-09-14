// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/evidence-commitment.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - only canonicalJson and sha256 are kept, with the node:crypto import they need

import { createHash } from 'node:crypto';

/** Canonical JSON: object keys sorted recursively, no whitespace — so the
 *  same claim always hashes identically regardless of emission order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
