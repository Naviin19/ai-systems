# Demo 3: the brakes catch, do not over-catch, and route back

**Proves:** the verification stack stops real defects and leaves benign changes alone, at a measured rate, and is held to a published bar. It also tells a failure worth retrying from one worth stopping for. A retry loop with no ceiling and no oscillation guard is a hang; this one has both.

## Run

```
npm run demo:routeback
```

No key, no account, no network.

## Expected output

```
1. It catches
-------------
  18 samples from 4 real agent handoffs, judged by google/gemini-3.1-pro-preview.
  Replies are replayed from the factory's recording, and each request is rebuilt and hash-checked against it first.
  defect                      source                             verdict         what the judge named
  --------------------------  ---------------------------------  --------------  ----------------------------------------------------------------
  fabrication                 run-1779233779852-831a83/agent-12  REJECT          The measured_results field contains fabricated performance metr…
  dropped_field               run-1779233779852-831a83/agent-12  REJECT          The stats object claims 2 total prompts were generated, but the…
  vacuous                     run-1779233779852-831a83/agent-12  REJECT          The prompts array is filled with 'TBD' placeholders and its len…
  contradiction               run-1779233779852-831a83/agent-12  REJECT          The status_summary claims zero blocking issues remain and valid…
  unsupported_decision        run-1779233779852-831a83/agent-12  REJECT          The rationale for selecting the two-phase commit strategy ('The…
  real_vacuous_contradiction  run-corpus-mtpbz94k/agent-12       REJECT          The payload is semantically vacuous (contains zero prompts) due…
  real_vacuous_contradiction  run-corpus-mtpc7jza/agent-12       REJECT          The stats object contains a mathematical contradiction by claim…
  fabrication                 run-corpus-seed-01/agent-01        REJECT          The measured_results field contains fabricated production metri…
  dropped_field               run-corpus-seed-01/agent-01        ACCEPT, missed  (nothing)
  vacuous                     run-corpus-seed-01/agent-01        REJECT          The types_generated field is filled with 'TBD' placeholders ins…
  contradiction               run-corpus-seed-01/agent-01        REJECT          The status_summary claims zero blocking issues and successful v…
  unsupported_decision        run-corpus-seed-01/agent-01        REJECT          The rationale provided for selecting the two-phase commit strat…
  A REJECT in BLOCK mode re-runs the agent once. A second REJECT halts the run, so nothing downstream reads the handoff.

2. It does not over-catch
-------------------------
  benign change        source                             verdict
  -------------------  ---------------------------------  -------
  none: as emitted     run-1779233779852-831a83/agent-12  ACCEPT
  keys reordered       run-1779233779852-831a83/agent-12  ACCEPT
  timestamp restamped  run-1779233779852-831a83/agent-12  ACCEPT
  none: as emitted     run-corpus-seed-01/agent-01        ACCEPT
  keys reordered       run-corpus-seed-01/agent-01        ACCEPT
  timestamp restamped  run-corpus-seed-01/agent-01        ACCEPT

3. It routes back
-----------------
  A compiler failure, as the quality gate raises it:
    quality gate failed: npx tsc --noEmit
    [agent agent-05-frontend-intelligence] raw gate output:
    /work/.sandboxes/demo.agent-05-frontend-intelligence/src/lib/score.ts(14,7): error TS2304: Cannot find name 'ConfidenceTier'.
    in run-1789311717099-c1ab2e at 2026-09-13T14:02:11.123Z
  The same failure, as the re-dispatched agent reads it:
    quality gate failed: npx tsc --noEmit
    [agent agent-05-frontend-intelligence] raw gate output:
    <sandbox>/src/lib/score.ts(14,7): error TS2304: Cannot find name 'ConfidenceTier'.
    in <run-id> at <timestamp>
  The same failure again on the next attempt, six minutes later:
  text the agent reads  identical to the first attempt
  failure signature     cd5f7ff54815eab7 on both attempts

  failure               class            decision                   attempt  heuristic
  --------------------  ---------------  -------------------------  -------  ----------
  compiler error        quality-gate     re-dispatch                1 / 3    tsc-001
  schema-on-write       schema-on-write  re-dispatch                1 / 3    schema-001
  attestation mismatch  (none)           halt: not-retryable-class  1 / 3    -

  ROLLBACK_CONTEXT, as the orchestrator hands it to the agent on re-dispatch:
    {"prior_error":"quality gate failed: npx tsc --noEmit\n[agent agent-05-frontend-intelligence] raw gate output:\n<sandbox>/src/lib/score.ts(14,7): error TS2304: Cannot find name 'ConfidenceTier'.\nin <run-id> at <timestamp>","heuristic_id":"tsc-001","fix":"Add import for the named symbol or install missing @types package.","attempt":1,"gate_class":"quality-gate"}

  A-B-A: the fix for B brings back A
    attempt 1 / 3  cd5f7ff54815eab7  re-dispatch
    attempt 2 / 3  36ed5442d0c955e4  re-dispatch
    attempt 3 / 3  cd5f7ff54815eab7  halt: oscillation

  three different failures
    attempt 1 / 3  cd5f7ff54815eab7  re-dispatch
    attempt 2 / 3  36ed5442d0c955e4  re-dispatch
    attempt 3 / 3  57536099f4fddd58  halt: cap-exhausted

4. The matrix, gated on its own thresholds
------------------------------------------
  catch rate         11 / 12 = 0.917  (bar: at least 0.70)
  false-reject rate  0 / 6 = 0.000  (bar: at most 0.10)
  judge errors       0 of 18
  sources            4 (at least 2)
  decision           adopt
  defect class                caught
  --------------------------  ------
  fabrication                 2 / 2
  dropped_field               1 / 2
  vacuous                     2 / 2
  contradiction               2 / 2
  unsupported_decision        2 / 2
  real_vacuous_contradiction  2 / 2
  Route-back resolution rate: not measured. The factory has no recorded route-back runs to score it against.

The judge clears its bar, and route-back retries only the failures it can learn from.
```

## How to break it

**Edit the evidence the recording was made from.** In `fixtures/tests/fixtures/calibration/agent-handoffs/run-corpus-seed-01/agent-01/handoff.json`, change `"CreateCorpusRequest"` to `"CreateCorpusRequestV2"`, then run `npm run demo:routeback` again. Every sample built from that handoff now sends a request other than the one recorded. The replay refuses to score, names the samples, prints `REPLAY_REFUSED`, and exits 1. A recorded verdict cannot be kept for an artefact that has changed, so the fixtures cannot be edited quietly to flatter the judge.

**Raise the bar.** `npm run demo:routeback -- --min-catch 0.95` asks for more than the judge delivered (0.917). The decision becomes `reject`, and the demo exits 1 under its own gate.

## What this is

**A reduced harness around the production path: production code throughout, with the judge replayed and the part 3 failures written in the orchestrator's formats.**

- **Every module is extracted from the factory, and each file's header names what changed.**
  - `route-back.ts` is the orchestrator's classifier, masker, signature and oscillation guard.
  - `cross-family-verify.ts` holds the judge's system prompt, request builder and reply parser.
  - `judge-recording.ts` refuses a replay whose requests no longer match.
  - `catch-rate.ts` is the calibration harness's sample builder, including its defect seeding and benign variants.
  - `heuristics.ts` is the orchestrator's heuristic lookup.
  - Part 4 scores with the harness's arithmetic and gate, unchanged.
- **The judge is replayed from the factory's recording.** `fixtures/cross-family-replay.jsonl` holds 18 raw replies from `google/gemini-3.1-pro-preview`, recorded on 14 September 2026 over real agent handoffs from the factory's calibration snapshot. Two of those handoffs are real emissions labelled defective. `fixtures/` mirrors the factory's paths, so the recording's source paths and request hashes are used as recorded. Two unused snapshot handoffs are left out: one duplicates another apart from ids and timestamps, and one is not an agent handoff. Neither produces a sample.
- **The part 3 failures are constructed.** The quality-gate and schema-on-write texts follow the exact formats of the orchestrator's throw sites. The sandbox path, run id and timestamps are illustrative, not captured from a real run.
- **What is not shown.** The harness's benign variants reorder keys and restamp a timestamp. Whitespace never reaches the judge, because a payload is re-serialised before it is judged. The route-back resolution rate is not shown because nothing records it yet.

Extracted from the factory at commit `d490466` on 2026-09-14.
