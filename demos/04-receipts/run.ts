// Demo 4: a receipt records what an agent was given, what it loaded and what it cited, and states what none of that
// proves. The factory's own receipt builder, over the ledger of one real dispatch: see README.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildReceipt } from './receipt';
import { heading, line, rows, table } from '../lib/print';

const RUNS = join(import.meta.dirname, 'fixtures', 'runs');
const RUN = 'run-corpus-mtpc7jza';
const AGENT = 'corpus-seed.agent-12-prompt-manager';
const n = (x: number): string => x.toLocaleString('en-US');

let receipt: ReturnType<typeof buildReceipt>;
try {
  receipt = buildReceipt({ runRoot: RUNS, runId: RUN, agentConfigId: AGENT, agentDirName: 'agent-12' });
} catch (e) {
  const issues = (e as { issues?: Array<{ path: PropertyKey[]; message: string }> }).issues;
  if (!issues) throw e;
  heading('The receipt contract refuses this receipt');
  for (const i of issues) line(`  ${i.path.map(String).join('.')}: ${i.message.split('\n')[0]!.slice(0, 120)}`);
  line('\nA receipt that claims more than its evidence can carry does not validate, so none is written.');
  process.exit(1);
}

const events = readFileSync(join(RUNS, RUN, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const complete = events.find((e) => e.event_type === 'AGENT_COMPLETE');
const usage = complete.token_usage as { input: number; output: number; cache_read: number; cache_write: number };
const { given, done } = receipt;
const distinct = new Set(given.index_injected.map((g) => g.skill)).size;

heading('1. What the agent was given');
rows([
  ['agent', `${AGENT}, one real dispatch on ${String(complete.ts).slice(0, 10)}`],
  ['citation index', `${given.index_injected.length} lines, naming ${distinct} distinct skills`],
  ['assembled prompt', `${n(given.prompt_chars!)} characters, about ${n(given.prompt_tokens_estimate!)} tokens (estimated as ${given.token_estimate_method})`],
  ['counted by the API', `${n(usage.input)} input, ${n(usage.cache_read)} read from cache, ${n(usage.cache_write)} written to cache, ${n(usage.output)} output, across the run`],
]);

heading('2. What it loaded, section by section');
table([
  ['turn', 'skill', 'section asked for', 'characters', 'tokens (est.)'],
  ...given.loaded.map((l) => [String(l.iter), l.file, l.section ?? 'whole file', n(l.chars), n(l.tokens_estimate ?? 0)]),
  ['', 'total', '', n(given.loaded.reduce((s, l) => s + l.chars, 0)), n(given.loaded.reduce((s, l) => s + (l.tokens_estimate ?? 0), 0))],
]);
line('  Each row is one load_skill call and the size of the text it returned.');

heading('3. What it cited');
rows([
  ['cited in its handoff', done.cited_in_output.length ? (done.cited_sections ?? []).map((c) => `${c.skill} ${c.section ?? ''}`.trim()).join(', ') : 'nothing: handoff.json and handoff.md carry no @skill: citation'],
  ['given, never cited', `${done.given_not_cited.length} of the ${distinct} skills in its index`],
  ['loaded, never cited', done.loaded_not_cited.join(', ')],
]);

heading('4. What the receipt will not claim');
let current = ' ';
for (const w of done.separability_statement.split(' ')) {
  if (current.length + w.length > 100) { line(current); current = ' '; }
  current += ` ${w}`;
}
line(current);

heading('5. The rest of the record');
rows([
  ['run outcome', receipt.run_outcome.status],
  ['gate verdicts', receipt.gate_verdicts.length ? receipt.gate_verdicts.map((g) => `${g.gate} ${g.result}`).join(', ') : 'none recorded in this run'],
  ['fields left empty', `${receipt.nulls.length}, each with its reason`],
]);
for (const x of receipt.nulls) line(`  - ${x.field}: ${x.reason}`);

line('\nThe receipt records and never judges: where it has no evidence, it names the gap instead of guessing.');
