# Engineering Probabilistic Systems

**Making probabilistic systems observable, testable and governable.**

---

## The problem

A language model is a probabilistic component. That is not the difficulty, and it is not something
to be engineered away. The difficulty is that **its interface does not reliably distinguish a
correct answer from an incorrect one.** A model can express uncertainty, refuse, or hedge; what it
cannot do is guarantee that the confidence it expresses tracks the accuracy it delivers. Right and
wrong arrive through the same channel, in the same shape, at the same apparent confidence.

So the engineering problem is not to make the component certain. It is to build a surrounding system
in which uncertainty, failure, provenance, evidence and recovery all remain **visible** — and
therefore a system that can be observed, tested and governed even though the part at its centre
cannot be.

## Four principles

Twelve mechanisms follow. They are instances of four ideas, and the four are the part worth
carrying somewhere else.

**1 · Put the deterministic thing first.** Numbers are computed before a model may mention them.
Cheap exact checks score candidates before a judge ranks them. A choice is made by counting
satisfied criteria rather than by asking. The model is left to do the one thing it is genuinely
better at — wording and selection — inside a frame that code has already made true.

**2 · Make the failure mode visible by construction.** A degraded gate cannot report a clean pass;
an abstention cannot be read as a zero; a judge that never reached the network cannot be recorded as
one that declined. Most of the engineering here is not preventing failure. It is refusing to let
failure and success look alike.

**3 · Let the interface carry the discipline.** One schema language generates every downstream
artifact. Every agent works in its own copy of the repository and merges under a lock. Every handoff
resolves against a typed contract, and every model call names a registered call site or does not
dispatch.

**4 · Point the same scepticism at your own instruments.** A check is not evidence because it
exists. Every rule in the detector below has to catch a planted defect in its own fixture or the
whole scan aborts, because a check that has never failed may be one that cannot. The habit that
makes the rest credible is being willing to switch an instrument off, and to publish the
measurement that says you should.

Beneath those four there is a ladder, and each rung is a different kind of engineering:

> **probabilistic → observable → testable → governable**

Observable means the system emits enough to know what it did. Testable means a machine can check
that against what it claimed. Governable means a person sets the policy and the system enforces it
without being asked twice.

---

## 1. An agent carries an index, not a library

*Knowledge — does the agent have what it needs?*

**Do not give an agent knowledge. Give it the ability to acquire knowledge.**

Context is the scarcest resource an agent has, and the instinct is to spend it on knowledge: load
the corpus and let the model find what it needs. That inverts the economics. Everything loaded
competes for attention with everything else, so the marginal document is not free — it is a tax on
the relevant one. An index costs almost nothing and defers the price of a document until a task
proves it is needed.

The corpus is 219 documents, roughly 917,000 words. No agent holds it. Each receives a fixed
behavioural kernel of 3,981 tokens — byte-identical across all twenty agents — plus a one-line index
of the documents its manifest declares, averaging 1,710 tokens. Total resident context runs from
7,347 to 19,068 tokens.

When a task matches an index line, the agent calls `load_skill(filename, section?)` and gets that
section — and a request matching nothing returns the file's section list rather than an error
string. A separate check refuses any new manifest entry citing a file over a thousand lines without
naming a section, so the index cannot quietly decay back into a library.

The trade was measured rather than assumed. A controlled four-arm run on this stack — two
independent runs of twenty, 480 calls each — found that having the right document present raises
output grade by 0.617, while carrying more documents alongside it *lowers* the grade by 0.813.
Retrieval beats residency, and an index is how you get retrieval without paying for residency.

---

## 2. Weak input becomes a typed payload before it reaches the model

*Specification — does it understand what it has been asked to do?*

**Make input typed and canonical before probabilistic processing begins.**

Whatever a user types is ambiguous, and every downstream check is weaker if that ambiguity is still
present when the model runs. So the boundary moves forward: free text becomes a schema-validated
object *first*, and everything after it operates on a known shape. The model is not asked to return
prose that something later has to parse.

The mechanism is a tool whose input schema *is* the caller's own schema, which the model is forced
to call, at temperature zero. Three properties make it dependable rather than merely present.

**The cache key is content-addressed over everything that could change the answer** — the raw text,
a normalised schema fingerprint, the context, the model and the quality floor. Normalised matters:
sorting the schema's required fields means two schemas that differ only in declaration order are one
cache entry, and a schema that genuinely changed is a clean miss rather than a stale hit. No stored
record needs a version field, because the version is in the key.

**Failure is three distinct things, not one.** Truncation throws its own error class, so the caller
raises the ceiling instead of concluding the input cannot be enriched. A wrong shape retries once. A
brace-balancing scan of the text output is the last resort. Collapsing those into one error would
lose the only information that tells a caller what to do next.

**Concurrent identical calls make one dispatch**, and the callers that piggyback are reported as
cache *misses* — because they never read a cache, and reporting them as hits would overstate what
the cache did.

---

## 3. One schema language, and everything downstream is generated

*Contracts — can components exchange information safely?*

**The system never hopes for JSON.**

A data shape written down in more than one place will diverge; the only question is when. The
defence is not discipline, because discipline is exactly what fails under deadline. It is
derivation: one source of truth, everything else generated from it, so there is no second copy left
to drift.

55 source files hold 2,099 schema declarations. 97 JSON Schema files are generated from them, 49 of
those registered. The handoff envelope between agents is a discriminated union of 24 variants, keyed
on the boundary each one crosses, and every variant's schema becomes a tool definition the producing
model is forced to call.

In the product that needed a second language, one canonical schema derives **three** targets — the
TypeScript validator, the Python one, and the contract embedded in the model's own system prompt.
Those are the three places a data shape usually drifts apart: the service that writes it, the
service that reads it, and the instructions telling the model what to produce. Deriving all three
from one source means they cannot disagree, because there is nothing to disagree with.

Edit a generated schema away from its source and the check names the drift at the exact path. Above
that sits a compiler that proves the seams rather than the spelling: for every dependency edge
between agents, the consumer's declared reads are checked by structural subtyping against the
producer's real envelope variant, so a field that changes type is caught, not only one that
disappears.

Each agent produces two linked artifacts — a zero-prose JSON record and a narrative for humans — and
a judge verifies the narrative claims nothing the JSON cannot support. A change's blast radius is
computed rather than estimated: a walker reports every dependent schema, table, prompt and document
a contract change would reach.

---

## 4. Every agent gets its own copy of the repository

*Orchestration — can they work concurrently without corrupting state?*

**Parallelism is safe when isolation is physical and the merge is refusing by default.**

Agents working in parallel on one checkout is the obvious design and the one that loses work.
Conventional isolation — each agent agreeing not to touch what it does not own — holds exactly
until one agent is wrong about what it owns, and being wrong is silent. Physical isolation cannot be
violated by mistake. A merge that refuses rather than reconciles then turns every remaining
collision into a failure somebody sees.

So work happens in a git worktree on its own branch, and merging back is fast-forward only: the tool
refuses rather than dropping a commit. Remove the merge lock and run it — the demo ships with the
instructions — and two processes rebase and fast-forward at the same moment, one landing and one
hitting git's own index lock. Nothing is silently lost either way; the difference is that without
the lock, finished work fails to land and the agent that produced it fails with it.

The lock is two layers, because contention comes from two places: an in-process queue for tasks
inside one orchestrator, and a lock file for separate processes. A lock whose holder has died is
taken over at once, under a short takeover file so two waiters cannot both claim it. Alongside it, a
wave scheduler starts every agent whose dependencies have completed. Set its parallelism to one and
it reproduces a topological order exactly, which is what makes it safe to turn up.

---

## 5. Numbers are computed, never authored

*Deterministic boundaries — what should the model never be allowed to decide?*

**The model may select and word. It may not calculate.**

In [Author](https://author-now.vercel.app), every statistic the output can contain is derived in pure code into a typed index
with stable ids. The model is handed only those tuples and may cite them by reference. After the
call, a gate resolves every citation against the index, then builds a universe of permitted numbers
from the stat values, the quoted customer questions and the verbatim source evidence, and scans
every prose field for multi-digit tokens that are not in it.

The rule exists because a model asked to write persuasive prose will invent a credible figure, and
concrete specifics are exactly how a fabrication sounds true. A related check refuses any expression
containing a numeric token that does not appear verbatim in the source text — narrower and stricter
than the fuzzy match around it.

The same instinct appears as a one-line comment in the scoring layer: *recompute the composite —
don't trust the model's arithmetic.* The schema accepts the judge's dimension scores and the code
overwrites the total the model calculated. And where a model is asked for a customer's question, it
never retypes one: it cites integer indexes into a pool of real observed language, so verbatim drift
is structurally impossible and an unanchored question is never shipped.

---

## 6. Abstention is a type, not a missing value

*Abstention — can the system admit that it doesn't know?*

**A system that cannot say "I don't know" will say something else instead.**

[Whitespace Hunter](https://whitespace-hunter.vercel.app)'s signals either score or return `null` with a stated reason, and the
distinction survives every layer: the composite renormalises its weights over only the signals that
fired, and the breakdown still lists all six with `null` in the abstained slots — visible on the
screen, named.

The vendor's own limitation is carried the same way. Its core metric is a vendor proxy rather than a
measurement of the market, so the exact sentence saying so is declared once as a constant and
embedded in every verdict, evidence record, API payload, weekly email and dashboard footer — with
byte-equality asserted as a test. Where the vendor holds no history for one axis, an illegal
comparison abstains rather than pairing a fresh number with a stale one, and every legal pair
records both periods and the gap between them.

Elsewhere the discipline takes other shapes. In an earlier build, a three-value confidence enum is
bound in the prompt to both a numeric band and a speech act — *data shows this, state as fact* against *limited evidence,
may not hold*. A failed run produces a valid, stored, schema-shaped artifact marked insufficient
rather than an error page. And in Author, a channel where a scraper failed is forced to `UNMEASURED`
before any branch can classify it as an opportunity, because a technical failure and a market opening look
identical in the data and must never be reported as the same thing.

---

## 7. Evidence is committed before it is questioned

*Verification — can a claim be checked against prior evidence?*

**A sincere justification assembled after the question is still assembled after the question.**

Structured evidence is hashed the moment an agent emits it, before any verifier asks anything.
During interrogation the worker may only point at pre-committed entries. Change one byte of
committed evidence and the run stops, naming the entry and printing both hashes.

The threat model is stated in the source, and it is why this is cheap: a cooperative but fallible
worker, not an attacker. No signatures, no proofs — a content hash is enough to make
after-the-fact rationalisation impossible.

A frontier model from a different family then reviews what the agent emitted. A rejection re-runs the
producer once with the defect in its prompt, and the second attempt is judged as well — previously
the re-run was returned unread, so an agent that repeated the same defect passed. A re-run that
changed a committed entry with no new work behind it is refused before the judge sees it, because a
rewritten justification is exactly what could talk a judge round. Separately, every runnable
verification in an agent's step file is re-run independently and compared with what the agent
claimed: claiming a pass where the command fails halts the run and preserves the sandbox, while
claiming a failure that really failed is honest and gets a corrector loop capped at two attempts.

---

## 8. A detector for failures that look exactly like success

*Failure observability — can failure masquerade as success?*

**A rule that suddenly matches nothing is broken, not victorious.**

The most expensive defects are the ones whose failed state is byte-identical to their healthy state:
an unchecked database write, a paid model call whose `catch` returns null, a read of a key nothing
writes. [Ark](https://ark-now.vercel.app) ships an audit that hunts for them in source. It found 17
unchecked writes and drove them to zero.

Its guard against becoming decorative is the part worth copying. Every rule must first catch a
planted defect in its own fixture, or the whole scan aborts. Each rule declares a minimum file
count, so a collapsed glob is caught rather than celebrated. A count that drops further than the
explicitly accepted set exits with an error. Sites are keyed by a hash of the normalised enclosing
statement rather than file and line, so the count survives refactoring across seventeen live
worktrees. Its CI comment states the design rule: *a gate that fails on day one gets disabled, so on
day one it fails on nothing.*

The shape recurs everywhere once you look for it. A degraded quality gate carries `gate_ran: false`
and a reason as a required schema field, so no consumer can read it as zero problems found. A judge
separates *could not run* from *chose not to answer*, after a missing environment variable produced
"abstained, 3 of 3 votes, $0.0000" on every run — which reads exactly like three models thoughtfully
declining. And in Archer a typing-time grader tags every response with one of four literals, because
all four payloads are identical by design and the tag is the only way to tell a real answer from a
silent fallback.

---

## 9. Deterministic gates vote before the judge is allowed to

*Gating — can cheap certainty eliminate work before probabilistic judgement?*

**Spend the cheap, exact check first; spend the model only on what is left.**

A model asked to judge is slow, expensive and itself probabilistic, which makes it the worst
available instrument for any question a regex can settle outright. Order the checks by cost and
certainty instead: exact ones first, and the judge only on what survives them — where the remaining
question is genuinely a matter of taste rather than of fact.

The two highest-stakes narrative stages run two or three producers from different model families in
parallel. Every candidate is then scored by deterministic gates — reference resolution, an editorial
lint bank, the grounding scan above. Only if at least two candidates come back completely clean is a
judge asked to choose between them.

The ladder below that makes it economical as well as sound. Exactly one clean candidate is taken
with no judge call at all. Zero clean candidates get one targeted repair pass on the least-violating
one, and the repair message names each offending field, the matched text and the fix, so it is a
rewrite rather than a blind regeneration. If every producer throws, a deterministic floor is
assembled from the run's own real substrate. A second failure drops the field rather than shipping
it.

Author settles model choice the same way: eleven models across three real call sites, run against
the production prompts and forced tools, scored on a composite in which *reliability* is the
product's own contract gates — parse success, lint blocker rate, reference resolution. Failures stay
in the leaderboard rather than being dropped, and the harness deliberately writes nothing back into
policy. A person picks.

---

## 10. A twenty-minute pipeline inside a thirteen-minute function

*Runtime — can the system survive its operating environment?*

**Suspend deliberately at a clean boundary rather than dying at the ceiling.**

A platform limit will be reached; the only choice is whether the system meets it deliberately or is
killed by it. Work that dies at a ceiling leaves behind state nobody wrote down, at a point nobody
chose. Work that stops at a boundary it selected leaves a record it can be resumed from — which
turns a hard limit into a scheduling detail.

Rather than running until the serverless limit kills it, Author's orchestrator watches its own
remaining budget and suspends voluntarily at a stage boundary: it persists, confirms the save
landed, stops its heartbeat, drains its event queue, releases its lock, then dispatches its own next
leg and returns success. Its four budget gates are set from measured live p95 stage durations, not
guesses.

Two conditions keep it from looping. A leg may suspend only if at least one unit of new work
happened during it, so a resumed leg that did nothing cannot suspend forever — and only on a save
that provably landed. The stale-lock window is derived rather than chosen: the function's own
maximum duration plus a grace period, because a leg cannot outlive its function. Earlier hand-picked
windows of three and a half and then eight minutes let the resume job steal work that was live but
slow.

Progress events append to a table under a monotonic sequence number rather than living in process
memory, so a reconnect resumes precisely and a fresh connection replays the run for free — with the
client clamping progress to its maximum, because replay would otherwise drop the bar from 80% back
to 10%, and the terminal frame emitted only after the result is stored, so nobody is told
"complete" before the data is fetchable.

---

## 11. A build's lessons outlive the build

*Learning — does experience improve future runs?*

**One conversation is an opinion about a moment. Recurrence across conversations is what makes it a
rule.**

This is the oldest mechanism here and the only one with a six-month audit trail. Two early products
wrote structured lessons files. The next build imported both, promoted every pattern independently
confirmed in two separate builds into a cross-project rules file with a confidence grade, and seeded
them into the following build's playbooks. Those rules then appear in production source as
citations — a comment naming the prior build and the lesson number that forced the line beneath it.
Both original lessons files are still in the corpus today.

The machinery around it grew afterwards. A decision ledger holds 557 rows — 499 taken by a person,
57 by a machine, one by a judge — append-only, superseded rather than edited, with rows injected
back into the context of later work whose subject matches. A second check reads the original record
rather than the injected summary, so a gap in one cannot hide a gap in the other.

Conventions are promoted on a deliberate threshold: a directive-shaped statement seen in **two or
more separate sessions** becomes a rule that every agent tool reads, while one repeated ten times in
a single session is a finding that decays on a board. All the structure sits on the reading and
promotion side — writing a note costs nothing, and delivery is what has to be earned.

---

## 12. The brief box grades you while you type

*Product surface — can these principles reach the user?*

**Make the shortfall legible as a score and the remedy legible as a bounty.**

Everything downstream of a free-text box inherits that box's quality, and the person typing has no
way to tell a thin brief from a strong one — the field looks identical either way. Asking for more
with a longer form loses them before the first answer. The alternative is to make the shortfall
visible while they type and put a price on the remedy, so supplying more becomes a choice with a
visible return rather than an obligation.

[Archer](https://archer2.vercel.app)'s home page is a targeting instrument rather than a form. After 800ms of not
typing — cancelling any in-flight request so only the newest text is graded — a model scores the
brief from 0 to 100 on specificity, account specificity and signal density. A bar fills and changes
colour at the threshold. One question appears at a time, generated from that specific brief,
labelled with the points it is worth and what it unlocks. The launch button stays disabled below the
bar.

It solves cold-start sparsity on a pipeline that costs real money per run and whose entire output
quality sits downstream of one free-text box. A five-question form gets abandoned. What keeps it
honest rather than coercive is that the score takes the *maximum* of length and semantic signal
rather than an average — so a genuinely strong short brief reaches full marks without answering
anything — and that the "we recognise this brand" chip is never the model's claim: the prompt orders
it to always return false, and the server overwrites it after checking a probe-verified list.

This surface is also where a class of vendor risk surfaced. The grader pointed at a `-latest` alias;
the alias drifted to a different model, pushing median latency past the route's timeout, so a large
share of live sessions fell back to static content at three times the assumed price — with no error
anywhere. The fix was a shootout on the real prompt, then a pin to a concrete id with a fallback
from another vendor. A daily probe now asserts that every registered id still resolves to the same
underlying model and still honours forced tool choice: every id, not only the aliases, because even
a pinned one was observed floating across dated snapshots.

## What transfers

The four principles at the top are the answer, and the twelve mechanisms are the evidence that
they were applied rather than asserted. Put the deterministic thing first. Make the failure mode
visible by construction. Let the interface carry the discipline. Point the same scepticism at your
own instruments.

Together they move a system up one rung at a time — observable, then testable, then governable. The
component at the centre stays uncertain. The system around it does not have to be.
