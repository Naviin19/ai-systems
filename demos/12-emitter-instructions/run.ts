// Demo 12: an agent is not told to fetch data it has no route to. A playbook line that needs a shell to
// touch a file is found, classed by whether the agent can reach that data at all, and checked against the
// inventory of what is already on record. The detector proves it fires on a planted order before it reads
// the playbook. See README.md for what was extracted.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { accountedFor, classify, scanStepFile, type Hit, type Inventory, type RouteClass } from './rules';
import { heading, line, rows, table } from '../lib/print';

const HERE = import.meta.dirname;
const FIXTURES = join(HERE, 'fixtures');

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_DETECTOR_BROKEN = 2;

interface Finding extends Hit {
  klass: RouteClass;
}

const load = (dir: string): { agent: string; playbook: string; inventory: Inventory } => {
  const inventory = JSON.parse(readFileSync(join(FIXTURES, dir, 'inventory.json'), 'utf8')) as Inventory;
  const playbook = readFileSync(join(FIXTURES, dir, `${inventory.agent}-steps.md`), 'utf8');
  return { agent: inventory.agent, playbook, inventory };
};

/** Every filesystem instruction the inventory does not account for, with its class. */
const run = (agent: string, playbook: string, inventory: Inventory): { hits: Hit[]; findings: Finding[] } => {
  const hits = scanStepFile(playbook);
  const findings = hits
    .filter((h) => !accountedFor(h, inventory.evidence))
    .map((h) => ({ ...h, klass: classify(h, agent) }));
  return { hits, findings };
};

heading('The class of defect being hunted');
line('  An emitter-path agent receives its playbook as its whole prompt and holds tools that open no file.');
line('  A line in that playbook that needs a shell to touch a file is an order the agent cannot perform.');
line('  Each one is classed by one mechanical question: can this agent reach that data at all?');
line('');
rows([
  ['NO_ROUTE', 'no route exists; the line needs a decision about where the data comes from'],
  ['WRONG_ROUTE', 'an upstream handoff read by file path; it is already in the prompt as SEED_STATE, so reword'],
  ['SELF_READ', "the agent's own emitted handoff; an emit-time self-check replaces the read"],
]);
line('');
line('  Left alone: a # comment, a prose bullet, and a self-check on the fields the agent emits.');

// ── Self-test ──────────────────────────────────────────────────────────────────────────────────────
// The detector fires on each planted shape, and leaves each non-instruction alone, before any playbook
// is read. A detector that cannot be shown to fire says nothing when it passes.
heading('Self-test first: the detector catches what it planted');
const st = load('self-test');
const planted: Array<{ marker: string; expect: RouteClass | 'not a finding'; why: string }> = [
  { marker: 'already-known', expect: 'not a finding', why: 'the inventory accounts for it' },
  { marker: 'build_clearance', expect: 'not a finding', why: 'a self-check: names no file, needs no shell' },
  { marker: 'commented-out', expect: 'not a finding', why: 'a # comment' },
  { marker: 'next/image', expect: 'not a finding', why: 'a prose bullet: no command span' },
  { marker: 'some-file-that-nobody-produces', expect: 'NO_ROUTE', why: 'a file nothing produces' },
  { marker: 'agent-cc/handoff.json', expect: 'WRONG_ROUTE', why: 'an upstream handoff, read by path' },
  { marker: 'agent-aa/handoff.json', expect: 'SELF_READ', why: "the agent's own handoff" },
];
const first = run(st.agent, st.playbook, st.inventory);
const selfTestRows: Array<Array<string | number>> = [['planted line', 'expected', 'observed', 'verdict']];
let detectorBroken = false;
for (const p of planted) {
  const f = first.findings.find((x) => x.text.includes(p.marker));
  const observed = f ? f.klass : 'not a finding';
  const ok = observed === p.expect;
  if (!ok) detectorBroken = true;
  selfTestRows.push([p.marker, p.expect, observed, ok ? 'ok' : 'THE DETECTOR IS BROKEN']);
}
table(selfTestRows);
if (first.findings.length !== 3) {
  detectorBroken = true;
  line('');
  line(`  expected exactly 3 findings, got ${first.findings.length}`);
}

// A playbook whose every instruction is on record reports nothing.
const cleanTree = run(st.agent, '⚡ Verify: `test -f already-known.md || exit 1`\n', st.inventory);
line('');
rows([
  ['a playbook the inventory fully accounts for', cleanTree.findings.length === 0 ? '0 findings' : `${cleanTree.findings.length} findings — THE DETECTOR IS BROKEN`],
]);
if (cleanTree.findings.length !== 0) detectorBroken = true;

if (detectorBroken) {
  line('');
  line('SELF_TEST_FAILED — refusing to scan the playbook.');
  line('A detector that does not fire on an order it planted itself would report this playbook clean, and');
  line('that report would be indistinguishable from a playbook that is clean. Exit 2: could not run.');
  process.exit(EXIT_DETECTOR_BROKEN);
}
line('');
line('SELF-TEST PASS: a planted unperformable order is caught and classed NO_ROUTE, an upstream handoff');
line('read WRONG_ROUTE, a read of the agent\'s own handoff SELF_READ; an inventoried line, a self-check,');
line('a # comment and a prose bullet are each left alone.');

// ── The scan ───────────────────────────────────────────────────────────────────────────────────────
heading('The scan');
const pb = load('playbook');
const scanned = run(pb.agent, pb.playbook, pb.inventory);
rows([
  ['agent', pb.agent],
  ['playbook', `fixtures/playbook/${pb.agent}-steps.md`],
  ['lines', String(pb.playbook.split(/\r?\n/).length)],
  ['instructions that need a shell to touch a file', String(scanned.hits.length)],
  ['on record in the inventory', String(scanned.hits.length - scanned.findings.length)],
]);
line('');
const scanRows: Array<Array<string | number>> = [['line', 'command', 'file', 'class', 'on record']];
for (const h of scanned.hits) {
  scanRows.push([h.line, h.command, h.file, classify(h, pb.agent), accountedFor(h, pb.inventory.evidence) ? 'yes' : 'NO']);
}
table(scanRows);

if (scanned.findings.length) {
  line('');
  for (const f of scanned.findings) line(`  ${f.klass.padEnd(11)} ${pb.agent}-steps.md:${f.line}  ${f.text}`);
  line('');
  line(`Exit ${EXIT_FINDINGS}: an instruction the agent cannot perform, and the inventory does not carry.`);
  line('Fix the instruction, or bring the inventory level with the playbook. Never widen the detector.');
  process.exit(EXIT_FINDINGS);
}

line('');
line('Every filesystem instruction in the playbook is on record. Exit 0.');
line('Nothing above reached a network, a key or a model.');
process.exit(EXIT_OK);
