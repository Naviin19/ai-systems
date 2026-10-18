# Open problems

What this architecture demonstrates, it demonstrates. What follows is what it does not solve, stated plainly
enough to be checked. The problems are ordered by what each would cost someone who trusted the architecture
and hit it in production, not by how interesting it is inside the factory. Several are visible in this
repository's own demos, which say so in their own words.

*Checked against factory `87fae286` on 18 October 2026. A commit hash names a commit of the software factory
(private), not of this repository.*

---

## 1. Most of the pipeline is a person pasting a file into a session

Twelve of twenty agents do not run autonomously. For each one, the orchestrator writes a prompt file and
prints an instruction to open a fresh session and paste it in. It then polls for a handoff file, timing out
after an hour by default.

**Why this costs more than the ceremony suggests.** The prompt those sessions receive is the agent's
generated playbook plus any retry context. It does not pass through the prompt assembler, and that has
consequences:

- **The kernel never reaches them.** The architecture calls the behavioural kernel universally resident, and
  the orchestrator refuses to build an agent without it. It reaches none of the twelve producer agents that
  do most of the building.
- **Forced-schema emission mostly does not apply.** It binds the two emitter agents of fifteen. The twelve
  producers write their handoff through a generated script.

**What it costs an adopter.** An adopter who runs builds unattended finds that the guarantees they relied on
are absent from exactly the sessions doing the work. This is not a bug to patch. It is what the system is
today.

*Evidence: shipped behaviour, read from the orchestrator's producer path and the generated playbooks.*

## 2. No product has been built start to finish on one version of this pipeline, and the loops that need production have never closed

Products are built with the factory, but each in its own copy, and the harness changes inside that copy as
the build goes (see [decision 11](DESIGN-DECISIONS.md#11-each-product-is-built-in-its-own-copy-of-the-factory-and-the-factory-learns-from-the-copy)).
During Author's build, its copy's orchestrator changed in 30 commits. So no one has measured one brief going
in and a deployed product coming out through every agent on one unchanged factory.

The loops that need a live product are the ones that have not closed:

- **Hardening.** The hardening agent has never run against a deployed product. Ark, Archer and Author were
  hardened by hand. This repository's demo notes say the same, in their own words.
- **Divergence.** No divergent candidate has been judged. The flag is now on for the build under way, but
  the orchestrator does not yet import the lane, so a candidate cannot reach its gate.
- **Route-back.** It has fired live. Two examples:
  - In September, an agent used all three attempts and halted at the cap.
  - In October, an agent in Whitespace Hunter's research run passed on its second attempt.

  Those run records sit outside the tracked history, so no recovery rate exists to publish.

**What it costs an adopter.** Every mechanism here was built against real failures. But an adopter running a
whole build on one version of this pipeline would be among the first to do so, and would be measuring the
pipeline as much as using it.

*Evidence: audited — the products' histories, the factory's commits that name them, and the hardening state,
last written on 18 May with no declare-hot answer.*

## 3. A green check can mean the check looked at nothing

This problem has two faces:

- a mechanism that returns success over an empty input set
- a mechanism whose coverage is declared by hand rather than derived from what it governs

From the outside, both print a pass.

Each of these instances can be checked in the source:

- **The gateway's cost ceiling cannot fire.** It projects cost from zero input and zero output tokens. Every
  adapter prices linearly, so the projection is always zero, and comparing it with any non-negative ceiling
  is always false. The branch is dead code.
- **The model-provenance partition key is a single constant.** The tree it partitions holds no audit records.
- **The deficit-language lint has no fixture.** None of its eight patterns matches anything in the test
  tree. The one lint that deterministically fails a grade is exercised by nothing.
- **Typed contract coverage is thin where it matters.**
  - Of 23 declared dependency edges, 5 carry typed field reads and 18 carry none: 9 field reads across the
    whole pipeline.
  - The build spine is declared with no typed reads at all. So the compiler checks that an edge and its
    envelope variant exist, not individual fields.
- **Cross-family judging is narrower than its flag implies.** In the example registry, three call sites
  request it, and none declares the judge-and-producer pair the validator needs before it can compare
  anything.

**What it costs an adopter.** They ship believing that:

- a cost ceiling protects them
- model provenance is partitioned
- forbidden language is linted
- contract edges are typed

Each is a protection they find they never had, at the moment they need it.

*Evidence: shipped code, read directly. This is the class the factory names as its own anti-pattern: a gate
whose passing state cannot be told apart from its dead state.*

## 4. You can prove what an agent was shown, not that it read any of it

The system records which documents were placed in an agent's context. It cannot establish that the agent
opened one. The receipt says so in a constant it carries: a citation proves injection into the index, not
acknowledgement, not loading, not influence.

[Demo 04](../demos/04-receipts/) shows the measured case: an agent given an index of 45 skills cited none of
them, and its handoff carries no citation at all.

Two adjacent claims, at the strength the evidence carries:

- **A corrector cycle is counted only by the agent that ran it.** The bound is two cycles. The count lives in
  a file the agent writes: four such files existed on disk at a September audit, and none was ever committed.
  Whether a self-reported count can be trusted is untested, not known to fail.
- **Output-drift detection runs for one agent of twenty.** Only one has the two baselines enforcement needs.
  Where it runs, it compares wording with a lexical embedder, and says so.

A controlled experiment has since shown a measurable effect from the right skill being present (see
[decision 5](DESIGN-DECISIONS.md#5-a-receipt-that-refuses-to-claim-influence)). No single receipt can show
that effect for its own dispatch.

**What it costs an adopter.** The index costs tokens on every dispatch, and the cost grows with the corpus.
For any one run, they cannot show what it bought.

## 5. When a run recovers, nothing records how

A failure can end three ways: it is routed back and fixed, it is flagged and the run halts, or it is
repaired silently and the run carries on. The third is the one the factory's rules forbid. All three exist
as a design, and none is recorded:

- **A halted agent gets no receipt.** The receipt is built only on the success path. An agent stopped by a
  gate leaves an `AGENT_FAIL` event and nothing in the shape every other agent leaves.
- **A recovery leaves no marker.** When a route-back succeeds, the loop exits with no event. So the time to
  recover is unknown for every past run.
- **A silent repair has no counter.** Several catch sites log a warning to the console and continue. A
  counter of silent fixes could therefore only ever read zero: what it counts is, by construction,
  unrecorded.

The factory's own audit of this, dated 4 October, names what is needed: a recovered marker, a receipt on the
halt path, a counter for silent repairs, and the schema issues kept across a retry. None is built.

**What it costs an adopter.** A run that ends green may have halted and resumed, or carried a silent repair
through, and its record looks the same either way.

*Evidence: audited — the receipt's attach point and the route-back loop's exit, re-read at `87fae286`.*

## 6. The written rule and the code that enforces it disagree

Two people following two canonical documents can reach different answers about the same artifact. There is
a live instance in an agent's playbook: a value capitalised one way in the prose, and constrained to lower
case by the enum that validates it.

**What it costs an adopter.** Repeated, concrete rework, and no way to tell which of two authorities will fail
their build.

## 7. More of the enforcement is advisory than blocking, and nothing dates the advisory period

Each gate's mode is a switch set to off, warn or block. Of 68 switches, 37 default to warn and 21 to block.
CI fails on an unevaluated verdict for only two of them.

Every warn default carries a written condition for flipping it to block, which keeps this tractable rather
than permanent. But a condition without a date is a warning that can outlive the problem it was waiting on.

**What it costs an adopter.** The cost is slow and compounding, cheap to ignore and expensive to reverse. The
end state is a suite that is green because it is asleep.

## 8. The checks test the shape of the work, and against unanticipated defects they are close to blind

The one place recall was measured against a reading census was the assembled-prompt check (see
[decision 6](DESIGN-DECISIONS.md#6-audit-the-prompt-the-agent-receives-not-the-files-it-is-built-from)).
Its deterministic half found 6% of what the reading found. The gate says so in its own header, and states
that a clean deterministic result is not evidence the prompts are clean. Its reading half confirmed every
candidate it was shown and rejected none, so it does not discriminate either.

**What it costs an adopter.** Someone who reads 43 CI gate ids as 43 things that cannot go wrong has
mispriced their risk by about an order of magnitude.

## 9. A quality check calibrated on its own corpus goes blind when the whole corpus is bad

The adaptive channel flags what is unusual for its type, against a baseline drawn from the population it is
judging. When the population shifts together, nothing looks unusual. In one measured run, 13 of 20 files sat
below their floor and no anomaly was raised.

The design anticipates this. Fixed floors stay authoritative, and the adaptive channel is forbidden to adjust
them, so the failure is bounded rather than silent. It is listed because it is the single most copyable idea
in the repository, and it does not work alone.

## 10. Captured knowledge neither graduates on evidence nor expires on truth, only on a timer

Observations are captured freely and decay on a clock. A person must promote one before it becomes a durable
rule. In seven months three rules have been promoted, all on one day. Notes that are not promoted age out
whether or not they were right.

One figure is deliberately absent. The count of pending candidates is per-machine and ungoverned, and a
number a reader cannot check does not belong here. That is part of the problem: the rule "seen in two
separate sessions" only ever counts sessions on one machine.

**What it costs an adopter.** A maintenance tax rather than a production failure. No deploy breaks because a
convention sat unpromoted.

---

## What is deliberately not claimed

These statements were considered for this document and cut, or changed, because they are argument rather
than measurement:

| Considered | What the evidence carries instead |
|---|---|
| "The attestation split has never caught a false claim" | It has. On 6 October an agent attested PASS for two checks it had no tool to run, and the re-run reported the mismatch. |
| "An agent that runs five cycles and reports two is undetectable" | The enabling fact is measured: the count is self-reported and uncommitted. The step to undetectable is inference. |
| "The blast radius over-reports, and its precision cannot be trusted" | The structural coupling is measured: 28 of 58 registered schemas share a source file. No false dependency edge has been demonstrated. |
| "Audited: 0" | That sentence is a code comment quoting itself. The measurement that says the same is in problem 3: three call sites request cross-family enforcement and none declares the pair the validator needs. |

A document about unsolved problems is the last place to overstate one.
