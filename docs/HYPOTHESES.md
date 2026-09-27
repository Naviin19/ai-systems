# Hypotheses

Four things I think might be true and cannot yet show. Each has a way to test it, and each is stuck for a
different reason.

---

## Does an index make the work better, or only cheaper?

An agent here carries a list of what exists rather than the documents themselves, and fetches what it needs
when it needs it. Cheaper is settled. Better is not.

Four positive effect sizes have been published and withdrawn, each by the next for an instrument defect:
+2.955 (an output cap returned empty answers, graded at the floor), +1.4 to +1.9 (a restricted analysis of
contaminated data), +0.851 (a rubric derived from the skill body, and 47 baseline fetch-stubs scored as
answers), then −0.179 on a rubric that names no skill. That instrument carries a positive control: handed
the right vocabulary and the wrong question, it drops overall by 3.13 against a threshold pre-committed at
2.0.

A four-arm Gate 0 run on gpt-4o-mini finds the right document worth having and extra resident documents
costly, but both effects are carried by one skill of three; a second run puts the relevant-document figure
at +0.480. An independent resident-load ladder on sonnet-4 shows no slope across 15K–80K of resident text.

A second arc is underway: 166 tasks drawn from recorded production failures, each carrying the fix that
worked; a picker that pairs task to skill the way an agent does, by reading one-line descriptions, joined
by majority of three; and a loss-rate guard that withholds the headline when more than 2% of cells are
lost, because uneven timeouts across workers measure the harness rather than the corpus.

What would settle it: a paired delta on production-failure tasks, under a rubric that discriminates and a
positive control, on the model the factory dispatches, with no arm at the ceiling.

## Do typed handoffs actually stop errors spreading?

When one agent hands work to the next, the system can describe exactly which fields the second one reads,
and check that the first really produces them. The premise is that this stops a mistake travelling down the
chain.

I cannot test it here. Of twenty-three places where one agent depends on another, five describe what they
read in that detail. The checker is built and works; there is almost nothing for it to check. Getting an
answer means declaring the other eighteen first, which is weeks of unglamorous work and the only route to
knowing whether the premise holds.

Typed handoffs stop shape errors. A well-formed handoff can still describe work that did not happen. The
question now turns on the world check: every reported path resolved on disk, and fields the machine already
knows removed from the form the model fills.

## Can a system learn from its own history without entrenching its mistakes?

Decisions are recorded as they are made, and the relevant ones are fed back into later work so the same
ground is not re-argued. A separate check reads the original record — never the summary that gets fed
forward — so a fault in one cannot hide a fault in the other.

The hoped-for result is that later work starts from further along. The risk is the same mechanism running
backwards: a system that learns from itself can become confident about something it got wrong, and the more
faithfully it carries its history, the harder that is to dislodge.

Three rules have been promoted in nine months. That is far too few to see either effect, which means I
currently have neither the benefit nor the evidence of the risk.

## Can novelty survive a system built for consistency?

Almost everything here pushes an agent toward doing the expected thing correctly. That is the point, and it
has a cost: a system optimised entirely for compliance will reliably reproduce known answers and rarely
produce a useful departure from them.

So there is a fenced-off lane. An agent may attach one unconventional idea to its work. Nothing downstream
acts on it. A person decides whether to keep it, and the only thing counted is how often a kept idea
survives that judgment.

It has never run. Zero ideas have been judged. The measure is deliberately crude — counting survival rather
than scoring quality — because scoring the ideas would teach the channel to produce ideas that score well,
which is the opposite of what it is for.
