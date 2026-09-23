// Demo 9: a signal that had nothing to score on returns null, not zero — and the composite renormalises
// over the signals that reported rather than averaging in a number nobody measured. See README.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SIGNAL_TYPES,
  SignalResultSchema,
  THRESHOLD_CLOSING,
  THRESHOLD_OPENING,
  VENDOR_PROXY_CAVEAT,
  WEIGHTS,
  classify,
  compositeIfAbstentionWereZero,
  compositeScore,
  type SignalResult,
} from './composite';
import { heading, line, rows, table } from '../lib/print';

const fixture = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'cluster.json'), 'utf8')) as {
  cluster: string;
  signals: unknown[];
};

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, held: boolean, detail: string): void => void checks.push([name, held, detail]);

heading('1. Six signals, and null is a legal answer');
const parsed = SignalResultSchema.array().safeParse(fixture.signals);
if (!parsed.success) {
  line(`the fixture does not satisfy the signal contract: ${parsed.error.message.slice(0, 200)}`);
  process.exit(1);
}
const signals: SignalResult[] = parsed.data;
check('every signal satisfies the contract', true, `${signals.length} signals parsed`);
check('all six signal types are present', signals.length === SIGNAL_TYPES.length, `${signals.length}/${SIGNAL_TYPES.length}`);

table([
  ['signal', 'weight', 'score', 'state', 'why'],
  ...signals.map((s) => [
    s.signal_type,
    WEIGHTS[s.signal_type].toFixed(2),
    s.score === null ? 'null' : String(s.score),
    s.abstained ? 'abstained' : s.fired ? 'fired' : 'scored',
    s.abstain_reason ?? '—',
  ]),
]);

const abstaining = signals.filter((s) => s.abstained);
line('');
line(`  ${abstaining.length} of ${signals.length} signals abstained, each with a stated reason. Nothing guessed a value.`);
check('an abstention always carries a reason', abstaining.every((s) => !!s.abstain_reason), `${abstaining.length} with reasons`);
check('an abstention never carries a score', abstaining.every((s) => s.score === null), 'score === null');

heading('2. The composite renormalises over what reported');
const { composite, breakdown } = compositeScore(signals);
const liveWeight = signals.filter((s) => !s.abstained).reduce((a, s) => a + WEIGHTS[s.signal_type], 0);
rows([
  ['signals that reported', `${signals.length - abstaining.length} of ${signals.length}`],
  ['their weight before renormalising', liveWeight.toFixed(2)],
  ['composite', String(composite)],
  ['window status', classify(composite)],
  ['thresholds', `open ${THRESHOLD_OPENING}, closing ${THRESHOLD_CLOSING}`],
]);
line('');
line('  The breakdown still lists all six. A reader sees what was not measured instead of inferring it');
line('  from a low number:');
line('');
line(`  ${JSON.stringify(breakdown)}`);
check(
  'the breakdown lists every signal, abstentions included',
  Object.keys(breakdown).length === SIGNAL_TYPES.length && abstaining.every((s) => breakdown[s.signal_type] === null),
  `${Object.keys(breakdown).length} keys, abstained slots null`,
);

heading('3. What the ordinary handling would have produced');
line('  Folding a missing number in as a zero is the usual move. Here is what it costs on this cluster.');
line('');
const asZero = compositeIfAbstentionWereZero(signals);
const statusZero = classify(asZero);
table([
  ['treatment', 'composite', 'window status'],
  ['abstention renormalised (this system)', String(composite), classify(composite)],
  ['abstention counted as zero', String(asZero), statusZero],
]);
line('');
line(`  A gap in collection would have read as ${composite - asZero} points of evidence against the market,`);
line(`  and moved the verdict from "${classify(composite)}" to "${statusZero}". The two signals that abstained`);
line('  are missing because credentials are not set, which says nothing whatsoever about the category.');
check(
  'treating an abstention as zero changes the verdict',
  asZero < composite && statusZero !== classify(composite),
  `${composite} (${classify(composite)}) vs ${asZero} (${statusZero})`,
);

heading("4. The vendor's limitation travels verbatim");
line('  The metric behind the heaviest signal is a vendor proxy. The sentence saying so is declared once');
line('  and carried into every artifact, byte for byte, so it cannot soften as it travels.');
line('');
const carried = signals.find((s) => s.signal_type === 'difficulty_lag')!;
const inEvidence = carried.evidence.vendor_proxy_caveat;
const identical = inEvidence === VENDOR_PROXY_CAVEAT;
rows([
  ['declared once as', `${VENDOR_PROXY_CAVEAT.slice(0, 64)}…`],
  ['length of the constant', `${VENDOR_PROXY_CAVEAT.length} characters`],
  ['length as it arrives in evidence', typeof inEvidence === 'string' ? `${inEvidence.length} characters` : 'absent'],
  ['byte-equal', identical ? 'yes' : 'NO — it changed on the way'],
  ['weight of the signal it qualifies', WEIGHTS.difficulty_lag.toFixed(2)],
]);
check(
  'the caveat arrives byte-equal to the constant it was declared as',
  identical,
  identical ? `${VENDOR_PROXY_CAVEAT.length} characters, unchanged` : 'the carried copy differs from the declaration',
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
