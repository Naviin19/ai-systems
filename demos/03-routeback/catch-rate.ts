// Extracted from the factory repository (skill-ecosystem, private),
// scripts/calibration/measure-judge-catch-rate.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - kept: HARNESS, EXAMPLES_DIR, TASK_CONTEXT, the Corpus type and the sample builder (collectArtifacts, seedDefect, benignVariant, collectContractExamples, readLabels, buildSamples)
//   - removed: argument parsing, the network judge, cost accounting and main(); run.ts replays the recording and scores it with main()'s arithmetic
//   - added: export on the names run.ts imports

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const HARNESS = 'cross-family-judge-catch-rate';
const EXAMPLES_DIR = 'contracts/examples';
export const TASK_CONTEXT = 'This handoff was emitted by a pipeline agent as its declared boundary artifact. Judge it on its own terms.';

/**
 * Which corpus to draw the population from.
 *
 *   agent-handoffs    (default) — real emitted boundary artifacts under
 *     verification/runs/ (or --runs-dir). The ONLY corpus that can produce an
 *     adoption verdict, because it is the only one in the distribution the judge
 *     will actually see.
 *   contract-examples — contracts/examples/*.json: 26 hand-curated, fully
 *     populated canonical artifacts (verified 2026-08-03: zero placeholders).
 *     These are per-schema exemplars, not emitted handoffs — closer to the real
 *     distribution than a build log, but not it. Runs on this corpus are capped
 *     at CAPABILITY-SIGNAL and can never print "adopt", so a good number here
 *     cannot be quoted as adoption evidence.
 *
 * NOT offered as a corpus: templates/handoff-notes/*.template.json. All 26 are
 * mustache shells ({{uuid}}, {{honest_flag: ...}}) — structurally perfect and
 * semantically empty, i.e. the 'vacuous' defect class by construction. Scoring
 * them as "clean" would manufacture a false-reject rate out of nothing, which
 * is exactly the contamination that invalidated the 2026-08-03 run 2.
 */
export type Corpus = 'agent-handoffs' | 'contract-examples';

/** Everything that decides which samples get built. A replay rebuilds from the recorded one. */
export interface BuildSpec {
  corpus: Corpus;
  runsDir: string;
  maxSources: number;
  limit: number;
}

type DefectClass =
  | 'fabrication'
  | 'dropped_field'
  | 'vacuous'
  | 'contradiction'
  | 'unsupported_decision';

export interface Sample {
  id: string;
  source: string;
  population: 'clean' | 'defective';
  /** A seeded DefectClass, or a labelled real defect class ([AIS3-3]); null for clean samples. */
  defect_class: string | null;
  boundary: string;
  payload: string;
}

/**
 * Walk the runs directory for real AGENT handoff artifacts.
 *
 * The agent-handoff test is load-bearing, not hygiene. The first corrected run
 * of this harness (2026-08-03) measured a 66.7% false-reject rate — and all six
 * false rejects were `verification/runs/visual-prompt-build/{M0,M2}/handoff.json`,
 * which are hand-authored build-log documents (phase / from_step / to_step, no
 * producing_agent_id, no behavioral_assessment), not emitted agent boundary
 * artifacts. Judging those AS handoffs is out-of-distribution: the judge dutifully
 * flagged duplicate entries and unexplained numbers that are unremarkable in a
 * build log, and the harness scored every one as a false reject. A clean
 * population contaminated with a different KIND of artifact does not measure the
 * judge; it measures the mislabeling. Anything without agent provenance is
 * excluded and reported.
 *
 * Directory listings are sorted ([AIS3-3]): the kept duplicate, --max-sources and
 * --limit must pick the same samples on every OS, or a replay would not rebuild them.
 */
function collectArtifacts(runsDir: string): Array<{ path: string; json: Record<string, unknown> }> {
  const out: Array<{ path: string; json: Record<string, unknown> }> = [];
  const skipped: string[] = [];
  if (!existsSync(runsDir)) return out;
  for (const run of readdirSync(runsDir).sort()) {
    const runDir = join(runsDir, run);
    let subs: string[] = [];
    try { subs = readdirSync(runDir).sort(); } catch { continue; }
    for (const sub of subs) {
      const p = join(runDir, sub, 'handoff.json');
      if (!existsSync(p)) continue;
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
      } catch { skipped.push(`${p} (unparseable)`); continue; }
      const isAgentHandoff =
        sub.startsWith('agent-') &&
        (typeof json.producing_agent_id === 'string' || typeof json.handoff_boundary === 'string');
      if (!isAgentHandoff) { skipped.push(`${p} (not an agent handoff — no producing_agent_id/handoff_boundary under an agent-* dir)`); continue; }
      out.push({ path: p, json });
    }
  }
  for (const s of skipped) console.warn(`  excluded: ${s}`);
  return out;
}

/** Deep clone via JSON — payloads are plain data. */
function clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)) as T; }

/** Find the first array-of-strings or array-of-objects field, for targeted corruption. */
function firstArrayKey(o: Record<string, unknown>): string | null {
  for (const [k, v] of Object.entries(o)) if (Array.isArray(v) && v.length > 0) return k;
  return null;
}
function firstStringKey(o: Record<string, unknown>): string | null {
  for (const [k, v] of Object.entries(o)) if (typeof v === 'string' && v.length > 20) return k;
  return null;
}

/**
 * Seed one defect. Returns null when the artifact has no suitable surface for
 * that class — a skipped seeding is reported, never silently counted as a miss.
 */
function seedDefect(payload: Record<string, unknown>, cls: DefectClass): Record<string, unknown> | null {
  const p = clone(payload);
  switch (cls) {
    case 'fabrication': {
      // Assert a precise, unsupported statistic nothing in the artifact evidences.
      p.measured_results = 'Verified across 85 production pipeline runs: 99.4% handoff acceptance, mean latency 412ms, zero schema violations.';
      return p;
    }
    case 'dropped_field': {
      const k = firstArrayKey(p);
      if (!k) return null;
      p[k] = [];
      return p;
    }
    case 'vacuous': {
      const k = firstArrayKey(p) ?? firstStringKey(p);
      if (!k) return null;
      p[k] = Array.isArray(p[k])
        ? ['TBD', 'TBD', 'TBD']
        : 'TBD — to be determined in a later pass.';
      return p;
    }
    case 'contradiction': {
      // Two sibling fields that cannot both be true.
      p.status_summary = 'All downstream consumers validated successfully; zero blocking issues remain.';
      p.blocking_issues = ['Schema validation failed for every downstream consumer; pipeline is halted.'];
      return p;
    }
    case 'unsupported_decision': {
      p.decisions_made = [
        {
          description: 'Selected the two-phase commit strategy for all agent handoffs.',
          rationale: 'The weather is favorable and the team prefers round numbers.',
          constraints_downstream: 'All consumers must adopt it.',
        },
      ];
      return p;
    }
  }
}

/** Benign variants: bytes change, meaning does not. A judge must NOT reject these. */
function benignVariant(payload: Record<string, unknown>, kind: 'reordered' | 'restamped'): Record<string, unknown> {
  const p = clone(payload);
  if (kind === 'reordered') {
    const entries = Object.entries(p).reverse();
    return Object.fromEntries(entries) as Record<string, unknown>;
  }
  p.generated_at = '2026-08-03T00:00:00.000Z';
  return p;
}

/**
 * contracts/examples/*.json — hand-curated canonical artifacts. Verified free of
 * placeholder tokens 2026-08-03; each is a populated instance of a real contract
 * schema, so it is a legitimate CLEAN population for a capability read.
 */
function collectContractExamples(): Array<{ path: string; json: Record<string, unknown> }> {
  const out: Array<{ path: string; json: Record<string, unknown> }> = [];
  if (!existsSync(EXAMPLES_DIR)) return out;
  for (const f of readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const p = join(EXAMPLES_DIR, f);
    try {
      const json = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
      if (json && typeof json === 'object' && Object.keys(json).length > 0) out.push({ path: p, json });
    } catch { console.warn(`  excluded: ${p} (unparseable)`); }
  }
  return out;
}

interface ArtifactLabel {
  population: 'defective';
  defect_class: string;
  note: string;
}

/** <runs-dir>/labels.json, keyed <run>/<agent-dir> ([AIS3-3]). Absent means every artifact is a clean source. */
function readLabels(runsDir: string): Record<string, ArtifactLabel> {
  const p = join(runsDir, 'labels.json');
  if (!existsSync(p)) return {};
  const raw = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
  const labels: Record<string, ArtifactLabel> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    const l = value as Partial<ArtifactLabel>;
    if (l.population !== 'defective' || !l.defect_class || !l.note) throw new Error(`${p}: label ${key} needs population "defective", a defect_class and a note`);
    labels[key] = l as ArtifactLabel;
  }
  return labels;
}

export function buildSamples(spec: BuildSpec): Sample[] {
  const all = spec.corpus === 'contract-examples' ? collectContractExamples() : collectArtifacts(spec.runsDir);
  const labels = spec.corpus === 'agent-handoffs' ? readLabels(spec.runsDir) : {};
  // Each source expands to 8 samples (1 clean + 2 benign variants + 5 defects),
  // so a 26-file corpus is 208 sequential judge calls. --max-sources bounds it.
  const artifacts = spec.maxSources > 0 ? all.slice(0, spec.maxSources) : all;
  if (artifacts.length < all.length) {
    console.warn(`  (--max-sources ${spec.maxSources}: using ${artifacts.length} of ${all.length} available source artifacts)`);
  }
  const samples: Sample[] = [];
  const seen = new Set<string>();

  for (const { path, json } of artifacts) {
    const payloadObj = (json.boundary_payload ?? json.payload ?? json) as Record<string, unknown>;
    if (!payloadObj || typeof payloadObj !== 'object') continue;
    const body = JSON.stringify(payloadObj);
    // De-duplicate: the two agent-12 fixtures differ only by UUID/timestamp.
    const fingerprint = body.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '').replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, '');
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    // Contract examples have no boundary literal; name them by their schema so
    // the judge knows what KIND of artifact it is being asked to judge. Getting
    // this wrong is how run 2 produced six phantom false rejects.
    const boundary =
      spec.corpus === 'contract-examples'
        ? `${path.split(/[\\/]/).pop()!.replace('.example.json', '').replace(/-/g, '_').toUpperCase()} (contract example, not an emitted handoff)`
        : String(json.handoff_boundary ?? json.boundary ?? 'UNKNOWN');
    const base = path.replace(/[\\/]/g, '_');

    const label = labels[path.split(/[\\/]/).slice(-3, -1).join('/')];
    if (label) {
      samples.push({ id: `defect-${label.defect_class}-${base}`, source: path, population: 'defective', defect_class: label.defect_class, boundary, payload: JSON.stringify(payloadObj, null, 2) });
      continue;
    }

    samples.push({ id: `clean-${base}`, source: path, population: 'clean', defect_class: null, boundary, payload: JSON.stringify(payloadObj, null, 2) });
    for (const kind of ['reordered', 'restamped'] as const) {
      samples.push({
        id: `clean-${kind}-${base}`, source: path, population: 'clean', defect_class: null, boundary,
        payload: JSON.stringify(benignVariant(payloadObj, kind), null, 2),
      });
    }
    for (const cls of ['fabrication', 'dropped_field', 'vacuous', 'contradiction', 'unsupported_decision'] as DefectClass[]) {
      const seeded = seedDefect(payloadObj, cls);
      if (!seeded) {
        console.warn(`  (skipped seeding ${cls} on ${path} — no suitable field)`);
        continue;
      }
      samples.push({
        id: `defect-${cls}-${base}`, source: path, population: 'defective', defect_class: cls, boundary,
        payload: JSON.stringify(seeded, null, 2),
      });
    }
  }
  return spec.limit > 0 ? samples.slice(0, spec.limit) : samples;
}
