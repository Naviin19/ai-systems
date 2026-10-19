// Demo 14: receipt v2 is six optional fields with no default, so a receipt written before them still validates
// and comes back with nothing added, and a value of the wrong shape is refused. See README.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ReceiptSchema } from '../../contracts/types/measurement/receipt';
import { heading, line, rows, table } from '../lib/print';

const V2 = ['state_before', 'state_after', 'preamble_variant', 'dispatch_topology', 'narrative_present', 'factory_commit'] as const;
const TAG_COMMIT = 'a'.repeat(40);
const old = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'pre-v2.json'), 'utf8')) as Record<string, unknown>;

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, held: boolean, detail: string): void => void checks.push([name, held, detail]);

/** Every key path in a JSON value, so "nothing added" is checked at every depth, not only the top. */
const paths = (v: unknown, at = ''): string[] =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => [`${at}${k}`, ...paths(x, `${at}${k}.`)])
    : Array.isArray(v) ? v.flatMap((x, i) => paths(x, `${at}${i}.`)) : [];

heading('1. A receipt written before receipt v2');
const parsedOld = ReceiptSchema.safeParse(old);
rows([
  ['receipt', String(old.receipt_id)],
  ['schema_version', String(old.schema_version)],
  ['validates', parsedOld.success ? 'yes' : `NO: ${parsedOld.error.issues[0]?.message}`],
  ['carries any of the six', V2.filter((f) => f in old).join(', ') || 'none'],
]);
check('a receipt from before v2 still validates', parsedOld.success, parsedOld.success ? 'parsed' : 'refused');
check('it carries none of the six fields', V2.every((f) => !(f in old)), 'none present');

heading('2. Parsing it adds nothing');
line('  A field the schema fills in with a default appears in every receipt that never recorded it, and the');
line("  factory's contract-evolution check reads a defaulted field as newly required. So each of the six is");
line('  optional with no default: an old receipt comes back from the parser exactly as it went in.');
line('');
const before = paths(old).sort();
const after = parsedOld.success ? paths(parsedOld.data).sort() : [];
const added = after.filter((p) => !before.includes(p));
rows([
  ['key paths in the file', before.length],
  ['key paths after parsing', after.length],
  ['added by the parser', added.join(', ') || 'none'],
]);
check('parsing an old receipt adds no key', parsedOld.success && added.length === 0, added.length ? `added ${added.join(', ')}` : `${before.length} paths in, ${after.length} out`);

heading('3. A receipt that recorded all six');
const v2 = {
  ...old,
  state_before: 'API_TO_COLLECTION,SPEC_TO_FOUNDATION',
  state_after: 'COLLECTION_TO_ANALYSIS',
  preamble_variant: 'with',
  dispatch_topology: 'pipeline',
  narrative_present: true,
  factory_commit: TAG_COMMIT,
};
const parsedV2 = ReceiptSchema.safeParse(v2);
table([['field', 'value', 'what it records'],
  ['state_before', v2.state_before, 'the boundaries of the upstream handoffs that named this agent'],
  ['state_after', v2.state_after, "this handoff's own boundary"],
  ['preamble_variant', v2.preamble_variant, 'which resident preamble the dispatch was given'],
  ['dispatch_topology', v2.dispatch_topology, "the trace scorer's reading of how the agent was dispatched"],
  ['narrative_present', String(v2.narrative_present), 'whether a narrative sat beside the JSON'],
  ['factory_commit', `${TAG_COMMIT.slice(0, 12)}…`, 'the factory commit the run was built from'],
]);
line('');
rows([['validates', parsedV2.success ? 'yes' : `NO: ${parsedV2.error.issues[0]?.message}`], ['schema_version', parsedV2.success ? parsedV2.data.schema_version : '—']]);
check('a receipt with all six recorded validates', parsedV2.success, 'parsed');
check('the six fields leave the version at 1.0', parsedV2.success && parsedV2.data.schema_version === '1.0', 'the fields are the version');

heading('4. A value of the wrong shape is refused');
const wrong: Array<[string, unknown, string]> = [
  ['factory_commit', 'not-a-sha', 'a commit is 40 hex characters'],
  ['preamble_variant', 'maybe', 'with or without, nothing else'],
  ['dispatch_topology', 'hierarchical', "the run's reading, not an agent's"],
  ['narrative_present', 'yes', 'a boolean, not a word'],
  ['state_before', '', 'absent when unknown, never empty'],
];
const refusals = wrong.map(([field, value, why]) => {
  const r = ReceiptSchema.safeParse({ ...old, [field]: value });
  return { field, value, why, refused: !r.success };
});
table([['field', 'value', 'refused', 'why'], ...refusals.map((r) => [r.field, JSON.stringify(r.value), r.refused ? 'yes' : 'NO', r.why])]);
check('every wrong shape is refused', refusals.every((r) => r.refused), `${refusals.filter((r) => r.refused).length} of ${refusals.length}`);

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
