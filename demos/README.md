# Demos

Six demos, each running code extracted from the factory over data the factory recorded. None needs a key, an account or the network.

```
npm run demo              # all six: what each proves, and whether it held
npm run demo:<name>       # one of them, with its full output
```

## What each one proves

| Demo | Plate | Proves | Kind |
|---|---|---|---|
| [contract](01-contract/) | 04 Contract spine | The handoff between agents has one source of truth, a Zod schema. A producer's type change that breaks a consumer is named, with the playbook line that reads the field, before any agent runs. | production path |
| [drift](02-drift/) | 05 Verification stack | Each agent's handoff is compared with its own earlier builds by a deterministic embedder, with no model. Only drift at the enforcing level stops a run, and a falling margin warns before the floor breaks. | production path |
| [routeback](03-routeback/) | 05 Verification stack | The verification stack stops real defects and leaves benign changes alone, at a measured rate, and is held to a published bar. | reduced harness |
| [receipts](04-receipts/) | 06 Context residency | A dispatch leaves a receipt of what the agent was given, what it loaded and what it cited, and the receipt will not claim more than that proves. | production path |
| [isolation](05-isolation/) | 03 Compiler spine | The orchestrator runs agents together wherever the dependency graph allows, each in its own git worktree, and their merges reach main because they are serialised. | reduced harness |
| [attest](06-attest/) | 05 Verification stack | The evidence behind an agent's claims is hash-locked when the agent emits, before any gate or judge reads it. | reduced harness |

## Production path, reduced harness

Every demo's README says which of the two it is, and what it stages.

- **Production path.** The factory's functions run unchanged over data the factory recorded: its contracts and agent graph, real agent handoffs and baselines, the ledger of a real run. What a demo stages is only where those files sit.
- **Reduced harness.** The factory's checks still run unchanged, but something around them stands in for a part that cannot run here:
  - a recorded judge reply in place of a live judge (routeback, attest);
  - stand-in agents that each commit one file, in place of real dispatches (isolation).

  The README names what is replayed or constructed.

## How a demo is extracted

- **A header on every carried-over file.** Each file taken from the factory begins with a header naming its source path, the factory commit, the date, and what changed on extraction. Most say "unchanged".
- **A `demo.json`.** It lists the factory files a demo was drawn from and the symbols it relies on, at that commit, so the extraction can be checked against the factory.
- **A named tamper.** Each demo's `demo.json` and README name an exact edit that must make it refuse, and the line it prints when it does. `npm run demo` shows two of them.

## Plates without a demo

| Plate | Why there is no demo |
|---|---|
| 01 Operating system | It maps the whole factory and the products built from it. The demos exercise its parts. The products run live, and nothing in this repository touches them. |
| 02 Knowledge substrate | Its checks run over the factory's 218 skill files and their registry, which are not published here. |
| 07 Hardening loop | Agent 11 hardens a deployed product through repeated browser runs against its staging site. There is no staging deployment here, and the loop has not yet run against a real product. |
| 08 Learning loops | Nothing becomes permanent without a person. The loops capture on their own, and promote only when someone approves. A self-contained demo would have to play that person. |
| 09 Runtime engine | Its packages serve products at run time and are not on the factory's build path. This repository runs no product. |
| 10 Two-lane execution | The explore lane is off by default. What it produces is judged by a person at gate A. Its one automatic part is a guard that keeps the candidate off every other agent's handoff, and no demo exercises it. |
