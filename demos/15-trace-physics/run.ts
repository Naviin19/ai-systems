// Demo 15: a run is scored by how it moved, a value nobody recorded stays null instead of becoming a zero, and the
// input's score sits beside the run's score, never inside it. See README.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TracePhysicsAgentSchema, TracePhysicsRunSchema } from '../../contracts/types/measurement/trace-physics';
import { WEIGHTS, scoreRun, traceScore, type LedgerEvent } from './trace-physics';
import { heading, line, rows, table } from '../lib/print';

const events = readFileSync(join(import.meta.dirname, 'fixtures', 'events.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l) as LedgerEvent);
// Each agent's accepted handoff.json, by size: the scorer reads its length, never its content.
const agents = [
  { agentId: 'demo.agent-01-foundation', handoffChars: 8000 },
  { agentId: 'demo.agent-02-collection', handoffChars: 8000 },
  { agentId: 'demo.agent-03-analysis', handoffChars: 6000 },
];
const brief = { score: 0.72, source: 'input-state.json, written for this demo' };

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, held: boolean, detail: string): void => void checks.push([name, held, detail]);
const fmt = (n: number | null, d = 3): string => (n === null ? 'null' : n.toFixed(d));

heading('1. Three dispatches, scored by how each one moved');
const run = scoreRun({ runId: 'run-trace-demo', events, agents, inputState: brief });
const [clean, thrashed, unmeasured] = run.agents;
table([
  ['agent', 'jerk', 'schema friction', 'compression', 'wall time', 'score'],
  ...run.agents.map((a) => [
    a.agent_id, a.jerk.jerk, a.schema_friction.schema_friction, fmt(a.compression.compression),
    a.energy.wall_ms_to_complete === null ? 'null' : `${a.energy.wall_ms_to_complete / 1000}s`, fmt(a.score),
  ]),
]);
line('');
line(`  score = ${WEIGHTS.compression} × compression + ${WEIGHTS.jerk} / (jerk + 1) + ${WEIGHTS.schema_friction} / (schema friction + 1)`);
line(`  every record carries calibration: ${clean.calibration}`);
line('');
line('  What made agent 02 thrash, from its own events:');
rows([
  ['route-back retries', thrashed.jerk.route_back_retries],
  ['restarts', thrashed.jerk.restarts],
  ['corrector cycles beyond the first', thrashed.jerk.corrector_cycles_beyond_first ?? 'null'],
  ['repeated identical loads', thrashed.jerk.repeated_identical_loads],
  ['schema-on-write route-backs', thrashed.schema_friction.schema_on_write_route_backs],
]);

const byHand = (a: typeof clean): number | null =>
  a.compression.compression === null ? null
    : 0.4 * a.compression.compression + 0.4 / (a.jerk.jerk + 1) + 0.2 / (a.schema_friction.schema_friction + 1);
check('each score is the published formula', run.agents.every((a) => a.score === byHand(a)), 're-derived by hand for all three');
check('the clean dispatch outranks the one that thrashed', (clean.score ?? 0) > (thrashed.score ?? 1), `${fmt(clean.score)} > ${fmt(thrashed.score)}`);
check(
  'every record satisfies the contract',
  run.agents.every((a) => TracePhysicsAgentSchema.safeParse(a).success) && TracePhysicsRunSchema.safeParse(run).success,
  '3 agent records and 1 run record',
);

heading('2. A value nobody recorded stays null');
line('  Agent 03 finished, but its completion carries no token usage, as every mock run does. With no token');
line('  total there is no compression, so there is no score, and the record says why:');
line('');
rows(unmeasured.nulls.filter((x) => x.field === 'compression.tokens_total' || x.field === 'score').map((n): [string, string] => [n.field, n.reason]));
line('');
const asZero = traceScore(0, unmeasured.jerk.jerk, unmeasured.schema_friction.schema_friction);
table([
  ['treatment', 'agent 03 score', 'its rank of three'],
  ['the null stays null (this scorer)', fmt(unmeasured.score), 'unranked'],
  ['the null read as zero', fmt(asZero), asZero !== null && asZero > (thrashed.score ?? 0) ? 'second, above agent 02' : 'third'],
]);
line('');
line('  Read as zero, a dispatch nobody measured would rank above one that was measured, on the strength of');
line('  having recorded nothing that could count against it.');
check('a dispatch with no token record has no score', unmeasured.score === null, `score ${fmt(unmeasured.score)}`);
check(
  'the run leaves it out of compression and names it',
  run.nulls.some((n) => n.field === 'totals.compression[demo.agent-03-analysis]') && run.totals.tokens_total === 69000,
  `run tokens ${run.totals.tokens_total}, over agents 01 and 02`,
);

heading("3. The input's score sits beside the run's score");
const poorer = scoreRun({ runId: 'run-trace-demo', events, agents, inputState: { score: 0.1, source: 'a poorer brief' } });
table([
  ['brief', 'meta.input_score', 'run score'],
  [brief.source, fmt(run.meta.input_score, 2), fmt(run.score)],
  [poorer.meta.input_score_source ?? '', fmt(poorer.meta.input_score, 2), fmt(poorer.score)],
]);
line('');
line('  A poorer brief is recorded beside the run, so a reader can weigh it. It does not move the score, so a');
line('  run cannot look better or worse for what it was handed.');
check("the brief's score never moves the run's score", run.score === poorer.score && run.meta.input_score !== poorer.meta.input_score, `${fmt(run.score)} both times`);

heading('What held');
table([['check', 'result', 'detail'], ...checks.map(([n, ok, d]) => [n, ok ? 'held' : 'FAILED', d])]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  line('');
  line(`${failed.length} check(s) failed: ${failed.map(([n]) => n).join('; ')}`);
  process.exit(1);
}
line('');
line('All checks held. Nothing above reached a network, a key or a model.');
