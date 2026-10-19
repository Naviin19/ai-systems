// Demo 16: a prompt assembled from fragments can contradict itself while every fragment is correct on its own, so the
// check reads the assembled prompt, and a stale copy of it is UNEVALUATED rather than a pass. See README.md.
import { join } from 'node:path';
import { FRAGMENTS, assemble, readFragments } from './assemble';
import { checkAssembled } from './checks';
import { computeInputHash, gateVerdict } from './gate';
import { heading, line, rows, table } from '../lib/print';

const FIX = join(import.meta.dirname, 'fixtures');
const before = readFragments(join(FIX, 'fragments'));
const after = readFragments(join(FIX, 'fragments'), join(FIX, 'fixed'));

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, held: boolean, detail: string): void => void checks.push([name, held, detail]);
const rulesIn = (text: string, id: string): string[] => checkAssembled(id, text).map((f) => f.rule);
const BOUND = /Max (\d+) cycles?|eligible for (ONE|TWO|\d+) Corrector cycles?|maximum of (\d+)/i;

heading('1. Read one fragment at a time, each states one bound');
const perFragment = FRAGMENTS.map((f) => {
  const bounds = before[f].split('\n').map((l) => l.match(BOUND)?.[0]).filter(Boolean) as string[];
  return { f, bounds, d1: rulesIn(before[f], f).includes('D1-numeric-bound-disagreement') };
});
table([['fragment', 'cycle bound it states', 'D1 on its own'], ...perFragment.map((r) => [r.f, r.bounds.join('; ') || '—', r.d1 ? 'FIRES' : 'clean'])]);
line('');
line('  The kernel says two cycles and the retry rule says one, but no file holds both, so a check that reads');
line('  files one at a time can only ever see one number.');
check('no fragment shows the disagreement on its own', perFragment.every((r) => !r.d1), `${FRAGMENTS.length} fragments clean`);

heading('2. Assembled, the prompt contradicts itself');
const onBefore = assemble(before, 'on');
const d1 = checkAssembled('agent-02', onBefore).find((x) => x.rule === 'D1-numeric-bound-disagreement');
rows([
  ['assembled prompt', `${onBefore.split('\n').length} lines`],
  ['D1', d1 ? d1.message : 'no finding'],
]);
line('');
line('  In the factory the two halves were a skill and a string literal in the orchestrator, 1,962 assembled');
line('  lines apart in every prompt, from 1 June to 6 September. Every per-file gate passed throughout.');
check('assembled, the two bounds are caught disagreeing', !!d1, d1 ? d1.message : 'D1 did not fire');

heading('3. A switch can break a prompt that was whole');
const offBefore = assemble(before, 'off');
const d6On = rulesIn(onBefore, 'agent-02').includes('D6-tool-ordered-undescribed');
const d6Off = checkAssembled('agent-02', offBefore).find((x) => x.rule === 'D6-tool-ordered-undescribed');
table([
  ['steering switch', 'STEERING POINTS block', 'D6'],
  ['on', onBefore.includes('## STEERING POINTS') ? 'present' : 'absent', d6On ? 'FIRES' : 'clean'],
  ['off', offBefore.includes('## STEERING POINTS') ? 'present' : 'absent', d6Off ? 'FIRES' : 'clean'],
]);
line('');
line('  Turning the tool off drops the block that explains it and keeps the order to call it. In the factory,');
line('  25 such orders across 11 playbooks were conditioned on the switch.');
check('with steering on, the steering order is described', !d6On, 'D6 clean');
check('with steering off, an order to call it is caught', !!d6Off, d6Off ? `line ${d6Off.line}` : 'D6 did not fire');

heading('4. The fix, checked on the assembled prompt both ways');
const fixed = (['on', 'off'] as const).map((s) => ({ s, findings: checkAssembled(`agent-02/${s}`, assemble(after, s)) }));
table([['steering switch', 'findings'], ...fixed.map((r) => [r.s, r.findings.map((x) => x.rule).join(', ') || 'none'])]);
line('');
line('  The retry rule now reads the same bound as the kernel, and the order to call the steering tool says what');
line('  to do when the tool is not there.');
check('the fixed prompt is clean with the switch on and off', fixed.every((r) => r.findings.length === 0), '0 findings, both settings');

heading('5. A stale copy is not evidence');
line('  The gate reads a corpus assembled earlier, stamped with a hash of every input. Edit one input after');
line('  assembly and the corpus on disk is no longer what an agent would receive.');
line('');
const corpus = assemble(after, 'on');
const stamp = computeInputHash(after, 'on');
const fresh = gateVerdict(stamp, computeInputHash(after, 'on'), checkAssembled('agent-02', corpus).length);
const edited = { ...after, 'kernel.md': after['kernel.md'].replace('Max 2 cycles', 'Max 3 cycles') };
const stale = gateVerdict(stamp, computeInputHash(edited, 'on'), checkAssembled('agent-02', corpus).length);
const noStamp = gateVerdict(null, computeInputHash(after, 'on'), 0);
table([
  ['corpus', 'findings in the text on disk', 'verdict', 'exit', 'why'],
  ['fresh', checkAssembled('agent-02', corpus).length, fresh.state, fresh.exit, fresh.why],
  ['kernel edited after assembly', checkAssembled('agent-02', corpus).length, stale.state, stale.exit, stale.why],
  ['no stamp', '—', noStamp.state, noStamp.exit, noStamp.why],
]);
line('');
line('  Graded as it stands, the stale text has no finding and would read as a pass. The kernel it was built');
line('  from now says three cycles while the retry rule says two.');
check('a fresh, clean corpus passes', fresh.state === 'PASS', `${fresh.state}, exit ${fresh.exit}`);
check('a stale corpus is UNEVALUATED, never a pass', stale.state === 'UNEVALUATED' && stale.exit === 3, `${stale.state}, exit ${stale.exit}`);
check('a corpus with no stamp is UNEVALUATED', noStamp.state === 'UNEVALUATED' && noStamp.exit === 3, `${noStamp.state}, exit ${noStamp.exit}`);

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
