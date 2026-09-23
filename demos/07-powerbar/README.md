# powerbar

**Proves:** Input quality is scored while the user types, and the interface does not depend on a model being reachable.

```
npm run demo:powerbar
```

No key, no account, no network.

## What it stages

One product's home page is a targeting instrument rather than a form. As the user types, their brief is
scored 0–100 and a bar fills; a single question appears at a time, generated from that brief, carrying the
points it is worth and what it unlocks; and the launch button stays disabled until the bar clears 35.

The problem it solves is cold-start sparsity on a pipeline that costs real money per run and whose entire
output quality sits downstream of one free-text box. A five-question form gets abandoned. Scoring the box
makes the shortfall legible, and putting a price on each question makes the remedy legible too.

This demo runs the scoring, the question ladder and the launch gate over five briefs written for it. It
does not call a model, which is the point of section 3.

## The five checks

| Check | What would break it |
|---|---|
| answering a question raises lock-on | the answer bonus stops being added |
| the model-off path satisfies the same contract | the deterministic path drifts from the schema the model path returns |
| a dense short brief launches with no questions answered | the score stops taking the strongest available signal |
| a brief that names its target is never asked for it | the slot-filled predicate stops firing |
| a first draft is not pestered | the character gates are lowered back to where they were |

## Four paths, one shape

The route can answer from the model, from its cache, from the deterministic scorer when the feature flag is
off, and from the deterministic scorer again after a model error. **All four payloads are the same shape by
design**, so every response carries a tag naming which path produced it. That tag is the only way to tell a
real answer from a silent fallback, and it is the reason three production defects on this surface were
diagnosable at all.

Section 3 checks the half of that claim which can be checked offline: the deterministic output parses
against the same contract the model path must satisfy.

## The properties, not just the code

Two of the checks are about design rather than implementation.

**The score takes the maximum of the length signal and the semantic signal**, never an average. A genuinely
strong short brief therefore reaches the gate on the strength of what it says, and is never made to answer
anything. Answers are a bonus that accelerates weak briefs.

**A question surfaces only when its slot is empty and the brief is long enough to have earned it.** The
character gates in this file are not the original ones — they were raised after the first set was observed
firing while the user was still on word four or five, before they had a chance to name the target
themselves.

When no question is on screen, the demo says which of those two reasons applies. A brief that is too short
and a brief that has already answered everything are different facts, and reporting them as one would be
the same overclaim the interface exists to avoid.

## How to break it

In `demos/07-powerbar/sharpening.ts`, change

```
const base = Math.max(charLevel, semanticLevel);
```

to

```
const base = Math.min(charLevel, semanticLevel);
```

then run `npm run demo:powerbar`. It exits 1, and the failing row prints its own arithmetic —
`max(31, 82) = 31` — so the substitution is visible in the output rather than inferred from it.

## What this does not prove

The grader's model, its measured latency and its cost are not exercised here; nothing in this demo calls a
model. The semantic score in section 4 is an **input** to the formula being tested, not a measurement of
anything. The five briefs were written for this demo and are not recorded user sessions. And the client
behaviour — an 800ms debounce, with any in-flight request aborted on the next keystroke, so only the newest
text is ever graded — is described in the extraction manifest but not executed here.
