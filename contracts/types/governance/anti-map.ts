// Extracted from the software factory (private),
// contracts/types/governance/anti-map.ts at 87fae286, on 2026-10-18.
// Changed on extraction: two phrases in the doc comment, a private planning path and the sensor's working name.

import { z } from 'zod';

/**
 * anti-map.ts — [LF0-12] the anti-map of hallucinations: its DEFINITIONS, split out of the
 * package's skill-shaped spec (a design document in the factory's programme folder) by
 * ruling D-C, 2026-10-03, "Split it in two". The explanation is parked beside its siblings in
 * skills/governance/anti-map-hallucination-architecture.md; this file is the one place the
 * types live.
 *
 * WHAT IT IS: a prior on WHERE an agent will hallucinate, built from what the model cannot
 * experience (six experiential regions) and what it was rewarded to say anyway (one reward-bias
 * region), used to allocate verification budget instead of sampling uniformly. It is not a
 * detector.
 *
 * NOT WIRED. No router, gate or agent reads these types yet. Under ESTS a claim's grounding
 * fields travel in the claim's `extension{}`, which no router or gate reads; the expected
 * consumers are the early sensor and the SamplingVerifier, itself a candidate
 * ([240 D2]: "Candidate, population banked"). The multipliers, priors and threshold below are
 * the spec's placeholders, fitted from logged outcomes before anything routes on them.
 *
 * Source changes on the way in: Zod ^3.24 → this repo's v4; the Prompt Linter's report severity
 * and mode use the factory's gate vocabulary (lib/env-mode.ts GATE_MODES: OFF, WARN, BLOCK),
 * never FAIL; "assumed_default — mandatory if !anchored" is enforced, not only commented.
 * R19: additive-only from here. R22 keeps the generated JSON Schemas fresh.
 */

/** What the model has no direct contact with; where it fills in rather than reports. */
export const ExperientialRegionSchema = z.enum([
  'duration',   // time as felt: timeline errors, "recent" drift, 2 weeks read as 2 months
  'perception', // colour, scale, legibility, sound: confident specs that fail physically
  'friction',   // effort, setup time, physical consequence: frictionless plans
  'stakes',     // nothing the model does costs it anything: overcommitment, no risk aversion
  'magnitude',  // numbers as felt: ₹37 Cr vs ₹37 L, plausible number, wrong order
  'social',     // how a message lands: a register that reads fine on paper and lands wrong
]);

/** The four defaults human-approval training rewards; orthogonal to the experiential regions. */
export const RewardBiasKindSchema = z.enum([
  'agreement',  // conceding to the user's stance
  'completion', // filling a gap instead of reporting it
  'confidence', // dropping calibrated uncertainty
  'intent',     // optimising for apparent want over truth or need
]);

/** The seven regions: six blind spots (test vision) and one conflict of interest (test independence). */
export const GroundingRegionSchema = z.union([ExperientialRegionSchema, z.literal('reward_bias')]);

/** Long-tail score: 0 = common, 1 = rare. */
export const SparsitySchema = z.number().min(0).max(1);

/** One row of the Grounding Index, the lexicon the Prompt Linter reads; human-reviewed. */
export const GroundingTermSchema = z.object({
  term: z.string().min(1),
  region: ExperientialRegionSchema,
  anchor_required: z.boolean(),
  anchor_pattern: z.string().nullable(),   // regex or description of an acceptable anchor
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),      // ISO timestamp
});

/** A stated stance or desired conclusion in an agent's input: what an output might echo. */
export const PremiseSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(['stance', 'desired_conclusion', 'leading_frame']),
  source: z.enum(['user', 'upstream_agent']),
});

/** The factory's gate vocabulary for the linter's mode and its report: never FAIL. */
export const AntiMapGateModeSchema = z.enum(['OFF', 'WARN', 'BLOCK']);

/** The Prompt Linter's report on one compiled prompt (unnumbered: R22 is contract parity). */
export const GroundingReportSchema = z.object({
  prompt_id: z.string().min(1),
  unanchored_terms: z.array(z.object({ term: z.string(), region: ExperientialRegionSchema, position: z.number().int().min(0) })),
  leading_frames: z.array(z.string()),
  permission_clause_present: z.boolean(),
  severity: z.enum(['PASS', 'WARN', 'BLOCK']),
});

/** A claim's grounding declaration: an unknown unknown turned into a known unknown. */
export const ClaimGroundingSchema = z.object({
  region: GroundingRegionSchema.nullable(),  // null = purely factual, no experiential content
  anchored: z.boolean(),                     // was the experiential term tied to something concrete?
  assumed_default: z.string().optional(),    // what was assumed when unanchored: required then
  sparsity: SparsitySchema,
  stance_inherited: z.boolean(),             // the claim matches an extracted premise
  gap_declared: z.boolean(),                 // the output reported something missing
  hedge_present: z.boolean(),                // calibrated uncertainty expressed
}).superRefine((c, ctx) => {
  if (!c.anchored && c.region !== null && !c.assumed_default?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['assumed_default'], message: 'an unanchored claim must say what it assumed (assumed_default)' });
  }
});

/** One cell of the Anti-Map Store: a beta-binomial posterior per (region, agent, task type). */
export const AntiMapCellSchema = z.object({
  region: GroundingRegionSchema,
  agent_id: z.string().min(1),
  task_type: z.string().min(1),
  alpha: z.number().positive(),   // observed hallucinations + prior
  beta: z.number().positive(),    // observed clean claims + prior
  n_obs: z.number().int().min(0),
  updated_at: z.string(),         // ISO timestamp
});

/** The Verifier Router's three handlers, and the SamplingVerifier's three added modes. */
export const VerifierHandlerSchema = z.enum(['tool_grounding', 'cross_family_verify', 'human_gate']);
export const VerificationModeSchema = z.enum(['perturbation', 'counterfactual_stance', 'blind_judge']);

/** Day-one priors, hand-set and weak (alpha + beta = PRIOR_STRENGTH); replaced at the end of Phase 1. */
export const ANTI_MAP_PRIOR_STRENGTH = 10;
export const ANTI_MAP_PRIOR_MEANS: Readonly<Record<z.infer<typeof GroundingRegionSchema>, number>> = Object.freeze({
  reward_bias: 0.3,
  duration: 0.2,
  perception: 0.2,
  friction: 0.15,
  magnitude: 0.15,
  social: 0.1,
  stakes: 0.1,
});

/**
 * Risk Scorer multipliers. PLACEHOLDERS until Phase 2 fits them from logged outcomes:
 *   risk = posterior_mean × (anchored ? anchored : 1) × (1 + sparsity)
 *        × (stance_inherited ? stance_inherited : 1) × (leading frame && !gap_declared ? leading_frame_undeclared : 1)
 */
export const RISK_MULTIPLIERS_PLACEHOLDER = Object.freeze({ anchored: 0.3, stance_inherited: 1.6, leading_frame_undeclared: 1.4 });
/** The Verifier Router's Phase 3 default threshold; a placeholder until calibrated against the observed Brier score. */
export const VERIFIER_ROUTE_THRESHOLD_PLACEHOLDER = 0.35;

/**
 * [U2-2.5] One claim the Risk Scorer scored: its grounding, the cell it was scored against, each §6 factor beside the
 * product, so a logged risk can be re-derived by hand. Logged, never routed on (Phase 1: "computes but does not route").
 */
export const AntiMapScoredClaimSchema = z.object({
  claim_index: z.number().int().min(0),
  region: GroundingRegionSchema,
  cell: z.object({ agent_id: z.string().min(1), task_type: z.string().min(1), alpha: z.number().positive(), beta: z.number().positive(), n_obs: z.number().int().min(0) }),
  posterior_mean: z.number().min(0).max(1),
  multipliers: z.object({ anchored: z.number().positive(), sparsity: z.number().positive(), stance_inherited: z.number().positive(), leading_frame_undeclared: z.number().positive() }),
  risk: z.number().min(0),
  grounding: ClaimGroundingSchema,
});
/**
 * [U2-2.5] The Risk Scorer's log for one handoff (anti-map-scores.json beside it): what it scored, what it could not
 * and why, and that it routed nothing. `routes` is a literal so the record itself says the scorer steered nothing.
 */
export const AntiMapScoreLogSchema = z.object({
  schema_version: z.literal('1.0'),
  agent_id: z.string().min(1),
  task_type: z.string().min(1),          // the handoff boundary the claims crossed
  store_path: z.string().min(1),
  cells_in_store: z.number().int().min(0),
  leading_frame_in_prompt: z.boolean().nullable(),   // null = no saved prompt to lint, or the lint could not run (frame_note says which)
  frame_note: z.string().min(1).optional(),
  claims_seen: z.number().int().min(0),
  scored: z.array(AntiMapScoredClaimSchema),
  unscored: z.object({
    count: z.number().int().min(0),
    reason: z.string().min(1),
    details: z.array(z.string().min(1)).max(50).optional(),   // one line per claim the contract refused: its index and the issue
  }),
  routes: z.literal('nothing'),
  scored_at: z.string(),                 // ISO timestamp
});

export type ExperientialRegion = z.infer<typeof ExperientialRegionSchema>;
export type RewardBiasKind = z.infer<typeof RewardBiasKindSchema>;
export type GroundingRegion = z.infer<typeof GroundingRegionSchema>;
export type GroundingTerm = z.infer<typeof GroundingTermSchema>;
export type Premise = z.infer<typeof PremiseSchema>;
export type GroundingReport = z.infer<typeof GroundingReportSchema>;
export type ClaimGrounding = z.infer<typeof ClaimGroundingSchema>;
export type AntiMapCell = z.infer<typeof AntiMapCellSchema>;
export type AntiMapScoredClaim = z.infer<typeof AntiMapScoredClaimSchema>;
export type AntiMapScoreLog = z.infer<typeof AntiMapScoreLogSchema>;
