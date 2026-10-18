# Grounding

Where is an agent likely to be wrong, and what does it know at the moment it hands off? Five instruments the
factory began building in October answer those two questions. None of them steers a run. Each section below
says what exists in code, at what tier, and what has to be true before it earns any control.

*Measured at factory `87fae286` on 18 October 2026. Tiers as in [Figures and evidence](evidence.md):
`shipped` means a named file implements it, `audited` means counted at that commit, and `unverified` means
no traceable source yet.*

| Instrument | What exists | What it controls | Before it may control anything |
|---|---|---|---|
| [The anti-map](#1-the-anti-map) | Types, a store of prior cells, a risk logger, a prompt linter | Nothing. Its log says `routes: nothing` | Fifty judged runs with region tags, then a Brier improvement over 15% |
| [Claim states](#2-claim-states) | A design and nine recorded rulings | Nothing. There is no code | A pre-registered pass rule, read on a round that has not run |
| [State-legible prompts](#3-state-legible-prompts) | A lens over every prompt surface | The lens warns | A census on main with zero gated findings |
| [Trace physics](#4-trace-physics) | A scorer for every dispatch and every run | Nothing. It ranks | Five real runs with a score, and the self-test held a week apart |
| [The early sensor](#5-the-early-sensor) | A recorder, its guard, its calibration scorer | Nothing, and CI proves it | No path is planned |

---

## 1. The anti-map

Hallucination is not uniform. An agent fills in where it has no contact with the thing it describes, and
where it was rewarded for an answer regardless.

The types name seven regions. Six are what a model never experiences:

- **duration**: time as felt, so two weeks reads as two months
- **perception**: colour, scale and legibility claimed from text alone
- **friction**: setup time and physical consequence, so plans come out frictionless
- **stakes**: nothing the model says costs it anything
- **magnitude**: numbers as felt, so ₹37 lakh becomes ₹37 crore, with the right digits at the wrong order
- **social**: a register that reads fine on paper and lands wrong

The seventh is reward bias, in four kinds:

- **agreement**: conceding to the stance in the prompt
- **completion**: filling a gap instead of reporting it
- **confidence**: dropping calibrated uncertainty
- **intent**: serving what the prompt seems to want over what is true

The point is the verification budget. An expensive check, such as a cross-family judge or a perturbation
pass, belongs on a claim in one of these regions. Spread evenly across every claim, it is mostly spent where
nothing goes wrong.

A claim declares its grounding: its region, whether it was anchored to something concrete, and, when it was
not, what it assumed. The contract refuses an unanchored claim that does not say what it assumed.

The risk scorer multiplies a per-region posterior by four factors:

- whether the claim was anchored
- how rare its subject is
- whether it inherited a stance from the prompt
- whether a leading frame met no declared gap

The factors are placeholders, and the code names them `PLACEHOLDER`. Each handoff gets one log record, and
that record's `routes` field is the literal `nothing`. The store holds one prior cell per region, weak by
design so that data would wash it out, and no observations. Nothing yet writes a new cell or moves one. No
claim carries a region tag, because the tagger is not built. So every run so far logs zero scored claims and
says why, rather than printing a clean zero.

A linter reads the assembled prompts for unanchored experiential terms, for leading frames, and for the
sentence that gives an agent permission to report a gap. It warns.

*Evidence: shipped — `contracts/types/governance/anti-map.ts`, `scripts/lib/anti-map.ts`,
`scripts/lib/prompt-linter.ts`. The logger is on by default, and `PROMPT_LINTER_MODE` defaults to WARN.
Audited — seven prior cells, no observations, no scored claim. Unbuilt — the claim tagger, fitting the cells,
and routing on risk.*

## 2. Claim states

A claim carries how well it is known, and the gate that reads it can lower that state but never raise it.

There are six states: KNOWN, UNKNOWN, UNCERTAIN, CONFLICTED, ASSUMED and OUT_OF_SCOPE. Each fixes its action:
proceed, retrieve, verify, adjudicate, qualify and test, or abstain. The agent declares the state. The action
is derived from it, and an agent that writes its own action is in violation.

The gate's rules run in a fixed order and only downgrade. A KNOWN claim with no evidence reference becomes
ASSUMED and passes. It is not rejected. Two things count as evidence:

- a file in the agent's sandbox with a machine hash
- an upstream claim already authorised as KNOWN

A floating-point confidence may be recorded, but no route and no gate may read one. Routing reads only the
gate's typed fields.

None of this is code. The handoff envelope has no field for claims, nothing writes them, and no gate reads
them. Two instruments already read the record it will produce: the anti-map logger and the early sensor's
calibration scorer. Both find nothing.

*Evidence: audited — designed and unbuilt at `87fae286`. The decision ledger holds nine design rulings. None
of the forty-six build units is done, and the schema has no field. No behaviour can be claimed.*

## 3. State-legible prompts

An agent boundary is an instrumentation point. It sits where a change of state has to become observable.

Five boundaries carry every prompt the factory writes or reads:

- **A, human and agent**: the brief, a gate decision, a steering answer.
- **B, agent and agent**: the handoff envelope and its narrative.
- **C, agent and model**: the assembled dispatch prompt, step files, judge prompts, tool descriptions.
- **D, agent and knowledge**: skills, the citation index, lessons, prior decisions.
- **E, product and its user**: the system prompts a product ships with.

The lens labels every prompt surface with its boundary and checks it. Its census of 5 October counted 552
files: 487 at D, 37 at C, 17 at A, 4 at B and 3 at E. It warns. Its own condition for blocking is a census on
main with zero gated findings, and the first census found 136.

The other half is the transition contract. A handoff would declare its state: verified, uncertain,
conflicting, incomplete, unsafe or unevaluated. The receiver would route on that state: continue, retrieve,
adjudicate, regenerate or abstain. That half is designed and unbuilt.

So is the trajectory reading, which would judge a series of builds by the direction its metrics move rather
than by any one value. The only trend reader that ships is semantic drift's margin series, in
[§5 of the architecture](architecture.md#5-the-verification-stack).

*Evidence: shipped — `scripts/lib/prompt-lens.ts`, run inside `verify-all`, with `LENS_MODE` defaulting to
WARN. Audited — the census of 5 October. The transition contract and the series trend are unbuilt: none of
nineteen units is done.*

## 4. Trace physics

A run can be scored by how it moved, not only by where it ended.

Each dispatch gets four quantities:

- **Jerk** counts thrash: route-back retries, oscillations, judge re-runs, gate rejections, restarts, and
  repeated identical loads.
- **Compression** is the accepted handoff's tokens over the tokens spent.
- **Schema friction** counts schema failures and fallbacks.
- **Energy** is wall time and cost. It is reported, not scored.

The score is `0.4 × compression + 0.4 / (jerk + 1) + 0.2 / (schema friction + 1)`. Every record carries the
tag `uncalibrated-operator-sketch-2026-10-02`. The score ranks runs, and nothing blocks on it.

A value the ledger does not record is null, with its reason. A null never becomes a zero inside a sum: when
compression is null, the score is null. The self-test plants exactly that mutation, a null turned into a
zero, and refuses it. A score of the input brief sits beside the run's score and never inside it. The
orchestrator writes a record for every dispatch and for every run, including halted and mock runs.

*Evidence: shipped — `contracts/types/measurement/trace-physics.ts`, `scripts/lib/trace-physics.ts` and the
`TRACE_PHYSICS` event. There is no switch, because it controls nothing. Unverified — no committed real run
carries a score. Its own condition for blocking is the self-test's ordering holding in two sessions at least
a week apart, plus five real runs with a score.*

## 5. The early sensor

The early sensor is a second opinion, graded on its own calibration before anyone may listen to it.

After an agent emits, a separate model reads the handoff and its narrative, but not the system prompt or the
turn record. It answers a frozen set of questions: five probabilities and three choices. The probabilities
are:

- will the faithfulness judge pass the handoff?
- will its attestations re-run clean?
- will the cross-family judge accept it?
- will its release score clear the floor?
- will the run succeed?

Each probability is later set against what happened, scored by Brier score and by calibration error. A
question with fewer than four scored points reads UNEVALUATED. The scorer's own self-test must rank a
calibrated reader above a random one, and a random one above an anti-calibrated one.

Nothing reads its answers. A block in `verify-all` fails the build if any dispatch, gate, route-back or
router module can reach the sensor's output. The block follows imports, dynamic imports, spawned programs
and agent gate commands, and it is proven red on a planted tree before it is trusted. The sensor runs as a
child process that emits a status line and never throws.

The same discipline holds across the programme: every floor names what it was calibrated on and what it is
evaluated on, and the two are never the same round.

*Evidence: shipped — `scripts/calibration/measure-sensor-calibration.ts`, `configs/sensor-questions.v1.json`,
and the reader-authority block in `verify-all.ts`, with `SENSOR_MODE` defaulting to OFF. Audited — one live
reading, on a seeded fixture handoff. Unverified — its calibration: no Brier score has been computed on real
data. No path to control is planned while floats may not route.*

---

## Why none of it steers

Five instruments share one property: none of them moves a run. That is the design. Each is recorded before
it is trusted, and each states in its own source what would have to be true before it is. An instrument
whose condition has not been met stays a recorder, and a recorder that turns out to be wrong has cost a log
line, not a build. The questions these instruments exist to answer are in [the workshop](WORKSHOP.md). What
they still cannot see is in [Open problems](OPEN-PROBLEMS.md).
