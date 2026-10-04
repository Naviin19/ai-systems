# Engineering Probabilistic Systems

**Making probabilistic systems observable, testable and governable.**

---

## The problem

A language model is a probabilistic component. It can write, judge, summarise and decide where no
fixed rule can, yet **its interface does not reliably distinguish a correct answer from an incorrect
one.** Right and wrong arrive through the same channel, in the same shape, at the same apparent
confidence.

So the work is not to make the component certain. It is to build a system around it in which
uncertainty, failure, provenance, evidence and recovery all stay **visible**, so the whole can be
observed, tested and governed.

Four principles do that work: compute before the model speaks, make failure impossible to mistake
for success, let the interface enforce the discipline, and test the tests.

## Four principles

```
 THE PRINCIPLE                                    THE MECHANISMS THAT APPLY IT

 1  Put the deterministic thing first       ───   2 Typed input · 5 Numbers · 10 Gates
 2  Make the failure mode visible           ───   6 Abstention · 8 Claim vs world · 9 Detector
 3  Let the interface carry the discipline  ───   1 Index · 3 Schema · 4 Isolation · 13 Brief box
 4  Point scepticism at your own instruments ──   7 Evidence · 11 Runtime · 12 Lessons

 probabilistic  →  observable  →  testable  →  governable
```

Thirteen mechanisms follow, ordered as a dependency spine. The thirteen plates in
[architecture.md](architecture.md) cut the same system by behaviour.

**1 · Put the deterministic thing first.** Numbers are computed before a model may mention them.
Cheap, exact checks score candidates before a judge ranks them. The model does what it is genuinely
useful for, wording, selection and transformation, inside a frame that code has already made true.

**2 · Make the failure mode visible by construction.** A degraded gate cannot report a clean pass.
An abstention cannot be read as a zero. A judge that never reached the network cannot be recorded as
one that declined. Most of the engineering here is not about preventing failure; it is about never
letting failure and success look alike.

**3 · Let the interface carry the discipline.** One schema language generates every downstream
artifact. Every agent works in its own copy of the repository and merges under a lock. Every handoff
resolves against a typed contract, and every model call names a registered call site or does not
dispatch.

**4 · Point the same scepticism at your own instruments.** A check is not evidence because it
exists. Every rule in the detector below must catch a planted defect in its own fixture or the whole
scan aborts, because a check that has never failed may be one that cannot.

---

## 1. An agent carries an index, not a library

*Knowledge — does the agent have what it needs?*

**Do not give an agent knowledge. Give it the ability to acquire knowledge.**

Context is an agent's scarcest resource, and every extra document is a tax on the relevant one. An
index costs almost nothing and defers the price of a document until a task proves it is needed.

The corpus is 221 documents, roughly 949,000 words, and no agent holds it. The nine agents the
orchestrator dispatches itself receive a fixed behavioural kernel of 1,594 tokens plus a one-line
index of the documents their manifest declares, averaging 2,102 tokens; resident context runs from
8,086 to 20,291 tokens, estimated over the real assembled prompt. The eleven producer agents receive
their generated playbook as the whole prompt. When a task matches an index line, the agent calls
`load_skill(filename, section?)` and receives that section; a request that matches nothing returns
the file's section list instead of an error.

The index line is an engineered surface too, because an agent chooses a document from a single
sentence. Descriptions are rewritten under a pre-committed stop rule, and an irrelevance probe offers
tasks from outside the domain, such as unclogging a sink, where the right answer is zero documents.

---

## 2. Weak input becomes a typed payload before it reaches the model

*Specification — does it understand what it has been asked to do?*

**Make input typed and canonical before probabilistic processing begins.**

Whatever a user types is ambiguous, and every downstream check works better once that ambiguity is
resolved. So free text becomes a schema-validated object *first*: a tool whose input schema *is* the
caller's own schema, which the model is forced to call, at temperature zero.

**The cache key is content-addressed over everything that could change the answer**: the raw text, a
normalised schema fingerprint, the context, the model and the quality floor. A changed schema is a
clean miss, and no record needs a version field. **Failure comes in three kinds.** Truncation throws
its own error class, so the caller raises the ceiling instead of concluding the input cannot be
enriched; a wrong shape retries once; a brace-balancing scan is the last resort. **Concurrent
identical calls make one dispatch.**

At the front of a build, every issue found in the specification becomes a typed triage entry
carrying the operator's verdict, and nothing defaults to accepted.

---

## 3. One schema language, and everything downstream is generated

*Contracts — can components exchange information safely?*

**The system never hopes for JSON.**

A data shape written down in more than one place will diverge; the only question is when. The
defence is derivation, not discipline: one source of truth for every registered contract, with
everything downstream generated from it. The 46 per-agent I/O schemas are kept by hand outside that
registry, and are named as such.

55 source files hold 2,165 schema declarations. From them, 52 JSON Schema files are generated, 50 of
them registered. The handoff envelope between agents is a discriminated union of 24 variants, keyed
on the boundary each one crosses, and each of the 20 variants an agent emits becomes a tool
definition the producing model is forced to call. Every envelope carries its schema version: a newer
minor proceeds, a different major is refused with both numbers named, and an unreadable version is
never defaulted. The envelope also records whether its producing model was *stamped* by the
orchestrator or *declared* by the agent, so a producer cannot claim its value was observed.

In the product that needed a second language, one schema derives **three** targets: the TypeScript
validator, the Python one, and the contract embedded in the model's own system prompt, the three
places a shape usually drifts apart.

Above the generated files sits a compiler that proves the seams rather than the spelling. For every
dependency edge, the consumer's declared reads are checked by structural subtyping against the
producer's real envelope variant, so a field that changes type is caught, not only one that
disappears. A change's blast radius is computed, not estimated.

---

## 4. Every agent gets its own copy of the repository

*Orchestration — can they work concurrently without corrupting state?*

**Parallelism is safe when isolation is physical and the merge is refusing by default.**

Agents working in parallel on one checkout is the obvious design, and the one that loses work.
Conventional isolation, each agent agreeing not to touch what it does not own, holds until one agent
is wrong about what it owns, and being wrong is silent. So each agent works in a git worktree on its
own branch, and merging back is fast-forward only, behind a lock: the tool refuses rather than
dropping a commit.

---

## 5. Numbers are computed, never authored

*Deterministic boundaries — what should the model never be allowed to decide?*

**The model may select and word. It may not calculate.**

In [Author](https://author-now.vercel.app), every statistic the output can contain is derived in
pure code into a typed index with stable ids, and the model may only cite them by reference. After
the call, a gate resolves every citation, builds a universe of permitted numbers from the stat
values, the quoted customer questions and the verbatim source evidence, and scans every prose field
for multi-digit tokens that are not in it.

A model asked to write persuasive prose will invent a credible figure, because concrete specifics
are exactly how a fabrication sounds true. So the code overwrites the total a judge calculated, and a
customer's question is cited by index into a pool of real observed language, never retyped.

---

## 6. Abstention is a type, not a missing value

*Abstention — can the system admit that it doesn't know?*

**A system that cannot say "I don't know" will say something else instead.**

Whitespace Hunter's signals either score or return `null` with a stated reason, and the distinction
survives every layer. The composite renormalises its weights over only the signals that fired, and
the breakdown still lists all six, with `null` in the abstained slots, named on screen.

---

## 7. Evidence is committed before it is questioned

*Verification — can a claim be checked against prior evidence?*

**A sincere justification assembled after the question is still assembled after the question.**

When an agent finishes, its evidence is sealed. Each piece is fingerprinted the moment it is
emitted, before anyone asks a question about it, and questions can only point at the sealed
evidence. Change a single character and the run stops and names the item, so a justification cannot
be rewritten after the fact.

A model from a different family then reviews the work, and the factory re-runs the checks each agent
says it passed. An agent that claims a pass where the check fails halts the run.

The same rule holds for the builder. A plan becomes a ledger of units, each with a fast check that
proves it. After every edit, a hook runs the current unit's check, and the result arrives as tool
output rather than as something the agent reports. A second hook refuses to end the turn while the
check is red, so "complete" means the command passed. After three attempts at the same unit it lets
go and marks it failed for a person, because a fourth attempt is thrashing. A third hook rebuilds a
short brief at every session start and after every compaction, so progress survives the context
being summarised.

---

## 8. A claim is checked against the world, not against its envelope

*Verification — can a claim be checked against the world?*

**A schema validates the shape of a claim, never the claim.**

A handoff can be well-formed, hashed and committed and still describe work that did not happen. So
every path an agent reports is resolved against disk. The fields that may carry one are declared, not
pattern-matched: sixteen leaves, eleven naming files, one a URL route that a name-matching check
would call missing on every run, four belonging to other systems. Zero handoffs reports as
unevaluated, never as clean.

The stronger half is upstream. Fields a machine already knows are removed from the form the model
fills, and the orchestrator writes the file before the handoff that names it, so claim and artifact
come from one hand. What an agent may say about its own dispatch is typed too: `blocked`,
`better_route`, `open_question`. An agent with no sanctioned outlet finds an unsanctioned one, so
every persistent surface the factory writes is inventoried, thirty-nine in all, twenty-one reaching
a prompt or a session, nineteen of those rewrite-invisible, and a detector holds the inventory to the
tree. It bans nothing; it makes every channel visible.

---

## 9. A detector for failures that look exactly like success

*Failure observability — can failure masquerade as success?*

**A rule that suddenly matches nothing is broken, not victorious.**

The most expensive defects are the ones whose failed state is byte-identical to their healthy state:
an unchecked database write, a paid model call whose `catch` returns null.

Every detector rule must first catch a planted defect in its own fixture, or the whole scan aborts,
and each declares a minimum file count, so a collapsed glob is caught rather than celebrated. The
design rule, from its CI comment: *a gate that fails on day one gets disabled, so on day one it
fails on nothing.*

---

## 10. Deterministic gates vote before the judge is allowed to

*Gating — can cheap certainty eliminate work before probabilistic judgement?*

**Spend the cheap, exact check first; spend the model only on what is left.**

The two highest-stakes narrative stages run producers from different model families in parallel.
Every candidate is scored by deterministic gates, and a judge is asked to choose only when at least
two come back completely clean. One clean candidate is taken with no judge call; none get one
targeted repair pass; and a second failure drops the field rather than shipping it.

---

## 11. A twenty-minute pipeline inside a thirteen-minute function

*Runtime — can the system survive its operating environment?*

**Suspend deliberately at a clean boundary rather than dying at the ceiling.**

A platform limit will be reached; the only choice is whether the system meets it deliberately or is
stopped by it. Work that pauses at a boundary it selected leaves a record it can resume from.

Author's orchestrator watches its own remaining budget and suspends at a stage boundary: it
persists, confirms the save landed, releases its lock, then dispatches its own next leg. A leg may
suspend only if it did new work and only on a save that provably landed, so it cannot loop. The
stale-lock window is derived from the function's maximum duration, because hand-picked windows let
the resume job take over work that was live but slow.

In the factory, a model call routes through one gateway, with policy, cost accounting, call log and
circuit breaker, as a transport swap beneath an unchanged tool loop, checked for what it would lose:
the prompt-cache breakpoint and cache token counts.

---

## 12. A build's lessons outlive the build

*Learning — does experience improve future runs?*

**One conversation is an opinion about a moment. Recurrence across conversations is what makes it a
rule.**

This is the oldest mechanism here, with a six-month audit trail. Patterns confirmed in two separate
builds were promoted into a cross-project rules file, and those rules now appear in production source
as citations. Decisions go into an append-only ledger that later work reads.

Standing instructions are captured the same way. Anything a person says that sounds like one,
*always*, *never*, *from now on*, is saved automatically, at no cost. What happens next depends on
recurrence. Said in two or more separate sessions, it is a convention, and a person can promote it
into the rule file every agent reads. Said in only one session, however often, it is a finding that
goes on a board and expires. Rules age too: one with no review for 180 days is flagged. Three have
been promoted so far. Writing a note costs nothing, and delivery is what has to be earned.

---

## 13. The brief box grades you while you type

*Product surface — can these principles reach the user?*

**Make the shortfall legible as a score and the remedy legible as a bounty.**

Everything downstream of a free-text box inherits that box's quality, and the person typing cannot
tell a thin brief from a strong one. A longer form loses the user before the first answer. The
alternative is to make the shortfall visible while they type and put a price on the remedy.

[Archer](https://archer2.vercel.app)'s home page is a targeting instrument rather than a form. After
800ms of not typing, a model scores the brief from 0 to 100 on specificity, account specificity and
signal density. A bar fills and changes colour at the threshold, one generated question at a time
appears, labelled with the points it is worth, and the launch button stays disabled below the bar.

## What transfers

The four principles at the top are the answer, and the thirteen mechanisms are the evidence that they
were applied rather than asserted. Put the deterministic thing first. Make the failure mode visible
by construction. Let the interface carry the discipline. Point the same scepticism at your own
instruments.

Together they move a system up one rung at a time: observable, then testable, then governable. The
model at the centre stays probabilistic, which is where its value comes from. The system around it is
what makes that value dependable.
