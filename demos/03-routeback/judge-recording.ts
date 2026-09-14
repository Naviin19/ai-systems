// Extracted from the factory repository (skill-ecosystem, private),
// scripts/calibration/lib/judge-recording.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - canonicalJson and sha256 are imported from ./canonical-json, extracted alongside

/**
 * judge-recording.ts — [AIS3-3] record a calibration's raw judge replies once; replay them without spend.
 *
 * A calibration that keeps only verdicts cannot be re-read, re-scored under a changed parser, or
 * reproduced without paying again. A recording stores, for every sample a harness builds, the hash of
 * the exact request the judge received, the model that answered, and the raw reply as it arrived (or
 * the failure that replaced it). Replay rebuilds the samples from the same committed sources, hashes
 * the request each would send today, and feeds the recorded reply back through the judge's own
 * parsing code. It refuses before scoring anything when a built sample has no entry, when an entry's
 * request no longer matches (the judge's prompt, model or parameters changed since recording), or
 * when the recording holds samples the sources no longer build.
 *
 * Request hashes ignore CRLF versus LF inside strings: a prompt file checked out on Windows and on
 * Linux is the same request, and a recording made on one must replay on the other.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { canonicalJson, sha256 } from './canonical-json';

export interface RecordingEntry {
  /** The harness that recorded it; a replay by another harness is refused. */
  harness: string;
  /** The judge the harness asked for (a replay rebuilds requests for this judge, not the CLI's). */
  judge: string;
  /** Everything that decides which samples the harness builds: replay rebuilds from the same. */
  sources: { dir: string; corpus?: string; max_sources?: number; limit?: number };
  sample_id: string;
  /** sha256 over the canonical JSON of the exact request, CRLF-insensitive. */
  request_hash: string;
  /** The model that answered, as the provider reported it. */
  model: string;
  /** HTTP judges: the response status; 0 when no response arrived at all. */
  status?: number;
  /** True when raw_reply is a failure (a non-2xx body, a transport error, an SDK throw), not a reply. */
  failed?: boolean;
  /** The reply as received: the HTTP body, the SDK response as JSON, or "<ErrorName>: <message>". */
  raw_reply: string;
  recorded_at: string;
}

export class RecordingError extends Error {}

export function requestHash(request: unknown): string {
  return sha256(canonicalJson(request).replace(/\\r\\n/g, '\\n'));
}

export function readRecording(path: string): RecordingEntry[] {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new RecordingError(`cannot read ${path}`);
  }
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line, i) => {
      let e: RecordingEntry;
      try {
        e = JSON.parse(line) as RecordingEntry;
      } catch {
        throw new RecordingError(`${path}:${i + 1} is not JSON`);
      }
      if (!e.harness || !e.judge || !e.sources?.dir || !e.sample_id || !/^[0-9a-f]{64}$/.test(e.request_hash ?? '') || !e.model || typeof e.raw_reply !== 'string' || e.raw_reply === '') {
        throw new RecordingError(`${path}:${i + 1} lacks harness, judge, sources, sample_id, request_hash, model or raw_reply`);
      }
      return e;
    });
}

/** One recording is one harness run: every entry must name the same harness, judge and sources. */
export function recordingSource(entries: RecordingEntry[], harness: string): Pick<RecordingEntry, 'judge' | 'sources'> {
  if (entries.length === 0) throw new RecordingError('the recording is empty');
  const first = entries[0];
  for (const e of entries) {
    if (e.harness !== harness) throw new RecordingError(`sample ${e.sample_id} was recorded by ${e.harness}, not ${harness}`);
    if (e.judge !== first.judge || canonicalJson(e.sources) !== canonicalJson(first.sources)) {
      throw new RecordingError(`entries disagree on the judge or sources (sample ${e.sample_id})`);
    }
  }
  return { judge: first.judge, sources: first.sources };
}

/** Pairs every built sample with its recorded reply, or refuses with every disagreement named. */
export function matchRecording(
  entries: RecordingEntry[],
  built: Array<{ sample_id: string; request_hash: string }>,
): Map<string, RecordingEntry> {
  const bySample = new Map<string, RecordingEntry>();
  for (const e of entries) {
    if (bySample.has(e.sample_id)) throw new RecordingError(`sample ${e.sample_id} is recorded twice`);
    bySample.set(e.sample_id, e);
  }
  const missing: string[] = [];
  const stale: string[] = [];
  for (const b of built) {
    const e = bySample.get(b.sample_id);
    if (!e) missing.push(b.sample_id);
    else if (e.request_hash !== b.request_hash) stale.push(b.sample_id);
  }
  const builtIds = new Set(built.map((b) => b.sample_id));
  const extra = entries.filter((e) => !builtIds.has(e.sample_id)).map((e) => e.sample_id);
  const name = (ids: string[]): string => ids.slice(0, 5).join(', ') + (ids.length > 5 ? `, and ${ids.length - 5} more` : '');
  const problems = [
    missing.length ? `${missing.length} built sample(s) have no recorded reply (${name(missing)})` : '',
    stale.length ? `${stale.length} sample(s) would send a different request than the one recorded, so the judge's prompt, model or parameters changed since recording; re-record (${name(stale)})` : '',
    extra.length ? `${extra.length} recorded sample(s) are no longer built from the sources (${name(extra)})` : '',
  ].filter(Boolean);
  if (problems.length) throw new RecordingError(`refusing to score this recording: ${problems.join('; ')}`);
  return bySample;
}

export function writeRecording(path: string, entries: RecordingEntry[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

/** Rebuilds a recorded failure ("<ErrorName>: <message>") so replay fails exactly as the recording did. */
export function rebuildError(raw: string): Error {
  const sep = raw.indexOf(': ');
  const err = new Error(sep > 0 ? raw.slice(sep + 2) : raw);
  if (sep > 0) err.name = raw.slice(0, sep);
  return err;
}

/** For an HTTP judge: a fetch that forwards the call and hands the raw response to `capture`. */
export function httpRecordingFetch(
  capture: (c: Pick<RecordingEntry, 'request_hash' | 'model' | 'status' | 'failed' | 'raw_reply'>) => void,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string };
    const request_hash = requestHash(body);
    let resp: Response;
    try {
      resp = await fetch(input, init);
    } catch (e) {
      const err = e as Error;
      capture({ request_hash, model: body.model ?? 'unknown', status: 0, failed: true, raw_reply: `${err.name}: ${err.message}` });
      throw e;
    }
    const text = await resp.text();
    let answered = body.model ?? 'unknown';
    try {
      answered = (JSON.parse(text) as { model?: string }).model ?? answered;
    } catch {
      /* a body that is not JSON keeps the requested model */
    }
    capture({ request_hash, model: answered, status: resp.status, failed: !resp.ok, raw_reply: text || `(empty body, HTTP ${resp.status})` });
    return new Response(text, { status: resp.status, headers: { 'Content-Type': resp.headers.get('content-type') ?? 'application/json' } });
  }) as typeof fetch;
}

/** For an HTTP judge: a fetch that answers with one recorded reply and never touches the network. */
export function httpReplayFetch(entry: RecordingEntry): typeof fetch {
  return (async (): Promise<Response> => {
    if (entry.failed && !entry.status) throw rebuildError(entry.raw_reply);
    return new Response(entry.raw_reply, { status: entry.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

/** The one line both calibration harnesses print, for the tools and checks that read a result. */
export function printMetrics(metrics: {
  harness: string;
  judge_model: string;
  catch_rate: number;
  false_reject_rate: number;
  defective: number;
  clean: number;
  errors: number;
  decision: string;
  replayed: boolean;
  [extra: string]: unknown;
}): void {
  console.log(`CALIBRATION_METRICS ${JSON.stringify(metrics)}`);
}
