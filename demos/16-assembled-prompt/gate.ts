// Extracted from the software factory (private),
// scripts/audit/corpus-stamp.mjs and scripts/verify-assembled-prompts.mjs at 87fae286, on 2026-10-18.
// Changed on extraction: corpusInputs, which walks the factory's tree for every file an assembled prompt reads, is
// replaced by the demo's own fragments; the hash is the same SHA-256 over (path, text with CRLF folded to LF) in sorted
// order, plus the switch that changes what is assembled. Of the gate, only its order of decisions is kept: a corpus
// with no stamp, or a stamp that no longer matches its inputs, is UNEVALUATED with exit 3, before any finding is read.
// Mode handling and the reading half are dropped.
import { createHash } from 'node:crypto';

/** SHA-256 over every input, sorted by path, and the switch. Content-addressed, not mtime. */
export function computeInputHash(inputs: Record<string, string>, steering: 'on' | 'off'): { hash: string; file_count: number } {
  const h = createHash('sha256');
  const files = Object.keys(inputs).sort();
  for (const f of files) {
    h.update(f);
    h.update(inputs[f].replace(/\r\n/g, '\n'));
  }
  h.update(`STEERING=${steering}`);
  return { hash: h.digest('hex'), file_count: files.length };
}

export type Verdict = { state: 'PASS' | 'FAIL' | 'UNEVALUATED'; exit: 0 | 1 | 3; why: string };

/**
 * The gate's order of decisions. Freshness comes first: a gate that grades a stale corpus reports PASS on text no
 * agent would receive. UNEVALUATED exits 3, never 0, so no wrapper can count it toward a green tally.
 */
export function gateVerdict(stamp: { hash: string } | null, now: { hash: string }, findings: number): Verdict {
  if (!stamp) return { state: 'UNEVALUATED', exit: 3, why: 'the corpus carries no freshness stamp' };
  if (stamp.hash !== now.hash) return { state: 'UNEVALUATED', exit: 3, why: 'the corpus is stale: its inputs changed since it was assembled' };
  if (findings) return { state: 'FAIL', exit: 1, why: `${findings} deterministic finding(s)` };
  return { state: 'PASS', exit: 0, why: 'fresh, and no finding' };
}
