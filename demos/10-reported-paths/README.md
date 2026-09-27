# reported-paths

**Proves:** A path an agent reports in its handoff is a claim about disk, and the scanner resolves it, while a route is never resolved and zero handoffs is never a pass.

```
npm run demo:reported-paths
```

No key, no account, no network.

## The class of defect

A handoff can be schema-valid and name a file that was never written. Every gate that checks the envelope's
shape passes it. This gate resolves every declared `filesystem` path in the handoff against disk, with
`existsSync`, before anything downstream reads the file.

Path-shaped is a syntactic trigger (`*_path`, `*_paths`, plus two named fields), never a verdict. What a
field actually is sits on its row in the declaration as a decided `kind`:

| kind | rows | resolved |
|---|---|---|
| `filesystem` | 11 | against `{runDir}` (the emitting agent's run directory), then the repo root |
| `route` | 1 | never — `golden_master_routes[].path` is a URL agent 08 screenshots |
| `foreign` | 4 | never — a file in a product workspace the factory does not own |

## What the four checks show

| Check | Fixture | Result |
|---|---|---|
| 1 · a reported file that does not exist is caught | `notes_emitted: ["reading-notes/source.notes.md"]`, no such file | state `PASS`, 1 claim, 1 `MISSING` — a control handoff whose note exists resolves 1 of 1 |
| 2 · a handoff that reports nothing because it wrote nothing is clean | `notes_emitted: []` beside a `blocked` route report | `UNEVALUATED`, 0 missing — an agent is never punished for an honest empty report |
| 3 · a URL route is never resolved against disk | `golden_master_routes: [{path: "/dashboard"}, {path: "/settings"}]` | as declared (`route`): 0 claims. The same handoff under a `filesystem` row: 2 missing on every run — the false positive the declaration exists to prevent |
| 4 · zero handoffs is `UNEVALUATED`, never a pass | an empty runs directory | `UNEVALUATED`, reason `0 handoffs under …`; no path returns `PASS` without resolving a claim |

Output ends with a verdict table. Any check that does not hold exits **2**; the run never reports partial
results as clean.

## How to break it

Remove the disk resolution. In `demos/10-reported-paths/reported-paths.ts`, change

```
            if (existsSync(abs)) { exists = true; resolvedAt = abs; break; }
```

to

```
            if (abs) { exists = true; resolvedAt = abs; break; }
```

then run `npm run demo:reported-paths`. Check 1 reports the fabricated path as resolved, the verdict table
shows `FAILED`, and the run exits **2** printing `SELF_TEST_FAILED — refusing to report a scan clean.`

## What is reduced

The scanner (`scanReportedPaths`, `valuesAt`, `isPathShaped`, `PATH_SHAPED_EXTRA`) and the 16-row declaration
run unchanged, with each row's prose note shortened to one line. The factory's parity leg, which walks the
generated envelope schema and requires a row for every path-shaped leaf it finds, is not carried: the schema
is not published here, so the inventory is copied rather than re-derived. The mode switch and the report file
are not carried; `run.ts` owns the exit contract. Four of the factory's nine self-test legs run here, over
committed fixture handoffs that carry only the fields the scanner reads.
