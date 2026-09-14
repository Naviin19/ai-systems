// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/measurement/receipt.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';

/**
 * receipt.ts — [120 SE-07] the given-vs-done receipt (measurement family).
 *
 * Rung 3 of the reachability ladder (Exists → Reachable → LOADED → Load-bearing).
 * One record per agent run, four field groups that must never collapse:
 * given / done / gate_verdicts / run_outcome. The receipt RECORDS; it does not
 * judge — no scores, no deviation verdicts (that is D2-era analysis, [240]).
 * A field that cannot be honestly populated ships null with a reason in
 * `nulls[]`, never a guess.
 *
 * OP-1 (operator, 2026-09-01): two attach points — load-time (RECEIPT_GIVEN
 * event after assembleSystemPrompt; SKILL_LOADED events complete given-as-read)
 * and post-emit (full receipt into events.jsonl + receipt.json beside the
 * handoff). OP-2 (operator, 2026-09-01): schema + separability statement
 * approved — every receipt embeds RECEIPT_SEPARABILITY_STATEMENT verbatim.
 *
 * Consumers today: scripts/lib/receipt.ts (builder) + scripts/emit-receipt.ts
 * (CLI/backfill). Consumers next: [160]'s WH runs (first real proof), [170]'s
 * baseline collection, [190] R23 belt (injection keyed off `given`), [200] R24
 * suspenders (post-emit vs ledger), [240] D2 verdicts.
 * R19: additive-only from here. R22 keeps the generated JSON Schema fresh.
 *
 * [TTR-6] (2026-09-01) residuals group — T1 within the Q4 ruling (operator,
 * verbatim: "score/floor/gap only"): the receipt carries {score, floor,
 * margin} — arithmetic on two RECORDED numbers, which is recording, not
 * judging. Population statistics (surface medians, z-scores) are analysis
 * and live ONLY in scripts/residual-baseline.ts's report. Optional field:
 * every pre-[TTR-6] receipt keeps validating (R19).
 */

/** Embedded verbatim in every receipt (OP-2). The honest limit of the done half. */
export const RECEIPT_SEPARABILITY_STATEMENT =
  "The done half records acknowledgement-class evidence only (citations, attestations, findings). " +
  "With what is on disk, 'shaped the output' cannot be separated from 'was acknowledged': a citation " +
  "proves injection into the index — not acknowledgement, not load, not influence (P1 B2). " +
  "Influence is provable by nothing currently recorded.";

/** One citation-index entry the agent was given (given-as-REACHABLE). */
export const GivenSkillSchema = z.object({
  skill: z.string().min(1),
  spec: z.string().nullable(), // "§full" | "§1-§4" | null when unspecified
  source: z.enum(['universal', 'domain']),
});

/** One actual load_skill fetch (given-as-READ; from SKILL_LOADED events). */
export const LoadedSkillSchema = z.object({
  file: z.string().min(1),
  section: z.string().nullable(),
  iter: z.number().int().positive(),
  chars: z.number().int().nonnegative(),
  // [AIS5-4] An estimate, by given.token_estimate_method. Optional so earlier receipts validate (R19-additive).
  tokens_estimate: z.number().int().nonnegative().optional(),
});

export const ReceiptGivenSchema = z.object({
  index_injected: z.array(GivenSkillSchema),
  loaded: z.array(LoadedSkillSchema),
  prompt_chars: z.number().int().nonnegative().nullable(), // null in mock mode (prompt not assembled)
  // [AIS5-4] Token ESTIMATES, labelled by their method: the offline chars/4 estimate estimate-token-load.ts
  // uses, never a tokenizer count. Optional so earlier receipts validate (R19-additive).
  prompt_tokens_estimate: z.number().int().nonnegative().nullable().optional(),
  token_estimate_method: z.literal('chars/4').optional(),
});

/** A field the builder could not honestly populate, with the reason. Never a guess. */
export const NullReasonSchema = z.object({
  field: z.string().min(1),
  reason: z.string().min(1),
});

export const ReceiptDepartureSchema = z.object({
  kind: z.enum(['attestation', 'corrector_cycle', 'drift_warn', 'circuit_breaker', 'out_of_scope', 'other']),
  detail: z.string().min(1),
  /** [170 P] 2026-09-06 (operator-approved intervention line b): a departure
   *  carries two INDEPENDENT facts — what rule it left, and whether it worked.
   *  Reporting both is a contribution; the second field never aggravates the
   *  first. null = not assessed (the honest default). R19-additive. */
  worked: z.boolean().nullable().default(null),
});

export const ReceiptDoneSchema = z.object({
  cited_in_output: z.array(z.string()),   // @skill: citations found in the emitted artifacts
  // [AIS5-4] The same citations at section grain: `@skill: x.md §3` is {skill: 'x.md', section: '§3'}, and
  // section is null when the citation named none. cited_in_output keeps its filename meaning for its readers.
  cited_sections: z.array(z.object({ skill: z.string().min(1), section: z.string().nullable() })).optional(),
  given_not_cited: z.array(z.string()),
  loaded_not_cited: z.array(z.string()),
  out_of_scope_findings: z.number().int().nonnegative().nullable(),
  departures: z.array(ReceiptDepartureSchema),
  separability_statement: z.literal(RECEIPT_SEPARABILITY_STATEMENT),
});

/** One gate that OBSERVABLY fired this run. Absence of a row is absence of evidence, never a pass. */
export const GateVerdictSchema = z.object({
  gate: z.string().min(1),        // e.g. 'attestation', 'd3_absorption', 'faithfulness', 'cross_family_judge', 'drift_audit', 'human_gate_A'
  mode: z.string().nullable(),    // WARN/BLOCK/enforce where recoverable from the event
  result: z.string().min(1),      // e.g. 'PASS', 'HONEST_FAIL', 'REJECTED', 'approved'
  detail: z.string().nullable(),
});

/** [TTR-6] One craftsmanship grade tied to this run's artifacts (the agent's
 *  handoff narrative or its playbook), with the expectation it was graded
 *  against and the gap between them. margin = score − floor, always. */
export const CraftsmanshipResidualSchema = z.object({
  source_file: z.string().nullable(),   // the graded artifact (cache source_file)
  surface: z.string(),                  // e.g. 'handoff-narrative', 'playbook'
  score: z.number(),                    // lowest dimension — the gate's binding value
  floor: z.number(),                    // the expectation, persisted at grade time
  margin: z.number(),                   // score − floor
});

/** [TTR-6] The expected_result half of T1: each recorded verification command
 *  with its expectation. matched is null until a recorded execution exists to
 *  compare against — the field was write-only from birth; this surfaces it
 *  honestly rather than speculatively re-running commands in a stale sandbox. */
export const VerificationCommandResidualSchema = z.object({
  command: z.string(),
  expected_result: z.string(),
  matched: z.boolean().nullable(),
});

export const ReceiptResidualsSchema = z.object({
  craftsmanship: z.array(CraftsmanshipResidualSchema),
  verification_commands: z.array(VerificationCommandResidualSchema),
});

export const RunOutcomeSchema = z.object({
  status: z.enum(['succeeded', 'failed', 're_run']),
  // H3's distinction, recorded where recoverable: who caused a re-run.
  rerun_by: z.enum(['human', 'judge', 'gate']).nullable(),
  detail: z.string().nullable(),
});

export const ReceiptSchema = z.object({
  schema_version: z.string().default('1.0'),
  receipt_id: z.string().uuid(),
  run_id: z.string().min(1),
  agent_id: z.string().min(1),
  emitted_at: z.string().datetime(),
  given: ReceiptGivenSchema,
  done: ReceiptDoneSchema,
  gate_verdicts: z.array(GateVerdictSchema),
  run_outcome: RunOutcomeSchema,
  // [TTR-6] optional so pre-existing receipts validate (R19-additive).
  residuals: ReceiptResidualsSchema.optional(),
  nulls: z.array(NullReasonSchema), // every honestly-unpopulatable field, with its reason
});

export type Receipt = z.infer<typeof ReceiptSchema>;
export type ReceiptGiven = z.infer<typeof ReceiptGivenSchema>;
export type ReceiptDone = z.infer<typeof ReceiptDoneSchema>;
export type GateVerdict = z.infer<typeof GateVerdictSchema>;
export type RunOutcome = z.infer<typeof RunOutcomeSchema>;
export type ReceiptResiduals = z.infer<typeof ReceiptResidualsSchema>;
