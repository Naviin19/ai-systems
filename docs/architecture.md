# Architecture

The eleven behaviours the plates show, in prose.

Every section below is also a plate in `docs/diagrams/`. This file exists because some readers cannot see images — text-extracting systems, terminal readers, anything consuming the repository as plain text — and what survives only as a picture never reaches them. Nothing here depends on a diagram rendering.

Each section was written from the factory's code at commit `5739a97`, on 14 September 2026. [`evidence.md`](evidence.md) has every figure, its tier and how it was measured.

---

## What the system is

A factory that builds software products with AI agents, and the runtime packages those products can run on, over one corpus of skill files.

The factory is twenty agent configurations: fifteen that build a product and five that run a research pipeline. An orchestrator dispatches them in dependency waves, each agent in its own git worktree. Every handoff between agents is parsed against a typed contract and passed through a verification stack before the next agent reads it. The corpus is 219 skill files, which agents cite and load a section at a time rather than carrying whole.

The run side is a set of packages: an LLM gateway, a model router and an MCP host for connectors. Author's app sends its model calls through its own copy of the gateway.

Four products run on it and are live: [Ark](https://ark-now.vercel.app), [Author](https://author-now.vercel.app), [Archer](https://archer2.vercel.app) and [Whitespace Hunter](https://whitespace-hunter.vercel.app). A fifth, Auteur, is specced. This repository is the published architecture: what the system does, the evidence for each figure, and demonstrations that run the code itself.

---

## 1. The operating system

It is a system with a build side and a run side, not a folder of scripts.

One corpus of skill files carries both halves, and the layers taper, narrower above wider, so the compression from the corpus to the products is a shape rather than an assertion. The build side is the orchestrator and its twenty agents. Model choices are recorded one per call site: CI fails when a model call in the factory's own code has no recorded decision, and the gateway refuses a call site it does not know.

[Whitespace Hunter](https://whitespace-hunter.vercel.app), live since 1 September, is a product a reader can open without trusting anything in this repository.

*Evidence: audited — 219 skill files, 20 agents and 39 CI gate ids, counted at factory `2fe954ea`; product status from Vercel production deployments on 14 September.*

## 2. The knowledge substrate

Importance in the corpus is measured, and the measurement is checked.

The skill files cite each other. A file is a measured hub when twenty or more other skill files cite it; the count is of distinct citing files, not of mentions. Thirteen files clear that line, measured by `scripts/skill-ref-count.ts`. Three files are also declared Level 0 by hand, and one of them, `master-prompt-architecture.md`, measures eighteen, so the Level-0 set is fourteen. Declaration is a judgement the measurement never revokes.

Three pre-commit checks hold the hubs. `skill-ref-count.ts --check-level0` blocks a commit when the factory's register stops naming a measured hub. `verify-hub-integrity.mjs` blocks one that breaks an anchor inside any of the fourteen. `audit-hub-citations.mjs` blocks a live file that cites a section that does not exist. CI runs the last two as R33. The per-hub counts written in the register are not checked, and they have drifted.

The factory records how often each skill is cited, not by whom, so the plate sizes every node by its own count and draws no edges between them. Nine layers — foundational, governance, coordination, engineering, connectors, intelligence, operational, tracking and meta — group the corpus; they do not rank it.

The checks exist because of a real defect. `configs/agent-00.config.ts` cited a section of `agent-constitution.md` that did not exist, so agent 00, the spec validator and first in the pipeline, was handed the literal string `[section not found]` where its constitution should have been. The entry was removed on 12 September, and since 14 September a citation to a missing section fails before it lands.

*Evidence: shipped — `skill-ref-count.ts`, `verify-hub-integrity.mjs`, `audit-hub-citations.mjs`, `.husky/pre-commit`, R33. Audited — thirteen measured hubs in a set of fourteen, and 219 files in nine layers.*

## 3. The compiler spine

Orchestration with isolation, not a prompt chain.

The agents form a dependency graph. The orchestrator's scheduler starts every agent whose dependencies inside the run have finished, up to `ORCH_MAX_PARALLEL`, four by default; one is the sequential fallback. The build graph resolves to twelve waves in which at most two agents overlap, three when the research cluster joins. The first failure stops new starts, and agents already running finish.

Each agent works in its own git worktree under `.sandboxes/`. Results reach trunk one at a time: inside the lock at `.sandboxes/.merge.lock` the orchestrator rebases the agent's branch onto main and fast-forwards. Human gate A, after synthesis, and gate B, after frontend core, hold only the agents that depend on them, while the rest keep running.

Before any agent starts, the orchestrator refuses to run on a drifted session baseline, an install command in the build, or a failed preflight check. Separately, the build-start prompt checks nineteen preflight features in `prompts/feature-descriptor.md`. Both are different objects from the thirty-three CI gate ids in `verify-all.ts`.

The plate once drew a linear chain. That was right about the code until the scheduler landed, and wrong after it.

*Evidence: shipped — `master-agentic-orchestrator.ts`, `agent-scheduler.ts`, `merge-lock.ts`, `review-gate.ts`, `preflight-gate.ts`. Audited — twelve waves, computed from the agent configs.*

## 4. The contract spine

One source of truth, and the reach of changing it is computed.

The source is hand-written Zod: 52 files under `contracts/types`, from which `SCHEMA_REGISTRY` registers 48 contracts in five tiers. The JSON Schemas, the contract registry and its catalog are generated from the registry. R22 regenerates every schema in memory and fails CI on any difference, and R32 fails when the registry or the catalog is stale. TypeScript types come from the same source by inference; they are typechecked, not generated.

Two surfaces are kept by hand and can drift: 46 per-agent input and output schemas, checked only for existence, and the database migrations, whose parity check is advisory and skips without a database. The plate draws them at the same size as the generated surfaces.

Handoffs are one contract, `HandoffEnvelopeSchema`, a union of 24 boundary variants, and each emitted payload is parsed against it before anything downstream reads it. Separately, in CI, `contract-compiler.ts` (R31) takes each of the 23 dependency edges, resolves the producer's real variant, and checks every read the consumer declares by structural subtyping. Five of the 23 edge declarations carry typed reads so far.

`blast-radius.ts` walks the registry's import graph breadth-first, so what a schema change reaches is computed: schemas, tables, and the 32 prompt files that name a schema. It is run by hand. The widest reach in the registry today is one schema with five importers. Agent 12, a different mechanism, derives each product's prompt library in TypeScript without a model call.

*Evidence: shipped — `generate-json-schemas.ts`, `contracts-vs-json-schema.ts` (R22), `generate-registry.ts` (R32), `contract-compiler.ts` (R31), `HandoffEnvelopeSchema`, `blast-radius.ts`. Audited — 48 contracts, 48 generated schemas and 46 hand-kept schemas.*

## 5. The verification stack

Four outcomes, and a failure that retrying can fix is told apart from one it cannot.

When an agent emits, the orchestrator commits the evidence behind its claims: a SHA-256 over its step attestations, the evidence references in its handoff, and the files those references name. Quality gates run next, such as `tsc` in the agent's sandbox, then schema on write and the D3 absorption check. Before any judge reads the handoff, the orchestrator recomputes the commitment and halts if anything moved. A producer's handoff, written by a separate session, is committed when the orchestrator first sees it, after schema on write and D3.

Only those first three checks can route back. `classifyRouteBack` decides from three facts: a retryable class, no A-B-A oscillation, and the attempt cap of three attempts in all. The orchestrator re-dispatches only when an error heuristic also matches, and sends the failure, masked of run ids, timestamps and sandbox paths, as `ROLLBACK_CONTEXT`. Without a matching heuristic the first failure halts.

Everything after that halts or warns. The post-emit chain runs the faithfulness judge, which scores the narrative against the JSON from 0 to 10 and warns, except at gates A and B, where it blocks; the output-contradiction check R24, which warns; semantic drift; and the release gate. Step attestation re-runs each step's verify command and halts on a mismatch, a missing attestation or an honest failure. The agent's work then merges, and the drift audit checks that every declared skill was indexed in the prompt the agent was given, halting after the merge if one was not. A halt stops new agents from starting; earlier merges stand.

Semantic drift is lexical: a `trigram-hash-64-v1` embedder with a cosine floor of 0.82, per agent, disabled with no baseline, advisory with one and enforcing with two or more. Today only agent 12 has two. Each run's margin above the floor is recorded, and a margin that keeps falling warns before the floor breaks. That is the only enforcement ladder in the stack; the other checks run in off, warn or block modes.

Two judges are calibrated against seeded defects, with a bar of a catch rate of at least 0.70 and false rejects of at most 0.10. On 14 September the faithfulness judge blocked 10 of 10 load-bearing contradictions and none of 9 faithful narratives. The opt-in cross-family judge, a non-Anthropic model that accepts or rejects an emitted handoff, caught 11 of 12 defects and rejected none of 6 clean handoffs. A fabricated narrative from an agent outside gates A and B is recorded, and the run continues.

*Evidence: shipped — `master-agentic-orchestrator.ts`, `route-back.ts`, `evidence-commitment.ts`, `post-emit-checks.ts`, `semantic-drift.ts`, `attestation-verifier.ts`, `drift-audit.ts`, `measure-judge-catch-rate.ts`, `measure-faithfulness-catch-rate.ts`.*

## 6. Context residency

Budgeting is a measurement, and so is uptake.

An agent the orchestrator dispatches does not carry the skill files it may need. Its prompt holds the agent kernel, inlined, and one index line per skill in its manifest, with the skill's description. When a step needs a skill, the agent calls `load_skill` for the whole file, a numbered section, or a section named by its heading. Loaded text counts against a 60,000-token cap. When full inlining was replaced on 1 June 2026, the recorded effect was 196K–521K tokens per agent down to 7K–31K, measured by estimate. On 14 September the static loads ran from 6,926 to 17,684 tokens.

A producer agent works in a separate session and is handed its playbook, which carries its skill citations but not the kernel.

Token reduction is a cost claim, and the weaker kind. Receipts record uptake: `RECEIPT_GIVEN` at dispatch, with what the index offered and the prompt's size, and `RECEIPT` after the human gates, with what the agent loaded and what it cited, down to the section. `given_not_cited` lists the skills in the index that the agent never cited, though it may still have loaded them. The receipt contract states what none of this shows: a citation proves injection into the index, not acknowledgement and not influence, and nothing currently recorded proves influence.

*Evidence: shipped — `PROGRESSIVE_DISCLOSURE` and `load_skill` in the orchestrator, `skill-sections.ts`, `receipt.ts`. Audited — the reduction, from commit `f0e35c1`, and today's loads, both in estimate mode.*

## 7. The hardening loop

Promotion requires a proof of convergence.

After deployment, agent 11 hardens a product one round at a time against its staging site. Each round runs the Playwright suite ten times, groups the failures by signature, and asks a person twice: first to mark each failure mode as a bug or a flake, then to approve each proposed edit before it is committed. The edits land on a hardening branch, staging is redeployed, and the ten runs repeat. A round is clean only when all ten pass and no failure mode is left, and the orchestrator demotes a clean claim that fresh test artifacts do not back.

After two clean rounds in a row, the orchestrator asks a person, between rounds and through the human-steering server, whether to declare the product hot. Yes, the default, ends the loop hot. Stop ends it as `human_stop`. Extend runs one more round, twice at most. Without a hot answer, the loop ends at five rounds plus any extensions, as `max_iterations`, which build-end surfaces. However it ends, the orchestrator hands learning-close one aggregated handoff carrying every round and the loop's own ending. Deploying to production after hot stays a separate human step.

The agent reaches a person through the steering tool, which a build gives agents only when `MCP_TOOLS_ENABLED` is set. In CI, five recorded answers replay through the real steering server, and the approval check refuses a replayed answer outside CI. That tests the steering and approval chain, not the loop: no hardening round runs in CI.

*Evidence: shipped — `agent-11-sugar-trainer.config.ts`, `hardening-state.ts`, `askDeclareHot` in the orchestrator, `agent-11-steps.md`, `verify-hitl-approvals.ts`, `test-steering-replay.ts`.*

## 8. The learning loops

Two loops, and in both a person decides what becomes permanent.

The amendment lane is a documented protocol, `learning-loop.md`, carried out by agents and the operator: capture a learning event, structure it, propose an amendment, stop for a person's approval, apply it with its cascade, and verify it within 48 hours. Human approval is the only route. The protocol also describes two tiers that would apply changes without approval; by operator ruling on 14 September they are a future design, not in force, with named conditions for switching either on. No code enforces the gate, which makes it a rule rather than a mechanism.

The convention lane is code. `capture-rule.mjs` records directive-shaped statements as they are typed, with the sessions they were said in. A person runs `promote.mjs` to promote one into the learned block of `AGENTS.md`, which every session reads; a candidate seen in fewer than two sessions is refused unless the person gives a reason, and the reason is recorded. A finding seen once can go to `run/board/` instead, where it decays when the board is swept. A promoted rule leaves when its `retire-when` condition fires and someone reviews the rules.

Settled decisions live in a third store, `build-log/decision-ledger.jsonl`: append-only through its only write API, and schema-validated. Neither lane writes to it; a person appends each row. At prompt assembly R23 injects the rows that match an agent, within a token bound, and after an agent emits, R24 flags an output that contradicts a recorded verdict, in warn mode.

Each build also stores its outcomes as Feedback rows: gate results, receipt counts, tokens and wall time, and craftsmanship margins. No loop reads them yet.

*Evidence: shipped — `capture-rule.mjs`, `promote.mjs`, `board.mjs`, `AGENTS.md`, `decision-ledger.jsonl`, R23, R24, `capture-run-feedback.ts`. Audited — the amendment lane, a protocol with no implementing code.*

## 9. The runtime engine

The packages a product runs on, and the product that runs on them.

The run side is three packages. The model router resolves a model for the tier its caller names — FORENSIC, SYNTHESIS, NARRATIVE or VISION — preferring a model the request or the stage pins. Nothing in it classifies how hard a task is. The LLM gateway dispatches each call through a provider adapter, OpenRouter always and Anthropic directly when a key is set, and records the call's latency. The MCP host starts connector servers, and its default lineup is three: Apify, Apollo and human steering. CI replays all three as real processes against recorded fixtures, and a build gives agents their tools only when `MCP_TOOLS_ENABLED` is set.

Cost does not stop a run. The gateway's cost cap prices a call at zero tokens, so it cannot trip, and the factory has no run cost cap, by operator ruling. At the end of each build the factory compares every agent's tokens and wall time with its baseline and flags an agent at +30% or +20%; the comparison is advisory.

Author's app is the production caller: it sends its pipeline's model calls through its own copy of the gateway, one call site per stage. Whitespace Hunter uses none of these packages; it collects from DataForSEO on a weekly cron.

*Evidence: shipped — `packages/llm-gateway`, `packages/model-router`, `packages/mcp-infra`, `test-connector-replay.ts`, `scripts/benchmark/measure-routing.ts`. Audited — Author's `gateway-client.ts` at `833dec6`, and Whitespace Hunter's code at `1c0529c`.*

## 10. Two-lane execution

The constraint is scoped, not total.

Everything above is about refusal, which leaves an obvious objection: a pipeline this rigid cannot produce anything new. The factory allows divergence in two fenced places.

Lane A is in the factory, and off by default. When `IMAGINATION_MODE` is on, agent 03c attaches exactly one divergent candidate to its gate-A handoff, and the person at gate A judges it. While the flag is off, the orchestrator strips any candidate from any agent's handoff before it is validated or written. Lane B, the primary lane, is in a product's runtime: on opt-in, agent 03b authors an imagination playbook for the product, and `reimagine()` derives candidates from the playbook's divergence operators, each with its own `divergence_id`.

The lanes run in separate contexts but share one contract and one verdict path. A candidate travels whole, as an opaque rider on the handoff envelope that no typed field reads, and `divergence_id` is the key a person's verdict attaches to, recorded for both lanes through one bridge. The guard is an allowlist: a check over the written handoffs that flags a candidate from any agent other than 03c, warning by default. The only metric is divergence-survival rate, how many candidates a person keeps, never quality lift.

The code is shipped; the factory lane has never been switched on. No other agent gains this wiring until ten candidates have been judged, and the last reading was zero.

*Evidence: shipped — `divergence-candidate.ts` and the envelope rider, `applyImaginationFlag` in the orchestrator, `packages/runtime-imagination`, `validate-handoff.ts`, `record-divergence-verdict.ts`, `recordDivergenceVerdict`. Audited — never run live, and zero judged candidates at the last reading.*

## 11. Prompts as specifications

A prompt is an artifact with a declared shape, graded before it is used.

Every prompt the system writes, uses or embeds declares an input, a transformation and an output, and is scored on five dimensions — specificity, structure, constraints, completeness, actionability — before it is allowed to run. The score is the **lowest** dimension rather than the mean, so a prompt cannot compensate for being unactionable by being well structured. Across the grade cache the weakest dimension is completeness, at a mean of 7.19.

The floor is not one number. Thirty surfaces each carry their own, at five levels: 8.5 for system prompts, scorers, adversarial judges and the questions put to a person; 8.0 for session dispatch and handoff narratives; 7.5 for instructions, build prompts, playbooks and step files; 7.0 for tool and schema descriptions; 4.0 for directory indexes and templates. The highest bar sits on the prompts that judge other work, so the bar is a claim about consequence rather than about length.

A prompt below its floor is rewritten once automatically and blocked on a second failure. What the gate does not reach is drawn on the plate: the score judges a prompt, not the output that prompt produces, and nothing connects the two. Of 1,116 graded prompts, 313 sit below their floor and are in the corpus anyway — the gate holds what passes through it, not what is already there.

*Evidence: shipped — `craftsmanship-gate.ts`, `enrich-prompt.ts`, `SURFACE_FLOORS` in `craftsmanship-surface-policy.ts`, `prompt-multiplier.md`. Audited — 30 surfaces at five floor levels, and 1,116 graded prompts of which 313 below floor.*

---

## Contested figures

None of the figures the plates draw is contested. [`evidence.md`](evidence.md) records how each was measured.

`evidence.md` is also the file the diagram compiler reads its expected counts from: change a figure there and the plate that draws it fails until it is redrawn; change a plate and it fails until the figure is corrected. Neither can be edited alone.

## What this rests on

Four tiers, and nothing is tiered higher than its weakest input.

**Shipped** means a named file implements it, and the right response is to ask to see the file. **Audited** means counted or observed at a named commit or on a named date; a count is audited, because no file implements a number. **Contested** means two sources disagree and the conflict is open; nothing drawn is contested today. **Unverified** means no traceable source, and nothing unverified is drawn.

Every figure in these sections carries citations into the factory or a product repository that a script resolves to the lines that show it.
