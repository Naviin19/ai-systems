// Demo 3: the brakes catch real defects, leave benign changes alone, and tell a failure worth retrying from one worth
// stopping for. Every check here is the factory's own code, extracted: see README.md.
import { join } from 'node:path';
import { buildSamples, HARNESS, TASK_CONTEXT, type Corpus, type Sample } from './catch-rate';
import { buildJudgeRequestBody, parseJudgeReply, type CrossFamilyVerifyRequest } from './cross-family-verify';
import { matchRecording, readRecording, recordingSource, requestHash, RecordingError, type RecordingEntry } from './judge-recording';
import { classifyRouteBack, failureSignature, maskVolatile } from './route-back';
import { matchHeuristic } from './heuristics';
import { heading, line, rows, table } from '../lib/print';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined =>
  argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ??
  (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : undefined);
const MIN_CATCH = Number.parseFloat(flag('min-catch') ?? '0.70');
const MAX_FALSE_REJECT = Number.parseFloat(flag('max-false-reject') ?? '0.10');

// The recording names its sources by their path in the factory, and the heuristics loader reads its table from the
// factory's path too. fixtures/ mirrors both paths, so neither is rewritten.
process.chdir(join(import.meta.dirname, 'fixtures'));

let recording: RecordingEntry[];
let samples: Sample[];
let replies: Map<string, RecordingEntry>;
try {
  recording = readRecording('cross-family-replay.jsonl');
  const source = recordingSource(recording, HARNESS);
  samples = buildSamples({ corpus: (source.sources.corpus ?? 'agent-handoffs') as Corpus, runsDir: source.sources.dir, maxSources: source.sources.max_sources ?? 0, limit: source.sources.limit ?? 0 });
  const requestOf = (s: Sample): CrossFamilyVerifyRequest => ({ agent_id: 'calibration-harness', boundary: s.boundary, task_context: TASK_CONTEXT, handoff_json: s.payload, judge_model: source.judge });
  replies = matchRecording(recording, samples.map((s) => ({ sample_id: s.id, request_hash: requestHash(buildJudgeRequestBody(requestOf(s))) })));
} catch (e) {
  if (!(e instanceof RecordingError)) throw e;
  console.log(`REPLAY_REFUSED: ${e.message}`);
  process.exit(1);
}

/** A recorded reply read the way verifyHandoffCrossFamily reads a live one: a failed call, a non-2xx status or an
 *  unparseable reply is ERROR, never REJECT. */
function verdictOf(entry: RecordingEntry): { verdict: 'ACCEPT' | 'REJECT' | 'ERROR'; defect: string } {
  if (entry.failed || (entry.status ?? 200) >= 400) return { verdict: 'ERROR', defect: '' };
  let text = '';
  try {
    text = (JSON.parse(entry.raw_reply) as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '';
  } catch {
    return { verdict: 'ERROR', defect: '' };
  }
  const parsed = parseJudgeReply(text);
  return parsed ? { verdict: parsed.verdict, defect: parsed.defect } : { verdict: 'ERROR', defect: '' };
}
const results = samples.map((s) => ({ ...s, ...verdictOf(replies.get(s.id)!) }));
const sourceOf = (s: Sample): string => s.source.split(/[\\/]/).slice(-3, -1).join('/');
const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

heading('1. It catches');
line(`  ${samples.length} samples from ${new Set(samples.map((s) => s.source)).size} real agent handoffs, judged by ${recording[0].model}.`);
line('  Replies are replayed from the factory\'s recording, and each request is rebuilt and hash-checked against it first.');
table([
  ['defect', 'source', 'verdict', 'what the judge named'],
  ...results.filter((r) => r.population === 'defective').map((r) => [r.defect_class ?? '', sourceOf(r), r.verdict === 'REJECT' ? 'REJECT' : `${r.verdict}, missed`, clip(r.defect || '(nothing)', 64)]),
]);
line('  A REJECT in BLOCK mode re-runs the agent once. A second REJECT halts the run, so nothing downstream reads the handoff.');

heading('2. It does not over-catch');
table([
  ['benign change', 'source', 'verdict'],
  ...results.filter((r) => r.population === 'clean').map((r) => [r.id.startsWith('clean-reordered-') ? 'keys reordered' : r.id.startsWith('clean-restamped-') ? 'timestamp restamped' : 'none: as emitted', sourceOf(r), r.verdict]),
]);

heading('3. It routes back');
const ROUTE_BACK_MAX = 3; // the orchestrator's cap: ROUTE_BACK_MAX_ATTEMPTS, default 3
const SANDBOX = '/work/.sandboxes/demo.agent-05-frontend-intelligence';
const RUN = 'run-1789311717099-c1ab2e';
const gateFailure = (at: string, code: string, message: string): string =>
  `quality gate failed: npx tsc --noEmit\n[agent agent-05-frontend-intelligence] raw gate output:\n${SANDBOX}/src/lib/score.ts(14,7): error ${code}: ${message}\nin ${RUN} at ${at}`;
const first = gateFailure('2026-09-13T14:02:11.123Z', 'TS2304', "Cannot find name 'ConfidenceTier'.");
const again = gateFailure('2026-09-13T14:08:52.740Z', 'TS2304', "Cannot find name 'ConfidenceTier'.");
line('  A compiler failure, as the quality gate raises it:');
for (const l of first.split('\n')) line(`    ${l}`);
line('  The same failure, as the re-dispatched agent reads it:');
for (const l of maskVolatile(first).split('\n')) line(`    ${l}`);
line('  The same failure again on the next attempt, six minutes later:');
rows([
  ['text the agent reads', maskVolatile(first) === maskVolatile(again) ? 'identical to the first attempt' : 'different from the first attempt'],
  ['failure signature', failureSignature(first) === failureSignature(again) ? `${failureSignature(first)} on both attempts` : `${failureSignature(first)}, then ${failureSignature(again)}`],
]);

const schemaFailure = [
  'SCHEMA_VALIDATION_FAIL: agent-03c-synthesis handoff payload does not match HandoffEnvelopeSchema.',
  'Boundary: SYNTHESIS_TO_FRONTEND',
  'Issues: boundary_payload.quality_assessment_summary: Invalid input: expected object, received undefined',
  "CORRECTOR: The agent's output did not conform to the typed boundary schema.",
  'PATH FORWARD: Check if the tool_use response matched the expected boundary_payload shape.',
  `MINIMUM CORRECTION: the [150] route-back loop re-dispatches with these issues as input (cap ${ROUTE_BACK_MAX}).`,
].join('\n');
const attestationFailure = 'ATTESTATION MISMATCH: agent-03c-synthesis step 2.1 claimed PASS; its verify command exited 1';

line();
table([
  ['failure', 'class', 'decision', 'attempt', 'heuristic'],
  ...[['compiler error', first], ['schema-on-write', schemaFailure], ['attestation mismatch', attestationFailure]].map(([name, text]) => {
    const d = classifyRouteBack(text, 1, ROUTE_BACK_MAX, []);
    return [name, d.class_id ?? '(none)', d.retry ? 're-dispatch' : `halt: ${d.reason}`, `1 / ${ROUTE_BACK_MAX}`, matchHeuristic(text)?.id ?? '-'];
  }),
]);

const heuristic = matchHeuristic(first)!;
const decision = classifyRouteBack(first, 1, ROUTE_BACK_MAX, []);
line('\n  ROLLBACK_CONTEXT, as the orchestrator hands it to the agent on re-dispatch:');
line(`    ${JSON.stringify({ prior_error: maskVolatile(first).slice(0, 6000), heuristic_id: heuristic.id, fix: heuristic.fix, attempt: 1, gate_class: decision.class_id })}`);

const other = gateFailure('2026-09-13T14:09:40.500Z', 'TS2322', "Type 'string' is not assignable to type 'number'.");
const third = gateFailure('2026-09-13T14:15:02.020Z', 'TS2307', "Cannot find module './tiers'.");
for (const [title, sequence] of [['A-B-A: the fix for B brings back A', [first, other, first]], ['three different failures', [first, other, third]]] as const) {
  line(`\n  ${title}`);
  const history: string[] = [];
  sequence.forEach((text, i) => {
    const d = classifyRouteBack(text, i + 1, ROUTE_BACK_MAX, history);
    history.push(d.signature);
    line(`    attempt ${i + 1} / ${ROUTE_BACK_MAX}  ${d.signature}  ${d.retry ? 're-dispatch' : `halt: ${d.reason}`}`);
  });
}

heading('4. The matrix, gated on its own thresholds');
// The arithmetic of measure-judge-catch-rate.ts main(), unchanged.
const errors = results.filter((r) => r.verdict === 'ERROR');
const scored = results.filter((r) => r.verdict !== 'ERROR');
const scoredClean = scored.filter((r) => r.population === 'clean');
const scoredDefective = scored.filter((r) => r.population === 'defective');
const caught = scoredDefective.filter((r) => r.verdict === 'REJECT');
const falseRejects = scoredClean.filter((r) => r.verdict === 'REJECT');
const catch_rate = scoredDefective.length ? caught.length / scoredDefective.length : 0;
const false_reject_rate = scoredClean.length ? falseRejects.length / scoredClean.length : 0;
const perClass: Record<string, { caught: number; total: number }> = {};
for (const r of scoredDefective) {
  const k = r.defect_class as string;
  perClass[k] ??= { caught: 0, total: 0 };
  perClass[k].total++;
  if (r.verdict === 'REJECT') perClass[k].caught++;
}
const MIN_POPULATION = 3;
const MIN_SOURCES = 2;
const MAX_ERROR_RATE = 0.2;
const sourceCount = new Set(samples.map((s) => s.source)).size;
const error_rate = results.length ? errors.length / results.length : 1;
const insufficient = scoredClean.length < MIN_POPULATION || scoredDefective.length < MIN_POPULATION || sourceCount < MIN_SOURCES || error_rate > MAX_ERROR_RATE;
const meetsBar = catch_rate >= MIN_CATCH && false_reject_rate <= MAX_FALSE_REJECT;
const verdict = insufficient ? 'insufficient-sample' : meetsBar ? 'adopt' : 'reject';

rows([
  ['catch rate', `${caught.length} / ${scoredDefective.length} = ${catch_rate.toFixed(3)}  (bar: at least ${MIN_CATCH.toFixed(2)})`],
  ['false-reject rate', `${falseRejects.length} / ${scoredClean.length} = ${false_reject_rate.toFixed(3)}  (bar: at most ${MAX_FALSE_REJECT.toFixed(2)})`],
  ['judge errors', `${errors.length} of ${results.length}`],
  ['sources', `${sourceCount} (at least ${MIN_SOURCES})`],
  ['decision', verdict],
]);
table([['defect class', 'caught'], ...Object.entries(perClass).map(([k, v]) => [k, `${v.caught} / ${v.total}`])]);
line('  Route-back resolution rate: not measured. The factory has no recorded route-back runs to score it against.');

if (verdict !== 'adopt') {
  line(`\nGATE FAILED: decision ${verdict}. This demo holds itself to the same bar the judge is held to.`);
  process.exit(1);
}
line('\nThe judge clears its bar, and route-back retries only the failures it can learn from.');
