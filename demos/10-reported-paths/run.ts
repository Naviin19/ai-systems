// Demo 10: a path an agent reports in its handoff is a claim about disk, and something resolves it. Every
// check here runs the factory's own scanner, extracted, over fixture handoffs it ships: see README.md.
import { join } from 'node:path';
import { scanReportedPaths, type PathFieldRow, type ScanResult } from './reported-paths';
import { REPORTED_PATH_FIELDS } from './reported-path-fields';
import { heading, line, rows, table } from '../lib/print';

const HERE = import.meta.dirname;
const RUNS = join(HERE, 'fixtures', 'runs');

const EXIT_OK = 0;
const EXIT_DETECTOR_BROKEN = 2;

// The scanner resolves a relative value against each root in turn; `{runDir}` expands to the emitting
// agent's own run directory, and `.` is the repo root — here, this folder.
const scan = (rowsUsed: PathFieldRow[], fixture: string): ScanResult => scanReportedPaths(rowsUsed, join(RUNS, fixture), HERE);

const readerRow = REPORTED_PATH_FIELDS.find((r) => r.path === 'boundary_payload.notes_emitted[]')!;
const routeRow = REPORTED_PATH_FIELDS.find((r) => r.kind === 'route')!;

heading('The class of defect');
line('  A schema-valid handoff can name a file that was never written. Every other gate checks the envelope\'s');
line('  SHAPE; this one resolves every declared filesystem path the envelope carries against disk.');

// ── The declaration ───────────────────────────────────────────────────────────────────────────────
// Path-SHAPED is a syntactic trigger; what a field IS is a decided `kind` on its row. Only 'filesystem' rows
// are ever resolved.
heading(`The declaration — ${REPORTED_PATH_FIELDS.length} path-shaped leaves, each with a decided kind`);
table([
  ['boundary', 'field', 'kind', 'resolved against'],
  ...REPORTED_PATH_FIELDS.map((r) => [r.boundary, r.path.replace(/^boundary_payload\./, ''), r.kind, r.kind === 'filesystem' ? (r.roots ?? ['{runDir}']).join(', ') : 'never']),
]);
const byKind = REPORTED_PATH_FIELDS.reduce<Record<string, number>>((a, r) => ((a[r.kind] = (a[r.kind] ?? 0) + 1), a), {});
line('');
rows(Object.entries(byKind).map(([k, n]) => [k, n]));

const verdicts: Array<[string, string, string, boolean]> = [];

// ── Check 1 ───────────────────────────────────────────────────────────────────────────────────────
heading('Check 1 — a handoff naming a file that does not exist is CAUGHT');
const fabricated = scan([readerRow], 'fabricated');
const written = scan([readerRow], 'written');
table([
  ['fixture', 'reported value', 'state', 'claims', 'resolved', 'missing'],
  ['fabricated', 'reading-notes/source.notes.md', fabricated.state, fabricated.claims, fabricated.resolved, fabricated.missing.length],
  ['written (control)', 'reading-notes/x.notes.md', written.state, written.claims, written.resolved, written.missing.length],
]);
for (const m of fabricated.missing) line(`\n  MISSING ${m.boundary} ${m.field} = ${JSON.stringify(m.value)} (run ${m.runId}/${m.agentDir})`);
const c1 = fabricated.state === 'PASS' && fabricated.missing.length === 1 && written.state === 'PASS' && written.missing.length === 0 && written.resolved === 1;
verdicts.push(['fabricated path is caught, written path resolves', 'MISSING 1 / MISSING 0', `MISSING ${fabricated.missing.length} / MISSING ${written.missing.length}`, c1]);

// ── Check 2 ───────────────────────────────────────────────────────────────────────────────────────
heading('Check 2 — a handoff that reports nothing because it wrote nothing is CLEAN');
const honest = scan([readerRow], 'honest');
rows([
  ['notes_emitted', '[]  (with a `blocked` route report beside it)'],
  ['state', honest.state],
  ['reason', honest.reason ?? ''],
  ['missing', honest.missing.length],
]);
const c2 = honest.state === 'UNEVALUATED' && honest.missing.length === 0;
verdicts.push(['empty report is clean, not punished', 'UNEVALUATED, MISSING 0', `${honest.state}, MISSING ${honest.missing.length}`, c2]);

// ── Check 3 ───────────────────────────────────────────────────────────────────────────────────────
// The same handoff is scanned twice: once with the row as declared (kind 'route'), once with the row
// rewritten as 'filesystem', which is what a name-matching gate would do with a field called `path`.
heading('Check 3 — a URL route (golden_master_routes[].path) is NEVER resolved against disk');
const asDeclared = scan([routeRow], 'routes');
const asNameMatched = scan([{ ...routeRow, kind: 'filesystem', roots: ['{runDir}'] }], 'routes');
table([
  ['row kind', 'state', 'claims', 'missing', 'what a run would see'],
  [routeRow.kind, asDeclared.state, asDeclared.claims, asDeclared.missing.length, 'nothing'],
  ['filesystem (name-matched)', asNameMatched.state, asNameMatched.claims, asNameMatched.missing.length, asNameMatched.missing.map((m) => m.value).join(', ') + ' reported missing on every run'],
]);
const c3 = asDeclared.claims === 0 && asDeclared.missing.length === 0 && asNameMatched.missing.length === 2;
verdicts.push(['route row makes 0 claims', '0 claims (2 if name-matched)', `${asDeclared.claims} claims (${asNameMatched.missing.length} if name-matched)`, c3]);

// ── Check 4 ───────────────────────────────────────────────────────────────────────────────────────
heading('Check 4 — zero handoffs is UNEVALUATED, never a pass');
const empty = scan(REPORTED_PATH_FIELDS, 'empty');
rows([
  ['handoffs scanned', empty.handoffsScanned],
  ['state', empty.state],
  ['reason', (empty.reason ?? '').replace(RUNS, 'fixtures/runs').replace(/\\/g, '/')],
]);
const c4 = empty.state === 'UNEVALUATED' && empty.handoffsScanned === 0 && /0 handoffs/.test(empty.reason ?? '');
verdicts.push(['zero handoffs is UNEVALUATED', 'UNEVALUATED', empty.state, c4]);

// ── Verdict ───────────────────────────────────────────────────────────────────────────────────────
heading('Verdict');
table([['check', 'want', 'got', 'verdict'], ...verdicts.map(([c, w, g, ok]) => [c, w, g, ok ? 'held' : 'FAILED'])]);

if (verdicts.some(([, , , ok]) => !ok)) {
  line('');
  line('SELF_TEST_FAILED — refusing to report a scan clean.');
  line('A scanner that does not catch the fabrication it planted itself would report a real run clean, and that');
  line('report would be indistinguishable from a run that really is clean. Exit 2: could not run.');
  process.exit(EXIT_DETECTOR_BROKEN);
}

line('');
rows([
  ['paths that return PASS without resolving a claim', '0'],
  ['exit when a check fails', `${EXIT_DETECTOR_BROKEN} — could not run, never a pass`],
  ['exit when every check holds', `${EXIT_OK}`],
]);
line('');
line('Every check held. Exit 0.');
line('Nothing above reached a network, a key or a model.');
process.exit(EXIT_OK);
