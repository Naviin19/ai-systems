// Demo 2: an agent's output is held to its own history with no model and no API call, and the margin to the floor is
// tracked, so degradation shows before the floor breaks. Every check here is the factory's own code: see README.md.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMBEDDER_ID, embedTextDeterministic } from './embed-output';
import { detectAgentDrift, marginCompression, type AgentDriftResult, type DriftPoint } from './semantic-drift';
import { heading, line, rows, table } from '../lib/print';

const FIX = join(import.meta.dirname, 'fixtures');
const FLOOR = 0.82; // the factory's default DRIFT_THRESHOLD
const AGENT = 'agent-12';
const read = (rel: string): string => readFileSync(join(FIX, rel), 'utf8');
const { handoff: thisRun } = JSON.parse(read('current-run.json')) as { handoff: string };

const scratch = mkdtempSync(join(tmpdir(), 'demo-drift-'));

/** A baseline directory holding the first `builds` of agent 12's committed baseline builds. */
function baselines(builds: number): string {
  const dir = join(scratch, `baselines-${builds}`);
  mkdirSync(join(dir, AGENT), { recursive: true });
  for (const f of readdirSync(join(FIX, 'semantic-baseline', AGENT)).sort().slice(0, builds)) {
    copyFileSync(join(FIX, 'semantic-baseline', AGENT, f), join(dir, AGENT, f));
  }
  return dir;
}

/** Writes the handoff where a run leaves it, then runs the factory's drift check on it. */
async function check(handoffRel: string, builds: number): Promise<AgentDriftResult> {
  const runId = `${handoffRel.replace(/\W+/g, '-')}-${builds}`;
  const runRoot = join(scratch, 'runs');
  mkdirSync(join(runRoot, runId, AGENT), { recursive: true });
  writeFileSync(join(runRoot, runId, AGENT, 'handoff.json'), read(handoffRel));
  return detectAgentDrift({ agentDirName: AGENT, runId, runRoot, baselineDir: baselines(builds), driftDir: join(scratch, 'drift', runId), threshold: FLOOR });
}

const verdict = (r: AgentDriftResult): string =>
  r.status === 'disabled' ? 'pass: not checked' : r.blocking ? 'halt' : r.status === 'drift-flagged' ? 'warn: reported, never blocks' : 'pass';

let blocked = false;
try {
  heading('1. The embedder: deterministic, no model, no network');
  const sample = read('candidates/run-corpus-mtpc7jza.json');
  const a = embedTextDeterministic(sample);
  const b = embedTextDeterministic(sample);
  rows([
    ['embedder', `${EMBEDDER_ID}: character trigrams hashed into 64 dimensions`],
    ['same handoff, embedded twice', a.every((v, i) => v === b[i]) ? 'identical vectors' : 'different vectors'],
    ['first components', a.slice(0, 4).map((v) => v.toFixed(6)).join(', ')],
  ]);

  heading(`2. Real agent-12 handoffs against its two committed baseline builds (floor ${FLOOR})`);
  const real = readdirSync(join(FIX, 'candidates')).filter((f) => f.endsWith('.json')).sort();
  const scored: Array<Array<string>> = [];
  for (const f of real) {
    const r = await check(`candidates/${f}`, 2);
    scored.push([f.replace(/\.json$/, ''), r.score!.toFixed(4), r.margin!.toFixed(4), verdict(r)]);
  }
  table([['handoff', 'score', 'margin', 'verdict'], ...scored]);
  line('  Score is the closest cosine similarity to any baseline, and margin is score minus floor.');
  line('  The baselines were recorded from two other builds of the same agent, so neither handoff is scored against itself.');

  heading('3. One stubbed handoff at each enforcement level');
  const ladder: Array<Array<string>> = [];
  for (const [level, builds] of [['disabled: no baseline builds', 0], ['advisory: one comparable build', 1], ['enforcing: two or more', 2]] as const) {
    const r = await check('mock-handoff.json', builds);
    ladder.push([level, r.score === null ? '-' : r.score.toFixed(4), verdict(r)]);
  }
  table([['level', 'score', 'outcome'], ...ladder]);
  line('  The stub is the factory\'s committed mock handoff, an envelope whose payload is {"mock": true}.');

  heading('4. The margin series: degradation shows before the floor breaks');
  const series: DriftPoint[] = [];
  const points: Array<Array<string>> = [];
  [0.14, 0.13, 0.12, 0.08, 0.05, -0.02].forEach((margin, i) => {
    series.push({ run_id: `run-${i + 1}`, score: FLOOR + margin, floor: FLOOR, margin, at: `2026-09-0${i + 1}T00:00:00.000Z` });
    points.push([`run ${i + 1}`, (FLOOR + margin).toFixed(2), margin.toFixed(2), marginCompression(series).status]);
  });
  table([['run', 'score', 'margin', 'series status'], ...points]);
  line('  An illustrative series, judged by the factory\'s marginCompression. Run 5 is still above the floor, and it warns.');

  heading('5. This run');
  const r = await check(thisRun, 2);
  rows([['handoff', thisRun], ['score', r.score!.toFixed(4)], ['margin', r.margin!.toFixed(4)], ['verdict', verdict(r)]]);
  blocked = r.blocking;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (blocked) {
  line('\nThis run\'s handoff drifted below the floor, and at the enforcing level drift blocks the run.');
  process.exit(1);
}
line('\nNo model and no API call: the check is a pure function of the handoff text and the committed baselines.');
