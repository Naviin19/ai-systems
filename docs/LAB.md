# The lab

The other documents describe what is built. This one describes what is being built next, and what each
piece is for. The factory is never finished: every month a few of its mechanisms are tightened, a few new
ones are tried, and the questions that decide which stay are written down before the work starts.

*Status as of 4 October 2026. Everything here is work in motion, so none of it carries an evidence tier;
the shipped and audited figures live in [Figures and evidence](evidence.md).*

---

## Running now

### The upgrade program

The factory and two of its products, Ark and Archer, are being brought onto one footing at the same time.

- **One gateway for every model call.** Every agent's dispatch goes through a single gateway that applies
  policy, projects cost, runs a human check where one is configured, scores the result and falls back to a
  second model when it has to. Research agents already route through it; the rest are next.
- **One trace per run.** Every model call and tool call becomes a span with a parent, a latency and the
  run it belongs to, named in the open GenAI conventions, so a run reads as a tree and any trace viewer can
  open it.
- **A lifecycle table per orchestrator.** The factory, Ark and Archer each declare the states a dispatch can
  be in and the moves between them, and a test holds the table to the code.
- **Archer resumes where it stopped.** A pipeline that dies mid-run picks up from the last stage it
  persisted instead of starting over.
- **Generative UI on Archer.** Analysis screens composed from an authored catalogue of components with typed
  properties, streamed to the page. The design is decided; the build is under way.

### Whitespace Hunter, rebuilt as a real multi-agent build

Whitespace Hunter scores how much runway an emerging category has left. Its second version is the first real multi-agent build, which makes it the best test of the factory so far. It is in development.

### Holdout scenarios, and a scorer that reads like a customer

Builders can fit their work to any test they can read. So the first scenarios for Whitespace Hunter live in
a private set that no build session can open: ten user journeys and a backtest, scored after the build by a
satisfaction measure. For each scenario, what fraction of independent runs would a user call a success?
Alongside it, a recorded copy of the product's own database, kept in step with the live one, lets the
factory test against realistic data without touching production.

### A shared language for agents

The work on how agents talk to each other, so that a handoff names what it read, what it blocked on and
what it would do instead, is finished.

---

## Planned

- **Ark and Archer next builds.** A second build of Ark and a third of Archer, once the gateway and trace
  work above has landed in both.
- **Real routing benchmark.** The first run of the skill router against production-shaped tasks with a live
  model, replacing the mock baseline.
- **Retrieval for Ark's brand-book substrate.** The measured case for hybrid retrieval is being decided on
  cost and error rate per stage, and it moves when the numbers say it should.
- **Twins for the data vendors.** The same record-and-compare loop that now covers the product database,
  extended to the search and contact-data providers.

---

## What I want to find out

Four questions the work above is built to answer. Each has an instrument, and each is at a different stage.

### Does an index make the work better, or only cheaper?

An agent here carries a list of what exists and fetches the document it needs. Cheaper is settled. Better is
the question, and The instrument has been through four generations so far, each one
removing a flaw the last exposed, the latest scored on a rubric that names no skill and carries a positive
control, so a real effect has somewhere to show up. A second arc uses 166 tasks drawn from recorded
production failures, each with the fix that worked, and a picker that chooses documents the way an agent
does, from one-line descriptions.

Next: a paired comparison on those production-failure tasks, on the model the factory dispatches, with no
arm at the ceiling.

### Do typed handoffs stop errors spreading?

Handoffs are checked for shape today, and five of the twenty-three dependencies declare field by field what
the next agent reads. The checker is built and works. Declaring the other eighteen is the work that turns it
from a proof of mechanism into a measurement of how far an error travels. Beside it, every path an agent
reports is already resolved on disk, which answers the other half: a well-formed handoff that describes
work that did not happen.

### Can the system learn from its own history?

Decisions are recorded as they are made, and the relevant ones are carried into later work so the same
ground is not argued twice. A separate check reads the original record rather than the summary, so a fault
in one cannot hide in the other. Three conventions have been promoted in nine months, so this loop is young,
and the thing to watch is whether work that starts from further along stays correct as it goes.

### Where does a new idea come from?

Almost everything here pushes an agent toward the expected answer done correctly, which is what you want
from a pipeline. So there is a fenced lane for the unexpected: an agent may attach one unconventional idea
to its work, nothing downstream acts on it, and a person decides whether to keep it. The measure is
deliberately plain, how often a kept idea survives that judgment, because scoring the ideas would teach the
channel to write ideas that score well. The lane is built and off by default; the first judged ideas are
ahead.
