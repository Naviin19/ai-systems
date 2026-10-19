# trace-physics

**Proves:** A run is scored by how it moved, a value nobody recorded stays null instead of becoming a zero, and the input's score sits beside the run's score, never inside it.

```
npm run demo:trace-physics
```

No key, no account, no network.

## What it stages

Whether a run passed says where it ended. It does not say how hard it was to get there. The factory's trace
scorer reads the run's own events and gives every dispatch four quantities:

- **jerk**: thrash, meaning route-back retries, restarts, corrector cycles beyond the first and repeated
  identical loads
- **compression**: the accepted handoff's tokens over the tokens spent
- **schema friction**: schema failures and fallbacks
- **energy**: wall time and cost, which is reported but not scored

The score is `0.4 × compression + 0.4 / (jerk + 1) + 0.2 / (schema friction + 1)`. Every record says it is
`uncalibrated-operator-sketch-2026-10-02`. The score ranks dispatches, and nothing blocks on it.

The fixture run has three dispatches. One is clean. One thrashed, with two route-backs, a restart, a
repeated load and an extra corrector cycle. One has no token record, the state of every mock run. See
[Grounding](../../docs/GROUNDING.md#4-trace-physics) for where this sits in the factory.

## Expected output

```
  agent                     jerk  schema friction  compression  wall time  score
  ------------------------  ----  ---------------  -----------  ---------  -----
  demo.agent-01-foundation  0     0                0.087        240s       0.635
  demo.agent-02-collection  5     1                0.043        600s       0.184
  demo.agent-03-analysis    0     0                null         240s       null
```

```
  treatment                          agent 03 score  its rank of three
  ---------------------------------  --------------  ----------------------
  the null stays null (this scorer)  null            unranked
  the null read as zero              0.600           second, above agent 02
```

```
  check                                              result  detail
  -------------------------------------------------  ------  ---------------------------------------
  each score is the published formula                held    re-derived by hand for all three
  the clean dispatch outranks the one that thrashed  held    0.635 > 0.184
  every record satisfies the contract                held    3 agent records and 1 run record
  a dispatch with no token record has no score       held    score null
  the run leaves it out of compression and names it  held    run tokens 69000, over agents 01 and 02
  the brief's score never moves the run's score      held    0.190 both times
```

## Why null and not zero

A zero is a measurement. Agent 03 recorded no token usage, so its compression is unknown, not zero. Read as
zero, the unknown value would hand agent 03 a score of 0.600. That would rank a dispatch nobody measured
above one that was measured, on the strength of having recorded nothing that could count against it. The
scorer keeps the value null, keeps the reason beside it, and leaves the agent out of the run's compression
by name.

## How to break it

In `demos/15-trace-physics/trace-physics.ts`, change

```
  if (compression === null) return null;
```

to

```
  if (compression === null) return traceScore(0, jerk, schemaFriction);
```

then run `npm run demo:trace-physics`. It exits 1, and the unmeasured dispatch now carries a score:

```
  a dispatch with no token record has no score       FAILED  score 0.600
```

The factory's own self-test plants the same mutation and refuses it.

## What this does not prove

No committed real run in the factory carries a score yet. The scorer writes a record for every dispatch and
every run, but the runs it has scored so far are kept outside the tracked history. The score's weights are
an uncalibrated sketch: they rank, and the factory's condition for letting anything block on them is five
real runs with a score and the self-test holding in two sessions a week apart. The events and handoff sizes
here were written for this demo in the orchestrator's shape. The input score is written by the demo too; in
the factory nothing writes one yet.

The scorer is `scripts/lib/trace-physics.ts`, with only its disk reader removed, and the contract is
`contracts/types/measurement/trace-physics.ts`. Both were extracted from the factory at commit `87fae286` on
2026-10-18.
