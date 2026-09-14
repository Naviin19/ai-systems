// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/semantic-drift.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * semantic-drift.ts — [AIS3-4] per-agent semantic drift, and [AIS3-5] its margin series.
 *
 * One implementation behind both callers: the post-emit chain, which checks every agent in every build
 * (scripts/lib/post-emit-checks.ts), and the detect-semantic-drift.ts CLI (agent 11's hardening loop,
 * operators). Before [AIS3-4] only that CLI existed, only agent 11 called it, and no pipeline run ever
 * produced a drift report.
 *
 * LADDER, per agent, counted in COMPARABLE baseline builds. A baseline file counts only when at least one of
 * its lines was embedded by the current embedder (EMBEDDER_ID). The old ladder counted files, so a file
 * whose vectors could never be compared still promoted an agent toward enforcing.
 *   no baseline files                     disabled            never blocks
 *   files, none comparable                embedder-mismatch   never blocks; regenerate the baselines
 *   one comparable build                  advisory            drift reported, never blocks
 *   two or more comparable builds         enforcing           drift blocks
 * capAdvisory (DRIFT_MODE=advisory) caps enforcing at advisory.
 *
 * SCORE is the maximum cosine similarity to any comparable baseline (one close build clears the check),
 * FLOOR is the drift threshold, and MARGIN = score - floor. Drift is a negative margin. The handoff is read
 * with LF line endings: a checkout's CRLF moved one measured similarity from 0.966 to 0.984.
 *
 * SERIES ([AIS3-5]). Every scored run appends {run_id, score, floor, margin, at} to
 * <driftDir>/series/<agent>.jsonl, and marginCompression reads it. A margin that has fallen three runs in a
 * row to under half its earlier median is COMPRESSING: a warning while the agent is still above the floor.
 * Measured 2026-09-14 with trigram-hash-64-v1: real agent-12 handoffs from another product scored
 * 0.965-0.975 against the committed agent-12 baselines, so the 0.82 floor halts only gross drift, and the
 * series is where gradual degradation shows first.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { embedText, embedTextDeterministic, cosineSimilarity, computeEmbeddingHash, EMBEDDER_ID } from './embed-output';

export type DriftMode = 'disabled' | 'advisory' | 'enforcing';
export type DriftStatus = 'disabled' | 'embedder-mismatch' | 'no-current-output' | 'clean' | 'drift-flagged';

export interface DriftPoint {
  run_id: string;
  score: number;
  floor: number;
  margin: number;
  at: string;
}

export interface MarginCompression {
  status: 'insufficient-history' | 'steady' | 'compressing' | 'breached';
  points: number;
  last_margin: number | null;
  earlier_median: number | null;
}

export interface AgentDriftResult {
  agent: string;
  run_id: string;
  mode: DriftMode;
  effective_mode: DriftMode;
  status: DriftStatus;
  /** True only for drift at the enforcing level. */
  blocking: boolean;
  score: number | null;
  floor: number;
  margin: number | null;
  baselines_comparable: number;
  baselines_incomparable: number;
  samples_checked: number;
  matched_baseline: string | null;
  compression: MarginCompression | null;
  report_path: string | null;
}

export interface AgentDriftOptions {
  /** The agent's directory name under the baseline dir and the run dir, e.g. agent-12. */
  agentDirName: string;
  runId: string;
  runRoot: string;
  baselineDir: string;
  driftDir: string;
  threshold: number;
  capAdvisory?: boolean;
}

interface BaselineLine {
  build_id: string;
  content_hash: string;
  embedding: number[];
  embedder?: string;
}

function readBaselineFiles(agentBaselineDir: string): Array<{ file: string; lines: BaselineLine[] }> {
  if (!existsSync(agentBaselineDir)) return [];
  return readdirSync(agentBaselineDir)
    .filter((f) => f.startsWith('build-') && f.endsWith('.jsonl'))
    .sort()
    .map((file) => ({
      file,
      lines: readFileSync(join(agentBaselineDir, file), 'utf-8')
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .flatMap((l) => {
          try {
            const parsed = JSON.parse(l) as BaselineLine;
            return Array.isArray(parsed.embedding) && parsed.embedding.length > 0 ? [parsed] : [];
          } catch {
            return [];
          }
        }),
    }));
}

export function readDriftSeries(driftDir: string, agent: string): DriftPoint[] {
  const path = join(driftDir, 'series', `${agent}.jsonl`);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as DriftPoint];
      } catch {
        return [];
      }
    });
}

/** A negative last margin is a breach. Fewer than four points never judge a trend. Otherwise the margin
 *  is compressing when it has fallen three runs in a row and now sits under half the median of the
 *  margins before that fall. */
export function marginCompression(points: DriftPoint[]): MarginCompression {
  const m = points.map((p) => p.margin);
  const n = m.length;
  const last = n > 0 ? m[n - 1] : null;
  if (last !== null && last < 0) return { status: 'breached', points: n, last_margin: last, earlier_median: null };
  if (n < 4 || last === null) return { status: 'insufficient-history', points: n, last_margin: last, earlier_median: null };
  const fellThreeRuns = m[n - 4] > m[n - 3] && m[n - 3] > m[n - 2] && m[n - 2] > m[n - 1];
  const earlier = m.slice(0, n - 3).sort((a, b) => a - b);
  const mid = Math.floor(earlier.length / 2);
  const median = earlier.length % 2 === 1 ? earlier[mid] : (earlier[mid - 1] + earlier[mid]) / 2;
  return { status: fellThreeRuns && last < median / 2 ? 'compressing' : 'steady', points: n, last_margin: last, earlier_median: median };
}

export async function detectAgentDrift(o: AgentDriftOptions): Promise<AgentDriftResult> {
  const files = readBaselineFiles(join(o.baselineDir, o.agentDirName));
  const comparableFiles = files.filter((f) => f.lines.some((l) => l.embedder === EMBEDDER_ID));
  const baselines = comparableFiles.flatMap((f) => f.lines.filter((l) => l.embedder === EMBEDDER_ID));
  const incomparable = files.reduce((n, f) => n + f.lines.filter((l) => l.embedder !== EMBEDDER_ID).length, 0);
  const mode: DriftMode = comparableFiles.length === 0 ? 'disabled' : comparableFiles.length === 1 ? 'advisory' : 'enforcing';
  const effective_mode: DriftMode = o.capAdvisory && mode === 'enforcing' ? 'advisory' : mode;
  const unscored: Omit<AgentDriftResult, 'status'> = {
    agent: o.agentDirName, run_id: o.runId, mode, effective_mode, blocking: false,
    score: null, floor: o.threshold, margin: null,
    baselines_comparable: comparableFiles.length, baselines_incomparable: incomparable, samples_checked: 0,
    matched_baseline: null, compression: null, report_path: null,
  };
  if (files.length === 0) return { ...unscored, status: 'disabled' };
  if (comparableFiles.length === 0) return { ...unscored, status: 'embedder-mismatch' };

  const handoffPath = join(o.runRoot, o.runId, o.agentDirName, 'handoff.json');
  if (!existsSync(handoffPath)) return { ...unscored, status: 'no-current-output' };

  const raw = readFileSync(handoffPath, 'utf-8').replace(/\r\n/g, '\n');
  // The deterministic embedder is a pure function; only a provider embedder needs embedText's cache.
  const current = EMBEDDER_ID.startsWith('trigram-') ? embedTextDeterministic(raw) : await embedText(raw, o.agentDirName, o.runId);
  const similarities = baselines.map((b) => cosineSimilarity(current, b.embedding));
  const score = Math.max(...similarities);
  const margin = score - o.threshold;
  const drifted = margin < 0;

  // [AIS3-5] One series point per scored run; re-checking the same run with the same score adds nothing.
  const series = readDriftSeries(o.driftDir, o.agentDirName);
  const previous = series[series.length - 1];
  if (!(previous && previous.run_id === o.runId && previous.score === score)) {
    const point: DriftPoint = { run_id: o.runId, score, floor: o.threshold, margin, at: new Date().toISOString() };
    mkdirSync(join(o.driftDir, 'series'), { recursive: true });
    appendFileSync(join(o.driftDir, 'series', `${o.agentDirName}.jsonl`), JSON.stringify(point) + '\n');
    series.push(point);
  }
  const compression = marginCompression(series);

  const matched_baseline = drifted ? null : (baselines[similarities.indexOf(score)]?.build_id ?? null);
  const triplePath = join('contracts', 'agents', o.agentDirName, 'triple.json');
  const reportDir = join(o.driftDir, o.runId);
  mkdirSync(reportDir, { recursive: true });
  const report_path = join(reportDir, `${o.agentDirName}.json`);
  writeFileSync(report_path, JSON.stringify({
    agent_id: o.agentDirName,
    run_id: o.runId,
    mode,
    effective_mode,
    baselines_comparable: comparableFiles.length,
    baselines_incomparable: incomparable,
    threshold: o.threshold,
    embedder: EMBEDDER_ID,
    samples_checked: similarities.length,
    flags_raised: drifted ? 1 : 0,
    max_similarity: score,
    mean_similarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
    min_similarity: Math.min(...similarities),
    margin,
    compression,
    current_content_hash: computeEmbeddingHash(raw),
    matched_baseline,
    advisory: effective_mode === 'advisory',
    triple_contract_hash: existsSync(triplePath) ? createHash('sha256').update(readFileSync(triplePath)).digest('hex').slice(0, 16) : null,
  }, null, 2));

  return {
    ...unscored,
    status: drifted ? 'drift-flagged' : 'clean',
    blocking: drifted && effective_mode === 'enforcing',
    score,
    margin,
    samples_checked: similarities.length,
    matched_baseline,
    compression,
    report_path,
  };
}
