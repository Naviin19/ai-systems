# write-surface

**Proves:** Every persistent surface two agents share is on file, and the detector that holds the file to the tree catches its own planted cases before it may call the tree clean.

```
npm run demo:write-surface
```

No key, no account, no network.

## The class

A message can travel through any persistent surface two agents share: a board note one session writes and the
next reads at start, a handoff field the orchestrator places in the downstream agent's prompt, a report a later
run reads back. A registry lists each such surface: who writes it, who reads it back and where that read reaches,
whether the content is free text, what the write path permits, whether a rewrite by another process would be
noticed, and what watches it. The gate bans nothing. It keeps the list true.

## What it checks

| Check | Holds |
|---|---|
| `write-site` | every file that calls a filesystem write is named by a row's `writers[]` or sits under an allowlisted path |
| `anchor` | a row that reaches a prompt or a session names, for each writer and reader, a string found **in that file**; a mention in another file does not count |
| `allowlist-hides-channel` | an allowlisted file whose write call is aimed at a path that reaches a prompt must be listed on that row; declarations are followed (`const DIR = 'run/board'; const FILE = join(DIR, …)`), and a path that is only read, or only appears in the content written, is left alone |
| `envelope-free-text` | every top-level handoff key with a free-text leaf is declared at the count the schema derives; a new key fails, a stale declaration fails, and a `maxLength` does not make a string less free |

Only the destination argument of a write call is read. Coverage is at file grain: which surface a file writes is
a person's claim, and the anchor is what holds that claim to the file.

## Self-test first

Thirteen cases run over a temp copy of the fixture tree before the real tree is inspected: two controls that
must come back clean, one registry fault, and ten planted cases, five of them committed files under
`fixtures/planted/` overlaid one at a time. A missed case exits 2 and the tree is never inspected. Zero findings
after a real inspection is a result; zero catches in the self-test is a broken detector, and the order they run
in is the only thing that tells those apart.

Exit 0: clean. Exit 1: findings. Exit 2: could not run, from a missed planted case, an invalid registry, or a
scan that reached nothing. Exit 2 is never a pass.

## How to break it

In `demos/11-write-surface/detector.ts`, remove `appendFileSync` from the write-call pattern:

```
const SYNC_WRITE = /\b(writeFileSync|appendFileSync|renameSync|copyFileSync|cpSync|createWriteStream)\s*\(/;
```

to

```
const SYNC_WRITE = /\b(writeFileSync|renameSync|copyFileSync|cpSync|createWriteStream)\s*\(/;
```

Run it again. The planted `scripts/new-writer.ts` is no longer a write site, the self-test prints
`SELF_TEST_FAILED — refusing to inspect the fixture tree.`, and it exits **2**. The fixture tree is unchanged,
and it would have been reported clean.

## What is reduced

The production registry holds one row per factory surface over six scan trees and declares a count for every
boundary of the real handoff envelope; this one holds three rows, one tree and a two-boundary schema written for
the demo. The production self-test plants 18 cases; this one plants 13. Dropped: the OFF/WARN/BLOCK mode
switch, the report file, the listing and census flags, the `*` segment in scan trees, the symlink skip and the
scan-size floor. The four checks and the exit-2 doctrine are copied unchanged, with node built-ins only.
