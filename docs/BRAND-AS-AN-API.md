# Brand as an API

**Making brand understanding something every system can call.**

I've built three products that depend on each other. [Ark](https://ark-now.vercel.app) takes a
company's URL and returns a brand book. [Author](https://author-now.vercel.app) takes that brand
book and compiles a multi-channel content playbook. [Archer](https://archer2.vercel.app) uses the
same brand understanding to prepare sales intelligence for a target account.

That is the idea. A brand should work like an API: one source of understanding that every campaign,
page, pitch and agent calls.

---

## An API has two halves

Every API has an interface — what callers can ask for, and in what shape — and an implementation
that works out the answer. A brand API has both.

**The interface is the brand book, as a typed object.** Ark produces it. Author and Archer consume
it. Neither re-derives the brand; both read fields they can rely on. The brand book stops being an
output and becomes an input.

**The implementation is marketing science, as a graph.** Marketing has plenty of theory: Sharp,
Ehrenberg-Bass, Romaniuk, Binet and Field, Ritson, decades of evidence about how brands grow. What
it lacks is a way to make that evidence execute, applied the same way every time, with the work
checked against it.

The two halves answer different questions. The graph knows how brands grow in general. The brand
book knows what is true of this brand.

## Behind the interface: a graph, because the knowledge is relational

Marketing knowledge is a network. A claim means something only with evidence behind it. A mechanism
explains why a framework works. In places the canon disagrees with itself. A document can describe
these relationships, but it can't be asked for them. Ask a PDF "what supports this claim, and what
contradicts it?" and the only answer is: read it again and decide.

So the implementation is a knowledge graph, built from close reading of about 85 sources and
anchored on the evidence-based canon. When two relationships conflict, constructs from that canon
win.

It has five node types: concepts, mechanisms, frameworks, case studies and tensions. A tension is a
place where the canon disagrees with itself, and it is recorded as its own object.

It has thirteen edge types, and the list is closed:

```
supports · contradicts · prerequisite · measures · exemplifies · refines · complements
part_of · causes · mechanism_of · alternative_to · equivalent_to · subtype_of
```

Closed matters for the same reason an API's schema is fixed. Let every caller invent fields and
within a month the same relationship exists under four names, and none of them can be counted.
Adding an edge type means capturing it through the learning loop, amending the skill that defines
it, and showing dry-run evidence.

Nobody can hand-maintain thousands of relationships across 85 sources, so five agents build it: a
reader, a graph-builder, a synthesiser, and a builder and a validator for the layer the products
read from. Together they extract each source's constructs, decide which relationships hold, and
write nodes and edges that must pass a schema. Retrieval would find a passage again. This builds
structure the system can reason over.

On top of the graph sit eleven library layers, curated views that give each consumer only the slice
it needs, the way an API exposes endpoints and keeps its database behind them. Six methodology specs
govern the decision logic at runtime.

## Why this generalises

Nothing here is specific to marketing except the canon.

The pattern fits any field where expertise is written down, relational, and applied unevenly: a
closed vocabulary of relationships, agents that build structure from the literature, a typed
contract downstream systems read in place of prose, and gates that encode what a senior practitioner
checks without noticing. Clinical guidelines. Engineering standards. Case law, where a precedent
means little until you know what it overruled.
