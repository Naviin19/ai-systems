// The detector, reduced. The production rules walk a TypeScript AST; these match on text, because the four
// guards in run.ts are what this demo is about and they do not care how a rule finds its sites. Each rule
// still declares the two things a guard needs from it: a known-positive fixture, and a corpus floor.
import { createHash } from 'node:crypto';

export interface SilenceSite {
  ruleId: string;
  /** sha256 of the NORMALISED enclosing line — the stable identity. */
  hash: string;
  /** Advisory only. Correct at scan time, stale by the next reformat. */
  file: string;
  line: number;
  excerpt: string;
}

export interface SilenceRule {
  id: string;
  /** What a failure of this kind looks like when it is working, which is: exactly like success. */
  silence: string;
  /** Below this many files scanned, the scan is assumed to have collapsed rather than come back clean. */
  filesScannedMin: number;
  match: (line: string) => boolean;
}

/**
 * Sites are keyed by content, not by `file:line`.
 *
 * A baseline keyed on line numbers churns on every reformat, and — worse — silently forgives a genuinely
 * new site that happens to land on a forgiven line. Whitespace is collapsed before hashing, so reformatting
 * is invisible, while a genuinely different statement is a genuinely different hash.
 */
export const siteHash = (ruleId: string, statement: string): string =>
  createHash('sha256').update(`${ruleId}\u0000${statement.replace(/\s+/g, ' ').trim()}`).digest('hex').slice(0, 12);

const DB_MUTATORS = /\.(insert|update|upsert|delete)\s*\(/;
const ERROR_BOUND = /\{[^}]*\berror\b[^}]*\}\s*=/;

export const RULES: SilenceRule[] = [
  {
    id: 'unchecked-db-write',
    silence:
      'the client resolves a failed write with an error object instead of throwing, so an unread result means the write can fail without anything noticing',
    filesScannedMin: 3,
    match: (l) => /\.from\s*\(/.test(l) && DB_MUTATORS.test(l) && !ERROR_BOUND.test(l),
  },
  {
    id: 'paid-call-without-run-marker',
    silence:
      'a paid call whose catch returns null is indistinguishable downstream from a call that legitimately found nothing',
    filesScannedMin: 3,
    match: (l) => /catch\s*(\([^)]*\))?\s*\{\s*return\s+null\s*;?\s*\}/.test(l),
  },
  {
    id: 'dead-key-read',
    silence: 'a read of a key nothing writes returns undefined forever, which every consumer treats as "not set yet"',
    filesScannedMin: 3,
    // Deliberately a rule that finds nothing in the corpus below. Zero findings after a real scan is a
    // result; zero findings in a rule's own fixture is a broken matcher. Guard 1 is what tells them apart.
    match: (l) => /\bprocess\.env\.LEGACY_[A-Z_]+/.test(l),
  },
];
