# anti-map

**Proves:** Hallucination risk is scored where the model cannot check itself, every factor is logged beside the risk, and the record says it routed nothing.

```
npm run demo:anti-map
```

No key, no account, no network.

## What it stages

A model hallucinates more where it has no contact with what it describes, and where it was rewarded for an
answer regardless. The factory's anti-map names seven such regions. Six are things a model never
experiences: duration, perception, friction, stakes, magnitude and social register. The seventh is reward
bias, in four kinds: agreement, completion, confidence and intent. The point is the verification budget:
an expensive check belongs on a claim in one of these regions, not spread evenly across all of them.

One handoff carries six claims. The demo reads each against the contract, scores the tagged ones against a
store of seven prior cells, and prints every factor beside the risk it produces. See
[Grounding](../../docs/GROUNDING.md#1-the-anti-map) for where this sits in the factory.

## Expected output

```
3. One handoff, scored
----------------------
  claim  region       prior  × anchored  × sparsity  × stance  × frame  risk
  -----  -----------  -----  ----------  ----------  --------  -------  ------
  0      magnitude    0.15   1           1.6         1         1.4      0.336
  1      duration     0.2    0.3         1.2         1         1.4      0.1008
  2      reward_bias  0.3    1           1.3         1.6       1.4      0.8736

  anti-map: 3 scored claim(s) of 6 seen, highest risk 0.8736 — logged, routed nowhere (7 cell(s) in build-log/anti-map/cells.json; 3 unscored: 1 claim(s) carry no ClaimGrounding on extension{}; 1 claim(s) carry a ClaimGrounding the contract refuses (see details); 1 claim(s) are purely factual (region null))
    claim 5: assumed_default: an unanchored claim must say what it assumed (assumed_default)

  routes  nothing
```

and ten checks held, among them:

```
  an unanchored claim that states no assumption is refused          held    claim 5, friction
  every logged risk is the product of its logged factors            held    3 re-derived by hand
  the inherited stance ranks first and the anchored claim last      held    reward_bias 0.8736 > magnitude 0.336 > duration 0.1008
  the record says it routed nothing                                 held    routes: nothing
  a handoff with no tagged claim logs zero and says why             held    6 seen, 0 scored
```

The claim that echoes the brief's own stance ranks first, more than eight times the risk of a claim
anchored to a dated source. A claim that is unanchored and says nothing about what it assumed never reaches
the scorer: the contract refuses it, and the log carries the refusal rather than dropping the claim.

## How to break it

In `contracts/types/governance/anti-map.ts`, change

```
  if (!c.anchored && c.region !== null && !c.assumed_default?.trim()) {
```

to

```
  if (false) {
```

then run `npm run demo:anti-map`. It exits 1. The silent friction claim is now scored like the others, and
three checks fail, the first of them `an unanchored claim that states no assumption is refused`.

## What this does not prove

Nothing in the factory reads these scores. The record's `routes` field is the literal `nothing`, and no
router, gate or retry consults `risk`. Routing on it is a later phase, after the cells are fitted.

The six claims were written for this demo and tagged by hand. In the factory no real claim carries a region
tag yet, because the claim tagger is not built, so every real run logs zero scored claims, as part 4 shows.
The multipliers and priors are the contract's placeholders. They are named `PLACEHOLDER` in the source and
are meant to be fitted from logged outcomes before anything routes on them. The leading-frame factor is
stated by the demo, where the factory reads it from the saved prompt.

The scorer is `scripts/lib/anti-map.ts` with its disk reads and writes removed; the contract is the one in
`contracts/types/governance/anti-map.ts`. Both were extracted from the factory at commit `87fae286` on
2026-10-18.
