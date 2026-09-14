# Demo 2: drift, measured against the agent's own history

**Proves:** each agent's handoff is compared with that agent's own earlier builds by a deterministic embedder, with no model and no API call. How much comparable history exists sets one of three levels, and only the top level can stop a run. Every scored run also records its margin above the floor, and a margin that keeps falling raises a warning while the agent still passes.

## Run

```
npm run demo:drift
```

No key, no account, no network.

## Expected output

```
1. The embedder: deterministic, no model, no network
----------------------------------------------------
  embedder                      trigram-hash-64-v1: character trigrams hashed into 64 dimensions
  same handoff, embedded twice  identical vectors
  first components              0.088326, 0.046114, 0.093647, 0.117414

2. Real agent-12 handoffs against its two committed baseline builds (floor 0.82)
--------------------------------------------------------------------------------
  handoff              score   margin  verdict
  -------------------  ------  ------  -------
  run-corpus-mtpbz94k  0.9652  0.1452  pass
  run-corpus-mtpc7jza  0.9748  0.1548  pass
  Score is the closest cosine similarity to any baseline, and margin is score minus floor.
  The baselines were recorded from two other builds of the same agent, so neither handoff is scored against itself.

3. One stubbed handoff at each enforcement level
------------------------------------------------
  level                           score   outcome
  ------------------------------  ------  ----------------------------
  disabled: no baseline builds    -       pass: not checked
  advisory: one comparable build  0.7636  warn: reported, never blocks
  enforcing: two or more          0.7636  halt
  The stub is the factory's committed mock handoff, an envelope whose payload is {"mock": true}.

4. The margin series: degradation shows before the floor breaks
---------------------------------------------------------------
  run    score  margin  series status
  -----  -----  ------  --------------------
  run 1  0.96   0.14    insufficient-history
  run 2  0.95   0.13    insufficient-history
  run 3  0.94   0.12    insufficient-history
  run 4  0.90   0.08    steady
  run 5  0.87   0.05    compressing
  run 6  0.80   -0.02   breached
  An illustrative series, judged by the factory's marginCompression. Run 5 is still above the floor, and it warns.

5. This run
-----------
  handoff  candidates/run-corpus-mtpc7jza.json
  score    0.9748
  margin   0.1548
  verdict  pass

No model and no API call: the check is a pure function of the handoff text and the committed baselines.
```

## How to break it

Point this run at a stubbed emission. In `demos/02-drift/fixtures/current-run.json`, change `candidates/run-corpus-mtpc7jza.json` to `mock-handoff.json`, then run `npm run demo:drift` again. The stub scores 0.7636, under the 0.82 floor, and the demo prints:

```
5. This run
-----------
  handoff  mock-handoff.json
  score    0.7636
  margin   -0.0564
  verdict  halt

This run's handoff drifted below the floor, and at the enforcing level drift blocks the run.
```

It exits 1. In the factory the same result throws `SEMANTIC_DRIFT` from the post-emit chain, and the run halts with `halt-reason: semantic-drift`.

## What this is

**The production path over real agent-12 output. The margins in part 4 are illustrative.**

- **The check is the factory's own.** `semantic-drift.ts` and `embed-output.ts` are extracted unchanged. The factory's post-emit chain calls `detectAgentDrift` on every agent's handoff in every build, and `marginCompression` is the rule that judges each agent's margin series.
- **The data is real.** The two baseline files are agent 12's committed baselines. The two candidates are real dispatches of agent 12 from the factory's seeded handoff corpus, and neither is a build the baselines were recorded from. The stub is the factory's committed mock handoff.
- **Only the directory layout is staged.** The factory reads baselines from `build-log/semantic-baseline/` and a handoff from its run's directory. The demo copies the same files into a temporary directory in that layout, with zero, one or two baseline builds, to reach each level.
- **The embedder measures wording, not meaning.** It counts character trigrams. A real handoff scores about 0.97 and an empty envelope 0.76, so the 0.82 floor stops gross drift only. Gradual decline shows first in the series: a compressing margin is emitted as a `DRIFT_MARGIN_COMPRESSING` event and printed as a warning, and it never blocks. Setting `EMBED_PROVIDER=openrouter` swaps in a semantic embedding API, which changes the embedder id and makes the old baselines incomparable by design.
- **Advisory never blocks.** Only drift at the enforcing level halts a run. `DRIFT_MODE=advisory` caps every agent at advisory, and `DRIFT_THRESHOLD` moves the floor.

Extracted from the factory at commit `d490466` on 2026-09-14.
