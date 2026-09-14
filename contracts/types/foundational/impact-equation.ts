// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/foundational/impact-equation.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';

const DeviationEvidenceSchema = z.object({
  prediction_violated: z.string().min(1),
  mechanism: z.enum(['content', 'form', 'timing', 'combination']),
  decay_position: z.number().int().min(0),
});

const CoherenceEvidenceSchema = z.object({
  coherence_anchor: z.string().min(1),
  anchor_served: z.boolean(),
  contradictions_found: z.number().int().min(0),
  resolution_approach: z.string().optional(),
});

const AgencyEvidenceSchema = z.object({
  sources_traceable: z.boolean(),
  confidence_signals_present: z.boolean(),
  user_can_verify: z.boolean(),
  action_surfaces_provided: z.boolean(),
});

/** The canonical Impact score: each term normalized to [0,1], multiplied, rescaled to 0–10,
 *  rounded to two decimals. Multiplying before dividing keeps the rounding exact
 *  (7 × 9 × 8.5 = 535.5 → 5.36). */
export function computeImpactScore(d: number, c: number, a: number): number {
  return Math.round(d * c * a) / 100;
}

export const ImpactEquationSchema = z.object({
  deviation_score: z.number().min(1).max(10),
  deviation_evidence: DeviationEvidenceSchema,
  coherence_score: z.number().min(1).max(10),
  coherence_evidence: CoherenceEvidenceSchema,
  agency_score: z.number().min(1).max(10),
  agency_evidence: AgencyEvidenceSchema,
  I_score: z.number().min(0).max(10),
  weakest_term: z.enum(['D', 'C', 'A']),
  weakest_evidence: z.string().min(1),
  evaluator: z.enum(['self', 'judge', 'human']),
  model_used: z.string().optional(),
  calibration_version: z.string().default('1.0'),
  // P1-08: how each axis was measured (co-edit pair with five-laws-ai-systems.md §P1-08)
  measurement_method: z.object({
    deviation: z.string().default('deviation_score'),
    coherence: z.string().default('coherence_evidence + anchor_served'),
    agency: z.string().default('agency_evidence_count'),
  }).optional(),
}).superRefine((v, ctx) => {
  // Operator ruling D6 (2026-09-13): the contract computes I. A stated I_score must equal the
  // canonical product, (D/10) x (C/10) x (A/10) x 10, to two decimals. Every example, template
  // and fixture checked before this stored something near the MEAN of the three terms instead
  // (e.g. 8.2 / 7.8 / 8.5 stored as 8.1 where the product is 5.44).
  // Half a cent of tolerance (plus float slack) accepts a value rounded to two decimals AND the
  // unrounded product (5.355 or 5.36 for 7 / 9 / 8.5), and rejects anything a cent or more away.
  const expected = computeImpactScore(v.deviation_score, v.coherence_score, v.agency_score);
  if (Math.abs(v.I_score - expected) > 0.0051) {
    ctx.addIssue({
      code: 'custom',
      path: ['I_score'],
      message: `I_score ${v.I_score} does not equal (D/10)x(C/10)x(A/10)x10 = ${expected}`,
    });
  }
});
export type ImpactEquation = z.infer<typeof ImpactEquationSchema>;
