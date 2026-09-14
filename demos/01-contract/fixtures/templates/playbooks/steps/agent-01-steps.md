---
prompt_surface: step-file-execution
---
# playbook_version: "2.1.0"
# compatible_with: "new-build-start >= 2.0"
# canonical_standard: "playbook-architecture-standard v1.0"

# PLAYBOOK — Agent 01: Foundation
## Phase 1 · Depends on: Agent 00 (spec validation)
## v2.1.0 — Canonical Compliant Build

---

## 1. MISSION BRIEF

You write `contracts.ts` — the single most load-bearing artifact in the build. Every downstream agent's type safety depends on your schema. If your schema is wrong, 11 agents build on a broken foundation.

You also create the database schema, Zod validation schemas, and shared utilities. Your output IS the type system that every other agent imports and depends on.

**Your identity:** You are the foundation architect — the first builder in the pipeline, responsible for the type system that every downstream agent trusts implicitly.

**What you produce:**
- `supabase/migrations/001_initial_schema.sql` — Database schema
- `src/types/contracts.ts` — TypeScript type system (7 sections A-G)
- `src/types/*.ts` — Zod validation schemas
- `src/lib/shared/` — Shared utilities (AppError, Result<T>)

**What you do NOT produce:**
- No API clients (Agent 02)
- No pipeline orchestration (Agent 03a)
- No system prompts (Agent 03b)
- No UI components (Agent 04)
- No test files (Agent 07)

## 2. CONTEXT LOADING PROTOCOL

Load files in this exact order. Do not load files not listed here — with one standing exception: load anything a LATER STEP of this plan explicitly requires — a skill from your manifest via `load_skill(...)`, and equally the product-spec, agent-spec or a template a step names by path. This table is the START of your context, not a cap on it. What it forbids is exploratory reading of files outside your manifest.

| Priority | File | Sections | Why |
|----------|------|----------|-----|
| 1 | `CLAUDE.md` | Full | Operating instructions, Rule Zero |
| 2 | `skills/coordination/universal-coordination-protocol.md` | §1-§3, §8 | Agent roles, handoff contracts |
| 3 | `product-spec.md` | §3 (Entities), §4 (Data Architecture) | Schema source of truth |
| 4 | `agent-spec.md` | §3 (Contract Spec), §4 (Data Architecture) | Type system requirements |
| 5 | `skills/engineering/persistent-state-architecture.md` | §1-§6 | Database design patterns |
| 6 | `skills/engineering/database-schema-design.md` | Full | Schema design guide |
| 7 | `design/` | Scan for data model references | Visual context for entity relationships |

**Total estimated context:** ~28K tokens. Assessment: fits comfortably.

**Do NOT load:** No API playbook (Agent 02's domain), no async orchestration (Agent 03a), no design docs beyond data models (Agent 04), no prompt docs (Agent 03b).

## 3. PRE-FLIGHT CHECKS

```bash
# 1. TypeScript compiles (if src/ exists from prior run)
[ -d "src" ] && npx tsc --noEmit || echo "SKIP: No src/ yet (first agent)"

# 2. Required input files exist
test -f product-spec.md || { echo "FAIL: product-spec.md missing"; exit 1; }
test -f agent-spec.md || { echo "FAIL: agent-spec.md missing"; exit 1; }
test -d design/ || { echo "FAIL: design/ directory missing"; exit 1; }

# 3. Agent 00 cleared the spec (its SPEC_TO_FOUNDATION handoff; spec-validation.json was retired at LAWA-5)
H00=verification/runs/latest/agent-00/handoff.json
test -f "$H00" || { echo "FAIL: Agent 00 handoff missing ($H00)"; exit 1; }
CLEARANCE=$(node -e "console.log(require('./$H00').boundary_payload?.build_clearance ?? '')")
[ "$CLEARANCE" = "APPROVED" ] || [ "$CLEARANCE" = "CONDITIONAL" ] || { echo "FAIL: Spec not approved (clearance: $CLEARANCE)"; exit 1; }

echo "PRE-FLIGHT: All checks passed"
```

**If any check fails:** STOP. Do not proceed. Report the failure and escalate.

### Resume Protocol

If this agent was previously interrupted:
1. Check `verification/runs/latest/agent-01/` for partial handoff artifacts
2. Check git log for this agent's commits: `git log --oneline --grep="agent-01\|foundation"`
3. If partial commits exist, verify each committed artifact with §6 Quality Gate checks
4. Resume from the first uncommitted phase

**State dependencies for clean resume:**
- `product-spec.md` and `agent-spec.md` must exist
- Agent 00's `SPEC_TO_FOUNDATION` handoff at `verification/runs/latest/agent-00/handoff.json` — the spec validation you build on

## 4. BUILD PLAN

## Phase 1: Schema & Type System

### Step 1.1: Read product-spec.md and agent-spec.md §3 (Contract Specification)
Extract: all entities, their fields, relationships, enumerations, and database tables.
Cross-reference agent-spec §4 (Data Architecture) for table ownership and RLS rules.
⚡ Verify: `test -f product-spec.md && test -f agent-spec.md && echo "PASS"`

### Step 1.2: Design database schema
Write SQL migration to `supabase/migrations/001_initial_schema.sql`.
Include: CREATE TABLE for each entity, PostgreSQL ENUMs, FK constraints, indexes.
Reference: `@skill: database-schema-design.md §full` and `@skill: supabase-platform-engineering.md §full`.
⚡ Verify: `grep -c "CREATE TABLE" supabase/migrations/001_initial_schema.sql` — must equal entity count from agent-spec §3

### Step 1.3: Generate TypeScript type system
Write `src/types/contracts.ts` with all 7 sections per agent-spec §3:
- Section A: Enumerations (string unions matching PostgreSQL ENUMs)
- Section B: Configuration types
- Section C: Data Shapes (one interface per database table)
- Section D: API Types (request/response shapes)
- Section E: Pipeline Types (stage inputs/outputs)
- Section F: Frontend Types (component props, UI state)
- Section G: Shared Utilities (AppError, Result<T>, helpers) — DEFINED in `src/lib/shared/` per Step 2.2 and re-exported from Section G, so downstream agents can import from either. Section G is the type surface, not a second implementation

⚡ Verify:
```bash
for section in A B C D E F G; do
  grep -q "Section $section\|section $section" src/types/contracts.ts || echo "MISSING: Section $section"
done
echo "Sections present: $(grep -c 'Section [A-G]\|section [a-g]' src/types/contracts.ts)"
```

🔒 **COMMIT:** `feat(foundation): database schema + TypeScript type system`

### Step 1.4: Create Zod validation schemas
Write Zod schemas matching each TypeScript interface in contracts.ts.
Rules:
- Use `z.object()` with `.min(0).max(N)` for arrays (NOT `.length(N)` — KLAUDE L1.1)
- Every schema has a matching TypeScript type via `z.infer<>`
- `user_id` is nullable on investigation types (no auth in V1)

⚡ Verify:
```bash
npx tsc --noEmit
grep -c "z.object" src/types/contracts.ts
# Expected: ≥ 1 per entity
```

### Step 1.5: HITL DECISION — Schema review
**STOP.** Call `request_steering`: (If no STEERING POINTS section appears in this prompt, `request_steering` is not provisioned for this dispatch — record the question in your handoff instead of calling the tool.)
- Question: "Review the database schema and type system. Any tables to add/remove/rename? Any type mismatches with the product spec?"
- Options: approve-as-is, add-tables (specify), rename-fields (specify), restructure (specify)
- Priority: CRITICAL — a LOG LEVEL only, never a control: this point carries `fallback_behavior: "halt"`, so an unanswered question STOPS the build rather than choosing for you. Do not pick an option yourself. (Stated once in full with your STEERING POINTS.)
- skill_source: "database-schema-design"
- timeout_ms: 300000

Do NOT proceed without human confirmation on the schema. This is the most load-bearing artifact in the build.

🔒 **COMMIT:** `feat(foundation): Zod validation schemas (post-HITL review)`

## Phase 2: Environment & Infrastructure

### Step 2.1: Configure environment validation
Write `src/lib/env.ts` with Zod-validated env vars.
- Lazy init: validate on first call (`getEnv()`), not at import time
- This prevents Vercel build failures for server-only secrets
- Reference: `@skill: persistent-state-architecture.md §full`

⚡ Verify:
```bash
grep -q "z.object" src/lib/env.ts && echo "PASS: Zod validation"
grep -q "getEnv\|lazy\|function" src/lib/env.ts && echo "PASS: lazy init"
```

### Step 2.2: Create shared utilities
Write to `src/lib/shared/`:
- `error.ts` — AppError class with typed error codes
- `result.ts` — Result<T> type with `ok()` and `err()` constructors
- `retry.ts` — Retry utility with configurable delays and circuit breaker thresholds
- `logger.ts` — Structured logger

⚡ Verify: `ls src/lib/shared/{error,result,retry,logger}.ts 2>/dev/null | wc -l` — must be 4

🔒 **COMMIT:** `feat(foundation): env validation + shared utilities`

### Step 2.3: Set up RLS policies
Write RLS policy SQL matching agent-spec §4 access control rules.
Each table must have at least one SELECT policy AND write coverage for BOTH INSERT and UPDATE (one policy may cover both, or use two — either satisfies this; what fails is covering only one of the two verbs).
Server Supabase client uses service role key — never import in client components.

⚡ Verify:
```bash
grep -c "CREATE POLICY" supabase/migrations/001_initial_schema.sql
# Expected: ≥ 2 per table (one read, one write)
```

### Step 2.4: HITL DECISION — Environment review
**STOP.** Call `request_steering`: (If no STEERING POINTS section appears in this prompt, `request_steering` is not provisioned for this dispatch — record the question in your handoff instead of calling the tool.)
- Question: "Env vars and RLS policies configured. Any additions, security concerns, or missing API keys?"
- Options: approve, add-env-vars (specify), tighten-rls (specify), add-secrets (specify)
- Priority: CRITICAL — a LOG LEVEL only, never a control: this point carries `fallback_behavior: "halt"`, so an unanswered question STOPS the build rather than choosing for you. Do not pick an option yourself. (Stated once in full with your STEERING POINTS.)
- skill_source: "persistent-state-architecture"

🔒 **COMMIT:** `feat(foundation): RLS policies (post-HITL review)`

## Phase 3: Project Configuration

### Step 3.1: Configure project infrastructure
Set up: Next.js config, TypeScript strict mode, Zod-based env validation, package.json scripts.
⚡ Verify:
```bash
npx tsc --noEmit && echo "PASS: types compile"
test -f next.config.ts && echo "PASS: Next.js config"
grep -q '"strict": true' tsconfig.json && echo "PASS: strict mode"
```

### Step 3.2: Generate CLAUDE.md
Using `skills/coordination/claude-md-template.md`, generate the product's CLAUDE.md — a DECLARED output of this step (listed below), so kernel rule 5 permits it; generate the product's CLAUDE.md with:
- Rule Zero (session start protocol)
- Playbook routing table (12 agents)
- Skill file router
- Engineering standards
- Step execution protocol

⚡ Verify:
```bash
grep -q "Rule Zero\|rule zero" CLAUDE.md && echo "PASS: Rule Zero"
grep -q "Step Execution\|step execution" CLAUDE.md && echo "PASS: Step Execution Protocol"
```

🔒 **COMMIT:** `feat(foundation): project config + CLAUDE.md generation`

### Step 3.penultimate: Self-Assessment

Before writing the handoff, honestly assess your own work:
- Which deliverable are you least confident about? Why?
- Did any step produce output you'd want to revise if you had more time?
- Is there anything downstream agents should double-check?

Write the self-assessment into the handoff `boundary_payload.self_assessment`.

### Step 3.learning: Learning Capture

Two artifacts, not one. The **Q1–Q6 debrief** goes in the shared `build-log/agent-learning-log.md` (six questions, your section only). The **structured JSON below** carries the five capture categories shown — it is not a Q1–Q6 transcript, and you do not need a sixth category to satisfy the six questions.

Write a structured learning event to `build-log/agent-01-learning.json`:

```json
{
  "agent_id": "agent-01",
  "build_id": "{{BUILD_ID}}",
  "timestamp": "{{ISO_8601}}",
  "captures": {
    "hardest_step": { "step_id": "Phase.Step", "description": "string", "time_factor": 1.0 },
    "playbook_gaps": [{ "tripwire_missing": "string", "severity": "P0 | P1 | P2", "proposed_tripwire": "string" }],
    "time_overruns": [{ "step_id": "Phase.Step", "expected_minutes": 0, "actual_minutes": 0, "cause": "string" }],
    "upstream_gaps": [{ "source_agent": "agent-00", "missing_item": "string", "workaround": "string" }],
    "cross_build_lessons": [{ "pattern": "string", "detect": "string", "fix": "string", "verify": "string", "confidence": "HIGH | MEDIUM | LOW" }]
  }
}
```

⚡ Verify: `jq '.captures | keys' build-log/agent-01-learning.json` — must return all 5 capture categories.

### Step 3.final: Write Handoff Note
Emit the handoff via the `emit_handoff` tool (schema-on-write, forced `tool_choice`). The ORCHESTRATOR persists both artifacts — `handoff.json` and `handoff.md` — under `verification/runs/latest/agent-{NN}/`; you do not write them yourself. Machine-known envelope fields are stamped for you by the composer and are absent from the tool form (LAW-A: see `scripts/lib/envelope-stamps.ts`).
⚡ Verify: the `emit_handoff` call returned without a schema-validation error, and the `boundary_payload` you emitted is the one you intend. PROSE by design — do NOT turn this into a file test: the orchestrator persists `handoff.json` and `handoff.md` AFTER it verifies your attestations, so a `test -f` on your own handoff fails during your turn and fails again on the orchestrator’s re-run.

🔒 **COMMIT:** `docs: add agent-01 handoff note — quality gate passed`

## 5. DELIVERABLES MANIFEST

| File | Purpose | Consumed By |
|------|---------|-------------|
| `supabase/migrations/001_initial_schema.sql` | Database schema with ENUMs, FKs, RLS | Agent 02 (API clients reference tables) |
| `src/types/contracts.ts` | Master type system (7 sections) | All downstream agents |
| `src/types/*.ts` | Zod validation schemas | Agent 03a, 03b, 03c |
| `src/lib/shared/` | Shared utilities (AppError, Result<T>) | All downstream agents |
| `src/lib/env.ts` | Zod-validated environment variables | Agent 02, Agent 03c |
| `verification/backpressure/*.json` | Backpressure request when upstream output is unworkaroundable | Human (triage), blocking agent |
| `next.config.*, tsconfig.json, package.json` | Project configuration set up in Phase 1 | All downstream agents |
| `CLAUDE.md` (product root) | Product build rules generated from claude-md-template | All downstream agents |
| `verification/runs/latest/agent-01/handoff.json` | Structured handoff | Agent 02, Agent 03c, Agent 04 |
| `verification/runs/latest/agent-01/handoff.md` | Narrative handoff | Agent 02, Agent 03c, Agent 04 |

## 6. QUALITY GATE

```
ENGINEERING GATE:
  □ [P0] npx tsc --noEmit → 0 errors
  □ [P0] All 7 contract sections (A-G) present in contracts.ts
  □ [P0] Zod schemas match TypeScript interfaces (z.infer<> for each)
  □ [P1] No 'any' types in contracts.ts
  □ [P1] Database migration SQL is valid (no syntax errors)

PRODUCT GATE:
  □ [P0] Entity count in contracts.ts matches product-spec §3
  □ [P0] Every entity has fields, relationships defined
  □ [P1] Enum values match product-spec exactly
  □ [P2] Optional entities fully specified

PROJECT GATE:
  □ [P0] No files created outside your DECLARED OUTPUTS — that is the DELIVERABLES MANIFEST plus the kernel standing exceptions (learning-loop files and your own `verification/runs/**/agent-NN/**` artifacts). Creating a declared deliverable is never a violation of this gate, even when it sits outside the directories listed here. Owned directories (src/types/, supabase/, src/lib/shared/)
  □ [P0] Handoff note written with all mandatory sections
  □ [P1] All commits follow conventional format
  □ [P1] Learning capture Q1-Q6 filled
  □ [P1] Self-assessment in handoff envelope

GATE LOGIC:
  P0 fails → you may not proceed past the gate, but you still get the Corrector cycles the kernel grants you (max 2). HALT the pipeline only if the second cycle still fails. "Hard-block" is about not SHIPPING past a failure, not about refusing to fix it.
  P1 fails → SOFT-BLOCK. HITL steering decides proceed/fix.
  P2 fails → FLAG. Documented in handoff "Known Issues." Pipeline continues.
```

## 7. HANDOFF NOTE TEMPLATE
This section describes the NARRATIVE `.md` sibling only — it is not itself the handoff. The handoff proper is a JSON envelope you emit via the `emit_handoff` tool — that call is the only output path that counts — validated against your boundary schema; the orchestrator refuses one that does not validate. The two artifacts share one `handoff_id` and the orchestrator persists both. Put this section’s content in your text blocks alongside the `emit_handoff` call.

### What Was Built
[File list — matches §5]

### Architectural Decisions
[Tagged standalone assertions — e.g., **[v2: C1]** Lazy env initialization, not import-time]

### Known Issues
[Honest list. Even if empty: "No known issues."]

### Self-Assessment
- **Estimated quality:** [1-10]
- **Weakest deliverable:** [file path]
- **Weakest reason:** [why]
- **Confidence in quality:** [0-1]
- **Revision passes:** [count]
- **Honest flag:** [what you'd want to revise with more time, or null]

### For Agent 02: API Integration
- contracts.ts Section D (API Types) — review for completeness
- Shared utilities in `src/lib/shared/` — import paths and usage
- Result<T> type definition — verify it matches your client return pattern

### For Agent 03c: Synthesis
- Zod schemas — verify they match the types you'll validate against
- Section E (Pipeline Types) — verify stage input/output shapes

### For Agent 04: Frontend Core
- Section F (Frontend Types) — component props and UI state shapes
- Design tokens implied by the type system

### Verification Commands
```bash
npx tsc --noEmit
grep -c "Section [A-G]" src/types/contracts.ts  # Must be 7
jq -e '.handoff_boundary == "FOUNDATION_TO_COLLECTION"' verification/runs/latest/agent-01/handoff.json  # Must print true
```

## 8. TRIPWIRES

### Scope Violations
| If you catch yourself... | Stop and... |
|--------------------------|-------------|
| Building UI components or pages | STOP — that's Agent 04's job |
| Writing API clients or fetch calls | STOP — that's Agent 02's job |
| Writing pipeline orchestration logic | STOP — that's Agent 03a's job |

### Technology Choices
| Constraint | Required Approach |
|-----------|-------------------|
| Array validation | Use `z.array().min(0).max(N)`, NOT `.length(N)` (KLAUDE L1.1) |
| Environment variables | Lazy initialization at runtime, NOT import-time |
| User ID handling | `user_id` is nullable on investigation types (no auth in V1) |

### Failure Modes
| Scenario | Recovery |
|----------|----------|
| product-spec has no entities defined | STOP. Escalate to human — spec is incomplete |
| tsc fails after schema generation | Revert last change, re-read spec section, try again |
| Zod schema doesn't match TS interface | Fix the Zod schema to match TS (TS is source of truth) |

### Escalation
| Trigger | Action |
|---------|--------|
| Missing type/entity in product-spec | Ask human — don't invent types |
| Ambiguous relationship between entities | Ask human via steering — document the question |

### Backpressure
| If upstream output has a defect you cannot work around... | Write a backpressure request to `verification/backpressure/agent-{downstream}-to-agent-{upstream}.json` — the shape the pipeline runner reads at every handoff boundary, defined in `prompts/new-build-start.md` §BACKPRESSURE PROTOCOL. Fields: `requesting_agent`, `target_agent`, `defect` (what is wrong), `affected_deliverables` (file paths), `severity` (`P0` halts the pipeline for a targeted upstream re-run, `P1` pauses for HITL, `P2` is documented and the pipeline continues), `can_continue_degraded`, `workaround_if_degraded` (what you tried, or null). Then HALT. Also record it in your handoff `open_questions`. |

## 9. PARALLEL EXECUTION NOTES

**You depend on:** Agent 00 (Spec Validation): spec validation approval. Must be complete before you start.
**You block:** Agent 02 (API Integration), Agent 03c (Synthesis), Agent 04 (Frontend Core). They need contracts.ts, shared utilities, and database schema from your handoff.
**You run in parallel with:** No other agent — you are the first in the main chain.

*This playbook contains everything Agent 01 needs. Read CLAUDE.md, load the files in §2, run pre-flight in §3, execute the plan in §4, pass the quality gate in §6, write the handoff per §7. No ambiguity. No improvisation.*
