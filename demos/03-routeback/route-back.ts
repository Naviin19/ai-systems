// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/route-back.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - the self-test at the end of the file is removed; run.ts exercises the same functions

/**
 * route-back.ts — [150 SE-10] Royce route-back: failure classification,
 * failure signatures, and the oscillation guard for the orchestrator's
 * route-back loop.
 *
 * Doctrine (OP-1 approved 2026-09-01, run/ELI5-150-SE10.md): three failure
 * classes convert from flag-and-halt to route-back-with-failure-as-input —
 * agent quality gates, the D3 absorption gate, schema-on-write. Everything
 * else stays on the halt path with its written reason. Retry additionally
 * requires a matching error-heuristic (P2-06 TD4: no creative debugging) —
 * the caller combines this module's class verdict with matchHeuristic.
 *
 * Oscillation guard (pack Part C): same gate, same failure signature, twice
 * NON-consecutively (an A,B,A shape) → halt. The loop is thrashing between
 * states, not converging; consecutive repeats are left to the attempt cap.
 *
 * Self-test: npx tsx scripts/lib/route-back.ts --self-test
 */

import { createHash } from 'node:crypto';

/** The three converted classes. Anchored, not substring-fished: each pattern
 *  matches the throw sites in master-agentic-orchestrator.ts. */
export const ROUTE_BACK_CLASSES: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: 'quality-gate', pattern: /^quality gate failed:/m },
  { id: 'd3-absorption', pattern: /D3_ABSORPTION_GATE_FAIL/ },
  { id: 'schema-on-write', pattern: /SCHEMA_VALIDATION_FAIL/ },
];

export function routeBackClass(errText: string): string | null {
  for (const c of ROUTE_BACK_CLASSES) if (c.pattern.test(errText)) return c.id;
  return null;
}

/** Signature = sha256 over the normalized head of the failure text. Volatile
 *  tokens (paths, line:col numbers, durations, hex ids) are masked so "the
 *  same failure" hashes identically across attempts. */
export function failureSignature(errText: string): string {
  const normalized = errText
    .slice(0, 800)
    .replace(/\d+/g, 'N')
    .replace(/[A-Za-z]:[\\/][^\s'"]+|\/[^\s'"]+/g, 'PATH')
    .replace(/[0-9a-f]{8,}/gi, 'HEX')
    .toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/** The failure text an agent reads on re-dispatch ([AIS1-5]). Masks the tokens that change
 *  between two identical failures: run ids, ISO timestamps, the absolute path up to and
 *  including an agent sandbox, and hex ids that mix letters and digits. Keeps what the agent
 *  needs to act: the relative file with its (line,col), error codes, and the message. The
 *  signature above masks far harder (every digit) because it only has to compare, never to
 *  be read; masking line numbers here would take away the fix. */
export function maskVolatile(errText: string): string {
  return errText
    .replace(/\brun-\d{10,}-[0-9a-f]{4,}\b/gi, '<run-id>')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<timestamp>')
    .replace(/(?:[A-Za-z]:)?[\\/][^\s'"]*?\.sandboxes[\\/][^\\/\s'"]+/g, '<sandbox>')
    .replace(/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{8,}\b/gi, '<hex>');
}

/** A,B,A detection: the current signature already appeared, and the most
 *  recent entry is a DIFFERENT signature. Consecutive repeats (A,A) return
 *  false — the attempt cap owns those. */
export function isOscillation(history: readonly string[], current: string): boolean {
  if (history.length === 0) return false;
  const last = history[history.length - 1];
  return last !== current && history.includes(current);
}

export interface RouteBackDecision {
  retry: boolean;
  reason: 'route-back' | 'not-retryable-class' | 'cap-exhausted' | 'oscillation';
  class_id: string | null;
  signature: string;
}

/** Pure decision: class + cap + oscillation. Heuristic matching stays with
 *  the caller (it owns the heuristics table and the HEURISTIC_MISS artifact). */
export function classifyRouteBack(
  errText: string,
  attempt: number,
  maxAttempts: number,
  sigHistory: readonly string[],
): RouteBackDecision {
  const class_id = routeBackClass(errText);
  const signature = failureSignature(errText);
  if (!class_id) return { retry: false, reason: 'not-retryable-class', class_id, signature };
  if (isOscillation(sigHistory, signature)) return { retry: false, reason: 'oscillation', class_id, signature };
  if (attempt >= maxAttempts) return { retry: false, reason: 'cap-exhausted', class_id, signature };
  return { retry: true, reason: 'route-back', class_id, signature };
}
