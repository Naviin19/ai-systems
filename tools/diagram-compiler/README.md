# Diagram source

The ten plates are compiled, not drawn. `grammar.py` holds the visual grammar as
primitives — colour roles, box, tick, numeral, gate, connector, taper, node, citation
edge — and the three `diagrams_*.py` files describe each figure in terms of those
primitives. Nothing sets a colour or a text size directly.

This is deliberate. The brief requires that the set read as one system, and the cheapest
way to guarantee that is to make a grammar violation impossible to express rather than
something a reviewer has to catch. It is the same argument the contract spine makes about
schemas, applied to artwork.

## Regenerate

```
python3 diagrams_01_03.py      # 01 operating system · 02 knowledge substrate · 03 compiler spine
python3 diagrams_04_06.py      # 04 contract spine · 05 verification stack · 06 context residency
python3 diagrams_07_10.py      # 07 hardening · 08 learning loops · 09 runtime · 10 two-lane
python3 verify.py              # grammar, tick reconciliation, text geometry in a browser
python3 build_pdf.py && python3 to_pdf.py && python3 verify_pdf.py   # the reference set
```

Each plate script writes two files: the standalone plate to `diagrams/`, which carries its
own title and caption because a file in a repository has to label itself, and a bare twin
to `diagrams-bare/`, cropped to the artwork for the print build. `diagrams-bare/` is a
build artifact — regenerate it, do not edit it, do not commit it.

Standalone files are `viewBox="0 0 680 H"`, `width="100%"`, no gradients, no shadows, no
raster. Literal light-mode values ship as presentation attributes so any renderer gets a
correct light rendering; dark mode arrives as a `prefers-color-scheme` override, plus
`[data-theme]` rules for embedding in a page that states its own theme.

Commit the SVG, not a PNG. It renders natively on GitHub, appears in diffs, and lets a
reviewer watch the architecture change over time — which matters more than it used to,
now that the architecture demonstrably changes every three weeks.

## Changing a figure

Edit the diagram function, not the SVG. An SVG edited by hand is out of sync with its
source on the next regeneration, which is exactly the drift the set argues against.

If a figure's *count* changes, change it in one place and re-run. Ticks reconcile across
plates by construction: `ticks(x, y, n)` draws `n` marks, so a count that disagrees with
its label is a visible bug rather than a silent one.

## Two rules the verifier enforces that are easy to break by accident

**Ticks are for one kind of thing.** They count agents, stages, rounds and attempts, and
they reconcile across the set — if plate 03's per-stage ticks sum to 20, plate 01 must say
20. The Level-0 citation threshold also happens to be twenty, so drawing it as ticks would
make the reconciliation rule read a collision as agreement. Thresholds use `numeral()`.
`verify.py` fails the build if plate 02 emits a unit tick.

**Nothing goes above y=96.** The bare crop lifts the body by 78px and measures height from
the lowest drawn element, so anything placed higher is silently lost in the print build
while looking fine in the standalone file. Plate 05's return path was drawn at y=78 once;
it vanished from the PDF and nowhere else.

## Height budget

The print page fits roughly `H = 690` of bare artwork before the evidence chips are pushed
onto the next page. Plate 05 is the tallest in the set at 700 and is the constraint worth
remembering: if it grows, something else on it has to shrink.
