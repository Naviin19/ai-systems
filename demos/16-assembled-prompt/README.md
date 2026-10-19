# assembled-prompt

**Proves:** A prompt assembled from fragments can contradict itself while every fragment is correct on its own, so the check reads the assembled prompt, and a stale copy of it is UNEVALUATED rather than a pass.

```
npm run demo:assembled-prompt
```

No key, no account, no network.

## What it stages

An agent never reads a file. It reads a prompt assembled at dispatch: a kernel, a skill index, a step plan,
the orchestrator's own rule text and a steering block, some of them kept or dropped by runtime switches. A
check that reads files one at a time cannot see a defect that lives between two of them.

The factory learned this from one defect. Its kernel said a corrector could run at most two cycles. A
string in the orchestrator said "ONE Corrector cycle". The two sat 1,962 assembled lines apart in every
prompt, from 1 June until 6 September, while every per-file gate passed. It was found by reading the
assembled text as a whole. See
[decision 6](../../docs/DESIGN-DECISIONS.md#6-audit-the-prompt-the-agent-receives-not-the-files-it-is-built-from).

This demo rebuilds that shape from five fragments written for it:

- the same check, run one fragment at a time and then on the assembled prompt
- a steering switch turned off and on
- the fix
- a corpus that has gone stale since it was assembled

## Expected output

```
1. Read one fragment at a time, each states one bound
-----------------------------------------------------
  fragment       cycle bound it states             D1 on its own
  -------------  --------------------------------  -------------
  kernel.md      Max 2 cycles                      clean
  index.md       —                                 clean
  steps.md       —                                 clean
  retry-rule.md  eligible for ONE Corrector cycle  clean
  steering.md    —                                 clean

2. Assembled, the prompt contradicts itself
-------------------------------------------
  assembled prompt  44 lines
  D1                corrector-cycle bound stated 2 different ways (2 vs 1) at lines 9, 40
```

```
3. A switch can break a prompt that was whole
---------------------------------------------
  steering switch  STEERING POINTS block  D6
  ---------------  ---------------------  -----
  on               present                clean
  off              absent                 FIRES
```

```
  corpus                        findings in the text on disk  verdict      exit  why
  ----------------------------  ----------------------------  -----------  ----  --------------------------------------------------------------
  fresh                         0                             PASS         0     fresh, and no finding
  kernel edited after assembly  0                             UNEVALUATED  3     the corpus is stale: its inputs changed since it was assembled
  no stamp                      —                             UNEVALUATED  3     the corpus carries no freshness stamp
```

and eight checks held.

## Two shapes, one cause

**D1** is two sources stating one bound two ways. Each source is internally consistent; the contradiction
exists only once they are joined.

**D6** is a switch. With steering on, the step plan's order to call the steering tool sits beside the block
that describes it. Turn steering off and assembly drops the block but keeps the order. In the factory, 25
such orders across 11 playbooks were made conditional on the switch. The same prompt is whole under one
setting and broken under the other, so the check has to run on what each setting produces.

## Why a stale corpus is not a pass

The gate reads a corpus assembled earlier, stamped with a SHA-256 over every input. When an input changes
after assembly, the text on disk is no longer what an agent would receive. Graded as it stands, it would
pass, because the text on disk has no finding. So freshness is decided first, and a stale or unstamped
corpus is UNEVALUATED with exit 3. The exit is never 0, so no wrapper can count it toward a green tally.

## How to break it

In `demos/16-assembled-prompt/checks.ts`, change

```
  if (distinct.length > 1) {
```

to

```
  if (distinct.length > 2) {
```

then run `npm run demo:assembled-prompt`. It exits 1:

```
  assembled, the two bounds are caught disagreeing      FAILED  D1 did not fire
```

## What this does not prove

This half of the factory's gate is narrow. Against a census in which a reader went through every prompt
and logged 637 ambiguities, the deterministic checks found 6%. They catch the six defect shapes that have
shipped, and say nothing about the rest. The gate's reading half, a paid two-stage model pass, confirmed
every candidate it was shown and rejected none, so it does not discriminate yet. The gate runs under WARN
in the factory, where a finding is reported and the run continues. The FAIL row shows it under BLOCK.

The fragments were written for this demo, and `assemble.ts` is a toy. The factory's kernel, playbooks and
orchestrator text are private, and its assembler lives inside the orchestrator. `retry-rule.md` stands in
for the string literal where the real contradiction's second half lived.

`checks.ts` is `scripts/audit/deterministic-prompt-checks.mjs` with types added. `gate.ts` holds the stamp
from `scripts/audit/corpus-stamp.mjs` over the demo's fragments, and the gate's order of decisions from
`scripts/verify-assembled-prompts.mjs`. All were extracted from the factory at commit `87fae286` on
2026-10-18.
