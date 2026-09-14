// Extracted from the factory repository (skill-ecosystem, private),
// contracts/types/prompts/prompt-contract.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * Prompt Contract — the authoritative schema for every prompt in the ecosystem.
 *
 * This is Step 1 of the Prompt Manager build (Phase 2 of v6 upgrade). It is
 * load-bearing: the agent config, derivation, emission, parsing, reconciliation,
 * runtime, and self-test all bind to this contract.
 *
 * @skill: governance/structured-output-schemas.md — discriminated unions (no dedicated section)
 * @skill: governance/prompt-multiplier.md §five-scoring-dimensions
 * @skill: governance/temperature-profiles.md §four-temperature-tiers
 * @skill: foundational/discovery-frame.md §in-agent-output-pipelines
 *
 * Authoritative decisions baked in (see prompt-librarian-spec.md v2.0):
 *  - Decision 1: 9-section structured prompts (validated via section-vocabulary.ts)
 *  - Decision 2: Markdown is authoritative; .contract.json is derived
 *  - Decision 3: All versions kept forever (version field semantics support this)
 *  - Decision 4: Tiered inputs (4 tiers) with surface restrictions
 *  - Decision 5: Canon snapshot at build start; canon_version recorded per prompt
 *
 * v6 deltas from U6 source (Phase 2.2.5):
 *  - InvocationSurfaceSchema: removed 'chat-paste'; added 'embedded-in-product'
 *  - Refinement 4 (Tier-surface consistency): vacuous structure preserved
 *  - Added optional source_origin (which of 6 prompt surfaces produced this)
 *  - Added optional physical_path (on-disk path of source prompt)
 */

import { z } from 'zod';

// ============================================================================
// SECTION 1 — Foundational primitive types
// ============================================================================

export const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Must be semver: major.minor.patch (e.g., 1.2.0)');

export const UuidSchema = z.string().uuid();

export const IsoDatetimeSchema = z.string().datetime();

export const ContentHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'Must be a 64-char lowercase SHA-256 hex hash');

export const PromptIdSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]+(\.[a-z][a-z0-9-]+)*$/,
    'Format: {product}.{intent-kebab-case}',
  );

export const TierSchema = z.enum(['FORENSIC', 'PRECISION', 'SYNTHESIS', 'NARRATIVE']);
export type Tier = z.infer<typeof TierSchema>;

// v6 delta: 'chat-paste' removed (Manager onboards prompts embedded in shipped
// products, not pasted ad-hoc into chat). 'embedded-in-product' replaces it.
export const InvocationSurfaceSchema = z.enum([
  'embedded-in-product',
  'cli',
  'product-api',
  'inter-product-bus',
]);
export type InvocationSurface = z.infer<typeof InvocationSurfaceSchema>;

/**
 * v6 addition (Phase 2.2.5): which of the six prompt surfaces this contract's
 * source prompt came from. Inventoried in build-log/upgrade-v4/2.1-audit.md §2.1.5.
 *  - derived: synthesized by the Manager from skill files + canon
 *  - playbook: prompts/*.md build workflow files
 *  - orchestration: templates/playbooks/steps/agent-*-steps.md
 *  - product-runtime: packages/runtime-input-enrichment, session-input-enrichment
 *  - mcp-server: packages/mcp-server-* internal prompts (out-of-scope for Manager)
 *  - tool-schema: derived from a tool-use schema declaration
 *  - manual: hand-authored, not yet classified
 */
export const SourceOriginSchema = z.enum([
  'derived',
  'playbook',
  'orchestration',
  'product-runtime',
  'mcp-server',
  'tool-schema',
  'manual',
]);
export type SourceOrigin = z.infer<typeof SourceOriginSchema>;

// ============================================================================
// SECTION 2 — Tiered Input System (Decision 4)
// ============================================================================

export const SchemaBindingSchema = z.object({
  schema_id: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]+$/,
      'Format: {product}.{schema-name}',
    ),
  schema_version: SemverSchema,
});
export type SchemaBinding = z.infer<typeof SchemaBindingSchema>;

/**
 * Tier 1 — Inline scalars. Plain ZodObject; per-tier validation lives in
 * the parent contract's superRefine.
 */
export const Tier1InputSchema = z.object({
  tier: z.literal('inline-scalar'),
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
  scalar_type: z.enum(['string', 'number', 'boolean', 'enum']),
  enum_values: z.array(z.string()).optional(),
  default_value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type Tier1Input = z.infer<typeof Tier1InputSchema>;

/**
 * Tier 2 — Named references.
 */
export const Tier2InputSchema = z.object({
  tier: z.literal('named-reference'),
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
  reference_pattern: z.string().min(1),
  reference_resolver: z.enum(['filesystem', 'url', 'registry']),
});
export type Tier2Input = z.infer<typeof Tier2InputSchema>;

/**
 * Tier 3 — Product-schema objects.
 */
export const Tier3InputSchema = z.object({
  tier: z.literal('schema-object'),
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
  schema_binding: SchemaBindingSchema,
});
export type Tier3Input = z.infer<typeof Tier3InputSchema>;

/**
 * Tier 4 — Composed references. Phase 2 runtime; Phase 1 contracts only.
 */
export const Tier4InputSchema = z.object({
  tier: z.literal('composed'),
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
  composition: z.object({
    inner_tier: z.enum(['named-reference', 'schema-object']),
    inner_reference_pattern: z.string().optional(),
    inner_schema_binding: SchemaBindingSchema.optional(),
    min_items: z.number().int().positive(),
    max_items: z.number().int().positive(),
    constraints: z.array(z.string()),
  }),
});
export type Tier4Input = z.infer<typeof Tier4InputSchema>;

/**
 * Discriminated union — plain ZodObjects for proper discriminant inference.
 */
export const PromptInputSchema = z.discriminatedUnion('tier', [
  Tier1InputSchema,
  Tier2InputSchema,
  Tier3InputSchema,
  Tier4InputSchema,
]);
export type PromptInput = z.infer<typeof PromptInputSchema>;

export const InputDeclarationSchema = z.object({
  input: PromptInputSchema,
  allowed_surfaces: z
    .array(InvocationSurfaceSchema)
    .min(1, 'At least one invocation surface required'),
});
export type InputDeclaration = z.infer<typeof InputDeclarationSchema>;

// ============================================================================
// SECTION 3 — Output, Self-Test, Failure Modes, Citations
// ============================================================================

export const OutputShapeSchema = z.object({
  content_type: z.enum(['markdown', 'json', 'mixed', 'artifact-reference']),
  schema_ref: z.string().optional(),
  render_hint: z.string().optional(),
});
export type OutputShape = z.infer<typeof OutputShapeSchema>;

export const SelfTestSchema = z.object({
  invocation: z.record(z.string(), z.unknown()),
  expected_shape: z.string().min(20),
  validation_rules: z.array(z.string()).min(1),
});
export type SelfTest = z.infer<typeof SelfTestSchema>;

export const FailureModeSchema = z.object({
  mode: z.string().min(1),
  symptom: z.string().min(1),
  remediation: z.string().min(1),
});
export type FailureMode = z.infer<typeof FailureModeSchema>;

export const ExampleSchema = z.object({
  scenario: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
  expected_shape: z.string().min(1),
});
export type Example = z.infer<typeof ExampleSchema>;

export const SkillCitationSchema = z
  .string()
  .regex(
    /^@skill:\s+[a-z][a-z0-9-]*\/[a-z][a-z0-9-]+\.md\s+§[a-z0-9-]+$/,
    'Format: @skill: layer/file.md §section-id',
  );
export type SkillCitation = z.infer<typeof SkillCitationSchema>;

export const BoundSchemaSchema = z.object({
  schema_id: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]+$/,
      'Format: {product}.{schema-name}',
    ),
  schema_version: SemverSchema,
  binding_type: z.enum(['consumes', 'produces', 'references']),
});
export type BoundSchema = z.infer<typeof BoundSchemaSchema>;

// ============================================================================
// SECTION 4 — The PromptContract
// ============================================================================

export const PromptContractSchema = z
  .object({
    // Identity
    prompt_id: PromptIdSchema,
    contract_uuid: UuidSchema,
    product: z.string().min(1),
    prompt_version: SemverSchema,
    status: z.enum(['active', 'deferred', 'conflict', 'archived']),
    deferred_reason: z.string().optional(),

    // Intent
    intent_summary: z.string().min(10).max(200),
    intent_detail: z.string().min(20),
    outcome_declaration: z.string().min(20),

    // Inputs
    inputs: z.array(InputDeclarationSchema),

    // Output
    output_shape: OutputShapeSchema,

    // Bindings
    bound_schemas: z.array(BoundSchemaSchema),
    bound_skills: z
      .array(SkillCitationSchema)
      .min(1, 'Every prompt must cite at least one skill file'),

    // Quality envelope
    tier: TierSchema,
    resonance_floor: z.number().min(0).max(10),
    prompt_multiplier_score: z
      .number()
      .min(7.5, 'Prompts must clear the 7.5 floor')
      .max(10),

    // Operational
    preconditions: z.array(z.string()),
    failure_modes: z.array(FailureModeSchema),
    invocation_surface: z
      .array(InvocationSurfaceSchema)
      .min(1, 'Declare at least one invocation surface'),

    // Self-test (Pass 4 gate)
    self_test: SelfTestSchema,

    // Examples
    examples: z.array(ExampleSchema),

    // Provenance
    emitted_by: z.string(),
    emitted_at: IsoDatetimeSchema,
    derives_from: z.array(z.string()),

    // v6 additions (Phase 2.2.5): source surface + on-disk path of source prompt
    source_origin: SourceOriginSchema.optional(),
    physical_path: z.string().optional(),

    // Canon snapshot (Decision 5)
    canon_version: ContentHashSchema,

    // Markdown source-of-truth tracking (Decision 2)
    md_content_hash: ContentHashSchema,
  })
  .superRefine((contract, ctx) => {
    // Refinement 1: status='deferred' requires deferred_reason
    if (contract.status === 'deferred' && !contract.deferred_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deferred_reason'],
        message: 'deferred_reason is required when status="deferred"',
      });
    }

    // Refinement 2: prompt_id product matches product field
    const idProduct = contract.prompt_id.split('.')[0];
    if (idProduct !== contract.product) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prompt_id'],
        message: `prompt_id product "${idProduct}" must match product field "${contract.product}"`,
      });
    }

    // Refinement 3: Per-tier internal validation
    contract.inputs.forEach((decl, idx) => {
      const input = decl.input;

      if (
        input.tier === 'inline-scalar' &&
        input.scalar_type === 'enum' &&
        (!input.enum_values || input.enum_values.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['inputs', idx, 'input', 'enum_values'],
          message: 'enum_values is required when scalar_type="enum"',
        });
      }

      if (input.tier === 'composed') {
        const c = input.composition;
        if (c.max_items < c.min_items) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['inputs', idx, 'input', 'composition', 'max_items'],
            message: 'max_items must be >= min_items',
          });
        }
        if (c.inner_tier === 'named-reference' && !c.inner_reference_pattern) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['inputs', idx, 'input', 'composition', 'inner_reference_pattern'],
            message: 'inner_tier="named-reference" requires inner_reference_pattern',
          });
        }
        if (c.inner_tier === 'schema-object' && !c.inner_schema_binding) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['inputs', idx, 'input', 'composition', 'inner_schema_binding'],
            message: 'inner_tier="schema-object" requires inner_schema_binding',
          });
        }
      }
    });

    // Refinement 4: Tier-surface consistency.
    // v6 delta: U6 enforced that Tier 3/4 inputs cannot allow chat-paste. With
    // chat-paste removed from InvocationSurfaceSchema, the original rule is
    // structurally vacuous. The refinement structure is preserved (no-op body)
    // so superRefine indices don't shift; Manager-era surface constraints will
    // attach here when they appear.
    contract.inputs.forEach((_decl, _idx) => {
      // intentionally empty — see comment above
    });

    // Refinement 5: Top-level invocation_surface ⊆ intersection of required input surfaces
    const requiredInputs = contract.inputs.filter((d) => d.input.required);
    if (requiredInputs.length > 0) {
      const intersection = requiredInputs.reduce<Set<InvocationSurface>>(
        (acc, decl, i) => {
          if (i === 0) return new Set(decl.allowed_surfaces);
          return new Set(decl.allowed_surfaces.filter((s) => acc.has(s)));
        },
        new Set<InvocationSurface>(),
      );

      contract.invocation_surface.forEach((surface, idx) => {
        if (!intersection.has(surface)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['invocation_surface', idx],
            message: `Surface "${surface}" not allowed: at least one required input does not permit it. Allowed surfaces (intersection): [${[...intersection].join(', ')}]`,
          });
        }
      });
    }

    // Refinement 6: NARRATIVE tier requires resonance_floor >= 7.5
    if (contract.tier === 'NARRATIVE' && contract.resonance_floor < 7.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resonance_floor'],
        message: 'NARRATIVE tier requires resonance_floor >= 7.5',
      });
    }

    // Refinement 7: FORENSIC + bound_schemas should have a 'references' binding
    if (contract.tier === 'FORENSIC' && contract.bound_schemas.length > 0) {
      const hasReferences = contract.bound_schemas.some(
        (b) => b.binding_type === 'references',
      );
      if (!hasReferences) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bound_schemas'],
          message:
            'FORENSIC tier with bound_schemas should include at least one binding_type="references"',
        });
      }
    }

    // Refinement 8: self_test.invocation must include all required input names
    const requiredNames = contract.inputs
      .filter((d) => d.input.required)
      .map((d) => d.input.name);
    const providedNames = Object.keys(contract.self_test.invocation);
    const missing = requiredNames.filter((n) => !providedNames.includes(n));
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['self_test', 'invocation'],
        message: `self_test.invocation missing required inputs: ${missing.join(', ')}`,
      });
    }

    // Refinement 9: json/mixed output requires schema_ref
    if (
      ['json', 'mixed'].includes(contract.output_shape.content_type) &&
      !contract.output_shape.schema_ref
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['output_shape', 'schema_ref'],
        message: 'schema_ref is required when content_type is "json" or "mixed"',
      });
    }

    // Refinement 10: input names unique
    const names = contract.inputs.map((d) => d.input.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inputs'],
        message: `Duplicate input names: ${[...new Set(dupes)].join(', ')}`,
      });
    }
  });

export type PromptContract = z.infer<typeof PromptContractSchema>;

// ============================================================================
// SECTION 5 — Helpers for parsing and emission
// ============================================================================

/**
 * Determines which invocation surfaces a given input tier allows by default.
 * v6 delta: 'chat-paste' replaced with 'embedded-in-product' across all tiers.
 */
export function defaultSurfacesForTier(
  tier: PromptInput['tier'],
): InvocationSurface[] {
  switch (tier) {
    case 'inline-scalar':
    case 'named-reference':
      return ['embedded-in-product', 'cli', 'product-api', 'inter-product-bus'];
    case 'schema-object':
    case 'composed':
      return ['cli', 'product-api', 'inter-product-bus'];
    default: {
      const _exhaustive: never = tier;
      throw new Error(`Unhandled tier: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Computes the intersection of allowed surfaces across all required inputs.
 * The prompt's invocation_surface field MUST be a subset of this.
 */
export function computeAllowedSurfaces(
  inputs: InputDeclaration[],
): InvocationSurface[] {
  const required = inputs.filter((d) => d.input.required);
  if (required.length === 0) {
    return ['embedded-in-product', 'cli', 'product-api', 'inter-product-bus'];
  }
  return required.reduce<InvocationSurface[]>(
    (acc, decl, i) =>
      i === 0
        ? [...decl.allowed_surfaces]
        : acc.filter((s) => decl.allowed_surfaces.includes(s)),
    [],
  );
}

/**
 * Validates a contract; returns parsed value or human-readable error list.
 */
export function validateContract(
  raw: unknown,
):
  | { ok: true; contract: PromptContract }
  | { ok: false; errors: string[] } {
  const result = PromptContractSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, contract: result.data };
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

/**
 * Type guard for narrowing PromptInput on the discriminant.
 */
export function isInputOfTier<T extends PromptInput['tier']>(
  input: PromptInput,
  tier: T,
): input is Extract<PromptInput, { tier: T }> {
  return input.tier === tier;
}
