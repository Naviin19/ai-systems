# silence

**Proves:** A detector must catch a defect it planted itself before it is allowed to report a corpus clean.

```
npm run demo:silence
```

No key, no account, no network.

## The class of defect

A silence is a failure whose failed state is byte-identical to its healthy state. Three are hunted here:

| Rule | The silence |
|---|---|
| `unchecked-db-write` | the client resolves a failed write with an error object instead of throwing, so an unread result means the write can fail without anything noticing |
| `paid-call-without-run-marker` | a paid call whose `catch` returns null is indistinguishable downstream from a call that legitimately found nothing |
| `dead-key-read` | a read of a key nothing writes returns undefined forever, which every consumer reads as "not set yet" |

In the product this came from, the first rule found 17 unchecked writes and drove them to zero.

## The problem with writing this detector

A checker that silently matches nothing **is** the defect class it hunts. The repository this came from
had shipped that exact thing more than once: a contract gate authored and never wired; a drift audit whose
regex discarded the section, so a citation to a section that did not exist passed green; a quality gate
whose file pattern matched 218 of 249 files and reported a clean sweep.

So the detector carries four guards, and they run in this order:

**1 · Self-test first.** Every rule runs against its own known-positive fixture before the corpus is
touched. A rule that finds zero in its own fixture exits 2 and the corpus scan never happens.

**2 · Corpus floor.** Every rule declares the minimum number of files a real scan must reach. Fewer means
the scan collapsed, which fails loudly instead of passing quietly.

**3 · Count collapse.** If a rule's count drops further than the fixes explicitly accepted in this run, it
exits 2. **A rule that suddenly matches nothing is treated as broken, not as victory.**

**4 · No skip-as-pass.** There is no path that returns 0 without having scanned. Absence of evidence is
never reported as evidence of absence.

## Two zeroes that look identical

The third rule finds nothing in this corpus, and that is a result rather than a failure. Zero findings
*after a real scan* means the corpus is clean of that class. Zero findings *in a rule's own fixture* means
the rule is broken. Nothing in the output distinguishes those two zeroes — guard 1 is the only thing that
does, which is why it runs before anything else.

## Why sites are keyed by content

A baseline keyed on `file:line` churns on every reformat and, worse, silently forgives a genuinely new site
that lands on a forgiven line. The key here is a hash of the **normalised enclosing statement**: whitespace
is collapsed before hashing, so reformatting is invisible, while a genuinely different statement is a
genuinely different hash. The repository this came from has seventeen live worktrees, and four of its
original findings turned out to be pure line-drift artifacts.

## The ratchet

Existing sites stay legal; a new one is impossible. On the day the gate is switched on it blocks nothing
that exists and everything new — **because a gate that fails on day one gets disabled.**

## How to break it

Repair the planted defect in the detector's own fixture. In
`demos/08-silence/fixtures/known-positive/unchecked-db-write/planted.ts`, change

```
  await db.from('deliveries').update({ delivered: true }).eq('id', id);
```

to

```
  const { error } = await db.from('deliveries').update({ delivered: true }).eq('id', id);
```

then run `npm run demo:silence`. It exits **2**, prints `THE MATCHER IS BROKEN`, and refuses to scan the
corpus at all. Fixing the bug in the fixture is what breaks the detector, which is the counterintuitive
half of the design and the reason the fixture is committed rather than generated.

A second break is worth trying: add an unchecked write to any file under `fixtures/corpus/` and run it
again. It exits **1** and names the new site with its hash — the ratchet working in the other direction.

## What this does not prove

The production rules walk a TypeScript AST; these match on text, because the four guards are what this demo
is about and they do not care how a rule finds its sites. A text matcher would miss a multi-line write that
the real one catches. The corpus here is four small files written for the demo, not a real codebase, and
the counts in `fixtures/baseline.json` describe only those four files.
