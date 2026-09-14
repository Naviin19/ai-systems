// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/governance/agent-behavioral.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';
import { AgentIdSchema } from '../shared/index';
import { ImpactEquationSchema } from '../foundational/impact-equation';

// P1-08: Mechanical Reliability Rules — co-edit pair with agent-constitution.md §Rule 1-7.
// Each rule emits a structured check on every agent boundary.
export const MechanicalReliabilityRuleSchema = z.object({
  rule_id: z.enum(['rule_1', 'rule_2', 'rule_3', 'rule_4', 'rule_5', 'rule_6', 'rule_7']),
  mechanical_check: z.string().min(1),     // the verifiable command
  halt_condition: z.string().min(1),       // what triggers HALT
  passed: z.boolean(),
  evidence: z.string().optional(),
});

// P1: Trust as Verification
const TrustVerificationSchema = z.object({
  upstream_agent_id: AgentIdSchema,
  checks: z.array(z.object({
    check_type: z.enum(['schema_valid', 'quality_gate_passed', 'no_silent_failures', 'decisions_respected']),
    result: z.boolean(),
    detail: z.string(),
  })),
  trust_verdict: z.enum(['proceed', 'flag', 'halt']),
  // P1-08: optional — agents may attach the 7-rule trace
  mechanical_rules: z.array(MechanicalReliabilityRuleSchema).optional(),
});

// P2: Craftsmanship
const CraftsmanshipLogSchema = z.object({
  revision_passes: z.number().int().min(0),
  per_pass: z.array(z.object({
    pass_number: z.number().int().min(1),
    changes_made: z.number().int().min(0),
    I_score_before: z.number().min(0).max(10).optional(),
    I_score_after: z.number().min(0).max(10).optional(),
  })),
  ceiling_reached: z.boolean(),
});

// P3: Calibration
const ConfidenceCalibrationSchema = z.object({
  claims: z.array(z.object({
    claim_id: z.string().min(1),
    confidence: z.number().min(0).max(1),
    evidence_strength: z.enum(['strong', 'moderate', 'weak']),
    calibration_language: z.enum(['shows', 'suggests', 'one reading is']),
  })),
});

// P4: Coherence
const CoherenceRecordSchema = z.object({
  coherence_anchor: z.string().min(1),
  anchor_served: z.boolean(),
  protected_fields: z.array(z.object({
    field: z.string(),
    value: z.string(),
    source: z.string(),
  })),
  deviation_dimensions_used: z.array(z.string()),
});

// P5: Self-Assessment (uses F2 ImpactEquation)
const SelfAssessmentSchema = z.object({
  estimated_I: ImpactEquationSchema,
  weakest_term: z.enum(['D', 'C', 'A']),
  weakest_evidence: z.string().min(1),
  honest_flags: z.array(z.object({
    flag: z.string().min(1),
    severity: z.enum(['info', 'warning', 'critical']),
  })),
  confidence_floor: z.number().min(0).max(1),
});

export const AgentBehavioralSchema = z.object({
  trust_verification: TrustVerificationSchema,
  craftsmanship_log: CraftsmanshipLogSchema,
  confidence_calibration: ConfidenceCalibrationSchema,
  coherence_record: CoherenceRecordSchema,
  self_assessment: SelfAssessmentSchema,
});
export type AgentBehavioral = z.infer<typeof AgentBehavioralSchema>;

// Export sub-schemas that O2 Handoff Envelope needs
export { TrustVerificationSchema, SelfAssessmentSchema };
