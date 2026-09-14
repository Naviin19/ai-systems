// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/operational/divergence-candidate.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';

/**
 * DivergenceCandidate — the factory-canonical transport shape for an imagination
 * divergence spec ([IMAG-2026-09], operator ruling g, 2026-09-06: this file is
 * the single source of truth; Auteur's composer-io.ts copy re-homes to it via
 * their amendments log).
 *
 * Produced by @skill-ecosystem/runtime-imagination `reimagine()` (which mints
 * `divergence_id` deterministically as playbook:operator:dimension:hash8) and
 * judged by a HUMAN — the runtime never realizes or auto-applies a candidate
 * (imagination-protocol.md §1 Judge row, §4). Verdicts key on `divergence_id`
 * via feedback-flywheel's `recordDivergenceVerdict` (targetType 'divergence').
 *
 * DELIBERATELY LENIENT at this layer (drop-never-block): strings, the `opaque`
 * literal, and a catchall — NO .refine batteries. Full strictness (invariants
 * non-empty, dimension exists in the playbook, id recomputes) belongs to the
 * PRODUCING step's own gate. A malformed candidate must never be able to fail
 * whole-envelope validation at schema-on-write and dam the faithful path — the
 * faithful pipeline always outranks the explore branch.
 *
 * `opaque: true` is load-bearing (imagination-protocol.md §2 step 3): a
 * divergence is non-conforming by construction; it rides beside the typed
 * payload, never inside a typed fidelity field.
 */
export const DivergenceCandidateSchema = z
  .object({
    /** Stable spec identity minted by reimagine(): playbook:operator:dimension:hex8. */
    divergence_id: z.string().min(1),
    /** posture_dimension id the divergence applies to. */
    dimension: z.string().min(1),
    /** divergence_operator id that produced it. */
    operator: z.string().min(1),
    /** The observed (faithful) state being departed from. */
    before: z.string(),
    /** The operator's transform with {observed} resolved — the divergent intent. */
    after: z.string(),
    /** Why a domain expert would respect this break (rationale_template resolved). */
    rationale: z.string().min(1),
    /** Always true — a divergence is non-conforming by construction. */
    opaque: z.literal(true),
  })
  .catchall(z.unknown());

export type DivergenceCandidate = z.infer<typeof DivergenceCandidateSchema>;
