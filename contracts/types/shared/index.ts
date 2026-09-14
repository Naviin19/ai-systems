// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/shared/index.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';

// ===================================================================
// Session-2-v2 canonical shared types (11 types)
// ===================================================================

// 1. AgentId — dot notation: product.agent_name
export const AgentIdSchema = z.string()
  .regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/, 'AgentId must be dot notation: product.agent_name');
export type AgentId = z.infer<typeof AgentIdSchema>;

// 2. Tier — from temperature-profiles.md
export const TierSchema = z.enum(['FORENSIC', 'PRECISION', 'SYNTHESIS', 'NARRATIVE']);
export type Tier = z.infer<typeof TierSchema>;

// 3. Level — from MPA §2
export const LevelSchema = z.enum(['L1', 'L2', 'L3', 'L4', 'L5']);
export type Level = z.infer<typeof LevelSchema>;

// 4. Status — from structured-output-schemas
export const StatusSchema = z.enum(['success', 'partial', 'error']);
export type Status = z.infer<typeof StatusSchema>;

// 5. NarrativeChannel — from MPA §13 (exactly 6 channels)
export const NarrativeChannelSchema = z.enum([
  'authority', 'rebel', 'aspirant', 'connector', 'creator', 'dreamer',
]);
export type NarrativeChannel = z.infer<typeof NarrativeChannelSchema>;

// 6. VerificationMethod — from playbook-architecture-standard §6
export const VerificationMethodSchema = z.enum([
  'bash_command', 'schema_validation', 'llm_evaluation', 'manual', 'metric_threshold',
]);
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;

// 7. RecoveryAction — from pipeline-behavior-architecture §4.4
export const RecoveryActionSchema = z.enum([
  'retry', 'degrade', 'halt', 'escalate_to_human',
]);
export type RecoveryAction = z.infer<typeof RecoveryActionSchema>;

// 8. ConfidenceScore — from structured-output-schemas
export const ConfidenceScoreSchema = z.object({
  value: z.number().min(0).max(1),
  calibration: z.enum(['empirical', 'model_estimated', 'heuristic']),
  evidence_count: z.number().int().min(0),
});
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

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

// 10. TokenUsage
export const TokenUsageSchema = z.object({
  prompt: z.number().int().min(0),
  completion: z.number().int().min(0),
  total: z.number().int().min(0),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

// 11. UniversalSchemaWrapper — the base envelope every inter-agent message extends
export const UniversalSchemaWrapperSchema = z.object({
  agent_id: AgentIdSchema,
  agent_tier: TierSchema,
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  timestamp: z.string().datetime({ offset: true }),
  execution_ms: z.number().int().min(0),
  token_usage: TokenUsageSchema,
  status: StatusSchema,
  error_detail: z.string().nullable(),
  schema_version: z.string().min(1),
  payload: z.unknown(),
});
export type UniversalSchemaWrapper = z.infer<typeof UniversalSchemaWrapperSchema>;

// ===================================================================
// Additional types used by F3/F4 and downstream contracts
// ===================================================================

// Validation result interface (D5)
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  schema_id: string;
  schema_version: string;
}

// Enums for F4 Three Specifications
export const CognitiveOperationSchema = z.enum([
  'retrieve', 'structure', 'analyze', 'synthesize', 'create',
]);
export type CognitiveOperation = z.infer<typeof CognitiveOperationSchema>;

export const SourceTypeSchema = z.enum([
  'primary_data', 'user_input', 'retrieved_context', 'prior_analysis', 'domain_model',
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const ReliabilityTierSchema = z.enum(['1', '2', '3', '4']);
export type ReliabilityTier = z.infer<typeof ReliabilityTierSchema>;

export const CompletenessSchema = z.enum(['complete', 'partial', 'minimal']);
export type Completeness = z.infer<typeof CompletenessSchema>;

export const ConfidenceTierExpressionSchema = z.enum([
  'schema', 'metadata', 'embedded_prose',
]);
export type ConfidenceTierExpression = z.infer<typeof ConfidenceTierExpressionSchema>;

export const SelfVerificationSchema = z.enum([
  'none', 'fact_check', 'reflection_plus_check', 'embedded_reflection',
]);
export type SelfVerification = z.infer<typeof SelfVerificationSchema>;

// Enums for F1 Discovery Compliance
export const SeveritySchema = z.enum(['low', 'medium', 'high']);
export type Severity = z.infer<typeof SeveritySchema>;

export const EvaluatorSchema = z.enum(['self', 'judge', 'human']);
export type Evaluator = z.infer<typeof EvaluatorSchema>;

// Enums for governance/operational contracts
export const SpecificationTypeSchema = z.enum(['input', 'transformation', 'output']);
export type SpecificationType = z.infer<typeof SpecificationTypeSchema>;

export const SpecGapSchema = z.enum(['none', 'partial', 'missing']);
export type SpecGap = z.infer<typeof SpecGapSchema>;

export const SpecStrengthSchema = z.enum(['strong', 'adequate', 'weak', 'missing']);
export type SpecStrength = z.infer<typeof SpecStrengthSchema>;
