// Extracted from the factory repository (skill-ecosystem, private), at d490466, on 2026-09-14.
//   renderSchema: scripts/generate-json-schemas.ts, which writes the committed contracts/schemas/ tree.
//   deepEqual, sortKeys and firstDiff: scripts/contracts-vs-json-schema.ts, verify-all gate R22, which regenerates
//   every schema and compares it with what is committed.
// Changed on extraction: only these functions are kept, with export added and the zod import they need.

import { z } from 'zod';

/** Render one registry entry to its JSON Schema object.
 *
 *  [070 SE-03] root-cause fix: this script originally used the zod-to-json-schema
 *  package, which walks zod v3 `_def` internals — under zod v4 it silently emits
 *  EMPTY definitions, and all 37 committed schemas were born hollow (d4b09f5,
 *  2026-03-28) without any gate noticing. zod v4's native z.toJSONSchema() is the
 *  correct generator (the runtime tool_use path in scripts/lib/handoff-tool.ts
 *  already uses it). io defaults to 'output' semantics for every entry — recorded
 *  choice: parity checks compare presence + type family, where io barely bites. */
export function renderSchema(entry: { schema: any; name: string }): any {
  const native = z.toJSONSchema(entry.schema, { unrepresentable: 'any' }) as Record<string, any>;
  return { title: entry.name, ...native };
}

export function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}
export function sortKeys(v: any): any {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

/** First point of divergence between two parsed JSON values, for actionable messages. */
export function firstDiff(a: any, b: any, trail = '$'): string {
  if (deepEqual(a, b)) return '';
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${trail}: array length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return firstDiff(a[i], b[i], `${trail}[${i}]`);
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) return `${trail}.${k}: absent in regenerated, present on disk`;
      if (!(k in b)) return `${trail}.${k}: present in regenerated, absent on disk`;
      if (!deepEqual(a[k], b[k])) return firstDiff(a[k], b[k], `${trail}.${k}`);
    }
  }
  return `${trail}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`;
}
