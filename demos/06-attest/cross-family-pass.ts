// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/cross-family-pass.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - the live judge (verifyHandoffCrossFamily, an OpenRouter call) is not imported, so a judge must be injected
//   - the judge types are imported from ./cross-family-verify, extracted alongside

/**
 * cross-family-pass.ts — [AIS3-1] the cross-family judge pass, with the re-run judged too.
 *
 * The proposer runs once, exactly as a non-PV agent would, and a frontier non-Anthropic judge reads
 * what it emitted. In BLOCK mode a REJECT re-runs the proposer ONCE with the defect and the commitment
 * constraint in its prompt, and the judge reads the re-run as well. Before this module the orchestrator
 * returned the re-run unread, so an agent that repeated the defect passed. Now a REJECT after the re-run
 * halts with CROSS_FAMILY_REJECTED. The pass stays bounded at one re-run, because a judge loop would be
 * worse than the defect it chases. A judge ERROR never blocks, on either read.
 *
 * Evidence ([140 SE-09], [AIS1-4]): every read judges only evidence that still matches its commitment,
 * and the read stamps revealed_at on the committed set, whatever the verdict. [AIS3-2] The re-run is
 * shown the committed entries as committed, and before the judge reads it, revealRerun refuses a re-run
 * that changed a committed entry with no new work behind it. A rewritten justification is exactly what
 * could talk a judge round, so it never reaches the judge.
 */

import {
  commitHandoffEvidence,
  commitConstraintText,
  revealRerun,
  verifyCommitment,
  type CommitOptions,
  type EvidenceCommitment,
} from "./evidence-commitment";
import type { CrossFamilyVerdict, CrossFamilyVerifyRequest } from "./cross-family-verify";

export type CrossFamilyMode = "WARN" | "BLOCK";

/** What the re-run is told: rendered into the agent's own REJECTION_CONTEXT by the caller. */
export interface CrossFamilyRejection {
  reason: string;
  human_notes: string;
}

export interface CrossFamilyPassOptions<H extends { payload: unknown }> {
  agentId: string;
  /** The agent's outbound boundary literal: tells the judge what shape was owed. */
  boundary: string;
  mode: CrossFamilyMode;
  taskContext: string;
  judgeModel?: string;
  /** Runs the agent: first with no rejection, then at most once more with the judge's rejection. */
  runProposer: (rejection?: CrossFamilyRejection) => Promise<H>;
  /** Defaults to verifyHandoffCrossFamily; tests inject a scripted judge. */
  judge?: (req: CrossFamilyVerifyRequest) => Promise<CrossFamilyVerdict>;
  emit?: (type: string, payload: Record<string, unknown>) => void;
  /** [AIS3-2] Where file-backed evidence refs resolve: the agent's sandbox, as at emission. */
  commitOptions?: CommitOptions;
}

export interface CrossFamilyPassResult<H> {
  handoff: H;
  /** One verdict per read, in order: the first read, then the re-run's when there was one. */
  verdicts: CrossFamilyVerdict[];
  reRan: boolean;
}

/** The re-run repeated a rejected defect in BLOCK mode. Carries both verdicts for telemetry. */
export class CrossFamilyRejectedError extends Error {
  readonly agentId: string;
  readonly verdicts: CrossFamilyVerdict[];
  constructor(agentId: string, verdicts: CrossFamilyVerdict[]) {
    const last = verdicts[verdicts.length - 1];
    super(
      `CROSS_FAMILY_REJECTED: ${agentId} was re-run once after a cross-family REJECT, and the judge ` +
        `(${last.judge_model}) rejected the re-run too${last.severity ? ` [${last.severity}]` : ""}: ` +
        `${last.defect.slice(0, 300)}. halt-reason: cross-family-judge`,
    );
    this.name = "CrossFamilyRejectedError";
    this.agentId = agentId;
    this.verdicts = verdicts;
  }
}

/** One judged read: commit (or reuse the emission's commitment), verify, check the re-run against the
 *  first read's commitment when there is one, judge, reveal. */
async function judgeRead<H extends { payload: unknown }>(
  o: CrossFamilyPassOptions<H>,
  judge: (req: CrossFamilyVerifyRequest) => Promise<CrossFamilyVerdict>,
  handoff: H,
  step: "cross-family-judge" | "cross-family-judge-rerun",
  against?: EvidenceCommitment,
): Promise<{ verdict: CrossFamilyVerdict; commitment: EvidenceCommitment }> {
  const emit = o.emit ?? (() => {});
  const payload = handoff.payload as Record<string, unknown>;

  // [AIS1-4] executeAgent committed the emission before its quality gates. Reuse that commitment;
  // commit here only when this proposer produced none.
  const prior = payload.evidence_commitment as EvidenceCommitment | undefined;
  let commitment = prior ?? commitHandoffEvidence(payload, new Date(), o.commitOptions);
  payload.evidence_commitment = commitment;
  emit("EVIDENCE_COMMIT", {
    root_hash: commitment.root_hash, entry_count: commitment.entry_count, committed_at: commitment.committed_at,
    step, reused_emission_commitment: !!prior,
  });

  // The judge reads only evidence that still matches its commitment.
  const preJudge = verifyCommitment(commitment, payload, o.commitOptions);
  if (!preJudge.ok) {
    emit("EVIDENCE_COMMITMENT_MISMATCH", {
      root_hash: commitment.root_hash, changed: preJudge.changed, added: preJudge.added, removed: preJudge.removed,
      phase: step === "cross-family-judge" ? "pre-judge" : "pre-judge-rerun",
    });
    throw new Error(
      `EVIDENCE_COMMITMENT_MISMATCH: ${o.agentId} judge not invoked — evidence changed after commitment ` +
        `(changed ${preJudge.changed.length}, added ${preJudge.added.length}, removed ${preJudge.removed.length}). halt-reason: evidence-commitment`,
    );
  }

  // [AIS3-2] The re-run may point at committed entries or add new work, never re-justify a committed claim.
  if (against) {
    const reveal = revealRerun(against, commitment);
    if (!reveal.ok) {
      emit("EVIDENCE_COMMITMENT_MISMATCH", {
        root_hash: against.root_hash, rejustified: reveal.rejustified, new_work: reveal.new_work, phase: "re-run",
      });
      throw new Error(
        `EVIDENCE_REJUSTIFIED: ${o.agentId} judge not invoked — the re-run changed committed evidence with no new work ` +
          `behind it (${reveal.rejustified.join(", ")}). halt-reason: evidence-commitment`,
      );
    }
  }

  const verdict = await judge({
    agent_id: o.agentId,
    boundary: o.boundary,
    task_context: o.taskContext,
    handoff_json: JSON.stringify(payload ?? {}, null, 2),
    ...(o.judgeModel ? { judge_model: o.judgeModel } : {}),
  });

  // [140 SE-09] REVEAL: the judge's read IS the interrogation.
  commitment = { ...commitment, revealed_at: new Date().toISOString() };
  payload.evidence_commitment = commitment;
  emit("EVIDENCE_REVEAL", { root_hash: commitment.root_hash, revealed_at: commitment.revealed_at, verdict: verdict.verdict, step });

  return { verdict, commitment };
}

export async function runCrossFamilyPass<H extends { payload: unknown }>(
  o: CrossFamilyPassOptions<H>,
): Promise<CrossFamilyPassResult<H>> {
  const judge = o.judge ?? noLiveJudge;

  const first = await o.runProposer();
  const firstRead = await judgeRead(o, judge, first, "cross-family-judge");
  const verdicts = [firstRead.verdict];
  if (firstRead.verdict.verdict !== "REJECT" || o.mode !== "BLOCK") {
    return { handoff: first, verdicts, reRan: false };
  }

  const v = firstRead.verdict;
  const rerun = await o.runProposer({
    reason: `cross-family judge (${v.judge_model}) REJECT${v.severity ? ` [${v.severity}]` : ""}`,
    // The defect and the commit constraint, raw and unsoftened. The re-run is a fresh generation that
    // never saw its first handoff, so the constraint carries the committed entries as committed.
    human_notes: `${v.defect}\n\n${commitConstraintText(firstRead.commitment, { payload: first.payload })}`,
  });
  const rerunRead = await judgeRead(o, judge, rerun, "cross-family-judge-rerun", firstRead.commitment);
  verdicts.push(rerunRead.verdict);

  if (rerunRead.verdict.verdict === "REJECT") throw new CrossFamilyRejectedError(o.agentId, verdicts);
  return { handoff: rerun, verdicts, reRan: true };
}

/** Added on extraction: this repository makes no network call, so a judge must be injected. */
async function noLiveJudge(): Promise<CrossFamilyVerdict> {
  throw new Error("this extraction ships no live judge: inject one, such as a replay of a recorded reply");
}
