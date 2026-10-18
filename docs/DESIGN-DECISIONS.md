# Design decisions

Twelve choices that shaped the factory. Each says what was tried, what was measured, what was rejected and
why. Each also draws the boundary of the decision, so a reader can see what it deliberately does not claim.

One entry is still a candidate rather than a settled decision. It is the most uncomfortable one, and it
stays: a decisions document that holds no open question is a brochure.

*Checked against factory `87fae286` on 18 October 2026. Tiers as in [Figures and evidence](evidence.md). A
commit hash names a commit of the software factory (private), not of this repository.*

---

## How these were found

The dates carry less weight than they appear to.

Five of the most-cited documents in the corpus trace to the repository's second commit, `b4542c41` on
19 March, which added 71 files at once:

- the agent constitution
- the five laws
- the prompt constitution
- the learning loop
- the skill router

They arrived at 338 to 915 lines each, and each has since changed in 15 to 69 commits. The doctrine arrived
substantially formed. What grew out of problems met is the enforcement underneath it: the gates, detectors
and interlocks. Most of those state in their own file headers the failure that produced them.

There is a second caveat. The factory requires a plan before work is approved, so a plan that predates an
implementation proves nothing about foresight; it is the rule firing. Where a decision below is called a
response to a problem, the evidence is the failure the code names, not the existence of a plan.

---

## 1. An index, not a corpus

**Problem.** Every agent was handed whole skill files inline. As the corpus grew, so did every prompt, and
the agent read a fraction of what it carried.

**Alternatives.** Keep inlining and raise the ceiling. Summarise each file. Retrieve by embedding.

**Choice.** A behavioural kernel is inlined verbatim. Beside it sits a citation index of one line per skill,
and `load_skill()` fetches a named section on demand.

**Reasoning.** An agent usually needs one section. Which section becomes knowable at the moment of need, not
at dispatch.

**Trade-off.** The index line becomes the entire surface an agent chooses from: it can only ask for a skill
whose one line tells it apart. On 12 September four skills were found to be unelectable. A YAML block scalar
had made each one's whole visible line its filename. The failure was silent: the files were present,
referenced and counted, and never picked.

**Evidence.** `shipped`: per-agent load fell from 196K–521K tokens to 7K–31K when inlining was replaced
(`f0e35c1`, 1 June). Static load is measured and published as a range. An election-surface check has blocked
in pre-commit since 20 September.

**Status.** Held, with a detector underneath it. The kernel reaches the eight agents the orchestrator
dispatches itself. The twelve producer agents receive their playbook instead (see
[open problem 1](OPEN-PROBLEMS.md#1-most-of-the-pipeline-is-a-person-pasting-a-file-into-a-session)).

---

## 2. One source of truth, and generated output checked for emptiness

**Problem.** Contracts described in prose drift from the code that implements them.

**Alternatives.** Hand-write JSON Schema. Generate types from JSON Schema. Keep both and diff them.

**Choice.** Hand-written Zod is the source. JSON Schemas are generated from it. A compiler checks every
consumer's declared read against the producer's real envelope variant, by structural subtyping.

**Reasoning.** A generated artifact cannot disagree with its source. A diff between two hand-written
artifacts only tells you that they differ.

**Trade-off.** Generation can succeed and produce nothing. Every committed generated schema was an empty `{}`
from its first commit on 28 March, and stayed empty for five months. Under a new major version of its
library, the generator emitted nothing, and the gate meant to catch drift compared one hollow artifact with
another. It was found and fixed on 31 August.

**Evidence.** `shipped`: R22 now regenerates every schema and deep-compares it with the committed one. It has
blocked since 13 September. Before it will run, the compiler's self-test plants five defects, a type change
and a missing field among them, and requires each one to be caught.

**Status.** Held. The honest scope is narrower than "contracts are enforced". Of 23 declared edges, 18 carry
no typed field reads, so for most of the graph the compiler checks that an edge and its variant exist rather
than individual fields.

---

## 3. Evidence is hashed when it is emitted, not when it is questioned

**Problem.** A cooperative agent asked to justify its output will produce a justification. It may be
assembled after the fact and still be sincere.

**Alternatives.** Re-run the work at a human gate. Sample through the attestation flow. Build signature or
Merkle-tree infrastructure.

**Choice.** The evidence set is hashed when the agent emits, and the hash is verified before any judge reads
the handoff. The hash comes first and the question second.

**Reasoning.** This is the exam-room rule: anything that can change after the question is asked is not
evidence.

**Trade-off.** It proves the evidence is unchanged. It does not prove the evidence is true. The decision
names six surfaces it deliberately does not cover, recorded so the scope cannot quietly widen.

**Evidence.** `shipped`, in `evidence-commitment.ts`. `audited`: two handoffs from live runs carry a
commitment, one over 18 evidence entries and one over 10. Whether each was verified before its judge read it
is recorded in run logs kept outside the tracked history.

**Status.** Held. It is anti-rationalisation tooling, not adversarial security: the threat it models is a
cooperative agent, not an attacker.

---

## 4. Four classes of failure route back. Everything else halts.

**Problem.** Some failures are worth retrying and most are not. A pipeline that retries everything turns a
bug into a bill.

**Alternatives.** Retry under a circuit breaker. Route every gate failure back. Halt on everything.

**Choice.** Four failure classes route back, with the failure as the next input:

- quality gate
- artifact claim
- schema on write
- D3

Attempts are capped at three, with a guard against A-B-A oscillation. A retry needs both a retryable class
and a matching error heuristic.

**Reasoning.** The work turned up a surprise. The existing circuit breaker was called from nowhere, so
"retry five times, then escalate" was documented behaviour that no code path could reach. It has since been
deleted.

**Trade-off.** Routing back the drift audit and the faithfulness gate was considered and rejected, because a
retry loop around an honesty check trains the thing it measures. A novel failure, one with no matching
heuristic, halts on first sight rather than being retried creatively. The fourth class, a list of written
files that does not match what was written, was added on 8 October.

**Evidence.** `shipped`, in `route-back.ts`. `audited`: route-back has fired in live runs:

- On 6 September agent 00 used all three attempts on one quality-gate failure and halted at the cap.
- On 8 October, in Whitespace Hunter's research run, the graph builder failed schema on write and passed on
  its second attempt.

Those run records sit outside the tracked history, so no recovery rate is measured.

**Status.** Held, and demonstrated live. Its rate is unmeasured.

---

## 5. A receipt that refuses to claim influence

**Problem.** Budgeting what an agent is given is not knowing what it used.

**Alternatives.** One attach point rather than two. Collapse the record into one group. Treat acknowledgement
as influence.

**Choice.** The receipt has four groups that are never collapsed: given, done, gate verdicts and run outcome.
A null keeps its reason instead of being dropped.

**Reasoning.** The boundary is drawn in four words: injection is not acknowledgement, which is not loading,
which is not influence. A record that merges them can no longer tell you which one it holds.

**Trade-off.** The receipt records. It does not judge.

**Evidence.** `shipped`, in `receipt.ts` ([demo 04](../demos/04-receipts/)). `audited`: one receipt shows an
agent given an index of 45 skills that cited none of them, and its handoff carries no citation at all. A
controlled experiment ran four arms:

- the right skill alone
- the right skill with its real co-loads
- volume-matched filler
- no skill

It used three skills and 19 to 20 cases per arm, in two independent runs of 480 calls. Having the right skill
present raised the grade by 0.617 on a ten-point scale, against a no-effect band of 0.239.

**Status.** Held, with one claim narrowed by measurement. No single receipt can prove that its loaded skills
shaped its output, and that per-record claim stands. The absolute version, that influence is provable by
nothing recorded, is contradicted by the experiment. The factory's receipt still states the absolute version
in its own constant.

---

## 6. Audit the prompt the agent receives, not the files it is built from

**Problem.** An agent's prompt is assembled at dispatch from several sources and runtime switches:

- the kernel
- the skill index
- the step file
- the attestation contract
- the steering block

Every source can pass its own checks while the assembled prompt contradicts itself.

**Alternatives.** Lint each source file. Rely on the craftsmanship gate and the contradiction linter, which
read files one at a time.

**Choice.** Rebuild what each agent is handed and check it as one artifact (R27). The rebuilt set is stamped,
so a stale or missing set reports UNEVALUATED and never PASS. CI fails on UNEVALUATED.

**Reasoning.** The defect that forced this lived between files. The kernel said a corrector could run at
most two cycles. A string in the orchestrator said "ONE Corrector cycle". The two sat 1,962 lines apart in
every assembled prompt, from 1 June until 6 September, when the assembled text was read as a whole. All
along, every per-file gate passed. A runtime switch did the same in miniature. With the steering tool off,
assembly dropped the block that explained steering and kept the order to call it: "STOP. Call
`request_steering`". Twenty-five such orders across eleven playbooks were made conditional.

**Trade-off.** The deterministic half of the check is narrow. Against a census in which a reader went through
every prompt and logged 637 ambiguities, it found 6%. The paid reading pass did not discriminate: its
verifier confirmed all 109 candidates and rejected none. For producer agents, the rebuilt set held a prompt
none of them receives, until 16 October. No rewrite has been tested by running a model on it.

**Evidence.** `shipped`: R27, the deterministic checks and the set stamp. `audited`: the two-cycle
contradiction appeared in all 20 assembled prompts and is now in none. 138 findings are closed and held by a
check.

**Status.** Held, and advisory. R27 defaults to WARN. Its written condition for blocking is an over-reject
rate at most 0.2; the rate measured was 0.57.

---

## 7. A person decides what becomes permanent

**Problem.** An agent that can write its own instructions will, and the record of why will not survive it.

**Alternatives.** Auto-apply low-risk changes. Let a judge trained on conformance decide what to keep.

**Choice.** Propose, never auto-apply. Capture is free and unbounded, and delivery is earned. An observation
seen in two or more separate sessions becomes a candidate, and a person promotes it. An observation from one
session is a finding, and it decays.

**Reasoning.** One conversation is an opinion about a moment; recurrence across conversations is what makes a
rule. A judge trained on conformance will keep whatever looks conformant.

**Trade-off.** Nothing forces a decision. In seven months three rules have been promoted, all on 12
September. A ready candidate can wait indefinitely, and nothing escalates it.

**Evidence.** `shipped`: the promotion lane, in `promote.mjs`. The promotion count can be checked in the
factory's `AGENTS.md`. The pending count deliberately is not published: that buffer is per-machine and
ungoverned, and a figure a reader cannot check does not belong here.

**Status.** Held, and slow on purpose. It is slower than intended.

---

## 8. Convergence takes two clean rounds and an answer

**Problem.** Tests passing once is not convergence.

**Alternatives.** Ship on one clean run. Ship on a threshold score.

**Choice.** It takes two consecutive clean rounds, and then a declare-hot question between rounds. The round
cap belongs to the orchestrator, not to the agent asking.

**Reasoning.** One clean run is a sample. Two in a row is the cheapest available evidence of a trend.

**Trade-off.** It needs a deployed product to harden against. The question also defaults to yes, so an
unattended run ends hot. The person's answer is where the cost of being wrong is priced, but only when a
person is there to give it.

**Evidence.** `shipped`, in `hardening-state.ts` and `askDeclareHot`. `audited`: the loop has never run
against a deployed product. Its state file was last written on 18 May, after five partial rounds of a
millisecond or less each, with no declare-hot answer. Agent 11 never ran on Ark, Archer or Author, which
were hardened by hand.

**Status.** Held, and undemonstrated.

---

## 9. Divergence lives in two fenced places and is measured only by survival

**Problem.** Strict verification suppresses novelty. A pipeline that only checks conformance will only
produce conformant work.

**Alternatives.** Let the explore branch compete with the faithful one. Expand it to more agents once it
looks useful. Measure divergence by how much it lifts quality.

**Choice.** One opaque divergent candidate may ride a single gate's handoff, and the pipeline never realises
it. A person judges it. The only metric is how often a kept candidate survives that judgment.

**Reasoning.** Measured by quality lift, the channel would learn to look good, which is exactly what a
divergence channel must not do. Survival is the one signal a person's keep-or-discard produces honestly.

**Trade-off.** Expansion waits on ten judged verdicts. A raw row count was rejected because it double-counts
re-judgments, and a time-based trigger because it measures nothing. Reaching ten unlocks a proposal; it does
not approve one.

**Evidence.** `shipped`, behind a flag that is off by default. When the flag is off, the candidate is
stripped before validation, so nothing downstream sees one.

**Status.** Never judged. The flag is now set on for the product build under way. Even so, the orchestrator
does not yet import the lane, so a candidate cannot reach gate A.

---

## 10. Two marketing frameworks are typed as contracts, not prose

**Problem.** A framework that lives in a document is advice. Agents do not read advice; they read schemas.

**Alternatives.** Keep the frameworks as skill files that agents cite. Encode them as prompt text.

**Choice.** They ship as contracts: a narrative-channel enum with a fixed set of archetypes, and an impact
equation as a typed object.

**Reasoning.** A violation becomes a parse failure rather than a disagreement. The framework's shape also
becomes auditable, because an enum can be enumerated.

**Trade-off.** The vocabulary is fixed early. An idea that fits no archetype has nowhere to go but a new
contract version, and under the append-only rule the enum grows and never shrinks.

**Evidence.** `shipped`: [`shared/index.ts`](../contracts/types/shared/index.ts) and
[`impact-equation.ts`](../contracts/types/foundational/impact-equation.ts), both in this repository.

**Status.** Held, and under-told. It is the clearest case of a non-software discipline entering the system as
a type rather than as a paragraph.

---

## 11. Each product is built in its own copy of the factory, and the factory learns from the copy

**Problem.** A build exposes what the factory gets wrong, and it does so in the middle of the build. The
product cannot wait for the factory to be fixed.

**Alternatives.** Freeze the factory for the length of a build and log defects for later. Patch the shared
factory live while builds run against it.

**Choice.** Each product starts as a copy of the factory at a commit:

- Ark at `0e04093f`, on 25 April
- Archer's second version at `41cdd058`, on 3 May
- Author at a copy matching `0ad13a15`, on 30 May

The harness changes inside that copy as the build needs it. Lessons, fixes and new skills are carried back
upstream afterwards, as commits that name the build they came from. For example:

- `07810ee2` carried 29 lessons and 18 bug-fix patterns from the Archer build.
- `cbf772c4` promoted eight skills from Ark's builds.

**Reasoning.** The product ships, and the factory still gets the lesson.

**Trade-off.** No build has run start to finish on one unchanged factory. During Author's build, its copy's
orchestrator changed in 30 commits. The factory's end-to-end claim, one brief in and a deployed product out
through every agent, is therefore untested. A fix also takes time to reach every agent: a quality-gate fix
carried back from Archer in May reached the research agents in September. And products drift from the
factory as much as they feed it. A September audit found that two products did not call their models
through the gateway at all, and that the factory packages they carried were vendored copies that had drifted
from the source.

**Evidence.** `audited`, from the products' histories and the factory's commits that name them.

**Status.** Held as practice. The first build meant to run on one pinned commit throughout, with every input
an agent sees hashed against the pin, is Whitespace Hunter's second version. It has not finished a round.

---

## 12. **Candidate, not settled**: a product shipped without the pipeline

**Problem.** Is the compiler pipeline required to build a product to this standard, or only sufficient?

**Alternatives.** Dispatch the fifteen-agent pipeline for the build. Keep the question open indefinitely.
Lower the bar for what counts as a pipeline build.

**Choice.** Record the result rather than explain it away. Whitespace Hunter went from specification to a
publicly reachable deployment in three sessions, on 1 and 2 September, with fourteen model calls and its
regression and test suites passing. A person drove it, and the pipeline was never dispatched.

**Reasoning.** The decision ledger is append-only, so the row cannot be edited. The two rejected alternatives
are named in it: keep the question open forever, or quietly redefine what "done" means.

**Trade-off.** It is one instance, on a product of one shape. It does not show that the pipeline is
unnecessary. The pipeline's claim is about repeatability and typed handoffs across a large build, and three
sessions of direct work test that neither way. The mode also leaves nothing for the instruments to read:
the build produced no events, no receipts and no handoffs.

**Evidence.** `audited`: the sessions, the call count and the deployment.

**Status.** **Candidate.** It is one of four rows, in a ledger of 940, not yet promoted to validated.
