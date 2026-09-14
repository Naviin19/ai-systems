# Demo 6: evidence is frozen before it is judged

**Proves:** the evidence behind an agent's claims is hash-locked when the agent emits, before any gate or judge reads it. A judge never reads evidence that changed after it was committed, and a re-run cannot hand a judge new justification for an old claim.

A model asked to justify a claim will produce a justification, because that is what it is for. The factory's defence is to make the artefact immutable before the question is asked. `verifyCommitment` runs before the judge, and when anything committed has changed, the judge is not called at all.

## Run

```
npm run demo:attest
```

No key, no account, no network.

## Expected output

```
1. The commitment, made at emission
-----------------------------------
  handoff       corpus-seed.agent-12-prompt-manager → PROMPT_MANAGER
  entries       14 step attestations
  root hash     c9ff87132162debc64e62bb6634621eed161197316bf0779d6fb889038f8a356
  committed at  2026-09-14T00:00:00.000Z
  att:3    0b163e8b9585d11e…
  att:1.1  a79775cfd3d2d9df…
  att:1.2  60a695743e839f55…
  … and 11 more

2. The judge reads only evidence that still matches
---------------------------------------------------
  commitment  verified: no committed entry changed, none added, none removed
  judge       invoked (google/gemini-3.1-pro-preview, reply replayed from the factory's recording)
  verdict     REJECT [critical]
  defect      The payload is semantically vacuous (contains zero prompts) due to missing inputs, and fabricates mean/min prompt multiplier scores of 7.5 for an empty set.
  bound to    root c9ff87132162debc…: the judge read exactly the committed evidence

3. After a REJECT, what the re-run may do
-----------------------------------------
  In BLOCK mode a REJECT re-runs the agent once, and the re-run is told its committed entries as committed.

  cites committed evidence: re-emits every entry exactly
    allowed: the judge reads the re-run (ERROR: no recorded reply for this re-run)
    the re-run was told: COMMIT-BEFORE-INTERROGATION ([140 SE-09]): your evidence was locked at emission (root c9ff87132162debc…, 14 entries, c…

  does new work: re-executes step 3 under agent_cycle 2
    allowed: the judge reads the re-run (ERROR: no recorded reply for this re-run)

  new justification for an old claim: rewrites step 3, same cycle
    refused: judge not invoked — the re-run changed committed evidence with no new work behind it (att:3)

Evidence was frozen before it was judged: a verdict here can only be about what was committed.
```

## How to break it

Change one byte of committed evidence. In `fixtures/handoff.json`, change `input existence cannot be confirmed` to `input existence was confirmed`, then run `npm run demo:attest` again. The run stops at part 2, names the entry whose commitment no longer matches, prints the expected and received hashes, and ends with:

```
  judge not invoked — evidence changed after commitment
```

It exits 1. The judge is not asked to adjudicate the change and cannot be blamed for it, because the check happens before the judge and does not involve it.

## What this is

**The checks run on the production path; the judge and the emission around them are a reduced harness.**

- **The checks are the factory's own code.** `evidence-commitment.ts`, `cross-family-pass.ts` and `cross-family-verify.ts` in this folder, and `contracts/evidence-commitment.ts` at the repository root, are extracted from the factory. Each file's header names its source file, the commit, and what changed on extraction. `runCrossFamilyPass` is the pass the factory runs: it reuses the commitment made at emission, verifies it, refuses a re-justified re-run with `revealRerun`, and only then consults the judge.
- **The judge is a replay.** Its reply, in `fixtures/judge-reply.json`, is the one the factory recorded when a cross-family judge read this handoff during calibration on 14 September 2026. A re-run has no recording, so the replay answers `ERROR`. The factory's pass treats that like any judge it could not consult: it fails open and never blocks.
- **The handoff is real.** `fixtures/handoff.json` is an agent-12 emission from the factory's calibration snapshot. It halted at pre-flight, which is why the judge rejects it.
- **The commitment was made here, from that handoff.** The handoff's own stored commitment predates the change that commits every agent's evidence at emission, and holds no entries. So `fixtures/commitment.json` was made from its 14 attestations with the extracted `commitHandoffEvidence`, dated 14 September 2026. `npx tsx demos/06-attest/run.ts --commit` rebuilds it.
- **One part is not shown.** An evidence ref that names a file commits that file's hash as well, so rewriting the file moves the commitment. This handoff carries no evidence refs, so that part of the mechanism is not exercised here.

Extracted from the factory at commit `d490466` on 2026-09-14.
