# Figures and evidence

Every figure the plates draw and every mechanism they name: its value, what it rests on, and where to look.

**Re-audited 14 September 2026.** Every claim the ten plates made was checked against the factory at commit `5739a97` (`skill-ecosystem`, private) and against the four product repositories at named commits, read-only. The audit holds 245 claims. Each one states what the code does and cites the lines that show it, and a script in the factory resolves every citation. The plates and this file were redrawn from that audit: 98 claims held, 127 were corrected, 9 were removed and 11 were added. No figure the set draws is contested.

The audit also found defects in the factory itself. Those were fixed before anything here was drawn, and §5 lists them.

---

## 1. Tiers

| Tier | Means | A reader should |
|---|---|---|
| `shipped` | A named file implements it. | Ask to see the file. |
| `audited` | Counted or observed at a named commit, or in a named external source on a named date. | Treat it as measured on that date. |
| `contested` | Two sources give different values and the conflict is open. | Treat it as unknown, not as an average. |
| `unverified` | No traceable source. | Disregard it until it is checked. |

Nothing is tiered higher than its weakest input. A plate whose mechanism is shipped but whose count is audited is labelled for both. A threshold that a file enforces, such as the route-back cap, is shipped. A tally, such as the number of skill files, is audited, because no file implements a number.

---

## 2. Structure

Measured at factory `5739a97` on 14 September 2026.

| Figure | Value | Tier | How it was measured |
|---|---|---|---|
| Skill files | 218 | `audited` | `.md` files under `skills/`, not counting the per-layer `CLAUDE.md` indexes |
| In an active manifest | 170 | `audited` | referenced by an agent config or by `skills/meta/universal-primitives.json` |
| Parked | 48 | `audited` | listed in `skills/meta/retired-skills.json`; none of them is referenced |
| Architecture layers | 9 | `audited` | distinct `architecture_layer` values in skill frontmatter: engineering 68, governance 49, intelligence 37, coordination 19, connectors 13, operational 12, foundational 10, tracking 7, meta 3 |
| Agents | 20 | `audited` | `configs/agent-*.config.ts` |
| Build agents | 15 | `audited` | the configs outside the research-cluster pattern |
| Research agents | 5 | `audited` | `research-reader`, `research-graph-builder`, `research-synthesizer`, `marketing-availability-builder`, `marketing-availability-validator` |
| Build waves | 12, at most 2 agents at once | `audited` | the scheduler's rule applied to `dependsOn`; with the research cluster, 12 waves and at most 3 at once |
| Dependency edges | 23 | `audited` | `dependsOn` across the configs; 5 of the edge declarations carry typed reads, 9 reads in all |
| CI gate ids | 33, R1 to R33 | `audited` | `scripts/verify-all.ts`, which runs them as 34 blocks because R22 has a schema block and a database block |
| Health checks | 28 | `audited` | the numbered checks in the factory's root `CLAUDE.md` |
| Preflight features | 19, F1 to F19 | `audited` | `prompts/feature-descriptor.md`, run by the build-start prompt |
| Zod source files | 52 | `audited` | files under `contracts/types` that import zod |
| Registered contracts | 48, in five tiers | `audited` | `SCHEMA_REGISTRY`: governance 15, operational 11, measurement 11, foundational 7, knowledge 4 |
| Generated JSON Schemas | 48 | `audited` | one per registry entry |
| Per-agent I/O schemas | 46 | `audited` | `contracts/schemas/agents`, kept by hand |
| Contract examples | 27 | `audited` | the example checks in `verify-all.ts` |
| Traced prompt files | 32 | `audited` | prompt files the generated registry links to a schema |
| Handoff envelope variants | 24, of which 20 are emitted by an agent | `audited` | the generated contract catalog |
| Measured Level-0 hubs | 13 | `audited` | skills cited by 20 or more other skill files, from `verification/skill-ref-counts.json` |
| Level-0 set | 14 | `audited` | the measured hubs plus `master-prompt-architecture.md`, which is declared and measures 18 |
| MCP server packages | 6, of which 3 are in the default lineup | `audited` | `packages/mcp-server-*` and `DEFAULT_SERVER_KEYS` |
| Static prompt load | 6,926 to 17,684 tokens per agent | `audited` | `verification/token-budget-baseline.json`, estimate mode, 14 September |

The hub counts, highest first: five-laws-ai-systems 42, structured-output-schemas 40, prompt-craftsmanship-constitution 38, agent-constitution 37, discovery-frame 31, prompt-multiplier 30, design-principles 27, epistemic-vigilance 25, api-integration-patterns 25, prompt-constitution 23, testing-and-validation-playbook 21, marketing-analysis-frameworks 20, deployment-environment-configuration 20.

---

## 3. Mechanism

Grouped by the plate that draws each one. Every row is `shipped` unless it says otherwise.

### Plate 02, the knowledge substrate

| Mechanism | What it does | Implemented in |
|---|---|---|
| Hub measurement | Counts, for every skill, the other skill files that cite it | `scripts/skill-ref-count.ts` |
| Register check | Blocks a commit when the register stops naming a measured hub | `skill-ref-count.ts --check-level0`, `.husky/pre-commit` |
| Hub integrity | Blocks a commit that breaks an anchor inside any of the fourteen hubs | `verify-hub-integrity.mjs`, pre-commit and R33 |
| Section citations | Blocks a live file that cites a section that does not exist | `audit-hub-citations.mjs`, pre-commit and R33 |

### Plate 03, the compiler spine

| Mechanism | What it does | Implemented in |
|---|---|---|
| Dependency-wave dispatch | Starts every agent whose dependencies in the run have finished, up to `ORCH_MAX_PARALLEL` (4 by default); 1 is the sequential fallback | `scripts/lib/agent-scheduler.ts` |
| Worktree isolation | Gives each agent its own `git worktree` under `.sandboxes/`, rebased onto main before dispatch | `master-agentic-orchestrator.ts` |
| Merge serialisation | Queues merges in process and on the lock file `.sandboxes/.merge.lock`; rebase, then fast-forward | `scripts/lib/merge-lock.ts` |
| Start gates | Refuses to start, with exit 5, on a drifted session baseline, an install command, or a failed preflight check | orchestrator `main()`, `scripts/lib/preflight-gate.ts` |
| Human gates | Gate A after agent 03c and gate B after agent 04 hold only their dependents; a third rejection aborts the run | `scripts/lib/review-gate.ts` |

### Plate 04, the contract spine

| Mechanism | What it does | Implemented in |
|---|---|---|
| Schema on write | Parses each emitted payload with `HandoffEnvelopeSchema.safeParse`; a failure routes back | orchestrator |
| JSON Schema parity | R22 renders every registry entry and deep-compares it with the committed schema; blocking | `contracts-vs-json-schema.ts` |
| Contract compiler | R31 checks each consumer's declared reads against its producer's schema by structural subtyping; blocking in CI, and not run at dispatch | `contract-compiler.ts`, `edge-registry.ts` |
| Registry and catalog | Generated from `SCHEMA_REGISTRY`; R32 fails when either is stale | `generate-registry.ts`, `generate-contract-docs.ts` |
| Change impact | Walks `imported_by` breadth-first and reports the schemas, tables and prompt files a change reaches; run by hand | `blast-radius.ts` |
| Contract evolution | R19 classifies a breaking schema change; warns by default | `verify-contract-evolution.ts` |
| Prompt library | Agent 12 derives a product's prompt library in TypeScript, with no model call | `scripts/prompt-manager/` |

### Plate 05, the verification stack

| Mechanism | What it does | Implemented in |
|---|---|---|
| Evidence commitment | Takes a SHA-256 over the step attestations, the evidence references and the files they name when an agent emits, and verifies it before any judge reads the handoff; a producer's handoff is committed when first seen | `evidence-commitment.ts` |
| Route-back | `classifyRouteBack` retries three classes (quality gate, schema on write, D3) when an error heuristic matches, cuts A-B-A oscillation, and stops at three attempts in all | `route-back.ts`, orchestrator |
| Rollback context | Sends the failure, masked of run ids, timestamps and sandbox paths, with the heuristic's fix, as `ROLLBACK_CONTEXT`; a producer's re-dispatch carries it too | orchestrator |
| Faithfulness judge | Scores the narrative against the JSON from 0 to 10 at temperature 0.2; warns, and blocks at gates A and B | `verify-handoff-faithfulness.ts` |
| Output contradictions | R24 compares an output with recorded ledger verdicts; warns by default | `verify-output-contradictions.ts` |
| Semantic drift | `trigram-hash-64-v1` embedder with a cosine floor of 0.82; per agent, disabled, advisory or enforcing by its number of baselines | `scripts/lib/semantic-drift.ts` |
| Drift margin | Records `{score, floor, margin}` per run per agent; a falling margin warns and never blocks | `scripts/lib/semantic-drift.ts` |
| Step attestation | Re-runs each step's verify command and compares the result with the agent's claim; blocking | `attestation-verifier.ts` |
| Drift audit | Requires every declared skill to be indexed in the prompt the agent was given; blocking, after the merge | `drift-audit.ts` |
| Cross-family judge | Opt-in; a non-Anthropic model accepts or rejects the emitted handoff; warns by default | `cross-family-pass.ts` |
| Judge calibration | Seeds defects and holds each judge to catch ≥ 0.70 and false reject ≤ 0.10. On 14 September the cross-family judge caught 11 of 12 and rejected 0 of 6 clean handoffs; the faithfulness judge blocked 10 of 10 contradictions and 0 of 9 faithful narratives | `measure-judge-catch-rate.ts`, `measure-faithfulness-catch-rate.ts` |
| Craftsmanship residuals | Keeps per-surface margin baselines over prompt grades and flags a grade unusual for its surface | `residual-baseline.ts` (R26) |

### Plate 06, context residency

| Mechanism | What it does | Implemented in |
|---|---|---|
| Progressive disclosure | Assembles the kernel and one index line per manifest skill, and offers `load_skill` beside `emit_handoff` | orchestrator |
| Section loading | Returns a numbered section, a section named by its heading, or each part of a comma-separated spec; a spec that names nothing returns a notice, never the whole file | `scripts/lib/skill-sections.ts` |
| Load cap | Counts loaded text against 60,000 tokens | orchestrator |
| Receipts | `RECEIPT_GIVEN` at dispatch; `RECEIPT` after the human gates, for an agent that passed | `scripts/lib/receipt.ts` |
| Context reduction | `audited`: 196K–521K down to 7K–31K tokens per agent, estimate mode, when full inlining was replaced | commit `f0e35c1`, 1 June 2026 |

### Plate 07, the hardening loop

| Mechanism | What it does | Implemented in |
|---|---|---|
| Hardening round | Runs Playwright ten times against staging; a round is clean only when all ten pass and no failure mode is left | `agent-11-steps.md` |
| Termination | After two clean rounds, asks the declare-hot question between rounds: yes ends hot, stop ends as `human_stop`, extend runs one more round, twice at most; otherwise the loop ends at five rounds plus extensions | `hardening-state.ts`, `askDeclareHot` |
| Aggregated handoff | Hands learning-close every round, with the loop's own `termination_reason` and `hot_reached` | `aggregateHardeningPayload` |
| Edit approval | Requires every applied edit to trace to a person's approval | `verify-hitl-approvals.ts` |
| Steering replay | Replays five recorded answers through the real steering server, in CI only | `test-steering-replay.ts` |

### Plate 08, the learning loops

| Mechanism | What it does | Implemented in |
|---|---|---|
| Rule capture | Records directive-shaped statements with the sessions they were said in | `.claude/hooks/capture-rule.mjs` |
| Promotion | Run by a person; writes a rule into the learned block of `AGENTS.md`, and refuses a candidate seen in fewer than two sessions unless given a reason | `.claude/hooks/promote.mjs` |
| Rule decay | Evaluates `stale-when` on board notes and `retire-when` on rules when the board is swept or the rules are reviewed | `.claude/hooks/board-lib.mjs` |
| Decision ledger | Appends through its only write API and validates every row on write and on read | `lib/decision-ledger` |
| Decision injection | R23 injects the ledger rows that match an agent into its prompt, within a token bound, and names what it drops | orchestrator |
| Feedback store | Writes build outcomes as Feedback rows at the end of each build; no loop reads them yet | `capture-run-feedback.ts` |
| Feedback redaction | Replaces raw text with `sha256:` references, enforced by the store's input schema | `packages/feedback-flywheel` |
| Amendment lane | `audited`: a five-stage protocol in which human approval is the only tier in force | `learning-loop.md` |

### Plate 09, the runtime engine

| Mechanism | What it does | Implemented in |
|---|---|---|
| LLM gateway | Dispatches through a provider adapter and records each call's latency; its cost cap prices a call at zero tokens, so it cannot fire | `packages/llm-gateway` |
| Model router | Resolves a model for the tier the caller names: FORENSIC, SYNTHESIS, NARRATIVE or VISION | `packages/model-router` |
| MCP host | Starts connector servers, three in the default lineup; a build gives agents their tools only when `MCP_TOOLS_ENABLED` is set | `packages/mcp-infra` |
| Connector replay | Runs the three default servers as real processes against recorded fixtures in CI | `test-connector-replay.ts` |
| Apify actor paths | Requires every actor path to be `owner~name` and each companion tool to call its skill's actor; checked in CI | `verify-apify-actor-paths.ts` |
| Build-end comparison | Flags an agent at tokens +30% or wall time +20% over its baseline; advisory | `scripts/benchmark/measure-routing.ts` |
| Production caller | `audited`: Author's app sends its pipeline's model calls through its own copy of the gateway | Author `app/src/lib/llm/gateway-client.ts` at `833dec6` |

### Plate 10, two-lane execution

| Mechanism | What it does | Implemented in |
|---|---|---|
| Lane A | Agent 03c attaches one divergent candidate at gate A when `IMAGINATION_MODE` is on; the flag is off by default, and while it is off the orchestrator strips any candidate | `applyImaginationFlag`, agent 03c's steps |
| Lane B | Agent 03b authors a product's imagination playbook on opt-in, and `reimagine()` mints candidates from its operators | `packages/runtime-imagination` |
| Candidate contract | The whole candidate rides the envelope as an opaque rider; `divergence_id` is the key a verdict attaches to | `divergence-candidate.ts`, `handoff-envelope.ts` |
| Guard | Flags a candidate from any agent other than 03c in the written handoffs; warns by default | `validate-handoff.ts` |
| Verdict bridge | Records a person's verdict for both lanes, measured only as divergence-survival rate | `recordDivergenceVerdict`, `record-divergence-verdict.ts` |

---

## 4. Products

| Product | In its own words | Status on 14 September 2026 |
|---|---|---|
| Ark | "Give Ark a URL. Twelve minutes later, a complete brand book" | Live; latest production deployment 7 September |
| Author | "Content Playbook Compiler" | Live; latest production deployment 26 July |
| Archer2 | "B2B sales intelligence" | Live; latest production deployment 26 July |
| Whitespace Hunter | "Internal whitespace-detection instrument" | Live at `whitespace-hunter.vercel.app` since 1 September, 23:55 UTC; latest production deployment 6 September |
| Auteur | AI creative production | Specced; no repository yet |

Status is `audited` from each project's Vercel production deployments. The descriptions are quoted from each product's own repository. The four product repositories and the factory are private.

---

## 5. Corrections in this revision

The plates published before this revision made claims the code did not bear out. The largest:

| Plate | Drew | Now |
|---|---|---|
| 01, 06 | 152 skill files, contested | 218, audited |
| 01, 03 | 30 CI gates, against 19 preflight gates | 33 CI gate ids; the 19 are preflight features, a different object |
| 02 | 11 Level-0 hubs, in 8 or 9 layers | 13 measured hubs in a set of 14, in 9 layers |
| 02 | Citation edges between hubs and skills | No edge list is recorded; every node is sized by its measured count, and the edges are gone |
| 03 | One agent at a time, in dependency order | Waves: 12 for the build graph, at most 2 agents at once |
| 04 | 19 contracts deriving 43 schemas | 48 registered contracts generating 48 schemas, one to one |
| 04 | `contract-compiler.ts` drawn as not a gate | It is R31, blocking in CI |
| 05 | The evidence frozen before any path is chosen | Committed when an agent emits; a producer's handoff is committed later, after schema on write and D3 |
| 05 | Five checks in the order schema, attestation, judge, cross-family, drift | The order the code runs, with the drift audit after the merge |
| 05 | The drift band tracked by `residual-baseline.ts` | The drift margin is in `semantic-drift.ts`; `residual-baseline.ts` tracks prompt grades |
| 06 | About 70% fewer tokens | 196K–521K down to 7K–31K per agent, the recorded figure |
| 07 | Exit on two clean rounds, or escalate at five | Two clean rounds and a yes; stop and extend; the cap moves with each extension |
| 08 | Tier-1 changes applied without the human gate | Tiers 1 and 2 are not in force, by operator ruling |
| 08 | One telemetry stream feeding both loops | Stored as Feedback rows that no loop reads yet |
| 09 | Session context, a load estimator, complexity routing and cost circuit breakers | None of them exists; the caller names the tier, and nothing stops a run on cost |
| 09 | Six MCP connectors, and Whitespace Hunter as the product served | Three in the default lineup, and Author as the product on the gateway |
| 10 | A `divergence_id` crossing under a K4 parity check | The whole candidate rides an opaque rider; separation is an allowlist guard and a flag strip |
| products | Archer2 dormant; Author an SVG production pipeline | Archer2 live; Author a content playbook compiler |

**Defects fixed in the factory, not in the drawing.** Re-auditing the plates found places where the factory itself was wrong. Each was fixed, with a check that fails without the fix, before anything here was drawn from it:

- Producer agents were handed no prompt the drift audit could read, so a real producer run would have halted after the producer finished, and a re-dispatch returned the failed handoff at once.
- A named skill section loaded the whole file.
- Three Apify connector tools called actor paths that do not exist.
- The learning-loop protocol both forbade and allowed changes without approval, until an operator ruling settled it.
- Agent 11's declare-hot question was specified and never asked, and its stop condition was declared and never set.
- Agent 11's instructions offered an "extend" at the round cap that the loop could not honour.

---

## 6. The correction worth publishing

`configs/agent-00.config.ts` cited `agent-constitution.md §P1-§P2`, a section that does not exist. Agent 00, the spec validator and the first agent in the pipeline, was handed the literal string `[section not found]` where its constitution should have been. The entry was removed on 12 September. Since 14 September a citation to a section that does not exist fails in pre-commit and in CI (R33), in any live file.

It belongs here because it is a silent failure in the most load-bearing input in the system, found by an audit rather than by a symptom. A citation that silently resolves to an error string is worse than one that throws: the pipeline keeps running, and everything downstream is confidently built on nothing.

The re-audit found the same shape a second time. A named section, such as `§Eight Directives`, loaded the whole skill file, so a real dispatch of agent 12 asked for two sections, received two whole files, and recorded them in its receipt as section loads. That is fixed too, and plate 06 draws the fixed loader.

---

## 7. Not drawn

| Figure | Why it is not drawn |
|---|---|
| Residency class counts, 12 / 60 / 132 | No source, and they summed to the wrong total |
| Build-time compression, "2–4 weeks against 6–9 months" | No measured baseline on either side |
| "Up to 80% fewer manual interventions" | No instrument produces the number |
| Trend surge magnitudes, "18×" and "+1800%" | One run's output, not a headline figure |
| Type-check saving per dispatch, about 6 seconds | Not measured, and no plate makes a claim it would support |
| Graded prompt corpus, 471 | Not re-counted in this audit |

---

## 8. How the audit is held

The audit lives in the factory as `plans/ais-plate-claims.json`. Two checks there hold it and this repository to each other:

- **AIS7-1** resolves every citation: each factory citation at the audited commit, each product citation at its recorded commit, with the cited text on the cited line or within two lines of it.
- **AIS7-2** requires the plates to regenerate unchanged, `verify.py` to pass in two fonts, the reference set to rebuild and verify, every figure in §9 to equal the audit's, and no phrase the audit retired to survive in the plates, the README, `architecture.md` or this file outside §5 and §6.

In this repository, `tools/diagram-compiler/verify.py` fails a plate whose drawn count disagrees with §9.

---

## 9. Machine-readable figures

Every count the plates draw, in one block. `tools/diagram-compiler/verify.py` parses it and fails the build when a plate disagrees with it, so the figures and the artwork cannot drift apart: change a figure here and the plate that draws it fails until it is redrawn; change a plate and it fails until the figure is corrected here.

```json
{
  "drawn": {
    "skill_files":              {"value": 218, "tier": "audited", "plates": ["01", "06"]},
    "total_agents":             {"value": 20,  "tier": "audited", "plates": ["01", "03"]},
    "build_agents":             {"value": 15,  "tier": "audited", "plates": ["03"]},
    "research_agents":          {"value": 5,   "tier": "audited", "plates": ["03"]},
    "ci_gate_ids":              {"value": 33,  "tier": "audited", "plates": ["01"]},
    "preflight_features":       {"value": 19,  "tier": "audited", "plates": ["03"]},
    "build_waves":              {"value": 12,  "tier": "audited", "plates": ["03"]},
    "max_build_agents_at_once": {"value": 2,   "tier": "audited", "plates": ["03"]},
    "level0_hubs":              {"value": 13,  "tier": "audited", "plates": ["02"]},
    "level0_set":               {"value": 14,  "tier": "audited", "plates": ["02"]},
    "level0_threshold":         {"value": 20,  "tier": "shipped", "plates": ["02"],
                                 "form": "numeral"},
    "architecture_layers":      {"value": 9,   "tier": "audited", "plates": ["02"]},
    "zod_source_files":         {"value": 52,  "tier": "audited", "plates": ["04"]},
    "generated_schemas":        {"value": 48,  "tier": "audited", "plates": ["04"]},
    "per_agent_schemas":        {"value": 46,  "tier": "audited", "plates": ["04"]},
    "contract_examples":        {"value": 27,  "tier": "audited", "plates": ["04"]},
    "dependency_edges":         {"value": 23,  "tier": "audited", "plates": ["04"]},
    "traced_prompts":           {"value": 32,  "tier": "audited", "plates": ["04"]},
    "route_back_classes":       {"value": 3,   "tier": "audited", "plates": ["05"]},
    "route_back_cap":           {"value": 3,   "tier": "shipped", "plates": ["05"]},
    "hardening_clean_rounds":   {"value": 2,   "tier": "shipped", "plates": ["07"]},
    "hardening_round_cap":      {"value": 5,   "tier": "shipped", "plates": ["07"]},
    "hardening_extensions":     {"value": 2,   "tier": "shipped", "plates": ["07"]},
    "promotion_sessions":       {"value": 2,   "tier": "shipped", "plates": ["08"]},
    "mcp_default_servers":      {"value": 3,   "tier": "audited", "plates": ["09"]}
  },
  "stated_not_drawn": {
    "ci_gate_blocks":      {"value": 34,  "tier": "audited"},
    "health_checks":       {"value": 28,  "tier": "audited"},
    "skills_in_manifests": {"value": 170, "tier": "audited"},
    "retired_skills":      {"value": 48,  "tier": "audited"},
    "envelope_variants":   {"value": 24,  "tier": "audited"},
    "mcp_server_packages": {"value": 6,   "tier": "audited"}
  }
}
```

`form: numeral` on the Level-0 threshold is load-bearing rather than stylistic. Unit ticks count agents, rounds and attempts and reconcile across the set, so twenty citations drawn as twenty ticks would sit under a rule that reads identical tick counts as agreement with the twenty agents on plates 01 and 03. The verifier fails the build if plate 02 emits a unit tick at all.
