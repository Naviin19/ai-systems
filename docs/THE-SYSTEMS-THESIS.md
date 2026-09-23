# The systems thesis

I built a compilation pipeline — specifications, knowledge, contracts and policies go in; coordinated agent
execution comes out. The objective was to make AI agents and agentic teams reliable. The approach: apply
interface discipline at every boundary between probabilistic components. The eight principles below are
what that required.

---

## 1 · Expertise is infrastructure, addressable on demand

Don't give an agent knowledge. Give it the ability to acquire knowledge. Awareness is resident; content is
fetched. Every agent carries an index of what exists; any entry loads only when asked for.

A four-arm controlled run — two independent n=20 arms, 480 calls each — found that having the right
document present raises output grade by **+0.617**, while carrying more documents alongside it lowers grade
by **−0.813**. Which other documents accompany it was not shown to matter.

The corpus is 219 documents: **1.78M tokens if an agent carried all of it.** An agent carries **7.3K–19.1K**,
measured rather than estimated, reaching the whole corpus through an index averaging **1.7K** — a tenth of
a percent of what it addresses. The index is the entire retrieval surface, which is why four documents once
became unreachable when a parsing defect collapsed their visible line to their filename. They stayed
present, referenced and counted, and could never be chosen.

## 2 · Probabilistic workers need deterministic interfaces

The worker is uncertain. The system around it does not have to be. An uncertain worker plus an explicit
contract is a composable component.

One schema language is the source of truth. Machine-generated artifacts sit downstream of it. Forced
tool-choice means a malformed emission cannot be produced. A compiler proves each consumer's declared read
is a structural subtype of the producer's real output.

Edit a committed schema away from its source and the check names the drift at the exact path and exits
non-zero — fifteen seconds, no network. In production, 85 of 93 generations finished on a clean tool call;
the 5 that hit a token ceiling had arguments truncated mid-JSON, and because the schema was enforced the
pipeline degraded to static content rather than shipping a half-parsed object. Worse in richness, better in
truthfulness.

## 3 · Quality is selected, not requested

You do not get a better answer by asking better. You get it by rejecting a schema-valid answer that is not
worth having, and asking again.

Content gates sit between the model and the database — meaning checks, not shape checks. The ladder:
reject → re-ask at the same tier → escalate to a stronger model → omit honestly. A ten-item emission with
one malformed item keeps the valid subset. A section that cannot be written honestly is left out.

One gate rejects a headline true of any competitor. Another rejects an identity whose pillars describe the
methodology rather than the subject. Each rejects output the schema had already accepted.

## 4 · Uncertainty must be typed

When the system does not know something, it stores nothing and says why. The schema makes nothing a legal
value and a fabricated number an illegal one.

535 relationships, zero fabricated weights, confidence present on exactly 18 — precisely the 16 verified and
2 inferred ones a real measurement touched. The other 516 carry neither. In a second product, a vendor
timeout is recorded as `unmeasured` with the vendor's own run id attached, not as a zero.

One production consequence worth naming: honest null data moves the burden onto every reader. A consumer
that cannot handle absence will reject valid low-confidence results. That is not an argument against typed
uncertainty — it is an argument for designing consumers that understand it.

## 5 · Trust requires evidence, and observability is behavioral

Don't trust what the agent says it did. Commit the evidence supporting the claim, then verify it has not
changed before anything relies on it.

Four facts are kept separate that most systems collapse into one:
**availability ≠ retrieval ≠ acknowledgement ≠ influence.**

Change one byte of committed evidence and the run stops, names the entry, and prints both hashes. The
receipt's separability statement is a schema literal, so a receipt claiming more than injection fails to
build. The instrumentation earns its keep by producing uncomfortable numbers — 45 documents given and 0
cited, in the fullest receipt that exists.

## 6 · Failures become invariants

The unit of reliability engineering is not the fix. It is: defect → understanding → invariant → automated
enforcement, so the class cannot recur.

Six specimens, each traceable to a commit: an agent that read an error message and treated it as doctrine;
a gate that reported a pass because nothing ran; a perfect retrieval score that was an artifact of a line
ending; four documents that could never be chosen; a validator that deleted data while validating; a field
ten prompts instructed agents to write to that no schema contained. In a forensic pass over the nine most
recently built mechanisms, seven emerged from a failure that had already happened.
[ENGINEERING.md](ENGINEERING.md) carries the mechanisms those failures produced.

## 7 · Decomposition is compilation, bounded by recoverability

The hard problem is not making agents. It is compiling ambiguous work into safely executable work. Autonomy
is not the absence of intervention — it is the ability to run without continuous intervention while
remaining recoverable.

Brief → specification → dependency graph → execution waves → isolated worktrees → typed outputs → one merge
lock. Three classes of failure route back with the failure as input, capped, with an oscillation guard.
Every other class halts.

Remove the merge lock and run it: processes rebase simultaneously, one commit lands, another hits git's own
index lock. Nothing is silently lost — the merge is fast-forward only, so the tool refuses rather than
dropping work.

## 8 · Who changes the rules is a governance question

An agent that observes something must not thereby make the organisation believe it. The question is not
"human in the loop" as a safety checkbox. It is: when does an observation become a policy, and who is
allowed to make that happen?

Three lanes. **Amendment:** experience → learning event → structured proposal → human approval →
implementation → verification. **Convention:** an observation seen in two separate sessions becomes a
candidate rule; one session, however often repeated, decays. **Decision ledger:** append-only, no edit verb
— a correction is a new row that supersedes an old one.

A defect found during an audit became a filed proposal and merged as a change to the governing document, by
that path, with commits at every step.

---

## What is still open

| Hypothesis | Instrument |
|---|---|
| Does addressable expertise improve task quality, or only cost? | Four-arm harness, no-effect band 0.239 |
| Do typed handoffs reduce downstream failure propagation? | Contract compiler |
| Can institutional learning improve future runs without entrenching error? | Decision ledger + context injection + contradiction check |
| Can bounded divergence raise solution diversity while holding verification rates? | Divergence lane; survival rate only |

Each of these, with what is already answered and what is blocked, is in [HYPOTHESES.md](HYPOTHESES.md).
