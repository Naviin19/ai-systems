# Hypotheses

Four things I think might be true and cannot yet show. Each has a way to test it, and each is stuck for a
different reason.

---

## Does an index make the work better, or only cheaper?

An agent here carries a list of what exists rather than the documents themselves, and fetches what it needs
when it needs it. That this is cheaper is settled: the full corpus would be 1.78M tokens, and an agent
carries between 7,000 and 19,000.

Whether it produces *better* work is a separate question. One controlled run says yes — having the right
document present raised the grade by 0.617, and carrying extra documents alongside it lowered the grade by
0.813. But the thing being graded was a set exercise, not a real build, and three documents were tested
rather than two hundred.

The honest position: cheaper is proven, better is suggested, and the gap between a graded exercise and a
product someone ships is where most of my doubt sits.

## Do typed handoffs actually stop errors spreading?

When one agent hands work to the next, the system can describe exactly which fields the second one reads,
and check that the first really produces them. The premise is that this stops a mistake travelling down the
chain.

I cannot test it here. Of twenty-three places where one agent depends on another, five describe what they
read in that detail. The checker is built and works; there is almost nothing for it to check. Getting an
answer means declaring the other eighteen first, which is weeks of unglamorous work and the only route to
knowing whether the premise holds.

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
