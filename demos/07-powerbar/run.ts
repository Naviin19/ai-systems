// Demo 7: input quality is scored while the user types, and the interface does not depend on a model being
// reachable. Every scorer, gate and question below is the product's own code, extracted: see README.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PowerEvalSchema, fallbackEval, type EvalSource } from './power-eval';
import { LOCK_ON_THRESHOLD, SHARPEN_QUESTIONS, computeLockOn, nextQuestion } from './sharpening';
import { heading, line, rows, table } from '../lib/print';

const briefs = (JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'briefs.json'), 'utf8')) as {
  briefs: Array<{ label: string; text: string }>;
}).briefs;

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, held: boolean, detail: string): void => {
  checks.push([name, held, detail]);
};

/**
 * When no question is on screen, say which reason it is. A question can be withheld because the brief is
 * still too short to have earned it, or because its slot is already filled. Those are different facts about
 * the brief, and reporting them as one would be the exact overclaim this interface exists to avoid.
 */
const whyNone = (brief: string, answers: Record<string, string>): string => {
  let short = 0;
  let filled = 0;
  for (const q of SHARPEN_QUESTIONS) {
    if (q.id in answers) continue;
    if (q.when(brief)) return '';
    // Re-ask the gate with a brief long enough to clear every length threshold: if it would fire then, the
    // only thing holding it back here was length.
    if (q.when(brief.padEnd(400, ' '))) short++;
    else filled++;
  }
  const parts: string[] = [];
  if (short) parts.push(`${short} below the gates`);
  if (filled) parts.push(`${filled} already answered in the brief`);
  return `— none (${parts.join(', ')})`;
};

/** The bar the user watches fill. Twenty cells, and the threshold marked where the launch gate sits. */
const bar = (score: number): string => {
  const cells = 20;
  const filled = Math.round((score / 100) * cells);
  const gate = Math.round((LOCK_ON_THRESHOLD / 100) * cells);
  let out = '';
  for (let i = 0; i < cells; i++) out += i < filled ? '#' : i === gate ? '|' : '.';
  return out;
};

heading('1. The ladder, with the model switched off');
line('  Each brief scored by the deterministic path alone. The bar fills, the gate at 35 is marked |,');
line('  and one question is offered at a time — never a form.');
line('');
const ladder: Array<Array<string | number>> = [['brief', 'chars', 'bar', 'lock-on', 'launch?', 'next question']];
for (const b of briefs) {
  const graded = fallbackEval(b.text);
  const lock = computeLockOn(b.text, {}, graded.power_score);
  const q = nextQuestion(b.text, {});
  ladder.push([
    b.label,
    b.text.length,
    bar(lock),
    lock,
    lock >= LOCK_ON_THRESHOLD ? 'yes' : 'no',
    q ? `${q.id} (+${q.weight})` : whyNone(b.text, {}),
  ]);
}
table(ladder);

heading('2. One question, and what answering it buys');
const weak = briefs[1];
const first = nextQuestion(weak.text, {});
if (!first) throw new Error('fixture drift: the vague brief must still have an empty slot to ask about');
rows([
  ['on screen', first.q],
  ['worth', `+${first.weight} points`],
  ['unlocks', first.unlocks],
  ['options', first.options ? first.options.map((o) => o.label).join(' / ') : 'free text'],
]);
const before = computeLockOn(weak.text, {}, fallbackEval(weak.text).power_score);
const after = computeLockOn(weak.text, { [first.id]: 'Tata Capital' }, fallbackEval(weak.text).power_score);
line('');
line(`  answering it moves lock-on ${before} -> ${after}, and the next card slides in`);
check('answering a question raises lock-on', after > before, `${before} -> ${after}`);

heading('3. The same shape whether or not a model ran');
line('  The route has four paths. All four return this contract, which is why each response carries a tag');
line('  saying which one produced it — the payloads alone cannot tell you.');
line('');
const sources: EvalSource[] = ['llm', 'cache', 'fallback', 'fallback_after_llm_error'];
const parsed = PowerEvalSchema.safeParse(fallbackEval(briefs[3].text));
rows([
  ['paths sharing the contract', sources.join(', ')],
  ['deterministic output parses', parsed.success ? 'yes' : `NO — ${parsed.error?.message.slice(0, 80)}`],
  ['fields', parsed.success ? Object.keys(parsed.data).join(', ') : '—'],
  ['questions when no model ran', parsed.success ? String(parsed.data.questions.length) : '—'],
  ['brand resolved when no model ran', parsed.success ? String(parsed.data.resolved_target) : '—'],
]);
check('the model-off path satisfies the same contract', parsed.success, 'PowerEvalSchema.safeParse');

heading('4. The strongest signal wins, and answers are never required');
line('  Lock-on takes max(length signal, semantic signal). A dense short brief must reach the gate on the');
line('  strength of what it says, without being made to answer anything.');
line('');
const dense = briefs[4];
const charLevel = Math.min(100, Math.floor(dense.text.length / 4));
const SEMANTIC = 82; // what the grader returns for a brief this dense; the formula is what is under test
const unaided = computeLockOn(dense.text, {}, SEMANTIC);
rows([
  ['brief', `"${dense.text.slice(0, 60)}…"`],
  ['length signal', String(charLevel)],
  ['semantic signal', String(SEMANTIC)],
  ['lock-on, nothing answered', String(unaided)],
  ['launches unaided', unaided >= LOCK_ON_THRESHOLD ? 'yes' : 'NO'],
]);
check(
  'a dense short brief launches with no questions answered',
  unaided >= LOCK_ON_THRESHOLD && unaided === Math.max(charLevel, SEMANTIC),
  `max(${charLevel}, ${SEMANTIC}) = ${unaided}, gate ${LOCK_ON_THRESHOLD}`,
);

heading('5. It does not ask what the brief already answered');
line('  A question surfaces only when its slot is empty AND the brief is long enough to have earned it. The');
line('  char gates were raised after the originals were seen firing while the user was still on word four.');
line('');
const named = briefs[2];
const asked = new Set<string>();
let remaining: Record<string, string> = {};
for (let i = 0; i < SHARPEN_QUESTIONS.length; i++) {
  const q = nextQuestion(named.text, remaining);
  if (!q) break;
  asked.add(q.id);
  remaining = { ...remaining, [q.id]: 'answered' };
}
rows([
  ['brief names', 'Tata Capital'],
  ['target-name asked', asked.has('target-name') ? 'YES' : 'no — the slot is already filled'],
  ['questions it would ask', [...asked].join(', ') || 'none'],
]);
check('a brief that names its target is never asked for it', !asked.has('target-name'), 'target-name slot filled');

const gated = SHARPEN_QUESTIONS.filter((q) => !q.when(briefs[0].text));
check(
  'a first draft is not pestered',
  gated.length === SHARPEN_QUESTIONS.length,
  `${gated.length}/${SHARPEN_QUESTIONS.length} questions withheld at ${briefs[0].text.length} chars`,
);

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
