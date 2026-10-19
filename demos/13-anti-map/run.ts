// Demo 13: hallucination risk is scored where the model cannot check itself, every factor is logged beside the
// risk, and the record says it routed nothing. See README.md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ClaimGroundingSchema,
  ExperientialRegionSchema,
  GroundingRegionSchema,
  RewardBiasKindSchema,
} from '../../contracts/types/governance/anti-map';
import { NO_TAGGED_CLAIMS_REASON, logLine, priorFindings, scoreHandoff, seedCells } from './scorer';
import { heading, line, rows, table } from '../lib/print';

const NOW = '2026-10-18T00:00:00.000Z';
const handoff = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'handoff.json'), 'utf8')) as {
  epistemic: { claims: Array<{ text: string; extension?: Record<string, unknown> }> };
};
const claims = handoff.epistemic.claims;

const checks: Array<[string, boolean, string]> = [];
const check = (name: string, held: boolean, detail: string): void => void checks.push([name, held, detail]);

heading('1. Seven regions, and a claim the contract refuses');
const experiential = ExperientialRegionSchema.options;
const regions = GroundingRegionSchema.options.flatMap((o) => ('options' in o ? o.options : [o.value]));
rows([
  ['what the model never experiences', experiential.join(', ')],
  ['what it was rewarded to say anyway', `reward_bias: ${RewardBiasKindSchema.options.join(', ')}`],
]);
check('seven grounding regions: six experiential and one reward bias', regions.length === 7 && experiential.length === 6, `${regions.length} regions`);

line('');
line('  A claim declares its region, whether it was anchored to something concrete, and, when it was not,');
line('  what it assumed. Each claim in the fixture handoff, read against the contract alone:');
line('');
const verdicts = claims.map((c, i) => {
  if (!c.extension) return [String(i), '—', 'no grounding declared', c.text];
  const r = ClaimGroundingSchema.safeParse(c.extension);
  return [String(i), String(c.extension.region ?? 'null'), r.success ? 'accepted' : `refused: ${r.error.issues[0].message}`, c.text];
});
table([['claim', 'region', 'contract', 'text'], ...verdicts]);
const unanchoredWithAssumption = ClaimGroundingSchema.safeParse(claims[0].extension).success;
const unanchoredSilent = ClaimGroundingSchema.safeParse(claims[5].extension).success;
check('an unanchored claim that states its assumption is accepted', unanchoredWithAssumption, 'claim 0, magnitude');
check('an unanchored claim that states no assumption is refused', !unanchoredSilent, 'claim 5, friction');

heading('2. The store holds priors and nothing learned');
const cells = seedCells(NOW);
table([
  ['region', 'alpha', 'beta', 'prior mean', 'observations'],
  ...cells.map((c) => [c.region, c.alpha, c.beta, (c.alpha / (c.alpha + c.beta)).toFixed(2), c.n_obs]),
]);
line('');
line('  One weak prior per region, alpha + beta = 10, so data would wash it out. Nothing writes a learned');
line('  cell yet, and the store is held to exactly these seven.');
const findings = priorFindings(cells);
check('the store is exactly the seven prior cells, with no observations', findings.length === 0 && cells.every((c) => c.n_obs === 0), findings.length ? findings[0] : '7 cells, 0 observations');

heading('3. One handoff, scored');
line('  The prompt this handoff answered is taken to carry a leading frame, so an unanchored claim that');
line('  declares no gap carries the 1.4 factor.');
line('');
const log = scoreHandoff({
  payload: handoff,
  store: { path: 'build-log/anti-map/cells.json', cells },
  agentId: 'demo.agent-research-synthesizer',
  taskType: 'RESEARCH_TO_SYNTHESIS',
  leadingFrameInPrompt: true,
  now: NOW,
});
table([
  ['claim', 'region', 'prior', '× anchored', '× sparsity', '× stance', '× frame', 'risk'],
  ...log.scored.map((s) => [
    s.claim_index, s.region, s.posterior_mean, s.multipliers.anchored, s.multipliers.sparsity,
    s.multipliers.stance_inherited, s.multipliers.leading_frame_undeclared, s.risk,
  ]),
]);
line('');
line(`  ${logLine(log)}`);
for (const d of log.unscored.details ?? []) line(`    ${d}`);
line('');
rows([['routes', log.routes]]);

const product = (s: (typeof log.scored)[number]): number =>
  Math.round(s.posterior_mean * s.multipliers.anchored * s.multipliers.sparsity * s.multipliers.stance_inherited * s.multipliers.leading_frame_undeclared * 1e6) / 1e6;
check('every logged risk is the product of its logged factors', log.scored.every((s) => product(s) === s.risk), `${log.scored.length} re-derived by hand`);
check('three claims scored, three counted with a reason', log.scored.length === 3 && log.unscored.count === 3, `scored ${log.scored.length}, unscored ${log.unscored.count}`);
check(
  'the refused claim is logged with its issue, not dropped',
  (log.unscored.details ?? []).some((d) => d.startsWith('claim 5') && d.includes('assumed_default')),
  log.unscored.details?.[0] ?? 'no details',
);
const byRisk = [...log.scored].sort((a, b) => b.risk - a.risk);
check(
  'the inherited stance ranks first and the anchored claim last',
  byRisk[0]?.region === 'reward_bias' && byRisk[byRisk.length - 1]?.region === 'duration',
  byRisk.map((s) => `${s.region} ${s.risk}`).join(' > '),
);
check('the record says it routed nothing', log.routes === 'nothing', `routes: ${log.routes}`);

heading('4. What a real run logs today');
line('  No claim in a real handoff carries a region tag yet, because the tagger is not built. The scorer');
line('  says so rather than printing a clean zero:');
line('');
const untagged = scoreHandoff({
  payload: { epistemic: { claims: claims.map(({ text }) => ({ text })) } },
  store: { path: 'build-log/anti-map/cells.json', cells },
  agentId: 'demo.agent-research-synthesizer',
  taskType: 'RESEARCH_TO_SYNTHESIS',
  leadingFrameInPrompt: null,
  now: NOW,
});
line(`  ${logLine(untagged)}`);
check(
  'a handoff with no tagged claim logs zero and says why',
  untagged.scored.length === 0 && untagged.unscored.reason.includes(NO_TAGGED_CLAIMS_REASON),
  `${untagged.claims_seen} seen, ${untagged.scored.length} scored`,
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
