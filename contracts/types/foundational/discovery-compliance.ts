// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/foundational/discovery-compliance.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';
import { SeveritySchema } from '../shared';

const SubjectTestSchema = z.object({
  pct: z.number().min(0).max(100),
  sentences_scanned: z.number().int().nonnegative(),
  tool_as_subject_count: z.number().int().nonnegative(),
  user_as_subject_count: z.number().int().nonnegative(),
});

const DeficitViolationSchema = z.object({
  pattern_matched: z.string(),
  original_text: z.string(),
  location: z.string(),
  severity: SeveritySchema,
});

const DeficitPatternScanSchema = z.object({
  patterns_checked: z.array(z.string()),
  violations: z.array(DeficitViolationSchema),
});

const PrecisionTestSchema = z.object({
  novel_findings_count: z.number().int().nonnegative(),
});

const EmpowermentGateSchema = z.object({
  is_user_subject: z.boolean(),
  is_immediately_actionable: z.boolean(),
  feels_like_discovery: z.boolean(),
  increases_capability: z.boolean(),
});

export const DiscoveryComplianceSchema = z.object({
  check_0_empowerment: z.number().min(0).max(1),
  check_1_visceral: z.number().min(0).max(1),
  check_2_competence: z.number().min(0).max(1),
  check_3_reflective: z.number().min(0).max(1),
  gate_passed: z.boolean().optional(),
  subject_test: SubjectTestSchema,
  deficit_pattern_scan: DeficitPatternScanSchema,
  precision_test: PrecisionTestSchema,
  empowerment_gate: EmpowermentGateSchema,
  evaluator: z.enum(['self', 'judge', 'human']),
  model_used: z.string(),
  revision_count: z.number().int().nonnegative().default(0),
  evaluation_evidence: z.record(z.string(), z.unknown()).default({}),
});
export type DiscoveryCompliance = z.infer<typeof DiscoveryComplianceSchema>;
