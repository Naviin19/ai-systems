# ai-systems

[![diagrams](https://github.com/Naviin19/ai-systems/actions/workflows/diagrams.yml/badge.svg)](https://github.com/Naviin19/ai-systems/actions/workflows/diagrams.yml)
[![demos](https://github.com/Naviin19/ai-systems/actions/workflows/demos.yml/badge.svg)](https://github.com/Naviin19/ai-systems/actions/workflows/demos.yml)

The published architecture of an AI software factory and the products built with it. Twenty agent configurations are dispatched in dependency waves, each into its own git worktree. Every handoff between them is parsed against a typed contract and passed through a verification stack, and all of it runs over one corpus of 218 skill files. The factory and the product repositories are private. This repository is the methods section: ten plates of the architecture, the evidence behind every figure on them, and six demos that run the factory's own code.

```
git clone https://github.com/Naviin19/ai-systems && cd ai-systems
npm ci && npm run demo
```

The demos need no API key, no account and no network. CI runs them on Linux, macOS and Windows with every outbound connection refused. With Python and `pip install -r tools/diagram-compiler/requirements.txt`, `npm run diagrams && npm run diagrams:verify` regenerates the plates, checks every count on them against [`docs/evidence.md`](docs/evidence.md), and measures their text in a real browser.

---

![The operating system](docs/diagrams/01-operating-system.svg)

*The taper is the argument: one corpus carries a build side and a run side, and the compression from the corpus to the products is a shape rather than an assertion.*

## The ten plates

Each plate proves one claim. [`docs/architecture.md`](docs/architecture.md) carries all ten in prose, for anything that does not render images.

| # | Plate | Claim | Evidence |
|---|---|---|---|
| 01 | [Operating system](docs/diagrams/01-operating-system.svg) | A system with a build side and a run side, not a folder of scripts | audited counts |
| 02 | [Knowledge substrate](docs/diagrams/02-knowledge-substrate.svg) | Importance in the corpus is measured, and the measurement is checked | shipped checks · audited counts |
| 03 | [Compiler spine](docs/diagrams/03-compiler-spine.svg) | Orchestration with isolation, not a prompt chain | shipped · audited waves |
| 04 | [Contract spine](docs/diagrams/04-contract-spine.svg) | One source of truth, and the reach of changing it is computed | shipped · audited counts |
| 05 | [Verification stack](docs/diagrams/05-verification-stack.svg) | Four outcomes, and a failure retrying can fix is told apart from one it cannot | shipped |
| 06 | [Context residency](docs/diagrams/06-context-residency.svg) | Budgeting is a measurement, and so is uptake | shipped · audited reduction |
| 07 | [Hardening loop](docs/diagrams/07-hardening-loop.svg) | Promotion requires a proof of convergence | shipped |
| 08 | [Learning loops](docs/diagrams/08-learning-loops.svg) | Two loops, and in both a person decides what becomes permanent | shipped · audited protocol |
| 09 | [Runtime engine](docs/diagrams/09-runtime-engine.svg) | The packages a product runs on, and the product that runs on them | shipped · audited caller |
| 10 | [Two-lane execution](docs/diagrams/10-two-lane-execution.svg) | The constraint is scoped, not total | shipped · never run live |

The reference set, with every plate, its reading and what changed in this revision, is [`docs/ai-operating-system.pdf`](docs/ai-operating-system.pdf).

## Demos

Six demos run code extracted from the factory over data the factory recorded. Each one names a tamper that must make it refuse, and `npm run demo` shows two of them. [`demos/README.md`](demos/README.md) says how each was extracted and why six plates have no demo.

| Demo | Plate | Proves | Kind |
|---|---|---|---|
| [contract](demos/01-contract/) | 04 | A producer's type change that breaks a consumer is named, with the playbook line that reads the field, before any agent runs | production path |
| [drift](demos/02-drift/) | 05 | A handoff is compared with the agent's own earlier builds by a deterministic embedder, and only drift at the enforcing level stops a run | production path |
| [routeback](demos/03-routeback/) | 05 | The verification stack stops real defects and leaves benign changes alone, at a measured rate held to a published bar | reduced harness |
| [receipts](demos/04-receipts/) | 06 | A dispatch leaves a receipt of what the agent was given, loaded and cited, and the receipt claims no more than that proves | production path |
| [isolation](demos/05-isolation/) | 03 | Agents run together where the graph allows, each in its own worktree, and their merges reach main because they are serialised | reduced harness |
| [attest](demos/06-attest/) | 05 | The evidence behind an agent's claims is hash-locked when it emits, before any gate or judge reads it | reduced harness |

## Products

Built with the factory. The repositories are private, and a link that 404s is worse than none.

| Product | What it is | Status, 14 September 2026 |
|---|---|---|
| Ark | A brand book researched and written from a URL | Live; latest deployment 7 September |
| Author | A content playbook compiler: a multi-channel content and copy playbook from a brand's URL | Live; latest deployment 26 July |
| Archer2 | B2B sales intelligence: a verdict, target personas and pitch material for a target account | Live; latest deployment 26 July |
| Whitespace Hunter | Scores how much runway an emerging market category has left, from search and SERP signals | Live at [whitespace-hunter.vercel.app](https://whitespace-hunter.vercel.app) since 1 September |
| Auteur | AI creative production | Specced |

Status is audited from each project's Vercel production deployments, and each description follows the product's own repository.

## What this rests on

Every figure carries an evidence tier, and nothing is tiered higher than its weakest input. **Shipped** means a named file implements it, so the right response is to ask to see the file. **Audited** means counted or observed at a named commit or on a named date. **Contested** means two sources disagree. Nothing the plates draw is contested.

On 14 September 2026 every claim the plates made was re-audited against the factory's code at commit `5739a97`. The audit holds 245 claims, each citing the lines that show it, and a script resolves every citation. 98 claims held, 127 were corrected, 9 were removed and 11 were added, and the plates were redrawn from the result. Where a plate claimed more than the code did, the plate changed. Where the code was wrong, the factory was fixed first. [`docs/evidence.md`](docs/evidence.md) has every figure and how it was measured. Its machine-readable block is also what the diagram compiler checks the artwork against, so a figure and the plate that draws it cannot be edited apart.

One defect is published deliberately. `agent-00.config.ts` cited a section anchor that did not exist, so the spec validator — first in the pipeline, the gate every build passes through — was handed the literal string `[section not found]` where its constitution should have been. A citation that silently resolves to an error string is worse than one that throws, because the pipeline keeps running and everything downstream is confidently built on nothing. It was fixed on 12 September, and since 14 September a citation to a section that does not exist fails in pre-commit and in CI.

## License

[MIT](LICENSE).
