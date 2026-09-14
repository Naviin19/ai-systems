// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/evidence-commitment.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - the self-test at the end of the file is removed; run.ts exercises the same functions

/**
 * evidence-commitment.ts — [140 SE-09] commit-before-interrogation.
 *
 * The exam-room rule for cooperative-but-fallible agents: structured evidence
 * (attestations, evidence refs) is HASHED AND LOGGED at emission — before any
 * verifier asks a question — and during interrogation the worker may only
 * point at pre-committed entries. No new justification generation.
 *
 * Scope discipline, verbatim from the spike: simple content hash only —
 * anti-rationalization tooling, NOT adversarial-security infrastructure.
 * SHA-256 over canonical JSON; no signatures, no merkle proofs, no crypto
 * infra. A cooperative agent cannot accidentally rationalize past a logged
 * hash; a genuinely adversarial one is out of scope by design.
 *
 * [AIS3-2] Evidence that lives in a file is committed with the file. An evidence ref whose
 * `location` names a file under the base directory (the agent's sandbox) commits that file's
 * content hash, so rewriting the file after emission moves the commitment. After a judge REJECT,
 * revealRerun compares the re-run's commitment with the one the judge read, id by id. A new entry
 * is new work, and an unchanged entry points at committed evidence. A committed entry that changed
 * must show new work behind it: a step re-executed under a higher agent_cycle, or a ref whose file
 * changed. Any other change is new justification for an old claim, the one path the rule refuses.
 * The re-run is shown the committed entries as committed, so an honest re-run can re-emit the ones
 * it did not redo exactly.
 *
 * Self-test: npx tsx scripts/lib/evidence-commitment.ts --self-test
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export interface CommitmentEntry {
  id: string;
  hash: string;
  /** [AIS3-2] Evidence refs only: the file the ref's location names, relative to the base directory. */
  file?: string;
  /** [AIS3-2] SHA-256 of that file's bytes at commitment; also folded into `hash`. */
  file_hash?: string;
  /** [AIS3-2] Step attestations only: the attestation's agent_cycle (1 when absent). */
  cycle?: number;
}
export interface EvidenceCommitment {
  root_hash: string;
  committed_at: string;
  revealed_at: string | null;
  entry_count: number;
  entries: CommitmentEntry[];
}

/** [AIS3-2] Where file-backed evidence refs resolve. Without a baseDir no file is read and a ref
 *  commits its JSON only. Commit and verify must be given the same baseDir. */
export interface CommitOptions {
  baseDir?: string;
}

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

/** [AIS3-2] The file an evidence ref's location names, when it names one. The location's first token
 *  is read as a path ("build-log/cal.json (C2 item 1)", "src/a.ts:10"), a trailing :line[:col] or
 *  #Lnn is dropped, and it counts only when it resolves to a regular file inside baseDir. A prose
 *  location ("section_2_paragraph_1") names no file. */
function resolveEvidenceFile(location: unknown, baseDir: string | undefined): { file: string; file_hash: string } | null {
  if (!baseDir || typeof location !== 'string') return null;
  const token = location.trim().match(/^[^\s(),;]+/)?.[0]?.replace(/(?::\d+){1,2}$/, '').replace(/#L\d+(?:-L?\d+)?$/, '');
  if (!token) return null;
  const root = resolve(baseDir);
  const abs = resolve(root, token);
  const rel = relative(root, abs);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  try {
    if (!statSync(abs).isFile()) return null;
    return { file: rel.split(sep).join('/'), file_hash: createHash('sha256').update(readFileSync(abs)).digest('hex') };
  } catch {
    return null;
  }
}

interface EvidenceItem {
  entry: CommitmentEntry;
  value: unknown;
}

/** Collect hashable evidence from a handoff payload:
 *  - step_attestations[] (universal since schema 1.2) → id "att:<step_id>"
 *  - any evidence_refs[] arrays within the first 3 levels → id "ref:<source_id>"
 *  Bounded walk; unknown shapes are simply not committed (absence is honest —
 *  an uncommitted claim carries no commit-time guarantee, and that is the
 *  point of the field being visible). */
function walkEvidence(payload: unknown, opts: CommitOptions): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const seen = new Set<string>();
  const uniqueId = (id: string): string => {
    let unique = id;
    for (let i = 2; seen.has(unique); i++) unique = `${id}#${i}`;
    seen.add(unique);
    return unique;
  };
  const root = payload as Record<string, unknown> | null;
  if (!root || typeof root !== 'object') return items;
  const atts = (root as { step_attestations?: unknown }).step_attestations;
  if (Array.isArray(atts)) {
    for (const a of atts) {
      const cycle = (a as { agent_cycle?: unknown })?.agent_cycle;
      items.push({
        entry: {
          id: uniqueId(`att:${(a as { step_id?: string })?.step_id ?? 'unknown'}`),
          hash: sha256(canonicalJson(a)),
          cycle: typeof cycle === 'number' && Number.isInteger(cycle) ? cycle : 1,
        },
        value: a,
      });
    }
  }
  const walk = (node: unknown, depth: number): void => {
    if (depth > 3 || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) walk(item, depth + 1); return; }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'evidence_refs' && Array.isArray(v)) {
        for (const r of v) {
          const id = uniqueId(`ref:${(r as { source_id?: string })?.source_id ?? 'unknown'}`);
          const backing = resolveEvidenceFile((r as { location?: unknown })?.location, opts.baseDir);
          items.push({
            entry: backing
              ? { id, hash: sha256(`${canonicalJson(r)}\nfile:${backing.file_hash}`), file: backing.file, file_hash: backing.file_hash }
              : { id, hash: sha256(canonicalJson(r)) },
            value: r,
          });
        }
      } else if (k !== 'step_attestations') {
        walk(v, depth + 1);
      }
    }
  };
  walk(root, 0);
  return items;
}

export function collectEvidenceEntries(payload: unknown, opts: CommitOptions = {}): CommitmentEntry[] {
  return walkEvidence(payload, opts).map((i) => i.entry);
}

/** Commit: lock the evidence set at emission time. Deterministic root hash
 *  over the sorted entry hashes. */
export function commitHandoffEvidence(payload: unknown, now: Date = new Date(), opts: CommitOptions = {}): EvidenceCommitment {
  const entries = collectEvidenceEntries(payload, opts);
  const root_hash = sha256(entries.map((e) => e.hash).sort().join('\n'));
  return { root_hash, committed_at: now.toISOString(), revealed_at: null, entry_count: entries.length, entries };
}

/** Reveal check: every id the worker points at during interrogation must be
 *  pre-committed. Returns the violations (empty = clean). */
export function revealCheck(commitment: EvidenceCommitment, citedIds: string[]): { ok: boolean; unknown_ids: string[] } {
  const committed = new Set(commitment.entries.map((e) => e.id));
  const unknown_ids = citedIds.filter((id) => !committed.has(id));
  return { ok: unknown_ids.length === 0, unknown_ids };
}

/** [AIS3-2] Reveal check across a re-run: compares the re-run's commitment with the one the judge
 *  read, id by id. `new_work` holds new entries and changed entries with new work behind them (a
 *  step re-executed under a higher agent_cycle, or a ref whose file changed). `rejustified` holds
 *  committed entries that changed without it. ok only when nothing was re-justified. An entry the
 *  re-run dropped is not a violation: withdrawing a claim justifies nothing. */
export function revealRerun(
  original: EvidenceCommitment,
  rerun: EvidenceCommitment,
): { ok: boolean; rejustified: string[]; new_work: string[]; unchanged: string[] } {
  const before = new Map(original.entries.map((e) => [e.id, e]));
  const rejustified: string[] = [];
  const new_work: string[] = [];
  const unchanged: string[] = [];
  for (const e of rerun.entries) {
    const b = before.get(e.id);
    if (!b) new_work.push(e.id);
    else if (b.hash === e.hash) unchanged.push(e.id);
    else if (e.id.startsWith('att:') ? (e.cycle ?? 1) > (b.cycle ?? 1) : Boolean(e.file_hash && e.file_hash !== b.file_hash)) new_work.push(e.id);
    else rejustified.push(e.id);
  }
  return { ok: rejustified.length === 0, rejustified, new_work, unchanged };
}

/** Verify ([AIS1-4]): recompute the evidence set and compare it with a commitment, entry by
 *  entry. `changed` lists committed ids whose content hash moved, `added` lists ids present
 *  now that were never committed, and `removed` lists committed ids that are gone. ok only
 *  when all three are empty: the root hash alone can say THAT something moved, not WHAT.
 *  [AIS3-2] Pass the baseDir the commitment was made with, so file-backed refs re-read their files. */
export function verifyCommitment(
  commitment: EvidenceCommitment,
  payload: unknown,
  opts: CommitOptions = {},
): { ok: boolean; changed: string[]; added: string[]; removed: string[] } {
  const now = new Map(collectEvidenceEntries(payload, opts).map((e) => [e.id, e.hash]));
  const then = new Map(commitment.entries.map((e) => [e.id, e.hash]));
  const changed = [...then].filter(([id, h]) => now.has(id) && now.get(id) !== h).map(([id]) => id);
  const removed = [...then.keys()].filter((id) => !now.has(id));
  const added = [...now.keys()].filter((id) => !then.has(id));
  return { ok: changed.length === 0 && added.length === 0 && removed.length === 0, changed, added, removed };
}

/** Bound on the committed content shown to a re-run; beyond it, ids are named without content. */
const COMMITTED_CONTENT_CHARS = 16_000;

/** The constraint text injected into a re-run: the reveal-phase rule, stated to the worker in its
 *  own prompt. [AIS3-2] `payload` (the committed emission) adds the committed entries' content, so
 *  the re-run can re-emit what it did not redo exactly. `enforced: false` is the route-back form:
 *  the rule is stated, and the failed mechanical gate re-checks the new emission instead. */
export function commitConstraintText(
  commitment: EvidenceCommitment,
  context: { payload?: unknown; enforced?: boolean } = {},
): string {
  const ids = commitment.entries.map((e) => e.id).join(', ') || '(none committed)';
  const parts = [
    `COMMIT-BEFORE-INTERROGATION ([140 SE-09]): your evidence was locked at emission ` +
      `(root ${commitment.root_hash.slice(0, 16)}…, ${commitment.entry_count} entries, committed_at ${commitment.committed_at}). ` +
      `When addressing the defect you may point ONLY at pre-committed evidence entries [${ids}] ` +
      `or produce NEW WORK with NEW evidence — never new justification for the old claims.`,
    `How this is checked ([AIS3-2]): re-emit every committed entry you did not redo exactly as committed. ` +
      `A step you re-execute carries an agent_cycle one higher than its committed attestation. ` +
      `An evidence ref may change only when the file it names changed. New work goes in new entries.` +
      (context.enforced === false ? '' : ` A committed entry that changes any other way halts the run before the judge reads it.`),
  ];
  if (context.payload !== undefined && commitment.entries.length > 0) {
    const committed = new Set(commitment.entries.map((e) => e.id));
    let body = '';
    const omitted: string[] = [];
    for (const item of walkEvidence(context.payload, {})) {
      if (!committed.has(item.entry.id)) continue;
      const line = `${item.entry.id} ${canonicalJson(item.value)}\n`;
      if (body.length + line.length > COMMITTED_CONTENT_CHARS) omitted.push(item.entry.id);
      else body += line;
    }
    parts.push(
      `Committed entries, as committed (id, then content):\n${body}` +
        (omitted.length ? `(content not shown for ${omitted.join(', ')}; the bound is ${COMMITTED_CONTENT_CHARS} characters)` : ''),
    );
  }
  return parts.join('\n\n');
}
