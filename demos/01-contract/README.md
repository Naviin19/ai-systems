# Demo 1: one contract, and everything it reaches

**Proves:** the handoff between agents has one source of truth, a Zod schema. Its JSON Schema is generated from it, every consumer's reads are compiled against it, and the prompts that read it are traced from it. Change a field a consumer relies on, and the compiler names the consumer, the type it expected, the type it would receive, and the line of its playbook that reads the field. It does this before any agent runs.

## Run

```
npm run demo:contract
```

No key, no account, no network.

## Expected output

```
1. The contract, and the JSON Schema generated from it
------------------------------------------------------
  source                 contracts/types/operational/handoff-envelope.ts (Zod)
  variants               24 boundaries, one per handoff_boundary literal
  committed JSON Schema  regenerated, and identical to what is committed

2. Every seam of the agent graph, compiled
------------------------------------------
  agents                  20
  dependency edges        23, every one declared (undeclared: 0, stale: 0)
  edges with typed reads  5, 9 reads checked by structural subtyping
  playbook handoff reads  20 of 20 resolve against the real envelope
  compatible              yes
  ✓ agent-00 → agent-01  SPEC_TO_FOUNDATION  (1 read)
  ✓ agent-04 → agent-08  FRONTEND_CORE_TO_BROWSER_TESTING  (1 read)
  ✓ agent-09 → agent-10  CRAFTSMANSHIP_TO_DEPLOYMENT  (2 reads)
  ✓ agent-07 → agent-10  TESTING_TO_DEPLOYMENT  (2 reads)
  ✓ agent-10 → agent-11  DEPLOYMENT_COMPLETE  (3 reads)

3. What a change to the envelope reaches
----------------------------------------
  affected schemas  (none)
  affected tables   (none)
  prompts           32: every playbook and build prompt that reads a handoff
    templates/playbooks/playbook-template.md
    templates/playbooks/steps/agent-00-steps.md
    templates/playbooks/steps/agent-01-steps.md
    templates/playbooks/steps/agent-02-steps.md
    templates/playbooks/steps/agent-03a-steps.md
    templates/playbooks/steps/agent-03b-steps.md
    … and 26 more
  Total blast radius: 0 schemas + 0 tables + 32 prompts

One source of truth: the schema, its JSON Schema, every consumer read and the prompts that read it, all computed.
```

## How to break it

Make a producer promise less than its consumer relies on. Agent 09 emits `pixel_diff_status` as `PASS` or `FAIL`, and agent 10's playbook compares it to `'PASS'`. In `contracts/types/operational/handoff-envelope.ts`, change `pixel_diff_status: z.enum(['PASS', 'FAIL']),` to `pixel_diff_status: z.string(),`, then run `npm run demo:contract` again. It prints:

```
  The change breaks a consumer:
    agent-09 → agent-10 at boundary_payload.pixel_diff_status
      expected  enum(PASS|FAIL)
      received  string  (the producer does not restrict it to PASS, FAIL)
      read by   templates/playbooks/steps/agent-10-steps.md :: p.pixel_diff_status !== 'PASS'
```

It also reports that the committed JSON Schema has drifted from its source, at the exact path, and exits 1.

## What this is

**The production code, over the real contracts; the agent graph is captured as a fixture.**

- **The contracts are the factory's own schemas.** `contracts/types/` holds the handoff envelope and the seven schema files it imports, extracted verbatim.
- **So is the enforcement.** The compiler, the edge registry and the agent graph are in `contracts/enforcement/`; the blast-radius walk and its generated registry are in `contracts/registry/`. `json-schema.ts` holds the generator and the comparison that the factory's gate R22 uses. Each file's header names what changed on extraction. The only real change is that the compiler's command-line section is removed.
- **The compiler is the one the factory's gate R31 runs.** It compiles every dependency edge in today's agent graph. It also checks every consumer read declared in the edge registry, by structural subtyping, against the real envelope variant the producer emits. Finally it confirms that each declared read is still backed by the playbook line it cites, and that every handoff read in those playbooks resolves.
- **The agent graph is a capture.** `fixtures/agent-graph.json` holds each agent's key, dependencies and outbound boundary, read from the factory's 20 agent configs. The configs themselves, which import much of the factory, are not extracted.
- **Only the cited playbooks are included.** `fixtures/templates/playbooks/steps/` holds the four step files whose lines back the typed reads. The factory lints all 20; this demo lints those four.
- **The type check is a nominal subset.** Five of the 23 edges declare typed reads today. The other 18 are declared with no typed reads, so the compiler checks that the edge and the producer's envelope variant exist, not individual fields.

Extracted from the factory at commit `d490466` on 2026-09-14.
