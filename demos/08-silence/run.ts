// Demo 8: a detector for failures whose failed state is byte-identical to their healthy state — and the four
// guards that stop the detector becoming the very defect it hunts. See README.md for what was extracted.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RULES, siteHash, type SilenceSite } from './rules';
import { heading, line, rows, table } from '../lib/print';

const HERE = import.meta.dirname;
const FIXTURES = join(HERE, 'fixtures');
const CORPUS = join(FIXTURES, 'corpus');
const KNOWN_POSITIVE = join(FIXTURES, 'known-positive');

const EXIT_OK = 0;
const EXIT_NEW_SITES = 1;
const EXIT_DETECTOR_BROKEN = 2;

const walk = (dir: string, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
};

const scan = (ruleId: string, files: string[]): SilenceSite[] => {
  const rule = RULES.find((r) => r.id === ruleId)!;
  const sites: SilenceSite[] = [];
  for (const file of files) {
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((text, i) => {
        if (!rule.match(text)) return;
        sites.push({
          ruleId,
          hash: siteHash(ruleId, text),
          file: relative(HERE, file).replace(/\\/g, '/'),
          line: i + 1,
          excerpt: text.trim().slice(0, 62),
        });
      });
  }
  return sites;
};

heading('The class of defect being hunted');
for (const r of RULES) line(`  ${r.id.padEnd(30)} ${r.silence}`);

// ── Guard 1 ────────────────────────────────────────────────────────────────────────────────────────
// Every rule must catch its own planted defect before the corpus is touched. A rule that finds nothing
// in its own fixture cannot be allowed to report a clean corpus.
heading('Guard 1 — self-test first: every rule catches its own planted defect');
const selfTest: Array<Array<string | number>> = [['rule', 'fixture hits', 'verdict']];
let detectorBroken = false;
for (const rule of RULES) {
  const dir = join(KNOWN_POSITIVE, rule.id);
  if (!existsSync(dir)) {
    detectorBroken = true;
    selfTest.push([rule.id, '—', 'NO FIXTURE — a rule without a known positive cannot prove it works']);
    continue;
  }
  const hits = scan(rule.id, walk(dir));
  if (hits.length === 0) {
    detectorBroken = true;
    selfTest.push([rule.id, 0, 'THE MATCHER IS BROKEN']);
  } else {
    selfTest.push([rule.id, hits.length, 'alive']);
  }
}
table(selfTest);

if (detectorBroken) {
  line('');
  line('SELF_TEST_FAILED — refusing to scan the corpus.');
  line('A detector that cannot catch a defect it planted itself would report this corpus clean, and that');
  line('report would be indistinguishable from a corpus that really is clean. Exit 2: could not run.');
  process.exit(EXIT_DETECTOR_BROKEN);
}

// ── Guard 2 ────────────────────────────────────────────────────────────────────────────────────────
// Every rule declares a corpus floor. A collapsed glob fails loudly instead of passing quietly.
heading('Guard 2 — corpus floor: a collapsed scan fails loudly');
const files = walk(CORPUS);
const floorRows: Array<Array<string | number>> = [['rule', 'files scanned', 'floor', 'verdict']];
let floorBreached = false;
for (const rule of RULES) {
  const ok = files.length >= rule.filesScannedMin;
  if (!ok) floorBreached = true;
  floorRows.push([rule.id, files.length, rule.filesScannedMin, ok ? 'ok' : 'CORPUS FLOOR BREACHED']);
}
table(floorRows);
if (floorBreached) {
  line('');
  line('CORPUS_FLOOR_BREACHED — the scan found fewer files than the rule requires. Exit 2: could not run.');
  process.exit(EXIT_DETECTOR_BROKEN);
}

// ── The scan ───────────────────────────────────────────────────────────────────────────────────────
heading('The scan');
const found: Record<string, SilenceSite[]> = {};
for (const rule of RULES) found[rule.id] = scan(rule.id, files);
const scanRows: Array<Array<string | number>> = [['rule', 'sites', 'where']];
for (const rule of RULES) {
  const sites = found[rule.id];
  scanRows.push([
    rule.id,
    sites.length,
    sites.length ? sites.map((s) => `${s.file}:${s.line}`).join(', ') : 'none in this corpus',
  ]);
}
table(scanRows);
line('');
for (const rule of RULES) {
  for (const s of found[rule.id]) line(`  ${s.hash}  ${s.file}:${s.line}  ${s.excerpt}`);
}

// Writing a baseline is only reachable here — after the self-test and the floor. A baseline written by a
// broken detector would forgive nothing and hide everything, so the guards come first by construction.
if (process.argv.includes('--write-baseline')) {
  const rules: Record<string, { count: number; hashes: string[] }> = {};
  for (const rule of RULES) rules[rule.id] = { count: found[rule.id].length, hashes: found[rule.id].map((s) => s.hash) };
  writeFileSync(
    join(FIXTURES, 'baseline.json'),
    JSON.stringify(
      { _readme: 'Sites accepted the day the ratchet was switched on. Keyed by normalised content, never file:line.', generatedAt: '2026-09-21', rules },
      null,
      2,
    ) + '\n',
  );
  line('');
  line(`wrote baseline.json: ${Object.entries(rules).map(([k, v]) => `${k}=${v.count}`).join(', ')}`);
  process.exit(EXIT_OK);
}

line('');
line('  Note the third rule: zero sites, and that is a result, not a failure. Zero findings AFTER a real');
line('  scan means the corpus is clean of that class. Zero findings in a rule\'s OWN fixture means the');
line('  rule is broken. Guard 1 is the only thing that tells those two zeroes apart.');

// ── Guard 3 ────────────────────────────────────────────────────────────────────────────────────────
// A count that drops further than the fixes explicitly accepted is treated as breakage, not victory.
heading('Guard 3 — count collapse: a rule that suddenly matches nothing is broken, not victorious');
const baseline: Record<string, { count: number; hashes: string[] }> = JSON.parse(
  readFileSync(join(FIXTURES, 'baseline.json'), 'utf8'),
).rules;
const acceptedFixes = new Set<string>(); // nothing accepted this run
const collapseRows: Array<Array<string | number>> = [['rule', 'baseline', 'now', 'accepted fixes', 'verdict']];
let collapsed = false;
for (const rule of RULES) {
  const was = baseline[rule.id]?.count ?? 0;
  const now = found[rule.id].length;
  const allowedDrop = acceptedFixes.size;
  const bad = was - now > allowedDrop;
  if (bad) collapsed = true;
  collapseRows.push([rule.id, was, now, allowedDrop, bad ? 'COUNT_COLLAPSE' : 'ok']);
}
table(collapseRows);
if (collapsed) {
  line('');
  line('COUNT_COLLAPSE — a count fell further than this run accepted fixes for. Exit 2: could not run.');
  process.exit(EXIT_DETECTOR_BROKEN);
}

// ── Guard 4 ────────────────────────────────────────────────────────────────────────────────────────
heading('Guard 4 — no skip-as-pass');
rows([
  ['paths that return 0 without scanning', '0'],
  ['exit when a matcher is broken', `${EXIT_DETECTOR_BROKEN} — could not run, never a pass`],
  ['exit when a new site appears', `${EXIT_NEW_SITES}`],
  ['exit when every site is already in the baseline', `${EXIT_OK}`],
]);

// ── The ratchet ────────────────────────────────────────────────────────────────────────────────────
heading('The ratchet');
line('  Existing sites stay legal; a new one is impossible. On the day it is switched on it blocks nothing');
line('  that exists and everything new — because a gate that fails on day one gets disabled.');
line('');
const known = new Set(Object.values(baseline).flatMap((b) => b.hashes));
const novel = RULES.flatMap((r) => found[r.id]).filter((s) => !known.has(s.hash));
rows([
  ['sites in the baseline', String(known.size)],
  ['sites found now', String(RULES.reduce((n, r) => n + found[r.id].length, 0))],
  ['new since the baseline', String(novel.length)],
]);

if (novel.length) {
  line('');
  for (const s of novel) line(`  NEW  ${s.hash}  ${s.file}:${s.line}  ${s.excerpt}`);
  line('');
  line(`Exit ${EXIT_NEW_SITES}: a silence that was not there before.`);
  process.exit(EXIT_NEW_SITES);
}

line('');
line('Every site found is one the baseline already carries. Exit 0.');
line('Nothing above reached a network, a key or a model.');
