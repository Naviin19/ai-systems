// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/prompts/prompt-manager-envelope.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * Prompt Manager Envelope — variant #24 of the discriminated handoff envelope.
 *
 * Every agent in the compiler pipeline emits a typed handoff. This is the
 * variant emitted by the Prompt Manager (agent 12). The orchestrator
 * validates against the parent HandoffEnvelopeSchema discriminated union;
 * downstream agents read this to know what was emitted.
 *
 * @skill: governance/structured-output-schemas.md — discriminated unions (no dedicated section)
 * @skill: coordination/agent-memory-architecture.md §during-handoffs
 *
 * Spec source: prompt-librarian-spec.md §A.7 (renamed from "Librarian" → "Manager"
 * for v6; preserves the spec content, renames the role).
 *
 * STRUCTURE: This file exports the supporting type schemas (PromptSummary,
 * LibraryStats, SoulLedger) and a `PromptManagerPayload` schema that follows
 * the live envelope convention: `{ handoff_boundary: z.literal('PROMPT_MANAGER'),
 * boundary_payload: z.object({...}) }`. The parent HandoffEnvelopeSchema in
 * contracts/types/operational/handoff-envelope.ts extends HandoffBaseSchema
 * with this payload's shape to produce the 24th variant of its discriminated
 * union.
 *
 * v6 deltas from U6 source (renamed Librarian → Manager, surface enum updated):
 *  - Renamed PromptLibrary* → PromptManager*; emitted_by → '12-prompt-manager'
 *  - Removed 'chat-paste' from invocation_surface enum (replaced by 'embedded-in-product')
 *  - Renamed has_chat_paste → has_embedded_in_product
 *  - Renamed chat_paste_count → embedded_in_product_count in LibraryStats
 *  - Discriminant adapted from `envelope_type` to `handoff_boundary` to match
 *    live HandoffEnvelopeSchema convention
 */

import { z } from 'zod';
import {
  ContentHashSchema,
  IsoDatetimeSchema,
  PromptIdSchema,
  SemverSchema,
  TierSchema,
  type Tier,
} from './prompt-contract';

// ============================================================================
// SECTION 1 — Per-prompt summary (one row per emitted prompt)
// ============================================================================

/**
 * Status of a prompt as of envelope emission. Mirrors PromptContract.status
 * but lives at the envelope level so downstream agents can scan without
 * loading every individual contract.
 */
export const PromptEmissionStatusSchema = z.enum([
  'active',           // ready to use
  'deferred',         // dependency missing; will activate when it lands
  'conflict',         // operator edit conflicted with regeneration
  'archived',         // previous version, kept for history
  'regenerated',      // changed in this build (cascade triggered)
  'unchanged',        // no regeneration needed in this build
]);
export type PromptEmissionStatus = z.infer<typeof PromptEmissionStatusSchema>;

/**
 * One row per prompt in the library, summarized for downstream consumption.
 * Self-contained — downstream agents don't need to parse the full contract
 * unless they're inspecting a specific prompt.
 */
export const PromptSummarySchema = z.object({
  prompt_id: PromptIdSchema,
  current_version: SemverSchema,
  status: PromptEmissionStatusSchema,
  tier: TierSchema,
  intent_summary: z.string().min(10).max(200),

  // Surface and tier metadata. v6 delta: 'chat-paste' → 'embedded-in-product'.
  invocation_surface: z.array(
    z.enum(['embedded-in-product', 'cli', 'product-api', 'inter-product-bus']),
  ).min(1),
  has_embedded_in_product: z.boolean().describe(
    'Convenience flag: is this prompt accessible via embedded-in-product surface?',
  ),

  // Quality scores
  prompt_multiplier_score: z.number().min(7.5).max(10),
  resonance_floor: z.number().min(0).max(10),

  // For status='deferred'
  deferred_reason: z.string().nullable(),

  // For status='conflict'
  conflict_path: z
    .string()
    .nullable()
    .describe('Path to .conflict.md file if status="conflict"'),

  // Self-test outcome (Pass 4 only; null in earlier passes)
  self_test_passed: z.boolean().nullable(),
}).superRefine((summary, ctx) => {
  // status='deferred' must have deferred_reason
  if (summary.status === 'deferred' && !summary.deferred_reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deferred_reason'],
      message: 'deferred_reason is required when status="deferred"',
    });
  }
  // status='conflict' must have conflict_path
  if (summary.status === 'conflict' && !summary.conflict_path) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['conflict_path'],
      message: 'conflict_path is required when status="conflict"',
    });
  }
  // has_embedded_in_product consistency
  const hasEmbedded = summary.invocation_surface.includes('embedded-in-product');
  if (hasEmbedded !== summary.has_embedded_in_product) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['has_embedded_in_product'],
      message: 'has_embedded_in_product must reflect whether invocation_surface includes "embedded-in-product"',
    });
  }
});
export type PromptSummary = z.infer<typeof PromptSummarySchema>;

// ============================================================================
// SECTION 2 — Library-level statistics
// ============================================================================

/**
 * Aggregate stats for the library. Lets downstream agents and the soul ledger
 * reason about the library at a glance without iterating every prompt.
 */
export const LibraryStatsSchema = z.object({
  total_prompts: z.number().int().nonnegative(),

  // By status
  active_count: z.number().int().nonnegative(),
  deferred_count: z.number().int().nonnegative(),
  conflict_count: z.number().int().nonnegative(),
  archived_count: z.number().int().nonnegative(),

  // By regeneration outcome (this build)
  regenerated_in_this_build: z.number().int().nonnegative(),
  unchanged_in_this_build: z.number().int().nonnegative(),

  // By tier (for tier-distribution observability)
  tier_distribution: z.record(TierSchema, z.number().int().nonnegative()),

  // By surface. v6 delta: chat_paste_count → embedded_in_product_count.
  embedded_in_product_count: z.number().int().nonnegative(),
  cli_count: z.number().int().nonnegative(),
  product_api_count: z.number().int().nonnegative(),
  inter_product_bus_count: z.number().int().nonnegative(),

  // Quality
  mean_prompt_multiplier_score: z.number().min(7.5).max(10),
  min_prompt_multiplier_score: z.number().min(7.5).max(10),
});
export type LibraryStats = z.infer<typeof LibraryStatsSchema>;

// ============================================================================
// SECTION 3 — Soul ledger entry (Manager-specific)
// ============================================================================

/**
 * What the Manager learned about the product's prompt surface during
 * derivation. Read by downstream agents that consume Manager output.
 *
 * Fields are operator-readable strings — this is qualitative context,
 * not structured data, intentionally. (Distinct from the base envelope's
 * `soul_ledger_appends` which carries structured SoulLedgerEntry items.)
 */
export const PromptManagerSoulLedgerSchema = z.object({
  surface_observations: z
    .array(z.string())
    .describe(
      'What the Manager noticed about the product, e.g. ' +
      '"product has narrow outbound surface but deep state machine"',
    ),

  derivation_difficulties: z
    .array(z.string())
    .describe(
      'Things that were hard to derive cleanly, e.g. ' +
      '"three intents had overlapping semantics; merged into one prompt"',
    ),

  tier_distribution_note: z
    .string()
    .describe(
      'Qualitative comment on tier mix, e.g. ' +
      '"library leans NARRATIVE-heavy; consider whether SYNTHESIS could replace some"',
    ),

  recommendations_for_downstream: z
    .array(z.string())
    .describe(
      'Specific notes for later agents, e.g. ' +
      '"agent 04 may want to invoke {product}.ui-pattern-for-form"',
    ),
});
export type PromptManagerSoulLedger = z.infer<typeof PromptManagerSoulLedgerSchema>;

// ============================================================================
// SECTION 4 — The envelope variant payload
// ============================================================================

/**
 * Prompt Manager Payload — the boundary_payload shape for variant #24.
 *
 * Follows the live envelope convention: declares both `handoff_boundary`
 * (discriminant) and `boundary_payload` (content). The parent
 * HandoffEnvelopeSchema extends HandoffBaseSchema with `PromptManagerPayload
 * .shape.boundary_payload` to produce the 24th variant of its discriminated
 * union.
 */
export const PromptManagerPayload = z.object({
  handoff_boundary: z.literal('PROMPT_MANAGER'),
  boundary_payload: z.object({
    // Provenance
    emitted_by: z.literal('12-prompt-manager'),
    build_id: z.string().describe('UUID of the build'),
    pass: z.enum(['1', '2', '3', '4']).describe(
      'Which pass emitted this envelope (Manager runs in all four)',
    ),

    // Product context
    product: z.string().min(1),

    // Library content
    library_path: z
      .string()
      .describe('Filesystem path to the prompts/ directory in the product'),
    prompts: z.array(PromptSummarySchema),
    stats: LibraryStatsSchema,

    // Canon snapshot (Decision 5)
    canon_snapshot: ContentHashSchema,
    canon_drift_detected: z.boolean(),
    canon_drift_message: z.string().nullable().describe(
      'If canon_drift_detected, the build-output message describing the drift',
    ),

    // Self-test outcome (only populated at Pass 4)
    self_test_summary: z.object({
      total_run: z.number().int().nonnegative(),
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      failed_prompt_ids: z.array(PromptIdSchema),
    }).nullable(),

    // Manager-specific soul ledger (qualitative; distinct from base
    // envelope's structured soul_ledger_appends).
    manager_soul_ledger: PromptManagerSoulLedgerSchema,
  }),
}).superRefine((env, ctx) => {
  const bp = env.boundary_payload;

  // Refinement 1: stats counts must sum correctly
  const statusSum =
    bp.stats.active_count +
    bp.stats.deferred_count +
    bp.stats.conflict_count +
    bp.stats.archived_count;
  if (statusSum !== bp.stats.total_prompts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary_payload', 'stats'],
      message: `Status counts (${statusSum}) do not sum to total_prompts (${bp.stats.total_prompts})`,
    });
  }

  // Refinement 2: prompts.length matches total_prompts
  if (bp.prompts.length !== bp.stats.total_prompts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary_payload', 'prompts'],
      message: `prompts.length (${bp.prompts.length}) does not match stats.total_prompts (${bp.stats.total_prompts})`,
    });
  }

  // Refinement 3: every prompt's product matches envelope product
  bp.prompts.forEach((p, idx) => {
    const idProduct = p.prompt_id.split('.')[0];
    if (idProduct !== bp.product) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['boundary_payload', 'prompts', idx, 'prompt_id'],
        message: `Prompt product "${idProduct}" does not match envelope product "${bp.product}"`,
      });
    }
  });

  // Refinement 4: canon_drift_message required when canon_drift_detected
  if (bp.canon_drift_detected && !bp.canon_drift_message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary_payload', 'canon_drift_message'],
      message: 'canon_drift_message is required when canon_drift_detected=true',
    });
  }

  // Refinement 5: self_test_summary required at Pass 4
  if (bp.pass === '4' && !bp.self_test_summary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary_payload', 'self_test_summary'],
      message: 'self_test_summary is required at Pass 4',
    });
  }

  // Refinement 6: self_test_summary should be null in passes 1-3
  if (bp.pass !== '4' && bp.self_test_summary !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary_payload', 'self_test_summary'],
      message: 'self_test_summary should be null in passes 1-3 (self-test runs only at Pass 4)',
    });
  }

  // Refinement 7: self_test_summary internal consistency
  if (bp.self_test_summary) {
    const sum = bp.self_test_summary.passed + bp.self_test_summary.failed;
    if (sum !== bp.self_test_summary.total_run) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['boundary_payload', 'self_test_summary', 'total_run'],
        message: `passed + failed (${sum}) does not equal total_run (${bp.self_test_summary.total_run})`,
      });
    }
    if (bp.self_test_summary.failed_prompt_ids.length !== bp.self_test_summary.failed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['boundary_payload', 'self_test_summary', 'failed_prompt_ids'],
        message: 'failed_prompt_ids length must equal failed count',
      });
    }
  }

  // Refinement 8: tier_distribution counts must sum to total_prompts
  const tierSum = Object.values(bp.stats.tier_distribution).reduce(
    (a, b) => a + b,
    0,
  );
  if (tierSum !== bp.stats.total_prompts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary_payload', 'stats', 'tier_distribution'],
      message: `tier_distribution counts (${tierSum}) do not sum to total_prompts (${bp.stats.total_prompts})`,
    });
  }
});
export type PromptManagerPayloadShape = z.infer<typeof PromptManagerPayload>;

// ============================================================================
// SECTION 5 — Helpers
// ============================================================================

/**
 * Computes library stats from a list of prompt summaries. Used after all
 * prompts are emitted, before assembling the envelope.
 */
export function computeLibraryStats(
  prompts: PromptSummary[],
): LibraryStats {
  const tierDist: Record<Tier, number> = {
    FORENSIC: 0,
    PRECISION: 0,
    SYNTHESIS: 0,
    NARRATIVE: 0,
  };
  let embedded = 0;
  let cli = 0;
  let api = 0;
  let bus = 0;
  let pmsSum = 0;
  let pmsMin = 10;
  let regenerated = 0;
  let unchanged = 0;
  let active = 0;
  let deferred = 0;
  let conflict = 0;
  let archived = 0;

  for (const p of prompts) {
    tierDist[p.tier]++;
    if (p.invocation_surface.includes('embedded-in-product')) embedded++;
    if (p.invocation_surface.includes('cli')) cli++;
    if (p.invocation_surface.includes('product-api')) api++;
    if (p.invocation_surface.includes('inter-product-bus')) bus++;

    pmsSum += p.prompt_multiplier_score;
    if (p.prompt_multiplier_score < pmsMin) pmsMin = p.prompt_multiplier_score;

    switch (p.status) {
      case 'active':
        active++;
        break;
      case 'deferred':
        deferred++;
        break;
      case 'conflict':
        conflict++;
        break;
      case 'archived':
        archived++;
        break;
      case 'regenerated':
        active++; // regenerated prompts are also active
        regenerated++;
        break;
      case 'unchanged':
        active++; // unchanged prompts are also active
        unchanged++;
        break;
    }
  }

  return {
    total_prompts: prompts.length,
    active_count: active,
    deferred_count: deferred,
    conflict_count: conflict,
    archived_count: archived,
    regenerated_in_this_build: regenerated,
    unchanged_in_this_build: unchanged,
    tier_distribution: tierDist,
    embedded_in_product_count: embedded,
    cli_count: cli,
    product_api_count: api,
    inter_product_bus_count: bus,
    mean_prompt_multiplier_score: prompts.length > 0 ? pmsSum / prompts.length : 7.5,
    min_prompt_multiplier_score: prompts.length > 0 ? pmsMin : 7.5,
  };
}

/**
 * Validates the boundary_payload shape; returns parsed value or human-readable errors.
 * Used during agent-12 emission before wrapping in HandoffBase fields.
 */
export function validatePromptManagerPayload(
  raw: unknown,
):
  | { ok: true; payload: PromptManagerPayloadShape }
  | { ok: false; errors: string[] } {
  const result = PromptManagerPayload.safeParse(raw);
  if (result.success) {
    return { ok: true, payload: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((p) => String(p)).join('.')
        : '<root>';
    return `${path}: ${issue.message}`;
  });
  return { ok: false, errors };
}
