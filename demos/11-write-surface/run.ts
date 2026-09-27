// Demo 11: every persistent place two agents share is on file, and the detector that holds the file to the tree
// catches its own planted cases before it is allowed to call the tree clean. See README.md for what was extracted.
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inspect, validateRegistry, walk, writeCallsIn, REACHING, type Finding, type Registry, type SchemaNode } from './detector';
import { heading, line, rows, table } from '../lib/print';

const HERE = import.meta.dirname;
const FIXTURES = join(HERE, 'fixtures');
const TREE = join(FIXTURES, 'tree').replace(/\\/g, '/');
const PLANTED = join(FIXTURES, 'planted');

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_DETECTOR_BROKEN = 2;

const registry = (): Registry => JSON.parse(readFileSync(join(FIXTURES, 'registry.json'), 'utf8')) as Registry;
const schema = (): SchemaNode => JSON.parse(readFileSync(join(FIXTURES, registry().envelope_free_text.schema), 'utf8'));
const show = (f: Finding[]): string => JSON.stringify(f);

heading('The class');
line('  A message can travel through any persistent surface two agents share: a board note, a handoff field, a');
line('  report a later session reads. The registry lists every such surface. Four checks hold it to the tree:');
rows([
  ['write-site', 'every file that writes to disk sits on a row or an allowlisted path'],
  ['anchor', 'a row that reaches a prompt names a string found IN the writer and IN the reader'],
  ['allowlist-hides-channel', 'an allowlisted file cannot aim a write at a path that reaches a prompt, undeclared'],
  ['envelope-free-text', 'every free-text handoff key is declared at the count the schema has'],
]);

// ── Self-test first ────────────────────────────────────────────────────────────────────────────────
// A temp copy of the fixture tree; each planted file is overlaid for one case and removed after it. A registry or
// schema fault is a mutation of a fresh copy. Every case must behave before the real tree is inspected.
heading('Self-test first: every planted case behaves before the fixture tree is inspected');
const root = mkdtempSync(join(tmpdir(), 'write-surface-demo-')).replace(/\\/g, '/');
cpSync(TREE, root, { recursive: true });

interface Verdict { ok: boolean; got: string }
const run = (reg: Registry, sch: SchemaNode = schema()): Finding[] => inspect(root, reg, sch).findings;
const withPlant = (name: string, fn: () => Verdict): Verdict => {
  const src = join(PLANTED, name);
  const files = walk(src).map((f) => f.slice(src.length + 1));
  for (const rel of files) {
    mkdirSync(dirname(`${root}/${rel}`), { recursive: true });
    copyFileSync(`${src}/${rel}`, `${root}/${rel}`);
  }
  try { return fn(); } finally { for (const rel of files) rmSync(`${root}/${rel}`); }
};
const has = (f: Finding[], check: Finding['check'], file?: string): boolean => f.some((x) => x.check === check && (file === undefined || x.file === file));

const cases: Array<{ name: string; expect: 'caught' | 'left alone'; test: () => Verdict }> = [
  { name: 'control: a correct registry over the fixture tree is clean', expect: 'left alone', test: () => {
    const f = run(registry());
    return { ok: validateRegistry(registry()).length === 0 && f.length === 0, got: show(f) };
  } },
  { name: 'control: a write call named only in a comment is not a write site', expect: 'left alone', test: () => (
    { ok: writeCallsIn(readFileSync(`${root}/scripts/reader-only.ts`, 'utf8')) === 0, got: '' }
  ) },
  { name: 'registry: an unknown channel_class is refused', expect: 'caught', test: () => {
    const r = registry(); r.surfaces[0].channel_class = 'friendly';
    const p = validateRegistry(r);
    return { ok: p.some((m) => m.includes('channel_class "friendly"')), got: p.join('; ') };
  } },
  { name: 'write-site: a file that writes to disk and sits on no row is found', expect: 'caught', test: () => withPlant('unregistered-writer', () => {
    const f = run(registry());
    return { ok: has(f, 'write-site', 'scripts/new-writer.ts'), got: show(f) };
  }) },
  { name: 'write-site: an allowlisted directory does not cover a file that merely shares its prefix', expect: 'caught', test: () => withPlant('prefix-share', () => {
    const f = run(registry());
    return { ok: has(f, 'write-site', 'scripts/checks-and-balances.ts'), got: show(f) };
  }) },
  { name: 'anchor: an anchor present only in another file does not count', expect: 'caught', test: () => {
    const r = registry(); r.surfaces[0].read_back[0].anchor = 'export const post'; // in the WRITER, not the reader the row names
    const f = run(r);
    return { ok: has(f, 'anchor', 'scripts/brief.ts'), got: show(f) };
  } },
  { name: 'allowlist: an allowlisted file whose write call is aimed at a session-reaching path is found', expect: 'caught', test: () => withPlant('allowlist-hides-channel', () => {
    const f = run(registry());
    return { ok: has(f, 'allowlist-hides-channel', 'scripts/checks/rewrites-board.ts'), got: show(f) };
  }) },
  { name: 'allowlist: the same file, declared under named_by with a reason, is accepted', expect: 'left alone', test: () => withPlant('allowlist-hides-channel', () => {
    const r = registry(); r.surfaces[0].named_by = [{ file: 'scripts/checks/rewrites-board.ts', role: 'reads_only', reason: 'reads a note and plants a copy in a temp directory' }];
    const f = run(r);
    return { ok: !has(f, 'allowlist-hides-channel'), got: show(f) };
  }) },
  { name: 'allowlist: a destination reached through two declarations is found', expect: 'caught', test: () => withPlant('allowlist-two-hops', () => {
    const f = run(registry());
    return { ok: has(f, 'allowlist-hides-channel', 'scripts/checks/hops.ts'), got: show(f) };
  }) },
  { name: 'allowlist: a file that only READS such a path and writes a temp copy is left alone', expect: 'left alone', test: () => withPlant('allowlist-reads-only', () => {
    const f = run(registry());
    return { ok: !has(f, 'allowlist-hides-channel'), got: show(f) };
  }) },
  { name: 'envelope: a new free-text key is found, and a length cap does not excuse it', expect: 'caught', test: () => {
    const s = schema();
    for (const v of s.oneOf) v.properties.route_notes = { type: 'array', items: { type: 'string', maxLength: 600 } };
    const f = run(registry(), s);
    return { ok: f.some((x) => x.check === 'envelope-free-text' && x.detail.includes('"route_notes"')), got: show(f) };
  } },
  { name: "envelope: a declared count that is not the schema's is found", expect: 'caught', test: () => {
    const r = registry(); r.envelope_free_text.boundary_payload.per_boundary.A_TO_B = 1;
    const f = run(r);
    return { ok: f.some((x) => x.check === 'envelope-free-text' && x.detail.includes('"A_TO_B"')), got: show(f) };
  } },
  { name: 'envelope: a declared key that carries no free text is stale', expect: 'caught', test: () => {
    const r = registry(); r.envelope_free_text.keys.handoff_id = { count: 1, channel_class: 'machine' };
    const f = run(r);
    return { ok: f.some((x) => x.check === 'envelope-free-text' && x.detail.includes('"handoff_id"') && x.detail.includes('stale')), got: show(f) };
  } },
];

const selfTest: Array<Array<string | number>> = [['planted case', 'verdict']];
const missed: string[] = [];
try {
  for (const c of cases) {
    const v = c.test();
    if (!v.ok) missed.push(`${c.name}\n    got: ${v.got}`);
    selfTest.push([c.name, v.ok ? c.expect : 'MISSED']);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
table(selfTest);

if (missed.length) {
  line('');
  line('SELF_TEST_FAILED — refusing to inspect the fixture tree.');
  line(`The self-test missed ${missed.length} of ${cases.length} planted cases. A detector that cannot catch a case it planted`);
  line('itself would report this tree clean, and that report would be indistinguishable from a tree that really is');
  line('clean. Exit 2: could not run.');
  for (const m of missed) line(`  MISSED  ${m}`);
  process.exit(EXIT_DETECTOR_BROKEN);
}
line('');
line(`  ${cases.length} of ${cases.length} planted cases behaved. The detector is allowed to inspect the tree.`);

// ── The registry ───────────────────────────────────────────────────────────────────────────────────
heading('The registry: one row per surface');
const reg = registry();
const invalid = validateRegistry(reg);
if (invalid.length) {
  for (const m of invalid) line(`  - ${m}`);
  line(`REGISTRY_INVALID — ${invalid.length} problem(s). Exit 2: could not run.`);
  process.exit(EXIT_DETECTOR_BROKEN);
}
const reaches = (s: Registry['surfaces'][number]): string => [...new Set(s.read_back.map((r) => r.reaches))].join(', ') || 'nothing reads it back';
table([
  ['surface', 'content', 'reaches', 'integrity', 'rewrite noticed', 'watched by', 'channel class'],
  ...reg.surfaces.map((s) => [s.id, s.content, reaches(s), s.integrity, s.tamper_evident ? 'yes' : 'NO', s.watched_by.join(', ') || 'nothing', s.channel_class]),
]);

// ── The inspection ─────────────────────────────────────────────────────────────────────────────────
heading('The inspection: the fixture tree against the registry');
const result = inspect(TREE, reg, schema());
// No skip-as-pass: a scan that reached nothing, or found no writer, was pointed at the wrong place.
if (!result.scanned.length) { line('SCAN_EMPTY — no source file under the scan trees. Exit 2: could not run.'); process.exit(EXIT_DETECTOR_BROKEN); }
if (!result.writing.length) { line('SCAN_EMPTY — no file in the scanned trees writes to disk. Exit 2: could not run.'); process.exit(EXIT_DETECTOR_BROKEN); }
if (!result.census.variants) { line('SCHEMA_EMPTY — the envelope schema holds no boundary variants. Exit 2: could not run.'); process.exit(EXIT_DETECTOR_BROKEN); }

line(`  ${result.scanned.length} files scanned, ${result.writing.length} write to disk`);
line('');
table([
  ['writing file', 'write calls', 'covered by'],
  ...result.coverage.map((c) => [c.file, c.writeCalls, c.rows.length ? `row ${c.rows.join(', ')}` : c.allowlisted ? `allowlist ${c.allowlisted}` : 'NOTHING']),
]);
line('');
const census: Array<Array<string | number>> = [['free-text handoff key', 'declared', 'schema', 'verdict']];
for (const [k, n] of Object.entries(result.census.keys)) {
  const d = reg.envelope_free_text.keys[k]?.count;
  census.push([k, d ?? 'not declared', n, d === n ? 'ok' : 'MISMATCH']);
}
for (const [b, n] of Object.entries(result.census.per_boundary)) {
  const d = reg.envelope_free_text.boundary_payload.per_boundary[b];
  census.push([`boundary_payload ${b}`, d ?? 'not declared', n, d === n ? 'ok' : 'MISMATCH']);
}
table(census);

const reaching = reg.surfaces.filter((s) => s.read_back.some((r) => REACHING.has(r.reaches)));
line('');
rows([
  ['surfaces registered', reg.surfaces.length],
  ['reach an agent or a session', reaching.length],
  ['reach one and nothing watches them', reaching.filter((s) => !s.watched_by.length).map((s) => s.id).join(', ') || 'none'],
  ['reach one and a rewrite would go unnoticed', reaching.filter((s) => !s.tamper_evident).map((s) => s.id).join(', ') || 'none'],
  ['findings', result.findings.length],
]);

if (result.findings.length) {
  line('');
  for (const f of result.findings) line(`  [${f.check}] ${f.file ?? f.surface ?? ''}${f.file || f.surface ? ': ' : ''}${f.detail}`);
  line('');
  line(`WRITE_SURFACE: FAIL — ${result.findings.length} finding(s). Exit ${EXIT_FINDINGS}.`);
  process.exit(EXIT_FINDINGS);
}

line('');
line('WRITE_SURFACE: PASS — every writing file sits on a row or an allowlisted path, every anchor is in the file its');
line('row names, no allowlisted file aims a write at a prompt-reaching path, and every free-text handoff key is');
line(`declared at the count the schema has. Exit ${EXIT_OK}.`);
line('Nothing above reached a network, a key or a model.');
process.exit(EXIT_OK);
