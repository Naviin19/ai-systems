// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/shared/index.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - only EvidenceRefSchema and EvidenceCommitmentSchema are kept, with the zod import they need

import { z } from 'zod';

// 9. EvidenceRef — from structured-output-schemas + epistemic-vigilance.
// [140 SE-09] adds the OPTIONAL commit-before-interrogation fields (R19
// additive — old artifacts stay valid): content_hash = SHA-256 of the
// canonical-JSON claim; committed_at set at emission, BEFORE any verifier
// question; revealed_at set when a verifier samples it. Simple content hash
// only — anti-rationalization tooling for cooperative-but-fallible agents,
// not adversarial-security infrastructure (spike ruling, verbatim).
export const EvidenceRefSchema = z.object({
  source_id: z.string().min(1),
  source_type: z.string().min(1),
  reliability_tier: z.number().int().min(1).max(4),
  excerpt: z.string(),
  location: z.string(),
  content_hash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  committed_at: z.string().datetime({ offset: true }).optional(),
  revealed_at: z.string().datetime({ offset: true }).nullable().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

// 9b. EvidenceCommitment — [140 SE-09]: the emission-time lock over a
// handoff's whole evidence set (step_attestations + evidence_refs). Built by
// scripts/lib/evidence-commitment.ts; logged as EVIDENCE_COMMIT before the
// verifier runs; revealed_at stamped when interrogation samples it.
export const EvidenceCommitmentSchema = z.object({
  root_hash: z.string().regex(/^[0-9a-f]{64}$/),
  committed_at: z.string().datetime({ offset: true }),
  revealed_at: z.string().datetime({ offset: true }).nullable(),
  entry_count: z.number().int().nonnegative(),
  // [AIS3-2] file + file_hash: the file an evidence ref's location names, committed with the ref.
  // cycle: a step attestation's agent_cycle, which tells a re-executed step from a re-justified one.
  entries: z.array(z.object({
    id: z.string().min(1),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
    file: z.string().min(1).optional(),
    file_hash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    cycle: z.number().int().optional(),
  })),
});
export type EvidenceCommitment = z.infer<typeof EvidenceCommitmentSchema>;
