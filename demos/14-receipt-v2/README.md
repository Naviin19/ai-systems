# receipt-v2

**Proves:** Six fields join the receipt without breaking a single old one: each is optional with no default, so an old receipt comes back from the parser unchanged, and a value of the wrong shape is refused.

```
npm run demo:receipt-v2
```

No key, no account, no network.

## What it stages

[Demo 04](../04-receipts/) shows the receipt a dispatch leaves: what the agent was given, what it loaded
and what it cited. In October the factory added six fields to it:

| Field | What it records |
|---|---|
| `state_before` | the boundaries of the upstream handoffs that named this agent |
| `state_after` | this handoff's own boundary |
| `preamble_variant` | which resident preamble the dispatch was given |
| `dispatch_topology` | how the agent was dispatched: pipeline, debate or parallel |
| `narrative_present` | whether a narrative sat beside the JSON |
| `factory_commit` | the factory commit the run was built from |

Every receipt written before them still has to validate. The schema version stays `1.0`, because nothing
reads it and a version nobody reads would be theatre: the fields are the version.

The demo parses a receipt written before the six fields. That receipt is the factory's own test fixture. It
then adds all six, and tries a wrong shape for five of them.

## Expected output

```
2. Parsing it adds nothing
--------------------------
  key paths in the file    47
  key paths after parsing  47
  added by the parser      none
```

```
  check                                      result  detail
  -----------------------------------------  ------  --------------------------
  a receipt from before v2 still validates   held    parsed
  it carries none of the six fields          held    none present
  parsing an old receipt adds no key         held    47 paths in, 47 out
  a receipt with all six recorded validates  held    parsed
  the six fields leave the version at 1.0    held    the fields are the version
  every wrong shape is refused               held    5 of 5
```

## Why "no default" is the point

A default is the easy way to add a field. It is also a quiet breaking change. Every receipt that never
recorded the field comes back from the parser carrying a value nobody measured: `narrative_present: false`
on a run where nobody looked. The factory's contract-evolution check reads a defaulted field as newly
required for that reason. An absent value stays absent here, and in the factory the receipt's `nulls[]`
names why.

## How to break it

In `contracts/types/measurement/receipt.ts`, change

```
  narrative_present: z.boolean().optional(),
```

to

```
  narrative_present: z.boolean().default(false),
```

then run `npm run demo:receipt-v2`. Every receipt still validates, which is exactly why this change is easy
to miss. The demo exits 1 all the same, because the parser now adds `narrative_present` to a receipt that
never recorded it:

```
  parsing an old receipt adds no key         FAILED  added narrative_present
```

## What this does not prove

The demo exercises the contract, not the builder. In the factory, `buildReceipt` reads each of the six
fields from what the run recorded. It writes one only when the run recorded it, and otherwise leaves it
absent, with its reason in `nulls[]`. That builder is not extracted here, and demo 04 runs an earlier
builder that predates these fields. The receipt with all six fields is the old fixture plus six values
written for this demo.

The contract is `contracts/types/measurement/receipt.ts`, and the old receipt is the factory's
`tests/fixtures/receipts/pre-v2.json`. Both were extracted at commit `87fae286` on 2026-10-18. The wrong
shapes for four of the fields come from the factory's own test, `tests/receipt-v2.test.ts`.
