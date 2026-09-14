# Architecture

The ten claims this repository makes, in prose.

Every claim below is also a plate in `docs/diagrams/`. This file exists because some of
what screens a candidate cannot see images — text-extracting applicant systems, terminal
readers, anything consuming the repository as plain text — and a claim that only survives
as a picture is a claim half the audience never receives. Nothing here depends on a
diagram rendering.

---

## What the system is

An AI operating system with two halves over one substrate. The build half is a
multi-agent factory that compiles products: twenty agents, fifteen building and five
researching, dispatched in parallel into isolated git worktrees and gated at every
handoff by typed contracts and a verification stack. The run half is a production engine
that serves what the factory produced: an LLM gateway, a model router, connectors, and
circuit breakers that stop a run on cost or latency drift. Both halves read from the same
corpus of skill files.

The products built on it are Ark, Author, Archer2, Auteur and Whitespace Hunter. The
factory and the product repositories are private. This repository is the published
methods section: the architecture, the standards, and runnable demonstrations of the
parts that can be checked without a model.

---

## 1. The operating system

**Claim.** It is a system with a build side and a run side, not a folder of scripts.

One substrate carries both halves, and the layers taper — narrower above wider — so the
compression from the corpus to the products is a shape rather than an assertion. The
previous version of this map drew only the factory, which is half the architecture.

Whitespace Hunter, live since 2 September at `whitespace-hunter.vercel.app`, is the only
claim in this repository that can be settled without trusting anything in it. The URL
either loads or it does not.

*Evidence: audited for the agent counts. Contested for the file and gate counts. The
status of the other four products is unverified and the plate says so.*

## 2. The knowledge substrate

**Claim.** Importance in the corpus is computed, not declared.

The skill files form a citation graph. A file becomes Level-0 by being cited twenty or
more times by other skill files — nobody nominates it, and the set is recomputed from
the graph rather than maintained by hand. Eleven files currently clear that line.
`skill-ref-count.ts --check-level0` derives the set and is wired to `.husky/pre-commit`,
so a commit that damages a hub fails before it lands.

The layer taxonomy — foundational, governance, engineering, operational, coordination,
intelligence, tracking, meta — still groups the corpus, but it does not rank it. Whether
`connectors` is a ninth layer is unresolved.

This gate exists because of a specific defect. `configs/agent-00.config.ts` cited a
section anchor that did not resolve, so agent 00 — the spec validator, first in the
pipeline, the gate every build passes through — was handed the literal string
`[section not found]` where its constitution should have been. A citation that silently
resolves to an error string is worse than one that throws, because the pipeline keeps
running and everything downstream is confidently built on nothing. Found by audit rather
than by symptom, fixed 12 September, and the gate now catches the class.

*Evidence: shipped for the gate. Audited for the eleven hubs. Contested for the file and
layer counts.*

## 3. The compiler spine

**Claim.** Orchestration with isolation, not a prompt chain.

Agents run concurrently, each in its own git worktree, and contend for the trunk through
a file-lock mutex at `.sandboxes/.merge.lock`. Work proceeds in parallel; merges
serialise. An earlier version of this diagram drew a linear chain, which was simply
wrong about the system.

Before any of it starts, a preflight wall has to pass. `feature-descriptor.md` reports
nineteen gates and `verify-all.ts` reports thirty checks; whether the second is a
superset of the first or a different object sharing a word is unresolved, so the narrower
number is the one drawn.

*Evidence: shipped — `master-agentic-orchestrator.ts`. Contested for the gate count.*

## 4. The contract spine

**Claim.** One source of truth, and the cost of changing it is computed rather than
estimated.

Nineteen typed handoff contracts in three families — operational, governance,
measurement — are asserted by structural subtyping at every agent boundary before
execution, in `contract-compiler.ts`. From them, downstream surfaces are derived:
TypeScript types, JSON Schema, and runtime prompts are generated and diffed in CI;
database columns and fixture data are hand-maintained and can drift. The diagram draws
the drift-prone surfaces at equal prominence rather than airbrushing them.

`blast-radius.ts` walks the contract import graph breadth-first, so the affected set of
any edit is computed. The surprising output is a prompt file appearing in the blast
radius of a schema change — runtime prompts are compiled from contracts by
`agent-12-prompt-manager`, not written by hand, and an earlier version of this repository
marked them as drift-prone before that was corrected.

*Evidence: shipped — `contract-compiler.ts`, `blast-radius.ts`. Contested for whether
nineteen contracts derive the reported forty-three generated schemas.*

## 5. The verification stack

**Claim.** Four paths, and the evidence is frozen before any of them is chosen.

Before a check reads anything, `EvidenceCommitmentSchema` takes a SHA-256 commitment over
the step attestations and the evidence they reference. The judge that runs later is
therefore grading something that cannot have moved. This answers the obvious objection to
any LLM-as-judge arrangement with a mechanism rather than a paragraph: an agent asked to
justify a claim will produce a justification, so the defence is to make the artefact
immutable before the question is asked.

Then five checks run in order — schema on write via constrained decoding, step
attestation, a faithfulness judge scoring markdown against JSON, a cross-family check
where a different model family re-derives the result, and semantic drift against a
baseline with a floor of 0.82 cosine. Each carries an enforcement level that climbs from
disabled to advisory to enforcing, so a check earns the right to halt.

A failure is classified before it is acted on. `classifyRouteBack` strips volatile tokens
from the traceback, decides whether the failure is informative, and re-dispatches it to
the originating agent as `ROLLBACK_CONTEXT` — at most three times, with A-B-A oscillation
detected and cut. A compiler error routes back. A fabrication halts. So there are four
outcomes, not two: pass, warn, route back, halt.

The judge is itself tested. Synthetic faults across five defect classes, with a published
catch rate floor of 0.70 and a false-reject ceiling of 0.10, in
`measure-judge-catch-rate.ts`. And the drift threshold is a band rather than a line:
`residual-baseline.ts` tracks score, floor and margin, so compression of the margin is
visible before a breach — the difference between a smoke alarm and a thermometer.

*Evidence: shipped — `EvidenceCommitmentSchema`, `classifyRouteBack`,
`verify-handoff-faithfulness.ts`, `detect-semantic-drift.ts`,
`measure-judge-catch-rate.ts`, `residual-baseline.ts`.*

## 6. Context residency

**Claim.** Budgeting is a measurement, and so is uptake.

Skill files are cited rather than inlined, and fetched section-granularly on demand
through a `load_skill` tool. That reclaims roughly seventy per cent of the system prompt.

But token reduction is a cost claim, and cost claims are the weaker kind. `receipt.ts`
records two things per dispatch: `RECEIPT_GIVEN`, what was injected, and `RECEIPT`, what
the model acknowledged and cited. The gap between them is the only honest measure of
whether the budgeting worked, and a section injected under every strategy and cited under
none is dead context — paid for on every dispatch, contributing nothing. The industry
treats injection and uptake as the same event. They are not.

*Evidence: shipped for the mechanism — `PROGRESSIVE_DISCLOSURE`, `receipt.ts`. Audited
for the seventy per cent, which is a figure from a code path rather than a recorded
measurement. The old residency class counts are void.*

## 7. The hardening loop

**Claim.** Promotion requires a proof of convergence.

A release candidate runs ten Playwright passes per round against staging, failures are
deduplicated, a human steers through a stdio MCP server, and a patch is applied in the
sandbox. The loop exits on two consecutive clean rounds — an algebraic condition, not an
operator's judgement — and only then does the candidate move from warm to hot.

The human sits inside the loop as a steering call rather than above it as an approver,
and those decisions replay in CI from `steering-fixtures.jsonl`, so the loop runs
unattended without removing the person from it.

*Evidence: shipped — `agent-11-sugar-trainer.config.ts`,
`packages/mcp-server-human-steering`.*

## 8. The learning loops

**Claim.** Two loops over one telemetry stream: one a person gates, one that earns its
own entries.

The amendment lane captures a signal, structures it as a typed lesson, proposes an
amendment, stops at a human gate, applies through git hooks and re-scores. The gate is
architecture, not ceremony — it is the only stage the loop cannot pass on its own.

The convention lane is automatic and has a threshold instead. `capture-rule.mjs` observes
operational directives; a rule reaches permanent agent context via `promote.mjs` and
`AGENTS.md` only after it has been seen in two independent sessions, and it leaves again
when its declarative `retire-when` condition fires. A memory that only grows is a memory
nobody trusts, which is why the decay rule matters as much as the promotion rule.

Both lanes write to `build-log/decision-ledger.jsonl` — append-only, schema-validated. A
single-socket injector returns settled decisions to context, so a model cannot quietly
re-architect a choice already made.

*Evidence: shipped — `packages/feedback-flywheel`, `capture-rule.mjs`, `promote.mjs`,
`board.mjs`, `AGENTS.md`, `decision-ledger.jsonl`.*

## 9. The runtime engine

**Claim.** Production operation with cost governance, not just a build pipeline.

A request carries session context, is sized by a load estimator, and is routed by task
complexity across four tiers — forensic, precision, synthesis, narrative. Dispatch is
provider-agnostic through an LLM gateway with per-call latency profiling; six named MCP
connectors are replayed in CI from fixtures. Circuit breakers fail the build if cost
drifts past thirty per cent or wall-time past twenty per cent of the configured SLA.

Gate outcomes, given-against-done receipts and residual margins leave this engine and
return to the learning loops. Routing is a decision the system makes per task and cost is
a condition that can stop a run, so both belong in the same grammar as the build-time
gates.

*Evidence: shipped — `packages/model-router`, `packages/llm-gateway`,
`packages/mcp-infra`, `whitespace-hunter.vercel.app`.*

## 10. Two-lane execution

**Claim.** The constraint is scoped, not total.

Every claim above is about refusal, which leaves an obvious objection: a pipeline this
rigid cannot produce anything new. Lane 1 is strict, schema-bound execution into
production state. Lane 2 is exploration inside agent 03c's explore mode, where
alternatives are generated freely and held outside every contract.

What crosses between them is a `divergence_id` under a K4 parity check — an identifier,
never a payload. The guarantee is not a labelled box saying "contamination guard"; it is
that the boundary has exactly one opening, so there is nowhere else for a value to cross.

*Evidence: audited — imagination protocol v1.1. No implementing file has been named,
which makes this the least evidenced claim in the set.*

---

## Contested figures

Four counts come from two sources that disagree, and are recorded as contested rather
than averaged or quietly resolved in favour of the larger number:

- **Skill files**: 152, possibly 164 after twelve previously parked skills were wired into
  active manifests. The definition of "skill file" also needs settling.
- **Architecture layers**: 8 or 9, depending on whether `connectors` is a layer.
- **Gates**: 19 preflight in `feature-descriptor.md` against 30 checks in `verify-all.ts`.
- **Contracts against schemas**: 19 hand-authored against 43 generated. These are probably
  two different objects, in which case both are true and the ratio is itself a proof
  point — but that has not been confirmed.

`docs/evidence.md` carries every figure, its tier, its source, and the date it landed. It
is also the file the diagram compiler reads its expected counts from: change a figure
there and the plate that draws it fails until it is redrawn, and change a plate and it
fails until the figure is corrected. Neither can be edited alone.

## What this rests on

Three tiers, and nothing is tiered higher than its weakest input.

**Shipped** means a named file implements it, and the right response is to ask to see the
file. **Audited** means it was counted or observed during a repository read, or confirmed
by the author without a named file — second-hand, and not re-counted from code.
**Contested** means two sources disagree and the conflict is open.

Author confirmation raises a mechanism to shipped when the source names the implementing
file, because a file is something a reader can be shown. It does not raise a count, because
a count has no file to point at — only an arithmetic nobody has re-run, confirmed by the
person who would have to re-run it.

Twelve structural figures are still owed a count from source. They are listed in
`docs/evidence.md`, and the discipline there is to record the command that produced each
number alongside it. A figure with its command beside it is evidence. A figure without one
is a claim.
