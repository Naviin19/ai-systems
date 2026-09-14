// Demo 6: the evidence under judgement was committed before the judge saw it, and a judge never reads evidence that
// moved after its commitment. Every check here is the factory's own code, extracted: see README.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EvidenceCommitmentSchema } from '../../contracts/types/shared/index';
import { collectEvidenceEntries, commitHandoffEvidence, type EvidenceCommitment } from './evidence-commitment';
import { runCrossFamilyPass, type CrossFamilyRejection } from './cross-family-pass';
import { parseJudgeReply, type CrossFamilyVerdict } from './cross-family-verify';
import { heading, line, rows, short } from '../lib/print';

const DIR = join(import.meta.dirname, 'fixtures');
const COMMITTED_AT = new Date('2026-09-14T00:00:00.000Z');

type Envelope = Record<string, unknown> & { handoff_boundary: string; producing_agent_id: string; step_attestations: Array<Record<string, unknown>> };
/** The orchestrator's handoff object: the emitted envelope sits under `payload`. */
type Handoff = { payload: Envelope };
const readEnvelope = (): Envelope => JSON.parse(readFileSync(join(DIR, 'handoff.json'), 'utf8')) as Envelope;
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

// The emission step. The orchestrator commits an agent's evidence the moment it emits, before any gate or judge
// reads it. `--commit` re-creates fixtures/commitment.json from the fixture as committed; it is not part of a run.
if (process.argv.includes('--commit')) {
  const envelope = readEnvelope();
  delete envelope.evidence_commitment;
  const commitment = commitHandoffEvidence(envelope, COMMITTED_AT);
  writeFileSync(join(DIR, 'commitment.json'), JSON.stringify(commitment, null, 2) + '\n');
  console.log(`committed ${commitment.entry_count} entries, root ${commitment.root_hash}`);
  process.exit(0);
}

const committed: EvidenceCommitment = EvidenceCommitmentSchema.parse(JSON.parse(readFileSync(join(DIR, 'commitment.json'), 'utf8')));
const recording = JSON.parse(readFileSync(join(DIR, 'judge-reply.json'), 'utf8')) as { model: string; raw_reply: string };
const agent = readEnvelope().producing_agent_id;
const boundary = readEnvelope().handoff_boundary;
const taskContext = 'The handoff this agent emitted, judged on its own terms.';

/** The judge, replayed. The first read gets the reply the factory recorded for this handoff. A later read has no
 *  recording, so it answers ERROR, which the pass treats the way the factory treats any judge it cannot consult. */
function replayJudge(): () => Promise<CrossFamilyVerdict> {
  let reads = 0;
  return async () => {
    const base = { judge_model: recording.model, walltime_ms: 0, input_tokens: 0, output_tokens: 0 };
    if (reads++ > 0) return { ...base, verdict: 'ERROR', defect: '', error: 'no recorded reply for this re-run' };
    const content = (JSON.parse(recording.raw_reply) as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
    const parsed = parseJudgeReply(content);
    if (!parsed) return { ...base, verdict: 'ERROR', defect: '', error: 'unparseable recorded reply' };
    return { ...base, ...parsed };
  };
}

/** The handoff as its agent emitted it: the evidence, carrying the commitment made at emission. */
const emitted = (): Handoff => ({ payload: { ...readEnvelope(), evidence_commitment: clone(committed) } });

heading('1. The commitment, made at emission');
rows([
  ['handoff', `${agent} → ${boundary}`],
  ['entries', `${committed.entry_count} step attestations`],
  ['root hash', committed.root_hash],
  ['committed at', committed.committed_at],
]);
for (const e of committed.entries.slice(0, 3)) line(`  ${e.id.padEnd(8)} ${short(e.hash)}`);
line(`  … and ${committed.entry_count - 3} more`);

heading('2. The judge reads only evidence that still matches');
const events: Array<[string, Record<string, unknown>]> = [];
try {
  const result = await runCrossFamilyPass<Handoff>({
    agentId: agent,
    boundary,
    mode: 'WARN',
    taskContext,
    runProposer: async () => emitted(),
    judge: replayJudge(),
    emit: (type, payload) => events.push([type, payload]),
  });
  const v = result.verdicts[0];
  rows([
    ['commitment', 'verified: no committed entry changed, none added, none removed'],
    ['judge', `invoked (${v.judge_model}, reply replayed from the factory's recording)`],
    ['verdict', `${v.verdict}${v.severity ? ` [${v.severity}]` : ''}`],
    ['defect', v.defect],
    ['bound to', `root ${short(committed.root_hash)}: the judge read exactly the committed evidence`],
  ]);
} catch (e) {
  const message = (e as Error).message;
  if (!message.startsWith('EVIDENCE_COMMITMENT_MISMATCH:')) throw e;
  const now = new Map(collectEvidenceEntries(readEnvelope()).map((x) => [x.id, x.hash]));
  const mismatch = events.find(([t]) => t === 'EVIDENCE_COMMITMENT_MISMATCH')?.[1] as { changed?: string[]; added?: string[]; removed?: string[] };
  line('  refused before the judge:');
  for (const id of mismatch.changed ?? []) {
    rows([['artefact', `${id} in fixtures/handoff.json`], ['expected hash', committed.entries.find((x) => x.id === id)!.hash], ['received hash', now.get(id) ?? '(gone)']]);
  }
  for (const id of mismatch.added ?? []) line(`  added after commitment: ${id}`);
  for (const id of mismatch.removed ?? []) line(`  removed after commitment: ${id}`);
  line(`\n  ${message.replace(/^EVIDENCE_COMMITMENT_MISMATCH: \S+ /, '').replace(/ \(changed.*$/, '')}`);
  process.exit(1);
}

heading('3. After a REJECT, what the re-run may do');
line('  In BLOCK mode a REJECT re-runs the agent once, and the re-run is told its committed entries as committed.');
const reruns: Array<[string, (h: Envelope) => void]> = [
  ['cites committed evidence: re-emits every entry exactly', () => {}],
  ['does new work: re-executes step 3 under agent_cycle 2', (h) => { h.step_attestations[0] = { ...h.step_attestations[0], agent_cycle: 2, claimed_status: 'PASS', evidence: 'Re-ran the pre-flight with the spec present: test -f verification/spec-validation.json exited 0.' }; }],
  ['new justification for an old claim: rewrites step 3, same cycle', (h) => { h.step_attestations[0] = { ...h.step_attestations[0], evidence: 'The inputs were in fact confirmed, so the pre-flight should count as passed.' }; }],
];
for (const [label, edit] of reruns) {
  let told = '';
  try {
    const result = await runCrossFamilyPass<Handoff>({
      agentId: agent,
      boundary,
      mode: 'BLOCK',
      taskContext,
      runProposer: async (rejection?: CrossFamilyRejection) => {
        if (!rejection) return emitted();
        told = rejection.human_notes.split('\n').find((l) => l.startsWith('COMMIT-BEFORE-INTERROGATION')) ?? '';
        const rerun = readEnvelope();
        delete rerun.evidence_commitment;
        edit(rerun);
        return { payload: rerun };
      },
      judge: replayJudge(),
    });
    const v = result.verdicts[1];
    line(`\n  ${label}\n    allowed: the judge reads the re-run (${v.verdict}: ${v.error ?? v.defect})`);
  } catch (e) {
    const message = (e as Error).message;
    if (!message.startsWith('EVIDENCE_REJUSTIFIED:')) throw e;
    line(`\n  ${label}\n    refused: ${message.replace(/^EVIDENCE_REJUSTIFIED: \S+ /, '').replace(/\. halt-reason.*$/, '')}`);
  }
  if (told && label.startsWith('cites')) line(`    the re-run was told: ${told.slice(0, 118)}…`);
}

line('\nEvidence was frozen before it was judged: a verdict here can only be about what was committed.');
