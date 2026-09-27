// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/reported-paths.ts and contracts/enforcement/reported-path-types.ts at 5d5fb3f1, on 2026-09-27.
// Changed on extraction:
//   - PathKind and PathFieldRow are inlined from reported-path-types.ts
//   - REPORTED_PATHS_MODE (an env-mode switch) is not carried; run.ts owns the exit contract
//   - discoverPathShapedFields and checkParity, the schema-parity leg, are not carried: the generated envelope
//     schema they walk is not published here
//   - isPathShaped, PATH_SHAPED_EXTRA, valuesAt and scanReportedPaths are unchanged
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, isAbsolute, resolve } from 'node:path';

/** What a path-shaped field actually is. The whole point of the module. */
export type PathKind =
  /** A filesystem path the producing agent claims exists. Resolved against roots. */
  | 'filesystem'
  /** A URL route (e.g. "/dashboard"). Never touches disk. Declared so a
   *  name-matching successor cannot re-introduce the false positive. */
  | 'route'
  /** A filesystem path that is deliberately NOT resolvable from this repo —
   *  it names a file in a product workspace this factory does not own. */
  | 'foreign';

export interface PathFieldRow {
  /** The boundary whose variant carries it, or '*' for a shared sub-schema. */
  boundary: string;
  /** Dot path from the envelope root; `[]` steps into array elements. */
  path: string;
  kind: PathKind;
  /** Who fills it. 'orchestrator' fields are stamped, never authored. */
  author: 'agent' | 'orchestrator';
  /** Roots a 'filesystem' value may resolve against, relative to repo root.
   *  `{runDir}` expands to the emitting agent's run directory. */
  roots?: string[];
  /** Why this classification — read by a human, not by code. */
  note: string;
}

/** Names that LOOK like a path and therefore require a classification.
 *  Syntactic trigger only — never a verdict. */
export function isPathShaped(key: string): boolean {
  if (/(^|_)paths?$/.test(key)) return true;
  return PATH_SHAPED_EXTRA.has(key);
}

/** Path-shaped names the suffix rule cannot see. Additions here are
 *  deliberate: each one is a field that carries a path under another name. */
export const PATH_SHAPED_EXTRA = new Set<string>([
  'notes_emitted',       // reading-notes/{slug}.notes.md
  'amendments_present',  // post-{session}-amendment.json
]);

/* ── resolution over real handoffs ────────────────────────────────────────── */

export interface PathClaim {
  runId: string;
  agentDir: string;
  boundary: string;
  field: string;
  value: string;
  resolvedAt?: string;
  exists: boolean;
}

export interface ScanResult {
  /** PASS when claims were resolved; UNEVALUATED when there were none to resolve. */
  state: 'PASS' | 'UNEVALUATED';
  reason?: string;
  runsScanned: number;
  handoffsScanned: number;
  claims: number;
  resolved: number;
  missing: PathClaim[];
}

function readJson(p: string): Record<string, unknown> | null {
  try { return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>; } catch { return null; }
}

/** Pull the value(s) at a dot path, stepping into arrays at `[]`. */
export function valuesAt(obj: unknown, dotPath: string): string[] {
  const parts = dotPath.split('.');
  let cursor: unknown[] = [obj];
  for (const rawPart of parts) {
    const isArr = rawPart.endsWith('[]');
    const part = isArr ? rawPart.slice(0, -2) : rawPart;
    const next: unknown[] = [];
    for (const c of cursor) {
      if (!c || typeof c !== 'object') continue;
      const v = (c as Record<string, unknown>)[part];
      if (v === undefined || v === null) continue;
      if (isArr) { if (Array.isArray(v)) next.push(...v); }
      else next.push(v);
    }
    cursor = next;
  }
  return cursor.filter((v): v is string => typeof v === 'string');
}

/**
 * Resolve every declared 'filesystem' claim in the handoffs under `runsRoot`.
 *
 * ZERO handoffs, or handoffs carrying zero declared path fields, is
 * UNEVALUATED — never a pass, and never a failure either. That distinction is
 * the whole reason this gate can be honest on a tree with no runs.
 */
export function scanReportedPaths(
  rows: PathFieldRow[],
  runsRoot: string,
  repoRoot: string,
): ScanResult {
  const fsRows = rows.filter((r) => r.kind === 'filesystem');
  const out: ScanResult = {
    state: 'UNEVALUATED', runsScanned: 0, handoffsScanned: 0, claims: 0, resolved: 0, missing: [],
  };
  if (!existsSync(runsRoot)) {
    out.reason = `no ${runsRoot} directory`;
    return out;
  }

  let runDirs: string[] = [];
  try {
    runDirs = readdirSync(runsRoot).filter((d) => {
      try { return statSync(join(runsRoot, d)).isDirectory(); } catch { return false; }
    });
  } catch { /* unreadable → stays UNEVALUATED */ }

  for (const run of runDirs) {
    out.runsScanned++;
    const runPath = join(runsRoot, run);
    let agentDirs: string[] = [];
    try {
      agentDirs = readdirSync(runPath).filter((d) => {
        try { return statSync(join(runPath, d)).isDirectory(); } catch { return false; }
      });
    } catch { continue; }

    for (const agent of agentDirs) {
      const hp = join(runPath, agent, 'handoff.json');
      if (!existsSync(hp)) continue;
      const payload = readJson(hp);
      if (!payload) continue;
      out.handoffsScanned++;
      const boundary = typeof payload.handoff_boundary === 'string' ? payload.handoff_boundary : '*';

      for (const row of fsRows) {
        if (row.boundary !== '*' && row.boundary !== boundary) continue;
        for (const value of valuesAt(payload, row.path)) {
          out.claims++;
          const roots = row.roots?.length ? row.roots : ['{runDir}'];
          let exists = false;
          let resolvedAt: string | undefined;
          for (const rootTpl of roots) {
            const root = rootTpl.replace('{runDir}', join(runPath, agent));
            const abs = isAbsolute(value) ? value : resolve(repoRoot, root, value);
            if (existsSync(abs)) { exists = true; resolvedAt = abs; break; }
            if (!resolvedAt) resolvedAt = abs;
          }
          if (exists) out.resolved++;
          else out.missing.push({ runId: run, agentDir: agent, boundary, field: row.path, value, resolvedAt, exists: false });
        }
      }
    }
  }

  if (out.claims === 0) {
    out.reason = out.handoffsScanned === 0
      ? `0 handoffs under ${runsRoot}`
      : `0 declared path-typed fields present in ${out.handoffsScanned} handoff(s)`;
    return out;
  }
  out.state = 'PASS';
  return out;
}
