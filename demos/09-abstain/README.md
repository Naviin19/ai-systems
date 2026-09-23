# abstain

**Proves:** A signal with nothing to score on returns null rather than zero, and the composite renormalises over what reported.

```
npm run demo:abstain
```

No key, no account, no network.

## What it stages

One product scores a market category on six signals and combines them into a single number. Two of those
six abstain in production today, because the collectors behind them need credentials that are not set.

The question this demo answers is what a system should do with a number it does not have. The ordinary
answer is to treat it as zero, because a zero keeps the arithmetic working. This one treats it as absent,
renormalises the weights over the signals that reported, and still lists all six in the breakdown with
`null` in the abstained slots — so a reader sees what was not measured instead of inferring it from a low
score.

## What it costs to get this wrong

On the cluster in `fixtures/`, the two treatments do not merely differ by a little:

| Treatment | Composite | Window status |
|---|---|---|
| abstention renormalised | **79** | **open** |
| abstention counted as zero | 59 | narrowing |

A gap in collection would have read as twenty points of evidence *against* the market, and flipped the
verdict from open to narrowing. The two missing signals say nothing whatsoever about the category — they
say something about an environment variable.

## The vendor's limitation, carried verbatim

The heaviest signal, at weight 0.30, rests on a metric that is a vendor's model of competition rather than
a measurement of the market. Rather than bury that, the sentence saying so is declared once as a constant
and carried into every verdict, evidence record, payload, email and footer.

The demo asserts the carried copy is **byte-equal** to the declaration, not merely present and not merely
the same length. That distinction has teeth: swap the em-dash in the carried copy for a hyphen and the
string is still 116 characters long. A length check passes. A byte-equality check does not.

## How to break it

In `demos/09-abstain/composite.ts`, change

```
  const live = signals.filter((s) => !s.abstained && s.score !== null);
```

to

```
  const live = signals;
```

then run `npm run demo:abstain`. It exits 1, and both rows of the comparison table collapse to the same
number — the output shows the distinction disappearing rather than merely reporting that it did.

A second break: in `fixtures/cluster.json`, change the em-dash in `vendor_proxy_caveat` to a plain hyphen.
The length is unchanged, and the demo still exits 1.

## What this does not prove

The six signal verdicts in `fixtures/cluster.json` were written for this demo; the scorers that produce
them in the product are not run here, and neither is the series smoothing that guards the growth signal
against a single-month spike. `classify` is reduced to the two thresholds the composite is compared
against — the production classifier also consults a volume floor and a trend ratio. The weights and the
thresholds are the product's real ones.
