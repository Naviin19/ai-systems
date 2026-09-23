# enrich — live

**Proves:** Forced tool choice returns schema-valid structure from a real model, and five concurrent identical calls make one dispatch.

```
npm run demo:enrich
```

> **This one calls a real model and spends real money.** At most three calls, typically well under one US
> cent. It reads `ANTHROPIC_API_KEY`, or `OPENROUTER_API_KEY` if that is the one you hold. With neither
> set it explains itself and exits 0 without calling anything. Every other demo in this repository needs
> no key, no account and no network.

## Why this one has to be live

Three properties cannot be shown with a recorded fixture, because a recording would be assuming exactly
what is in question.

**That constrained decoding actually works.** The caller's schema is converted to JSON Schema at dispatch
and becomes the input schema of a tool the model is forced to call. Whether a real model returns a
schema-valid object through that path is a fact about the model, not about the code. A fixture would be
the author asserting it.

**That the cache key hits and misses for the right reasons.** The key is a hash over six inputs: a version
prefix, the raw text, a normalised schema fingerprint, the context, the model and the quality floor.

**That concurrent calls de-duplicate.** Five identical calls are issued at once and the demo counts
dispatches. One is the answer the mechanism claims; the demo counts rather than asserts.

## What a run looks like

```
1. Weak text in, typed object out

  raw: "we sell observability tooling, trying to get into Tata Capital — they appointed a new CTO in March"

  {
    "company": "Tata Capital",
    "industry": "Financial Services",
    "objective": "enter",
    "signals": [
      "Sells observability tooling",
      "Tata Capital appointed a new CTO in March",
      "Targeting Tata Capital as a prospect"
    ]
  }
```

Every signal traces to the input. The schema tells the model not to invent one, and the enum for
`objective` means "enter" is a legal value and a paragraph is not.

Then the key:

| What changed | Outcome |
|---|---|
| nothing | hit |
| field declaration order | hit — `required[]` is sorted before hashing, so order is normalised away |
| quality floor 7.5 → 9.0 | miss — the floor is folded into the key, so it is a different ask |

That second row is the useful one. Two schemas that differ only in the order their fields were written are
the same schema, and a naive fingerprint would treat them as different and pay for the same work twice.

And the de-duplication:

```
  concurrent calls        5
  dispatches made         1
  reported as cache hits  0
```

The four that piggybacked are reported as **misses**, because that is what they are — they never read a
cache. Reporting them as hits would overstate what the cache did.

## The failure paths are the point too

A live demo that dies in a stack trace demonstrates the opposite of what it is about. Each way this can
fail is named:

| Situation | What it prints | Exit |
|---|---|---|
| no key set | nothing was called and nothing spent; it was not asked to run | 0 |
| key rejected | check which key is set, and that it is current | 2 |
| no credits on the account | a billing state, not a defect in the mechanism | 2 |
| rate limited | wait and run it again | 2 |

Every refusal exits **2 — could not run**, which is never reported as a pass. Nothing was disproved,
because the request never reached a model.

## What this does not prove

The truncation path is not exercised: the demo's payloads are far below the token cap, so
`EnrichmentTruncatedError` — the distinct error class that exists so a caller raises the cap rather than
concluding the input cannot be enriched — never fires here. Neither does the two-attempt retry, because
the first attempt succeeds. The cache is the in-process bounded one; the package states its own limit,
that a multi-process deployment needs a shared adapter, and no such adapter is exercised here. The
ensemble path, which enriches once and returns a canonical serialisation with its hash so N model families
receive byte-identical bytes, is not run.

Costs and latencies vary by provider and model, and the model this defaults to will be superseded.
