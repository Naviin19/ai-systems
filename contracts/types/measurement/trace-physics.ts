// Extracted from the software factory (private),
// contracts/types/measurement/trace-physics.ts at 87fae286, on 2026-10-18.
// Unchanged apart from this header.

import { z } from 'zod';

/**
 * trace-physics.ts — [SLP-C1] the trace scorer's record (measurement family).
 *
 * 07-slp-state-legible-prompts.md §7.2 and D7. One record per agent dispatch and one per run, computed
 * from what the run ledger already records (events.jsonl, the agent's handoff.json and receipt.json):
 *   jerk            — how much the dispatch thrashed: route-back retries, oscillations, corrector cycles
 *                     beyond the first, judge re-runs, gate rejections, restarts, budget hits, repeated
 *                     identical loads (and repeated identical tool calls, null until SLP-C5b hashes them);
 *   compression     — accepted handoff tokens (estimated) over the tokens the dispatch spent;
 *   schema_friction — schema-on-write route-backs, D3 failures, clamp failures, schema fallbacks;
 *   energy          — wall time, and gateway cost when the gateway route ran;
 *   meta            — dispatch topology, mode, and the input score BESIDE the score, never inside it.
 *
 * The score is the operator's sketch, uncalibrated (ruling R-C1): 0.4·compression + 0.4/(jerk+1) +
 * 0.2/(schema_friction+1). It RANKS, it never blocks. Whatever the ledger does not record is null with a
 * reason in `nulls[]` (the receipt convention), and a null never becomes a 0 inside a sum or a score:
 * compression null means score null.
 *
 * R19: additive-only from here. R22 keeps the generated JSON Schema fresh.
 */

export const TRACE_PHYSICS_CALIBRATION = 'uncalibrated-operator-sketch-2026-10-02' as const;

export const TraceNullSchema = z.object({
  field: z.string().min(1),
  reason: z.string().min(1),
});

const count = z.number().int().min(0);

export const TracePhysicsAgentSchema = z.object({
  run_id: z.string().min(1),
  agent_id: z.string().min(1),
  jerk: z.object({
    route_back_retries: count,
    oscillations: count,
    corrector_cycles_beyond_first: count.nullable(),
    judge_reruns: count,
    gate_rejections: count,
    restarts: count,
    budget_hits: count,
    repeated_identical_loads: count,
    repeated_identical_tool_calls: count.nullable(),
    /** The sum of the non-null counts above; each null contributes nothing and is listed in nulls[]. */
    jerk: count,
  }),
  compression: z.object({
    accepted_handoff_tokens_est: count.nullable(),
    tokens_total: count.nullable(),
    tokens_split: z.object({ input: count, output: count, cache_read: count, cache_write: count }).nullable(),
    compression: z.number().min(0).nullable(),
    tokens_per_attested_step: z.number().min(0).nullable(),
    tokens_on_rejected_attempts: z.null(),
  }),
  schema_friction: z.object({
    schema_on_write_route_backs: count,
    d3_failures: count,
    clamp_failures: count,
    clamp_checks: count,
    schema_fallbacks: count,
    in_loop_validation_repairs: z.null(),
    schema_friction: count,
  }),
  energy: z.object({
    wall_ms_to_complete: count.nullable(),
    wall_ms_method: z.enum(['agent_complete', 'ts-delta']).nullable(),
    cost_usd: z.number().min(0).nullable(),
  }),
  meta: z.object({
    dispatch_topology: z.enum(['pipeline', 'debate', 'parallel-pv']),
    mode: z.enum(['continuous', 'opponent']),
    /** Beside the score, never inside it (§7.2): from verification/runs/<run>/input-state.json. */
    input_score: z.number().nullable(),
    input_score_source: z.string().nullable(),
  }),
  score: z.number().nullable(),
  calibration: z.literal(TRACE_PHYSICS_CALIBRATION),
  nulls: z.array(TraceNullSchema),
});
export type TracePhysicsAgent = z.infer<typeof TracePhysicsAgentSchema>;

export const TracePhysicsRunSchema = z.object({
  run_id: z.string().min(1),
  agents: z.array(TracePhysicsAgentSchema),
  totals: z.object({
    jerk: count,
    schema_friction: count,
    accepted_handoff_tokens_est: count.nullable(),
    tokens_total: count.nullable(),
    compression: z.number().min(0).nullable(),
  }),
  meta: z.object({
    /** The run is always hierarchical (one orchestrator); how many ran at once is not recorded. */
    dispatch_topology: z.literal('hierarchical'),
    max_parallel: z.null(),
    /** Distinct TRANSITION_CONTRACT states in the run: the operator's "more distinguishable states". */
    distinct_states_per_run: count.nullable(),
    input_score: z.number().nullable(),
    input_score_source: z.string().nullable(),
  }),
  score: z.number().nullable(),
  /** Lane B's trend() over a series of runs (SLP-C3); null with a reason until it is wired. */
  trend: z.null(),
  calibration: z.literal(TRACE_PHYSICS_CALIBRATION),
  nulls: z.array(TraceNullSchema),
});
export type TracePhysicsRun = z.infer<typeof TracePhysicsRunSchema>;
