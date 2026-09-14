// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/operational/handoff-envelope.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

import { z } from 'zod';
import { AgentIdSchema, EvidenceCommitmentSchema } from '../shared/index';
import { DivergenceCandidateSchema } from './divergence-candidate';
import { TrustVerificationSchema, SelfAssessmentSchema } from '../governance/agent-behavioral';
import { DiscoveryComplianceSchema } from '../foundational/discovery-compliance';
import { PromptManagerPayload } from '../prompts/prompt-manager-envelope';

// --- Boundary-specific payloads ---

// P2-05a: this boundary was renamed in 12-Agent upgrade; old name is recorded in scripts/migrations/v1.0-to-v1.1.ts
const FoundationToCollectionPayload = z.object({
  handoff_boundary: z.literal('FOUNDATION_TO_COLLECTION'),
  boundary_payload: z.object({
    types_generated: z.array(z.string()),
    migrations_run: z.array(z.string()),
    env_config_keys: z.array(z.string()),
  }),
});

const FoundationToFrontendCorePayload = z.object({
  handoff_boundary: z.literal('FOUNDATION_TO_FRONTEND_CORE'),
  boundary_payload: z.object({
    auth_utilities: z.array(z.string()),
    design_token_source: z.string(),
    typed_props_generated: z.boolean(),
  }),
});

// P2-05a: RENAMED PIPELINE_TO_FRONTEND_INTELLIGENCE → SYNTHESIS_TO_FRONTEND_INTELLIGENCE (03c→05)
const SynthesisToFrontendIntelligencePayload = z.object({
  handoff_boundary: z.literal('SYNTHESIS_TO_FRONTEND_INTELLIGENCE'),
  boundary_payload: z.object({
    data_shapes: z.record(z.string(), z.string()),
    api_routes: z.array(z.string()),
    processing_complete: z.boolean(),
  }),
});

// P2-05a: 6 NEW boundaries for the 12-agent pipeline
// Source: 12-Agent-Craftsmanship.md L180-196

const CollectionToAnalysisPayload = z.object({
  handoff_boundary: z.literal('COLLECTION_TO_ANALYSIS'),
  boundary_payload: z.object({
    pipeline_stages_completed: z.array(z.string()),
    raw_data_schemas: z.array(z.string()),
    sse_event_types: z.array(z.string()),
    cost_tracking_state: z.record(z.string(), z.unknown()),
  }),
});

const AnalysisToSynthesisPayload = z.object({
  handoff_boundary: z.literal('ANALYSIS_TO_SYNTHESIS'),
  boundary_payload: z.object({
    system_prompts_written: z.array(z.string()),
    analysis_outputs: z.array(z.record(z.string(), z.unknown())),
    prompt_eval_results: z.array(z.record(z.string(), z.unknown())),
    reasoning_patterns_applied: z.array(z.string()),
  }),
});

const SynthesisToFrontendPayload = z.object({
  handoff_boundary: z.literal('SYNTHESIS_TO_FRONTEND'),
  boundary_payload: z.object({
    validated_data_contracts: z.array(z.string()),
    api_routes_available: z.array(z.string()),
    zod_schemas_enforced: z.array(z.string()),
    pipeline_output_shapes: z.array(z.record(z.string(), z.unknown())),
    // [AIS4-7] Agent 03c's playbook tells it to emit this and its self-assessment checks for it. Undeclared,
    // the emit tool built from this schema had no field for it, so that check could never pass.
    quality_assessment_summary: z.string().min(1),
  }),
});

// [AIS4-7] A golden-master route: agent 08 screenshots `path`, and halts on a bare string or an entry
// without one. The other keys agent 04's playbook describes are named; anything else passes through.
const GoldenMasterRouteSchema = z.object({
  path: z.string().min(1),
  label: z.string().optional(),
  requires_auth: z.boolean().optional(),
  fixture_param: z.string().optional(),
}).catchall(z.unknown());

const FrontendCoreToBrowserTestingPayload = z.object({
  handoff_boundary: z.literal('FRONTEND_CORE_TO_BROWSER_TESTING'),
  boundary_payload: z.object({
    routes_created: z.array(z.string()),
    design_tokens_defined: z.array(z.string()),
    component_library_exports: z.array(z.string()),
    golden_master_routes: z.array(GoldenMasterRouteSchema),
  }),
});

const BrowserToCraftsmanshipPayload = z.object({
  handoff_boundary: z.literal('BROWSER_TO_CRAFTSMANSHIP'),
  boundary_payload: z.object({
    diff_cluster_report: z.array(z.record(z.string(), z.unknown())),
    lighthouse_scores: z.record(z.string(), z.unknown()),
    a11y_violations: z.array(z.record(z.string(), z.unknown())),
    responsive_failures: z.array(z.record(z.string(), z.unknown())),
  }),
});

const CraftsmanshipToDeploymentPayload = z.object({
  handoff_boundary: z.literal('CRAFTSMANSHIP_TO_DEPLOYMENT'),
  boundary_payload: z.object({
    final_quality_gate_results: z.record(z.string(), z.unknown()),
    pixel_diff_status: z.enum(['PASS', 'FAIL']),
    lighthouse_status: z.enum(['PASS', 'FAIL']),
    bugs_fixed_count: z.number().int().min(0),
  }),
});

const FrontendCoreToFrontendIntelligencePayload = z.object({
  handoff_boundary: z.literal('FRONTEND_CORE_TO_FRONTEND_INTELLIGENCE'),
  boundary_payload: z.object({
    design_tokens_available: z.array(z.string()),
    component_library_exports: z.array(z.string()),
    layout_slots: z.array(z.string()),
  }),
});

const TestingToDeploymentPayload = z.object({
  handoff_boundary: z.literal('TESTING_TO_DEPLOYMENT'),
  boundary_payload: z.object({
    test_suites_passed: z.array(z.string()),
    coverage_pct: z.number().min(0).max(100),
    critical_paths_verified: z.boolean(),
  }),
});

// Upgrade 6 Phase 6.9-6.10: 4 new typed boundaries replacing GENERIC usage.

/** Agent 02 → 03a: API integration artifacts. */
const ApiToCollectionPayload = z.object({
  handoff_boundary: z.literal('API_TO_COLLECTION'),
  boundary_payload: z.object({
    api_clients_configured: z.array(z.string()),
    secrets_verified: z.array(z.string()),
    retry_policies: z.array(z.object({
      service: z.string(),
      max_retries: z.number().int().min(0),
      backoff_ms: z.number().int().min(0),
    })),
  }),
});

/** Agent 05 → 06: AI/intelligence layer ready for admin wiring. */
const FrontendIntelligenceToAdminPayload = z.object({
  handoff_boundary: z.literal('FRONTEND_INTELLIGENCE_TO_ADMIN'),
  boundary_payload: z.object({
    ai_components_created: z.array(z.string()),
    prompt_chains_wired: z.array(z.string()),
    intelligence_layer_ready: z.boolean(),
  }),
});

/** Agent 06 → 07: Admin/config layer ready for testing. */
const AdminToTestingPayload = z.object({
  handoff_boundary: z.literal('ADMIN_TO_TESTING'),
  boundary_payload: z.object({
    cache_layer_configured: z.boolean(),
    observability_endpoints: z.array(z.string()),
    resilience_config: z.object({
      circuit_breaker_enabled: z.boolean(),
      rate_limiting_enabled: z.boolean(),
    }),
  }),
});

/** Agent 10: deployment verification report → Agent 11 (Sugar Trainer hardening). */
const DeploymentCompletePayload = z.object({
  handoff_boundary: z.literal('DEPLOYMENT_COMPLETE'),
  boundary_payload: z.object({
    deployment_url: z.string().url().optional(),
    vercel_config_valid: z.boolean(),
    env_vars_set: z.array(z.string()),
    lighthouse_scores: z.object({
      performance: z.number().min(0).max(100),
      accessibility: z.number().min(0).max(100),
      best_practices: z.number().min(0).max(100),
      seo: z.number().min(0).max(100),
    }),
    health_check_passed: z.boolean(),
    // Agent 11 hardening contract: target URL + idempotent redeploy command.
    // [AIS4-7] Required. They were optional "during transition" for v1 fixtures; no fixture carries this
    // boundary, and Agent 11 halts at pre-flight when one is absent. Optional only moved that failure from
    // Agent 10's emit, where schema-on-write sends it back, to Agent 11, where nothing can. is_idempotent
    // stays a boolean: false is an honest report Agent 11 refuses, not a malformed handoff.
    staging_url: z.string().url(),
    deploy_command: z.string().min(1),
    is_idempotent: z.boolean(),
  }),
});

/**
 * @deprecated Upgrade 6 Phase 6.12 — all 12 agents now use typed boundaries.
 * GENERIC remains in the discriminated union as a safety net during migration
 * but no agent config should reference it. The validate-handoff-envelope.ts
 * wrapper emits a runtime warning when GENERIC is detected. Remove entirely
 * once Phase 8 confirms zero GENERIC payloads in production runs.
 */
const GenericPayload = z.object({
  handoff_boundary: z.literal('GENERIC'),
  boundary_payload: z.record(z.string(), z.unknown()),
});

// Agent 11 Sugar Trainer (post-deployment hardening): per-round browser-test data,
// HITL decisions, and applied edits. Every applied edit MUST carry a hitl_approval_id
// (defense in depth: schema check + pre-commit hook + verify-hitl-approvals.ts).

const BrowserRunSchema = z.object({
  run_index: z.number().int().min(1).max(10),
  pass: z.boolean(),
  duration_ms: z.number(),
  failures: z.array(z.object({
    test_name: z.string(),
    error_message: z.string(),
    screenshot_path: z.string().optional(),
    ssim_diff_path: z.string().optional(),
    console_log_path: z.string().optional(),
  })),
  ssim_baseline_drift: z.number().optional(),
});

const FailureModeSchema = z.object({
  signature: z.string(),  // hash of (test_name, error_class, stack_top_frame)
  occurrences: z.number().int().min(1),
  affected_runs: z.array(z.number().int()),
});

const HitlDecisionSchema = z.object({
  question: z.string(),
  response: z.string(),
  mode: z.enum(['human-direct', 'you-decide', 'delegate', 'replay']),  // replay: a recorded answer, accepted only in test or CI runs ([AIS6-2])
  response_time_ms: z.number(),
});

const AppliedEditSchema = z.object({
  file_path: z.string(),
  diff: z.string(),
  commit_sha: z.string(),
  hitl_approval_id: z.string().min(1),  // FK to steering-decisions log
  hitl_decision_timestamp: z.string().datetime({ offset: true }),
  hitl_responder_mode: z.enum(['human-direct', 'you-decide', 'delegate', 'replay']),  // must match the decision's mode (verify-hitl-approvals)
});

const KeepFileOverrideSchema = z.object({
  file_path: z.string(),
  bug_description: z.string(),
  human_decision: z.enum(['override-keep', 'skip-bug', 'file-as-bug-only']),
  hitl_approval_id: z.string().min(1),
});

const RoundSchema = z.object({
  round_index: z.number().int().min(1),
  browser_runs: z.array(BrowserRunSchema).length(10),
  deduped_failure_modes: z.array(FailureModeSchema),
  hitl_decisions: z.array(HitlDecisionSchema),
  user_supplied_test_inputs: z.array(z.string()),
  applied_edits: z.array(AppliedEditSchema),
  redeploy: z.object({
    command: z.string(),
    exit_code: z.number(),
    staging_url_check_passed: z.boolean(),
  }).optional(),
  round_verdict: z.enum(['clean', 'partial', 'regressed']),
  keep_file_overrides: z.array(KeepFileOverrideSchema),  // empty for V1 builds
});

const HardeningToLearningPayload = z.object({
  handoff_boundary: z.literal('HARDENING_TO_LEARNING'),
  boundary_payload: z.object({
    rounds: z.array(RoundSchema).min(1).max(7),  // 5 cap + up to 2 human-extend
    hot_reached: z.boolean(),
    consecutive_clean_rounds: z.number().int().min(0),
    termination_reason: z.enum([
      'hot_threshold_met',
      'max_iterations',
      'human_stop',
      'regressed_unrecoverable',
    ]),
    total_rounds: z.number().int().min(1).max(7),
    ssim_variance_across_clean_rounds: z.number().optional(),
    staging_url: z.string().url(),
    deployment_count: z.number().int().min(1),
  }).refine(
    (data) => !data.hot_reached || data.consecutive_clean_rounds >= 2,
    { message: 'hot_reached requires consecutive_clean_rounds >= 2' },
  ),
});

/** Agent 00 (pre-pipeline): spec validation report → Agent 01 Foundation. */
const SpecToFoundationPayload = z.object({
  handoff_boundary: z.literal('SPEC_TO_FOUNDATION'),
  boundary_payload: z.object({
    spec_validation_path: z.string(),
    build_clearance: z.enum(['APPROVED', 'CONDITIONAL', 'BLOCKED']),
    p0_count: z.number().int().min(0),
    p1_count: z.number().int().min(0),
    p2_count: z.number().int().min(0),
    entity_count: z.number().int().min(0),
    resolved_ambiguities: z.array(z.string()),
  }),
});

// --- Universal fields (every handoff) ---

const DecisionSchema = z.object({
  decision_id: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().min(1),
  constraints_downstream: z.string(),
  reversible: z.boolean(),
});

const LimitationSchema = z.object({
  limitation: z.string().min(1),
  impact: z.enum(['low', 'medium', 'high']),
  suggested_mitigation: z.string(),
});

const FailedAttemptSchema = z.object({
  what_was_tried: z.string().min(1),
  why_it_failed: z.string().min(1),
  should_retry: z.boolean(),
});

const ConsumerInstructionSchema = z.object({
  instructions: z.string().min(1),
  priority_fields: z.array(z.string()),
  watch_for: z.array(z.string()),
});

const VerificationCommandSchema = z.object({
  command: z.string().min(1),
  expected_result: z.string().min(1),
  description: z.string(),
});

// --- Base schema (universal fields) ---

// P2-05a: schema_version + context_enrichment + soul_ledger fields
const SoulLedgerEntrySchema = z.object({
  judgment_type: z.enum(['DESIGN', 'PROMPT']),
  decision: z.string().min(1),
  rationale: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

const ContextEnrichmentSchema = z.object({
  microcorrectors_fired: z.array(z.string()),
  token_budget_used_pct: z.number().min(0).max(100),
});

// Phase 4.1 D4.2: absorption_status sub-schema. Optional, structurally
// validated here; the 4-precondition semantic check fires at orchestrator
// post-handoff hook (see lib/contract-validators/absorption-status-validator.ts
// + scripts/master-agentic-orchestrator.ts:1382). Field absent → no D3 check.
// Referenced section: skills/coordination/playbook-architecture-standard.md "Absorption Declaration" (11.2 When pruning fires).
const AbsorptionStatusSchema = z.object({
  absorbs: z.array(z.string().uuid()).default([]),
  leaves_for_downstream: z.array(z.string()).default([]),  // agent IDs, not UUIDs
  safe_to_prune_after: z.string().datetime({ offset: true }),
  state: z.enum(['active', 'absorbed', 'pruned']),
});

// craftsmanship-reconciliation Phase B.1 (session 2026-05-24): per-step
// attestations the agent emits to assert that each ⚡ Verify in its step file
// either passed, failed honestly, or was skipped (prose-only steps). The
// orchestrator's post-handoff verification phase re-runs every executable
// verify in the sandbox and cross-checks the agent's claims. Mismatches
// (claimed PASS, actual FAIL) → immediate HALT (attestation lie). Honest FAIL
// → corrector cycle (max 2 cycles per gap).
export const StepAttestationSchema = z.object({
  step_id: z.string().min(1),                                // "1.2", "3.4", or "Phase-1" for research agents
  step_title: z.string().min(1),
  verify_kind: z.enum(['inline', 'fenced', 'prose']),         // prose = no executable command; attestation-only
  verify_command: z.string(),                                 // verbatim bash; empty string when verify_kind === 'prose'
  claimed_status: z.enum(['PASS', 'FAIL', 'SKIPPED']),
  evidence: z.string(),                                       // stdout/stderr/note from the agent — empty allowed for PASS
  agent_cycle: z.number().int().min(1).max(3).default(1),     // 1 = first try, 2 = after Corrector cycle 1, 3 = after Corrector cycle 2
});
export type StepAttestation = z.infer<typeof StepAttestationSchema>;

const HandoffBaseSchema = z.object({
  schema_version: z.string().default('1.2'),       // P2-05a: mandatory semver. 1.2 (craftsmanship-recon B.1) adds step_attestations.
  // Upgrade 6 Phase 8.12: links .json + .md dual artifacts. Optional so existing
  // fixtures validate; orchestrator always populates it post-validation.
  handoff_id: z.string().uuid().optional(),
  producing_agent_id: AgentIdSchema,
  consuming_agent_ids: z.array(AgentIdSchema).min(1),
  pipeline_run_id: z.string().uuid(),
  timestamp: z.string().datetime({ offset: true }),
  gate_result_id: z.string().uuid(),
  behavioral_assessment: z.object({
    trust_verification: TrustVerificationSchema,
    self_assessment: SelfAssessmentSchema,
  }),
  discovery_compliance: DiscoveryComplianceSchema.nullable(),
  decisions_made: z.array(DecisionSchema),
  known_limitations: z.array(LimitationSchema),
  failed_attempts: z.array(FailedAttemptSchema),
  per_consumer_instructions: z.record(z.string(), ConsumerInstructionSchema),
  verification_commands: z.array(VerificationCommandSchema),
  // P2-05a: optional new fields (default empty so v1.0 payloads still validate)
  context_enrichment: ContextEnrichmentSchema.optional(),
  soul_ledger_appends: z.array(SoulLedgerEntrySchema).default([]),
  soul_ledger_archive: z.array(SoulLedgerEntrySchema).default([]),
  // Phase 4.1 D4.2 (session-27): absorption-pruning protocol metadata. Optional
  // so existing fixtures + the 26 handoff templates continue to validate. The
  // orchestrator's D3 hook (master-agentic-orchestrator.ts post-handoff) runs
  // the 4-precondition semantic check when this field is present.
  absorption_status: AbsorptionStatusSchema.optional(),
  // [140 SE-09]: emission-time lock over the evidence set — populated by the
  // orchestrator on the cross-family-judge path (commit BEFORE interrogation;
  // reveal stamped when the judge samples it). Optional — R19 additive.
  evidence_commitment: EvidenceCommitmentSchema.optional(),
  // craftsmanship-reconciliation Phase B.1: per-step attestations. Default
  // empty so v1.1 payloads validate. When populated, the orchestrator's
  // post-handoff verification phase cross-checks every executable claim by
  // re-running the verify command in the sandbox.
  step_attestations: z.array(StepAttestationSchema).default([]),
  // [TTR-2] (2026-09-01): the kernel Rule 8 channel, previously a phantom
  // field — mandated by agent-constitution.md Rule 8 + agent-kernel.md:30
  // ("log it in out_of_scope_findings; do not execute it"), read by the
  // receipt builder (scripts/lib/receipt.ts), present in NO schema until now
  // (0 hits across this file and all 26 handoff templates, verified
  // 2026-09-01). default([]) keeps every existing fixture validating (R19
  // additive). Schema-on-write exposes it to every agent's forced emit tool
  // automatically: buildHandoffTool() derives its JSON Schema from this Zod.
  // A non-empty array + run_outcome 'succeeded' is the receipt's
  // "departed-and-succeeded" state (T4) — via the 'out_of_scope' departure.
  out_of_scope_findings: z.array(z.string()).default([]),
  // [IMAG-8] (2026-09-06): the imagination rider. Divergent candidate SPECS
  // (opaque, human-judged, minted by runtime-imagination) ride beside the typed
  // payload — never inside a fidelity field (imagination-protocol.md §2 step 3).
  // .optional() with NO .default([]) — the absorption_status precedent (:399),
  // deliberately NOT the out_of_scope_findings default([]) shape above — so a
  // flag-off (IMAGINATION_MODE=OFF) emission OMITS the key entirely and the
  // byte-identity proof (IMAG-20) holds. Producer allowlist is enforced by the
  // IMAGINATION_GUARD_MODE check in validate-handoff.ts, not here: the envelope
  // transports, it does not police (drop-never-block). R19 additive.
  divergence_candidates: z.array(DivergenceCandidateSchema).optional(),
});

// Phase 2 / 2D: research-pipeline payloads (5 new boundaries).
// These describe the research substrate that produces corpus-grounded
// methodology specs feeding into product-build pipelines.

/** Research-reader → graph-builder. Per-source notes + per-session counts + drift indicator. */
const ReaderToGraphPayload = z.object({
  handoff_boundary: z.literal('READER_TO_GRAPH'),
  boundary_payload: z.object({
    session_id: z.string(),
    notes_emitted: z.array(z.string()),               // reading-notes/{slug}.notes.md paths
    concept_count_total: z.number().int().min(0),
    mechanism_count_total: z.number().int().min(0),
    tension_count_total: z.number().int().min(0),
    paradigm_anchors_used: z.array(z.string()),       // canonical anchor IDs
    drift_score: z.number(),                          // signed; |drift| > 0.30 → critical band
    drift_band: z.enum(['clean', 'advisory', 'critical']),
    ensemble_composition: z.string(),                 // e.g. "3-way (Opus + GPT-5.4 + Gemini)"
  }),
});

/** Graph-builder → synthesizer. Graph manifest + amendment record + cross-paradigm tensions. */
const GraphToSynthesisPayload = z.object({
  handoff_boundary: z.literal('GRAPH_TO_SYNTHESIS'),
  boundary_payload: z.object({
    graph_manifest_path: z.string(),                  // graph/graph-manifest.json
    schema_version: z.string(),
    concept_count: z.number().int().min(0),
    mechanism_count: z.number().int().min(0),
    framework_count: z.number().int().min(0),
    tension_count: z.number().int().min(0),
    cluster_count: z.number().int().min(0),
    cluster_distribution: z.record(z.string(), z.number()),
    amendments_present: z.array(z.string()),          // post-{session}-amendment.json paths
    cross_paradigm_tension_ids: z.array(z.string()),
  }),
});

/** Synthesizer → product-specific consumer (e.g. marketing-availability-builder). */
const SynthesisToProductPayload = z.object({
  handoff_boundary: z.literal('SYNTHESIS_TO_PRODUCT'),
  boundary_payload: z.object({
    synthesis_artifact_paths: z.array(z.string()),
    cross_source_claims: z.array(z.record(z.string(), z.unknown())),
    paradigm_anchors_cited: z.array(z.string()),
    consumed_graph_node_ids: z.array(z.string()),
    confidence_calibration: z.number().min(0).max(1),
    coverage_metrics: z.record(z.string(), z.unknown()),  // per-paradigm coverage
  }),
});

/** Marketing-availability-builder → marketing-availability-validator. */
const AvailabilityToLibraryPayload = z.object({
  handoff_boundary: z.literal('AVAILABILITY_TO_LIBRARY'),
  boundary_payload: z.object({
    availability_artifact_path: z.string(),
    methodology_session: z.string(),                  // e.g. "M7" or "A.M.1b"
    paradigm_anchors_cited: z.array(z.string()),      // ≥2 from canon roster
    cited_graph_concept_ids: z.array(z.string()),
    methodology_refs_actual: z.array(z.string()),     // [M1, M2, ...] this output cites
    amendment_record_path: z.string().nullable(),
  }),
});

/** Validator → terminal (closes research pipeline). */
const ResearchValidatorToLearningPayload = z.object({
  handoff_boundary: z.literal('RESEARCH_VALIDATOR_TO_LEARNING'),
  boundary_payload: z.object({
    validation_verdict: z.enum(['approve', 'advisory', 'critical_rework']),
    builder_artifact_path: z.string(),
    paradigm_anchor_check_passed: z.boolean(),
    paradigm_anchors_found_count: z.number().int().min(0),
    family_disjoint_with_builder: z.boolean(),        // forbidSameFamily structural check
    avg_amendment_coverage_pct: z.number().min(0).max(100),
    failure_modes: z.array(z.string()),               // empty when verdict = approve
  }),
});

// --- Per-boundary variants extending base ---

// P2-05a: RENAMED → FoundationToCollection
const FoundationToCollection = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('FOUNDATION_TO_COLLECTION'),
  boundary_payload: FoundationToCollectionPayload.shape.boundary_payload,
});

const FoundationToFrontendCore = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('FOUNDATION_TO_FRONTEND_CORE'),
  boundary_payload: FoundationToFrontendCorePayload.shape.boundary_payload,
});

// P2-05a: RENAMED → SynthesisToFrontendIntelligence
const SynthesisToFrontendIntelligence = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('SYNTHESIS_TO_FRONTEND_INTELLIGENCE'),
  boundary_payload: SynthesisToFrontendIntelligencePayload.shape.boundary_payload,
});

const FrontendCoreToFrontendIntelligence = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('FRONTEND_CORE_TO_FRONTEND_INTELLIGENCE'),
  boundary_payload: FrontendCoreToFrontendIntelligencePayload.shape.boundary_payload,
});

const TestingToDeployment = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('TESTING_TO_DEPLOYMENT'),
  boundary_payload: TestingToDeploymentPayload.shape.boundary_payload,
});

const Generic = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('GENERIC'),
  boundary_payload: GenericPayload.shape.boundary_payload,
});

// P2-05a: 6 NEW boundary variants
const CollectionToAnalysis = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('COLLECTION_TO_ANALYSIS'),
  boundary_payload: CollectionToAnalysisPayload.shape.boundary_payload,
});

const AnalysisToSynthesis = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('ANALYSIS_TO_SYNTHESIS'),
  boundary_payload: AnalysisToSynthesisPayload.shape.boundary_payload,
});

const SynthesisToFrontend = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('SYNTHESIS_TO_FRONTEND'),
  boundary_payload: SynthesisToFrontendPayload.shape.boundary_payload,
});

const FrontendCoreToBrowserTesting = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('FRONTEND_CORE_TO_BROWSER_TESTING'),
  boundary_payload: FrontendCoreToBrowserTestingPayload.shape.boundary_payload,
});

const BrowserToCraftsmanship = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('BROWSER_TO_CRAFTSMANSHIP'),
  boundary_payload: BrowserToCraftsmanshipPayload.shape.boundary_payload,
});

const CraftsmanshipToDeployment = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('CRAFTSMANSHIP_TO_DEPLOYMENT'),
  boundary_payload: CraftsmanshipToDeploymentPayload.shape.boundary_payload,
});

// Upgrade 6 Phase 6.9: 4 new typed boundary variants
const ApiToCollection = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('API_TO_COLLECTION'),
  boundary_payload: ApiToCollectionPayload.shape.boundary_payload,
});

const FrontendIntelligenceToAdmin = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('FRONTEND_INTELLIGENCE_TO_ADMIN'),
  boundary_payload: FrontendIntelligenceToAdminPayload.shape.boundary_payload,
});

const AdminToTesting = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('ADMIN_TO_TESTING'),
  boundary_payload: AdminToTestingPayload.shape.boundary_payload,
});

const DeploymentComplete = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('DEPLOYMENT_COMPLETE'),
  boundary_payload: DeploymentCompletePayload.shape.boundary_payload,
});

// Agent 00: Spec validation → Foundation
const SpecToFoundation = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('SPEC_TO_FOUNDATION'),
  boundary_payload: SpecToFoundationPayload.shape.boundary_payload,
});

// Agent 11: Sugar Trainer hardening report (terminal). The .refine() on the
// inner payload (hot_reached → consecutive_clean_rounds ≥ 2) is preserved by
// pulling boundary_payload through the shape accessor below.
const HardeningToLearning = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('HARDENING_TO_LEARNING'),
  boundary_payload: HardeningToLearningPayload.shape.boundary_payload,
});

// Phase 2 / 2D: 5 research-pipeline boundary variants
const ReaderToGraph = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('READER_TO_GRAPH'),
  boundary_payload: ReaderToGraphPayload.shape.boundary_payload,
});

const GraphToSynthesis = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('GRAPH_TO_SYNTHESIS'),
  boundary_payload: GraphToSynthesisPayload.shape.boundary_payload,
});

const SynthesisToProduct = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('SYNTHESIS_TO_PRODUCT'),
  boundary_payload: SynthesisToProductPayload.shape.boundary_payload,
});

const AvailabilityToLibrary = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('AVAILABILITY_TO_LIBRARY'),
  boundary_payload: AvailabilityToLibraryPayload.shape.boundary_payload,
});

const ResearchValidatorToLearning = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('RESEARCH_VALIDATOR_TO_LEARNING'),
  boundary_payload: ResearchValidatorToLearningPayload.shape.boundary_payload,
});

// v6 Phase 2.2.6: Prompt Manager (agent-12) — variant #24.
// Payload schema lives in contracts/types/prompts/prompt-manager-envelope.ts;
// see build-log/upgrade-v4/2.1-audit.md §2.1.3 for the variant-count correction
// (live had 23 at session-2 start; this is the 24th).
const PromptManager = HandoffBaseSchema.extend({
  handoff_boundary: z.literal('PROMPT_MANAGER'),
  boundary_payload: PromptManagerPayload.shape.boundary_payload,
});

// --- Main schema: discriminated union ---

export const HandoffEnvelopeSchema = z.discriminatedUnion('handoff_boundary', [
  SpecToFoundation,
  FoundationToCollection,
  FoundationToFrontendCore,
  SynthesisToFrontendIntelligence,
  FrontendCoreToFrontendIntelligence,
  TestingToDeployment,
  Generic,
  // P2-05a: 6 new
  CollectionToAnalysis,
  AnalysisToSynthesis,
  SynthesisToFrontend,
  FrontendCoreToBrowserTesting,
  BrowserToCraftsmanship,
  CraftsmanshipToDeployment,
  // Upgrade 6 Phase 6.9: 4 new typed boundaries
  ApiToCollection,
  FrontendIntelligenceToAdmin,
  AdminToTesting,
  DeploymentComplete,
  // Agent 11: Sugar Trainer terminal hardening boundary
  HardeningToLearning,
  // Phase 2 / 2D research pipeline (5 new boundaries)
  ReaderToGraph,
  GraphToSynthesis,
  SynthesisToProduct,
  AvailabilityToLibrary,
  ResearchValidatorToLearning,
  // v6 Phase 2.2.6: variant #24 (Manager — agent-12)
  PromptManager,
]);
export type HandoffEnvelope = z.infer<typeof HandoffEnvelopeSchema>;
