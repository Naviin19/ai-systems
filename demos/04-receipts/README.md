# Demo 4: what an agent was given, what it loaded, and what that does not prove

**Proves:** an agent dispatch leaves a receipt. The receipt records the citation index the agent was given, every section it loaded with the size of what came back, and what its handoff cited. It also states, in its own contract, what those records cannot show, and a receipt that claims more does not validate.

## Run

```
npm run demo:receipts
```

No key, no account, no network.

## Expected output

```
1. What the agent was given
---------------------------
  agent               corpus-seed.agent-12-prompt-manager, one real dispatch on 2026-09-06
  citation index      53 lines, naming 45 distinct skills
  assembled prompt    115,738 characters, about 28,935 tokens (estimated as chars/4)
  counted by the API  150,935 input, 163,785 read from cache, 54,595 written to cache, 8,454 output, across the run

2. What it loaded, section by section
-------------------------------------
  turn  skill                          section asked for  characters  tokens (est.)
  ----  -----------------------------  -----------------  ----------  -------------
  1     master-prompt-architecture.md  §1-§5              19,327      4,832
  1     prompt-multiplier.md           §3-§4              9,683       2,421
  1     temperature-profiles.md        whole file         17,648      4,412
  2     discovery-frame.md             §intent-language   75,694      18,924
  2     prompt-constitution.md         §Eight Directives  33,547      8,387
  2     prompt-type-taxonomy.md        §1-§2              186         47
  3     prompt-type-taxonomy.md        whole file         16,711      4,178
        total                                             172,796     43,201
  Each row is one load_skill call and the size of the text it returned.

3. What it cited
----------------
  cited in its handoff  nothing: handoff.json and handoff.md carry no @skill: citation
  given, never cited    45 of the 45 skills in its index
  loaded, never cited   discovery-frame.md, master-prompt-architecture.md, prompt-constitution.md, prompt-multiplier.md, prompt-type-taxonomy.md, temperature-profiles.md

4. What the receipt will not claim
----------------------------------
  The done half records acknowledgement-class evidence only (citations, attestations, findings). With
  what is on disk, 'shaped the output' cannot be separated from 'was acknowledged': a citation proves
  injection into the index — not acknowledgement, not load, not influence (P1 B2). Influence is
  provable by nothing currently recorded.

5. The rest of the record
-------------------------
  run outcome        succeeded
  gate verdicts      none recorded in this run
  fields left empty  2, each with its reason
  - residuals.craftsmanship: no craftsmanship grade in .cache/prompt-enrichment matches this run's handoff.md or this agent's playbook
  - residuals.verification_commands[].matched: no recorded execution of handoff verification_commands exists anywhere on disk (write-only field since birth); comparison deferred until a runner records exits — never a speculative re-run

The receipt records and never judges: where it has no evidence, it names the gap instead of guessing.
```

## How to break it

Make the receipt claim influence. In `demos/04-receipts/receipt.ts`, change `separability_statement: RECEIPT_SEPARABILITY_STATEMENT,` to `separability_statement: 'The cited skills shaped this output.',`, then run `npm run demo:receipts` again. It prints:

```
The receipt contract refuses this receipt
-----------------------------------------
  done.separability_statement: Invalid input: expected "The done half records acknowledgement-class evidence only (citations, attestations, findings).

A receipt that claims more than its evidence can carry does not validate, so none is written.
```

It exits 1. In the factory the statement is a `z.literal` in the receipt contract, and building a receipt ends by validating against that contract. When validation fails, the orchestrator logs `receipt: assembly failed … (non-fatal)`, writes no `receipt.json`, and the run carries on.

## What this record shows

- **One real dispatch.** Agent 12, the prompt manager, ran once from the factory's seeded handoff corpus on 2026-09-06. It had no product to derive prompts from. Its handoff says so: it halted and emitted an empty, valid payload rather than invent prompts.
- **Loads are sized, and the sizes tell.** Two loads asked for a named section and were handed the whole file: `discovery-frame.md §intent-language` (75,694 characters) and `prompt-constitution.md §Eight Directives` (33,547). The loader then resolved only numbered sections. `prompt-type-taxonomy.md §1-§2` returned a 186-character notice, because that file has no numbered sections, and the agent loaded the whole file on its next turn. Since this record, the factory's loader resolves a named section to its heading, and the step-file rows that named sections no heading carries have been corrected.
- **Nothing was cited.** A citation in the handoff is the only "done" evidence a receipt reads, and this handoff has none. The receipt does not treat that as proof the loads went unused, and it does not treat a citation as proof of use either.
- **Two kinds of token count.** The prompt figure is an estimate, characters divided by four, and says so. The API's figures come from the same run's ledger and total every call the run made, including the loaded text.

## What this is

**The production path over the ledger of one real dispatch.**

- **The builder and its contract are the factory's own.** `receipt.ts` is extracted unchanged, and so is the contract it validates against, in `contracts/types/measurement/receipt.ts`. The factory builds this receipt for every agent after its gates have run.
- **The data is a real run, unchanged.** `fixtures/runs/run-corpus-mtpc7jza/` holds the run's `events.jsonl` and agent 12's `handoff.json` and `handoff.md`, byte for byte as the factory's calibration corpus holds them.
- **One field is empty here and not in the factory.** The builder also reads craftsmanship grades from the factory's grade cache. The factory's receipt for this run carries nine grades of agent 12's playbook. That cache is not extracted, so here the field is empty, with its reason.

Extracted from the factory on 2026-09-14: the builder and contract at commit `d490466`, the run's ledger at `bfdfc1a`.
