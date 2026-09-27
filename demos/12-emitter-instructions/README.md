# emitter-instructions

**Proves:** An agent is never ordered to fetch data it has no route to, and the detector that checks this fires on an order it planted before it reads a playbook.

```
npm run demo:emitter-instructions
```

No key, no account, no network.

## The class of defect

An emitter-path agent receives its playbook as its entire system prompt and holds tools that open no
file. A line in that playbook that needs a shell to touch a file — `cat`, `jq`, `awk`, `test -f` with a
filename in command position — is an order the agent cannot perform. The agent either skips it, or emits a
schema-valid handoff claiming it ran.

The detector finds every such line and classes it by one mechanical question: can this agent reach that
data at all?

| Class | The line | The fix |
|---|---|---|
| `NO_ROUTE` | reads a file nothing delivers to the agent | a decision about where the data comes from |
| `WRONG_ROUTE` | reads an upstream handoff by file path, which the orchestrator already puts in the prompt as `SEED_STATE` | reword the line |
| `SELF_READ` | reads the agent's own emitted handoff back off disk | an emit-time self-check on the fields it emits |

Three shapes are left alone: a `#` comment, a prose bullet, and a self-check that names no file.

## Two checks, in this order

**1 · Self-test first.** The detector scans a playbook that plants each class and each non-instruction,
and must class every line as expected. A planted order that goes uncaught exits 2 and the real playbook
is never read.

**2 · The scan.** Every filesystem instruction in the playbook is compared with the inventory of what is
already on record. A line on record is not a finding. A line off record is a finding, classed, and exits 1.

## Why the inventory is a second input

The scan compares the playbook with a record, not with nothing. Matching is generous in both directions —
a `CLASS — LINENO:` prefix is stripped, a truncated entry matches the line it came from — with a
15-character floor so a stub cannot match everything. A too-strict match reports known lines as drift
and trains a reader to ignore the gate.

## How to break it

Repair the planted order in the detector's own fixture. In
`demos/12-emitter-instructions/fixtures/self-test/agent-aa-steps.md`, change

```
`cat some-file-that-nobody-produces.md | jq .planted`
```

to

```
the `planted` field you emit is present
```

then run `npm run demo:emitter-instructions`. It exits **2**, prints
`SELF_TEST_FAILED — refusing to scan the playbook.`, and never reads the playbook. The fixture is
committed rather than generated for this reason.

A second break: add `` ⚡ Verify: `jq .schema verification/runs/latest/agent-dd/handoff.json` `` to
`fixtures/playbook/agent-ee-steps.md` and run it again. It exits **1** and names the line `WRONG_ROUTE`.

## What is reduced

The production detector re-derives the emitter-path roster from `configs/` and reads eight real playbooks
against `verification/lawa5-emitter-inventory.json`; this demo names one agent and reads one fixture
playbook against a fixture inventory. The production gate runs under `EMITTER_INSTRUCTIONS_MODE`
(`OFF | WARN | BLOCK`) and prints a coverage caveat: it cannot see `npx`, `node`, `for`-loop bodies or
prose. This demo has no mode switch. The scanner and the classifier are the production text: no AST, no
model.
