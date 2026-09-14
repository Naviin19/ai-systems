# Figures and evidence

Every countable figure and named mechanism in the corpus, what it rests on, when it
landed, and where it came from.

This file replaces the blanket "all figures are illustrative pending verification" line
that sat on the cover of the first reference set. A single global disclaimer is the
weakest form of the honesty discipline the positioning depends on: it tells a reader that
*something* is unverified without telling them *which thing*, so nothing on any page can
be trusted. Per-figure tiers cost more to maintain and are worth it.

**Revision, 13 September 2026.** A fresh read of `skill-ecosystem` surfaced six
architecture upgrades that landed between 23 August and 13 September, some of which
contradict what the plates currently draw. The mechanisms are confirmed by the author.
The counts are not, and §5 explains why that distinction is held rather than collapsed.

---

## 1. Tiers

| Tier | Means | A reader should |
|---|---|---|
| `shipped` | A named file or package in `skill-ecosystem` implements it. | Ask to see the file. |
| `audited` | Counted or observed during a repo read, or confirmed by the author without a named file. Not independently re-counted from code. | Treat as good but second-hand. |
| `contested` | Two sources give different values and the conflict is not yet resolved. | Treat as unknown, not as an average. |
| `unverified` | Appears in an earlier draft with no traceable source. | Disregard until checked. |

Nothing is tiered higher than its weakest input. A diagram whose structure is `shipped`
but whose count is `audited` is labelled for both.

**The rule added this revision.** Author confirmation raises a *mechanism* to `shipped`
when the source names the file that implements it — a file is a thing a reader can be
shown, and being shown it settles the matter. Author confirmation does **not** raise a
*count*, because a count is not a mechanism. There is no file to point at, only an
arithmetic nobody has re-run, and the person confirming it is the person who would have
to re-run it. Distinguishing the two costs one column and it is the whole reason this
corpus is worth publishing.

`contested` is new. It exists because the alternative — quietly picking the more
impressive of two numbers, or splitting the difference — is the exact failure mode the
tier system was built to prevent, and this revision produced four cases of it at once.

---

## 2. Structure

| Figure | Value | Tier | Source | Changed from |
|---|---|---|---|---|
| Skill files | 152, **possibly 164** | `contested` | repo note; Stage 7 wired 12 previously parked skills into active manifests | was 204 |
| Architecture layers | **8 or 9** | `contested` | note gives 8 named; the September read gives 9, adding `connectors` | was 9 unnamed, corrected to 8, now reopened |
| Preflight gates | 19 | `contested` | note, `feature-descriptor.md` — conflicts with the 30 below | was 21 |
| Verification checks | 30 | `contested` | `verify-all.ts` — may be a superset of the 19, may be a different object entirely | absent |
| Typed handoff contracts | 19 | `contested` | note, `contracts/CONTRACT_CATALOG.md` — relationship to the 43 below unresolved | absent |
| Generated JSON schemas | 43 | `contested` | unified Zod tree with drift detection — generated surfaces, not hand-authored contracts | absent |
| Contract families | 3 | `audited` | note | absent |
| Build agents | 15 | `audited` | note; corroborated independently by the September read | was six abstract stages summing to 20 |
| Research agents | 5, named | `audited` | note; corroborated independently | absent |
| Total agents | 20 | `audited` | two independent sources agree | — |
| Named build agents | 9 of 15 | `audited` | note | six remain unnamed |
| Level-0 hub skills | 11 | `audited` | skills with ≥ 20 internal citations | absent |
| Graded prompt corpus | 471 | `audited` | residual baseline corpus | absent |

**Agent count is the only structural figure with two independent sources that agree.**
It is therefore the only one that should be drawn bare. Everything else in this table
carries its tier into the caption.

---

## 3. Mechanism

Ordered by when it landed. The dates are part of the evidence: a corpus showing six dated
architecture changes in three weeks reads as a system under active development, which is
a different and better claim than a finished portfolio piece.

### Standing — the original mechanism set

| Figure | Value | Tier | Source |
|---|---|---|---|
| Pipeline topology | Parallel, git-worktree isolated, mutex-gated merge | `shipped` | `master-agentic-orchestrator.ts` |
| Merge serialisation | `.sandboxes/.merge.lock` | `shipped` | `master-agentic-orchestrator.ts` |
| Contract enforcement | Structural subtyping asserted at build time | `shipped` | `contract-compiler.ts` |
| Change impact | Breadth-first traversal of the contract import graph | `shipped` | `blast-radius.ts` |
| Runtime prompt surface | Compiled from contracts, not hand-written | `shipped` | `agent-12-prompt-manager.config.ts` |
| Decode discipline | Constrained decoding via forced `emit_handoff` | `shipped` | `master-agentic-orchestrator.ts` |
| Step evidence | Machine-verifiable `step_attestations[]` | `shipped` | orchestrator + playbooks |
| Faithfulness judge | Markdown vs JSON, temperature 0.2, scored 0–10 | `shipped` | `verify-handoff-faithfulness.ts` |
| Judge cache key | SHA-256 of artifacts + system prompt + model ID | `shipped` | `verify-handoff-faithfulness.ts` |
| Drift embedder | `trigram-hash-64-v1`, deterministic, zero cost | `shipped` | `detect-semantic-drift.ts` |
| Drift threshold | 0.82 cosine against baseline | `shipped` | `detect-semantic-drift.ts` |
| Enforcement ladder | disabled → advisory → enforcing | `shipped` | `detect-semantic-drift.ts` |
| Judge catch rate floor | ≥ 0.70 | `shipped` | `measure-judge-catch-rate.ts` |
| Judge false reject ceiling | ≤ 0.10 | `shipped` | `measure-judge-catch-rate.ts` |
| Defect classes | 5 | `shipped` | `measure-judge-catch-rate.ts` |
| Context reduction | ~70% of system prompt tokens | `audited` | orchestrator, `PROGRESSIVE_DISCLOSURE` — the mechanism is shipped, the percentage is not measured |
| On-demand fetch | `load_skill` tool, section-granular | `shipped` | orchestrator |
| Hardening round size | 10× Playwright per round | `shipped` | `agent-11-sugar-trainer.config.ts` |
| Termination condition | Two consecutive clean rounds | `shipped` | `agent-11-sugar-trainer.config.ts` |
| Human steering transport | stdio MCP server | `shipped` | `packages/mcp-server-human-steering` |
| Offline steering | Replay from `steering-fixtures.jsonl` | `shipped` | `packages/mcp-infra` |
| Feedback redaction | Raw text → `sha256:ref` | `shipped` | `packages/feedback-flywheel` |
| Promotion path | Git lifecycle hooks | `shipped` | `capture-run-feedback.ts` |
| Router tiers | 4: Forensic, Precision, Synthesis, Narrative | `shipped` | `packages/model-router` |
| Cost circuit breaker | > 30% drift past SLA | `shipped` | `packages/llm-gateway` |
| Wall-time circuit breaker | > 20% drift past SLA | `shipped` | `packages/llm-gateway` |
| MCP connectors | 6 named | `shipped` | `packages/mcp-infra` |
| Type-check saving | ~6s per dispatch, incremental `tsbuildinfo` seeding | `audited` | dispatch path — mechanism shipped, figure unmeasured |

### Landed 23 Aug – 13 Sep 2026 — the new mechanism set

| Figure | Value | Tier | Source | Landed |
|---|---|---|---|---|
| Research source mode | Primary-source retrieval, `--sources` | `shipped` | skill engine, Stage 3 | 31 Aug |
| Inferential measurement | Layer validation pass | `shipped` | skill engine, Stage 5 | ~2 Sep |
| Trajectory evaluation | Scoring across a run, not per step | `shipped` | skill engine, Stage 6 | ~4 Sep |
| Parked-skill activation | 12 skills wired into active manifests | `shipped` | skill engine, Stage 7 | 6 Sep |
| Market discovery service | Live, public, DataForSEO-backed | `shipped` | `whitespace-hunter.vercel.app` | 1–2 Sep |
| Run cost | ~$0.10 per run, $1.40–2.00 / month / domain | `audited` | Whitespace Hunter billing | 2 Sep |
| Trend backfill window | 4 years | `audited` | Whitespace Hunter | 2 Sep |
| Digest delivery | HTML + email via Resend | `shipped` | Whitespace Hunter | 2 Sep |
| **Decision ledger** | Append-only JSONL, schema-validated | `shipped` | `build-log/decision-ledger.jsonl`, `DecisionRecordSchema` | 1–6 Sep |
| **Evidence commitment** | SHA-256 hash-lock of attestations **before** the judge reads them | `shipped` | `EvidenceCommitmentSchema` | 1–6 Sep |
| **Route-back classifier** | Failure traceback re-dispatched as structured input | `shipped` | `classifyRouteBack` | 1–6 Sep |
| Route-back cap | ≤ 3 attempts, A-B-A oscillation detected | `shipped` | `classifyRouteBack` | 1–6 Sep |
| Rollback transport | Failure injected as `ROLLBACK_CONTEXT` | `shipped` | orchestrator | 1–6 Sep |
| Volatile-token stripping | Applied to tracebacks before re-injection | `shipped` | `classifyRouteBack` | 1–6 Sep |
| **Given-vs-done receipts** | `RECEIPT_GIVEN` (injected) vs `RECEIPT` (cited) | `shipped` | `receipt.ts` | 1–6 Sep |
| **Residual baseline** | `{score, floor, margin}` tracked over time | `shipped` | `residual-baseline.ts` | 1–6 Sep |
| Timescale split | Fast-loop receipts decoupled from slow-loop residual evaluation | `shipped` | `residual-baseline.ts` | 1–6 Sep |
| Decision injection | Single-socket payload injector for settled decisions | `shipped` | orchestrator context assembly | ~6 Sep |
| **Two-lane execution** | Lane 1 strict / Lane 2 exploratory | `audited` | imagination protocol v1.1 — a protocol document; name the implementing file or plate 10 ships as designed, not shipped | 6–13 Sep |
| Divergence transport | `divergence_id`, K4 parity checks, contamination guards | `shipped` | agent 03c explore mode | 6–13 Sep |
| **Level-0 hub gate** | Commits gated on hub-skill integrity | `shipped` | `scripts/skill-ref-count.ts --check-level0`, `.husky/pre-commit` | 12 Sep |
| Hub threshold | ≥ 20 internal citations | `shipped` | `skill-ref-count.ts` | 12 Sep |
| **Convention flywheel** | Rule promoted to permanent context after ≥ 2 independent sessions | `shipped` | `.claude/hooks/capture-rule.mjs`, `promote.mjs`, `board.mjs`, `AGENTS.md` | 12 Sep |
| Rule decay | Declarative `stale-when` / `retire-when` | `shipped` | convention lane | 12 Sep |
| Prompt grader | 5 dimensions: clarity, specificity, context scope, constraint hardness, fallback grace | `shipped` | prompt multiplier | standing |
| Grader remediation | One auto-rewrite attempt, then deterministic halt | `shipped` | prompt multiplier | standing |
| Self-grading split | Generation (03b) and audit (03c) are separate agents | `shipped` | agent configs | standing |

Bold rows are the ones that change what a plate draws. All eight are tracked in §4 —
evidence commitment and residual baseline both land on plate 05, which absorbs them as the
entry gate and the threshold band respectively rather than as separate plates.

---

## 4. What the new mechanisms do to the existing plates

| Plate | Currently draws | Now wrong because | Action |
|---|---|---|---|
| 02 Knowledge substrate | 152 files across 8 layers | Level-0 gating means the corpus has a *citation graph* with topologically derived hubs. A layered stack is a filing cabinet; a hub graph is a structure. | Redraw as citation graph, hubs marked |
| 05 Verification stack | Two outcomes: halt, warn | Route-back is a third path and it is the distinctive one. A plate drawing two outcomes describes the system as it was before 1 September. | Redraw for four outcomes |
| 05 Verification stack | Checks begin at the stack entry | Evidence commitment hash-locks the artefact *before* any check runs. The stack now starts one step earlier than it is drawn. | Add the entry gate |
| 05 Verification stack | A threshold drawn as a line | The residual baseline tracks `{score, floor, margin}`, so the line is really a band, and margin compression is visible before a breach. | Draw the band |
| 06 Context residency | ~70% token reduction | Token reduction is a cost claim. Receipts make the harder claim — what was *used*, not what was *sent*. | Add the given/done split |
| 08 Learning loop | Designed protocol with a human gate | The flywheel is shipped code with a promotion threshold and a decay rule. This is an evidence-tier promotion, the most valuable change in the set. | Re-tier, add the ledger |
| 09 Runtime engine | Four products | Whitespace Hunter is a fifth, live, with a public URL a reader can click. | Add it |
| — | no plate | Nothing in the set shows the system doing anything other than constraining. Two-lane execution is the only evidence it can also explore, and keep the two apart. | New plate 10 |

---

## 5. Contested figures — resolve before drawing

Four conflicts opened this revision. Each must be resolved from code, not from judgement,
because the visual grammar requires ticks to reconcile across plates: if plate 03's
per-stage ticks sum to 20, plate 01 must say 20. Two different gate counts inside one
corpus breaks that rule visibly, and a reader who catches it stops trusting every other
number on every other plate.

| Conflict | Values | The question to answer |
|---|---|---|
| Layers | 8 vs 9 | Is `connectors` a ninth architecture layer, or a package directory that a reader miscounted as one? The earlier draft said 9, was corrected to 8, and the September read says 9 again. One of those three moments was wrong. |
| Gates | 19 vs 30 | Are the 19 preflight gates in `feature-descriptor.md` a subset of the 30 checks in `verify-all.ts`, or are these two different objects sharing a word? If subset: draw 30 with 19 marked as preflight. If distinct: they need different words, and the plates need to pick one. |
| Contracts vs schemas | 19 vs 43 | Almost certainly two things — 19 hand-authored handoff contracts, 43 generated JSON schemas derived from them. If so, both are true and the ratio is itself a proof point for plate 04. Confirm before drawing either. |
| Skill files | 152 vs 164 | Did the count of 152 predate or postdate Stage 7 wiring 12 parked skills into active manifests? Also settle whether "skill file" means every `SKILL.md` or only active-manifest entries. Two definitions produce two legitimate numbers. |

---

## 6. Unverified — not drawn, or drawn with the doubt on the face of it

| Figure | Value | Why it is out |
|---|---|---|
| Residency class counts | 12 resident / 60 index / 132 paged | Sums to 204, which was the wrong total. The three classes survive; the counts do not. |
| Product status | Ark live, Author live, Archer2 dormant, Auteur specced | Not corroborated by any source document. Drawn, but the plate's evidence line says so. |
| Per-layer file counts | never stated | No source gives a distribution. The substrate is drawn as a flow, not as equal rows, so the plate does not imply one. |
| Build-time compression | "2–4 weeks vs 6–9 months" | Comparative claim with no measured baseline on either side. |
| Intervention reduction | "up to 80% fewer manual interventions" | No instrument produces this number. "Up to" is doing all the work. |
| Trend surge magnitudes | "18×", "+1800%" | Real outputs of a real tool, but presented as headline figures rather than as one run's result. If used at all, they belong to a named query on a named date. |

The last three came from a September read written to persuade a general audience. They are
recorded here so that nobody re-imports them later believing they were checked once.

---

## 7. The correction worth publishing

`configs/agent-00.config.ts` cited a section anchor (`§P1-§P2`) that did not resolve.
Agent 00 — the spec validator, first in the pipeline, the one gate every build passes
through — was being handed the literal string `[section not found]` where its constitution
should have been. Found and fixed 12 September; the Level-0 gate now catches this class
before commit.

This belongs in the public repo, not despite being embarrassing but because of it. It is
a silent failure in the most load-bearing input in the system, caught by an audit rather
than by a symptom, and fixed by adding the check that would have caught it earlier. The
demos brief already observes that a visible correction in the git log did more for the
positioning than a clean history would have. This is a better one than the example it
cites.

The general point it proves is the one worth stating plainly: a citation that silently
resolves to an error string is worse than a citation that throws, because the pipeline
keeps running and every downstream output is confidently built on nothing. That is the
argument for the whole verification stack, and here it is with a date attached.

---

## 8. Still owed to the repo

The `audited` tier is the weak rank in this set, and `contested` is weaker. Twelve figures
carry the structural argument and none has been re-counted from code.

Run these inside `skill-ecosystem`:

- [ ] `152` / `164` — count `SKILL.md` under the skills tree; state the definition used
- [ ] `8` / `9` — read the layer taxonomy in the skill-file standard; is `connectors` a layer?
- [ ] `19` gates — count gate definitions in the pipeline config
- [ ] `30` checks — count checks in `verify-all.ts`; determine the relationship to the 19
- [ ] `19` contracts — count entries in `CONTRACT_CATALOG.md`
- [ ] `43` schemas — count generated JSON schemas; confirm they derive from the 19
- [ ] `11` Level-0 hubs — run `skill-ref-count.ts --check-level0`, record the output verbatim
- [ ] `471` graded prompts — count the residual baseline corpus
- [ ] `20` agents — already corroborated twice; re-count anyway, it is cheap and it is the figure every plate reconciles against
- [ ] `~70%` context reduction — run the dual assembly and record the number it actually produces
- [ ] `3` contract families, `9 of 15` named build agents — cheap, and they appear on plates
- [ ] The implementing file for two-lane execution — plate 10 is the only plate resting on a single unnamed source

Verify these and the structural half of the set moves to `shipped`. Until then the plates
say `audited` or `contested`, which is true and checkable, rather than stating them bare.

**Record the command and its output, not just the number.** A figure with the command
that produced it beside it is the difference between this file being a claim and being
evidence, and it costs one extra line each.

---

## 9. Machine-readable figures

Every count the plates draw, in one block. `tools/diagram-compiler/verify.py` parses this
and fails the build when a plate disagrees with it.

This exists so that the figures and the artwork cannot drift apart. It is the argument
plate 04 makes about schemas, turned on the set's own numbers: change a figure here and
the plate that draws it fails until it is redrawn; change a plate and it fails until the
figure is corrected here. Neither can be edited alone, which is the only version of
"single source of truth" that survives contact with a deadline.

```json
{
  "drawn": {
    "skill_files":            {"value": 152, "tier": "contested", "plates": ["01", "06"]},
    "preflight_gates":        {"value": 19,  "tier": "contested", "plates": ["03"]},
    "build_agents":           {"value": 15,  "tier": "audited",   "plates": ["03"]},
    "research_agents":        {"value": 5,   "tier": "audited",   "plates": ["03"]},
    "total_agents":           {"value": 20,  "tier": "audited",   "plates": ["01", "03"]},
    "route_back_cap":         {"value": 3,   "tier": "shipped",   "plates": ["05"]},
    "hardening_clean_rounds": {"value": 2,   "tier": "shipped",   "plates": ["07"]},
    "promotion_sessions":     {"value": 2,   "tier": "shipped",   "plates": ["08"]},
    "level0_hubs":            {"value": 11,  "tier": "audited",   "plates": ["02"]},
    "level0_threshold":       {"value": 20,  "tier": "shipped",   "plates": ["02"],
                               "form": "numeral"}
  },
  "stated_not_drawn": {
    "verification_checks": {"value": 30,  "tier": "contested"},
    "typed_contracts":     {"value": 19,  "tier": "contested"},
    "generated_schemas":   {"value": 43,  "tier": "contested"},
    "graded_prompts":      {"value": 471, "tier": "audited"},
    "architecture_layers": {"value": 8,   "tier": "contested", "alt": 9}
  }
}
```

`form: numeral` on the Level-0 threshold is load-bearing rather than stylistic. Unit ticks
count agents and stages and reconcile across the set, so twenty citations rendered as
twenty ticks would sit under a rule that reads identical tick counts as agreement with
the twenty agents on plates 01 and 03. The verifier fails the build if plate 02 emits a
unit tick at all.
