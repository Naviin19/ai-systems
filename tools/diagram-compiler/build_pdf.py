import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import OUT_FULL, OUT_BARE, REPO
import re, os, datetime

BARE = OUT_BARE

# num, slug, title, claim, reading (the diagram's own caption), what changed, tiers
FIGS = [
 ("01","01-operating-system","The operating system",
  "A system with a build side and a run side, not a folder of scripts.",
  "The taper is the argument: one corpus of skill files carries the factory that builds "
  "products and the call-site discipline for its model calls. Narrower layers sit above "
  "wider ones, so the compression from the corpus to the products is visible rather than "
  "asserted.",
  "The counts are re-measured and no longer contested: 218 skill files and 33 CI gate ids. "
  "Archer2 is live, and the product band reads four built and one specced.",
  [("audited","218 files, 20 agents, 33 CI gate ids"),("audited","product status, 14 Sep")]),

 ("02","02-knowledge-substrate","The knowledge substrate",
  "Importance in the corpus is measured, and the measurement is checked.",
  "A skill file is a measured hub when twenty or more other skill files cite it, and every "
  "node is drawn at the size of its own count. Three files are declared by hand, so the "
  "Level-0 set is fourteen, and pre-commit checks hold the hubs' names and anchors.",
  "Every node is now sized by its measured count, and the edges are gone, because the "
  "factory records how often a skill is cited, not by whom. The defect edge starts at agent "
  "00's config, and the panel names the checks that catch its class.",
  [("shipped","skill-ref-count.ts, verify-hub-integrity.mjs, audit-hub-citations.mjs"),
   ("audited","13 measured hubs, a set of 14")]),

 ("03","03-compiler-spine","The compiler spine",
  "Orchestration with isolation, not a prompt chain.",
  "Every agent whose dependencies have finished starts at once, up to four, each in its "
  "own git worktree, and results reach trunk one at a time under a file lock. The strip is "
  "the build graph's real twelve waves.",
  "Redrawn from a chain to waves: the scheduler that runs agents together landed after the "
  "plate was drawn. The orchestrator's own start gates now sit beside the nineteen "
  "preflight features.",
  [("shipped","agent-scheduler.ts, merge-lock.ts, review-gate.ts"),
   ("audited","12 waves, at most 2 at once")]),

 ("04","04-contract-spine","The contract spine",
  "One source of truth, and the reach of changing it is computed.",
  "Zod is the source. What is generated is gated in CI, and what is kept by hand is drawn in "
  "coral because it can drift. Each emitted handoff is parsed against its boundary schema, "
  "and the contract compiler checks declared reads by structural subtyping.",
  "Forty-eight contracts generate forty-eight schemas, one to one, so there is no ratio to "
  "draw. contract-compiler.ts is now a blocking CI gate, and the blast-radius frontier is "
  "the widest the registry holds.",
  [("shipped","R22, R31, R32, HandoffEnvelopeSchema"),("audited","48 contracts, 46 hand-kept schemas")]),

 ("05","05-verification-stack","The verification stack",
  "Four outcomes, and a failure retrying can fix is told apart from one it cannot.",
  "Direction encodes outcome: up and to the left returns, down terminates, straight "
  "continues. Evidence is committed when an agent emits. Only the first three checks can "
  "route back, and every later failure halts.",
  "The most corrected plate in the set. It now draws the checks in the order the code runs "
  "them, the evidence commitment at the entrance, and the drift audit after the merge; a "
  "retry also needs a matching error heuristic.",
  [("shipped","route-back.ts, evidence-commitment.ts, semantic-drift.ts, attestation-verifier.ts")]),

 ("06","06-context-residency","Context residency",
  "Budgeting is a measurement, and so is uptake.",
  "What sits inside the window and what waits outside it. Token reduction is a cost claim; "
  "receipts make the harder one, recording what was given against what the agent cited, "
  "and the receipt contract says a citation proves injection, not influence.",
  "The reduction is the recorded one, 196K to 521K down to 7K to 31K tokens per agent, "
  "beside today's loads. A named section now loads only that section.",
  [("shipped","load_skill, skill-sections.ts, receipt.ts"),
   ("audited","the reduction and today's loads, estimated")]),

 ("07","07-hardening-loop","The hardening loop",
  "Promotion requires a proof of convergence.",
  "Two clean rounds in a row lead to the declare-hot question, which the orchestrator asks "
  "between rounds. Yes ends hot, stop ends the loop, extend runs one more round, and the "
  "cap moves with each extension.",
  "The declare-hot question and the stop condition were specified and never built. They are "
  "built now, and the plate draws all four endings and the handoff that carries them.",
  [("shipped","hardening-state.ts, askDeclareHot, agent-11-steps.md")]),

 ("08","08-learning-loops","The learning loops",
  "Two loops, and in both a person decides what becomes permanent.",
  "A rule that recurs across two sessions is promoted by a person, and a finding seen once "
  "decays on the board. The amendment lane's human approval is the only route, and the "
  "decision ledger is a third store the pipeline reads back.",
  "The build telemetry is drawn as stored rather than read, because no loop reads it yet. "
  "The tiers that would skip the human gate are marked not in force, by operator ruling.",
  [("shipped","capture-rule.mjs, promote.mjs, AGENTS.md, decision-ledger.jsonl"),
   ("audited","the amendment lane, a protocol")]),

 ("09","09-runtime-engine","The runtime engine",
  "The packages a product runs on, and the product that runs on them.",
  "The caller names a tier, the router resolves a model and the gateway dispatches it. Cost "
  "does not stop a run. Author's app is the production caller; Whitespace Hunter, the "
  "product with a public URL, uses none of this.",
  "Rebuilt from what exists. Session context, a load estimator, complexity routing and cost "
  "circuit breakers were drawn and do not exist, and the product on the gateway moves from "
  "Whitespace Hunter to Author.",
  [("shipped","llm-gateway, model-router, mcp-infra"),("audited","Author's gateway client")]),

 ("10","10-two-lane-execution","Two-lane execution",
  "The constraint is scoped, not total.",
  "Divergence is allowed in two fenced places: one flag-gated candidate from agent 03c at "
  "gate A, and an opt-in product runtime. Both share one candidate contract and one verdict "
  "path, and a person judges every candidate.",
  "The implementing files are named, and the tier is shipped. What travels is the whole "
  "candidate as an opaque rider, not an identifier under a parity check, and the two lanes "
  "share a contract.",
  [("shipped","divergence-candidate.ts, applyImaginationFlag, validate-handoff.ts"),
   ("audited","never run live")]),
]

CHANGED = [
 ("Skill files","152, contested","218","code"),
 ("CI gates","30 against 19","33 gate ids; 19 preflight features","code"),
 ("Level-0 hubs","11","13 measured, 14 in the set","code"),
 ("Architecture layers","8 or 9","9","code"),
 ("Dispatch","a linear chain","12 waves, at most 2 at once","code"),
 ("Contracts and schemas","19 against 43","48 and 48, one to one","code"),
 ("Verification order","as described","as the code runs it","code"),
 ("Context reduction","about 70%","196K–521K to 7K–31K","commit"),
 ("Hardening exits","clean rounds or a cap","declare hot: yes, extend or stop","code"),
 ("Unapproved learning tiers","described as applying","not in force","ruling"),
 ("Cost governance","circuit breakers","none; deltas that only flag","code"),
 ("MCP connectors","six","three in the default lineup","code"),
 ("Product on the gateway","Whitespace Hunter","Author","code"),
 ("Archer2","dormant","live","Vercel"),
]

GRAMMAR = [
 ("teal","Teal","Platform substrate: layers, stages, checks, lanes"),
 ("purple","Purple","Products, and nothing else"),
 ("coral","Coral","Enforcement: gates, halts, drift-prone surfaces"),
 ("gray","Gray","Structural: frames, origins, inputs, outputs"),
]
FORMS = [
 ("Dashed outline","A gate or boundary condition. Never decorative."),
 ("Unit ticks","A count of agents, stages, rounds or attempts. Ticks reconcile by construction."),
 ("Numeral","A threshold. Drawn as a number so it cannot be mistaken for a reconciling count."),
 ("Direction","On plate 05, outcome. Up and left returns, down terminates, straight continues."),
 ("Taper","Distillation. Narrower layers sit above wider ones."),
 ("Broken rhythm","A deliberate exception. Plate 08's human gate is the case."),
]
TIERS = [
 ("shipped","A named file implements it. Ask to see the file."),
 ("audited","Counted or observed at a named commit, or in a named source on a named date. A count is audited, because no file implements a number."),
 ("contested","Two sources give different values and the conflict is open. Nothing drawn in this set is contested."),
 ("unverified","No traceable source. Nothing unverified is drawn."),
]

STRUCTURE = [
 ("Skill files","218","audited","skills/, per-layer indexes excluded","was 152, contested"),
 ("In a manifest, parked","170, 48","audited","agent configs, retired-skills.json","new"),
 ("Architecture layers","9","audited","architecture_layer in frontmatter","was 8 or 9"),
 ("Agents","20: 15 build, 5 research","audited","configs/agent-*.config.ts","unchanged"),
 ("Build waves","12, at most 2 at once","audited","dependsOn, the scheduler's rule","new"),
 ("CI gate ids","33","audited","verify-all.ts","was 30, contested"),
 ("Preflight features","19","audited","prompts/feature-descriptor.md","were called gates"),
 ("Registered contracts","48, in five tiers","audited","SCHEMA_REGISTRY","was 19, contested"),
 ("Generated JSON Schemas","48","audited","one per registry entry","was 43, contested"),
 ("Per-agent I/O schemas","46","audited","contracts/schemas/agents","new"),
 ("Measured Level-0 hubs","13, in a set of 14","audited","skill-ref-counts.json","was 11"),
 ("Static prompt load","6,926 to 17,684 tokens","audited","token-budget-baseline.json","new"),
]

MECHANISM = [
 ("Dependency-wave dispatch","Starts each agent once its dependencies finish, up to 4","agent-scheduler.ts","shipped"),
 ("Merge serialisation","Rebase, then fast-forward, under .merge.lock","merge-lock.ts","shipped"),
 ("Schema on write","safeParse on each emitted payload","orchestrator","shipped"),
 ("Contract compiler","Declared reads checked by structural subtyping (R31)","contract-compiler.ts","shipped"),
 ("Change impact","Breadth-first over the registry's imports; run by hand","blast-radius.ts","shipped"),
 ("Evidence commitment","SHA-256 when an agent emits, verified before any judge","evidence-commitment.ts","shipped"),
 ("Route-back","3 classes, a matching heuristic, A-B-A cut, 3 attempts","route-back.ts (classifyRouteBack)","shipped"),
 ("Faithfulness judge","Narrative against JSON; warns, blocks at gates A and B","verify-handoff-faithfulness.ts","shipped"),
 ("Semantic drift","Trigram-hash embedder, floor 0.82, enforcing at two baselines","semantic-drift.ts","shipped"),
 ("Step attestation","Re-runs each step's verify; blocking","attestation-verifier.ts","shipped"),
 ("Drift audit","Every declared skill indexed in the prompt; after the merge","drift-audit.ts","shipped"),
 ("Section loading","A numbered or named section, never a silent whole file","skill-sections.ts","shipped"),
 ("Receipts","RECEIPT_GIVEN at dispatch, RECEIPT after the gates","receipt.ts","shipped"),
 ("Hardening termination","Two clean rounds, then declare hot: yes, extend or stop","hardening-state.ts, askDeclareHot","shipped"),
 ("Convention promotion","Two sessions, or a recorded reason, by a person","promote.mjs, AGENTS.md","shipped"),
 ("Decision ledger","Append-only, schema-validated, injected by R23","decision-ledger.jsonl","shipped"),
 ("Amendment lane","A protocol whose human approval is the only tier in force","learning-loop.md","audited"),
 ("LLM gateway","Provider adapters and per-call latency; its cost cap cannot fire","llm-gateway","shipped"),
 ("MCP host","Three default servers, replayed in CI","mcp-infra","shipped"),
 ("Imagination lanes","One flag-gated candidate at gate A; an opt-in product runtime","runtime-imagination, validate-handoff.ts","shipped"),
]

PRODUCTS = [
 ("Ark","A brand book researched and written from a URL","Live; deployed 7 Sep"),
 ("Author","A content playbook compiler, from a brand's URL","Live; deployed 26 Jul"),
 ("Archer2","B2B sales intelligence for a target account","Live; deployed 26 Jul"),
 ("Whitespace Hunter","Runway scoring for emerging categories, at "
  '<span style="white-space:nowrap">whitespace-hunter.vercel.app</span>',"Live since 1 Sep"),
 ("Auteur","AI creative production","Specced"),
]

OUT_OF_SET = [
 ("Residency class counts","12 resident / 60 index / 132 paged",
  "No source, and the counts summed to the wrong total."),
 ("Build-time compression","2-4 weeks against 6-9 months",
  "A comparative claim with no measured baseline on either side."),
 ("Intervention reduction","up to 80% fewer manual interventions",
  "No instrument produces this number. The phrase 'up to' is doing all the work."),
 ("Trend surge magnitudes","18x, +1800%",
  "One run's output from a real tool, not a headline figure."),
 ("Type-check saving","about 6 seconds per dispatch",
  "Not measured, and no plate makes a claim it would support."),
 ("Graded prompt corpus","471","Not re-counted in this audit."),
]

def strip(slug):
    s = open(BARE + slug + '.svg', encoding='utf-8').read()
    st = re.search(r'<style>(.*?)</style>', s, re.S).group(1)
    return re.sub(r'<style>.*?</style>', '', s, flags=re.S), st

plates, shared = [], None
for f in FIGS:
    body, st = strip(f[1]); shared = shared or st
    plates.append(body)

def chips(ts):
    return "".join(f'<span class="chip c-{t}"><b>{t}</b> {s}</span>' for t, s in ts)

plate_pages = "\n".join(f'''
<section class="page plate">
  <p class="eyebrow">Plate {n} of 10</p>
  <h2>{title}</h2>
  <p class="claim">{claim}</p>
  <div class="art">{svg}</div>
  <div class="meta">
    <div><p class="lab">Reading</p><p>{reading}</p></div>
    <div><p class="lab">Changed in this revision</p><p>{note}</p>
         <p class="lab lab2">Evidence</p><div class="chips">{chips(ts)}</div></div>
  </div>
</section>''' for (n, slug, title, claim, reading, note, ts), svg in zip(FIGS, plates))

toc = "".join(f'<li><span class="n">{n}</span><span class="t">{t}</span>'
              f'<span class="c">{c}</span></li>' for n, s, t, c, *_ in FIGS)
changed = "".join(f'<tr><th>{a}</th><td class="was">{b}</td><td class="now">{c}</td>'
                  f'<td class="src">{d}</td></tr>' for a, b, c, d in CHANGED)
gram = "".join(f'<li><span class="sw s-{k}"></span><b>{n}</b>{d}</li>' for k, n, d in GRAMMAR)
forms = "".join(f'<li><b>{n}</b>{d}</li>' for n, d in FORMS)
tiers = "".join(f'<li><span class="chip c-{k}"><b>{k}</b></span><span>{d}</span></li>'
                for k, d in TIERS)
struct = "".join(f'<tr><th>{a}</th><td class="now">{b}</td><td class="tier">{c}</td>'
                 f'<td class="src">{d}</td><td class="was2">{e}</td></tr>'
                 for a, b, c, d, e in STRUCTURE)
mech = "".join(f'<tr><th>{a}</th><td>{b}</td><td class="src">{c}</td>'
               f'<td class="tier">{t}</td></tr>' for a, b, c, t in MECHANISM)
prods = "".join(f'<tr><th>{a}</th><td>{b}</td><td class="tier">{c}</td></tr>'
                for a, b, c in PRODUCTS)
outset = "".join(f'<tr><th>{a}</th><td class="was">{b}</td><td>{c}</td></tr>'
                 for a, b, c in OUT_OF_SET)

today = datetime.date.today().strftime("%B %Y")

HTML = f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>AI operating system — reference set</title>
<style>
:root{{
 --paper:#fdfcfa; --panel:#f5f3ef; --ink:#1a1917; --ink2:#4f4a44; --mute:#7d776f;
 --rule:#e2ded7; --rule2:#cfcabf;
 --teal:#1f6f65; --teal-bg:#e8f5f0; --coral:#a84a30; --coral-bg:#fdeeea;
 --purple:#4a3f8a; --purple-bg:#eeeafa;
 --sans:"Carlito","Liberation Sans",sans-serif;
 --serif:"Lora","Caladea",Georgia,serif;
 --mono:"DejaVu Sans Mono","Liberation Mono",monospace;
}}
@page{{size:A4 portrait;margin:18mm 18mm 20mm}}
*{{box-sizing:border-box}}
html{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
body{{margin:0;background:var(--paper);color:var(--ink);
 font-family:var(--serif);font-size:9.6pt;line-height:1.58}}
h1,h2,h3,.lab,.eyebrow,th,.t,.sw+b,.two b{{font-family:var(--sans)}}
.page{{break-before:page}}
.eyebrow{{font-family:var(--mono);font-size:7pt;letter-spacing:.12em;
 text-transform:uppercase;color:var(--mute);margin:0 0 6mm}}
h1{{font-family:var(--sans);font-size:30pt;line-height:1.04;font-weight:700;
 letter-spacing:-.02em;margin:0 0 6mm;text-wrap:balance}}
h2{{font-size:16pt;font-weight:700;margin:0 0 2mm;letter-spacing:-.01em}}
h3{{font-size:10.5pt;font-weight:700;margin:0 0 2.5mm}}
p{{margin:0 0 3.5mm}}
.stand{{font-size:12pt;line-height:1.5;color:var(--ink2);max-width:125mm}}
.lab{{font-size:7pt;letter-spacing:.11em;text-transform:uppercase;color:var(--mute);
 margin:0 0 1.5mm;font-weight:700}}
.lab2{{margin-top:5mm}}
.rule{{border:0;border-top:1px solid var(--rule);margin:8mm 0}}
.col{{max-width:118mm}}

/* cover */
.cover{{padding-top:22mm}}
.facts{{display:grid;grid-template-columns:1fr 1fr 1.35fr 1.3fr;gap:5mm;margin:10mm 0 0;
 padding-top:5mm;border-top:1px solid var(--rule2);list-style:none}}
.facts li{{font-family:var(--mono);font-size:7.6pt;color:var(--mute);line-height:1.5}}
.facts b{{display:block;font-size:13pt;color:var(--ink);font-weight:400;margin-bottom:1mm}}
.derived{{margin-top:14mm;padding-top:4mm;border-top:1px solid var(--rule)}}
.derived ul{{list-style:none;margin:0;padding:0;display:grid;gap:1.5mm;
 font-family:var(--mono);font-size:8pt;color:var(--ink2)}}
.derived em{{color:var(--mute);font-family:var(--serif);font-size:8.6pt}}

/* tables */
table{{border-collapse:collapse;width:100%;font-size:8.6pt;margin-bottom:2mm}}
.keep{{break-inside:avoid}}
th,td{{text-align:left;padding:1.9mm 3mm 1.9mm 0;border-bottom:1px solid var(--rule);
 vertical-align:top}}
thead th{{font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);
 border-bottom:1px solid var(--rule2);font-weight:700}}
tbody th{{font-weight:400;font-family:var(--sans);width:31%}}
.was{{color:var(--mute);text-decoration:line-through;font-family:var(--mono);font-size:7.6pt}}
.was2{{color:var(--mute);font-size:8pt}}
.now{{font-family:var(--mono);font-size:7.8pt}}
.src{{color:var(--mute);font-family:var(--mono);font-size:7.2pt}}
.tier{{font-family:var(--mono);font-size:7.2pt;color:var(--ink2)}}

/* grammar + tiers */
.two{{display:grid;grid-template-columns:1fr 1fr;gap:10mm}}
.two ul{{list-style:none;margin:0;padding:0;display:grid;gap:2.4mm;font-size:8.8pt}}
.two li{{display:flex;gap:2.5mm;color:var(--ink2);align-items:baseline}}
.two b{{color:var(--ink);font-weight:700;flex:none;min-width:26mm}}
.sw{{width:3.2mm;height:3.2mm;border-radius:.8mm;flex:none;border:.4mm solid;translate:0 .4mm}}
.s-teal{{background:var(--teal-bg);border-color:var(--teal)}}
.s-purple{{background:var(--purple-bg);border-color:var(--purple)}}
.s-coral{{background:var(--coral-bg);border-color:var(--coral)}}
.s-gray{{background:var(--panel);border-color:var(--rule2)}}
.tierlist li{{align-items:baseline;gap:3mm}}
.tierlist .chip{{flex:none}}

.chip{{display:inline-block;font-family:var(--mono);font-size:7pt;padding:.7mm 1.6mm;
 border-radius:.8mm;border:.3mm solid;line-height:1.4}}
.chip b{{font-weight:700;letter-spacing:.02em}}
.c-shipped{{background:var(--teal-bg);border-color:var(--teal);color:var(--teal)}}
.c-audited{{background:var(--panel);border-color:var(--rule2);color:var(--mute)}}
.c-contested{{background:var(--coral-bg);border-color:var(--coral);color:var(--coral)}}
.c-unverified{{background:var(--panel);border-color:var(--coral);color:var(--coral)}}
.chips{{display:flex;flex-wrap:wrap;gap:1.5mm}}

/* contents */
.toc{{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}}
.toc li{{display:grid;grid-template-columns:12mm 46mm 1fr;gap:4mm;padding:2.4mm 0;
 border-bottom:1px solid var(--rule);align-items:baseline}}
.toc .n{{font-family:var(--mono);font-size:7.6pt;color:var(--mute)}}
.toc .t{{font-weight:700;font-size:9.6pt}}
.toc .c{{color:var(--ink2);font-size:8.8pt}}

/* plates */
.plate h2{{margin-bottom:1.5mm}}
.claim{{font-style:italic;color:var(--ink2);font-size:10pt;margin:0 0 6mm;max-width:120mm}}
.art{{background:var(--panel);border:.3mm solid var(--rule);border-radius:1.5mm;
 padding:4mm;margin-bottom:6mm;break-inside:avoid}}
.art svg{{display:block;width:100%;height:auto}}
.art svg text{{font-family:var(--sans)}}
.meta{{display:grid;grid-template-columns:1fr 1fr;gap:9mm;padding-top:4mm;
 border-top:1px solid var(--rule)}}
.meta p{{font-size:8.6pt;line-height:1.5;color:var(--ink2);margin:0}}

.owed ul{{margin:0 0 4mm;padding-left:5mm;display:grid;gap:1.8mm;color:var(--ink2);
 font-size:9pt}}
code{{font-family:var(--mono);font-size:.88em;background:var(--panel);
 padding:.2mm .8mm;border-radius:.6mm}}
.colophon{{margin-top:10mm;padding-top:4mm;border-top:1px solid var(--rule);
 font-size:8.2pt;color:var(--mute);max-width:120mm}}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><style>{shared}</style></svg>

<section class="cover">
  <p class="eyebrow">Reference set · ten plates · re-audited September 2026</p>
  <h1>AI operating system</h1>
  <p class="stand">Ten diagrams, each proving a different claim about the same system.
  Every claim was re-audited against the factory's code on 14 September 2026, and every
  plate was redrawn from the result. Prepared as reference artwork for the public
  <span style="font-family:var(--mono);font-size:.9em">ai-systems</span>
  repository.</p>
  <ul class="facts">
    <li><b>10</b>plates</li><li><b>245</b>claims audited</li>
    <li><b>0</b>figures contested</li><li><b>{today}</b>compiled</li>
  </ul>
  <div class="derived">
    <p class="lab">Derived from</p>
    <ul>
      <li>skill-ecosystem at 5739a97 <em>— the factory, private, read at a named commit</em></li>
      <li>four product repositories <em>— read-only, each at a named commit</em></li>
      <li>Vercel production deployments <em>— product status, 14 September 2026</em></li>
      <li>plans/ais-plate-claims.json <em>— 245 claims, every citation resolved by a script</em></li>
    </ul>
  </div>
  <p class="colophon">Every figure in this set carries its own evidence tier. There is
  no blanket disclaimer, because a single global caveat tells a reader that something
  is unverified without telling them which thing, and nothing on any page can then be
  trusted. The tiers cost more to maintain and are worth it.</p>
</section>

<section class="page">
  <p class="eyebrow">How to read this set</p>
  <h2>Visual grammar</h2>
  <p class="col">The plates form one system. Colour carries meaning and each colour means
  exactly one thing; form carries meaning independently of colour. Where a distinction
  matters, it is drawn as topology rather than hue, so it survives a monochrome print.</p>
  <div class="two">
    <div><p class="lab">Colour</p><ul>{gram}</ul></div>
    <div><p class="lab">Form</p><ul>{forms}</ul></div>
  </div>
  <hr class="rule">
  <h2>Evidence tiers</h2>
  <p class="col">Each plate states what its claim rests on. Nothing is tiered higher than
  its weakest input: a plate whose mechanism is shipped but whose count is audited is
  labelled for both.</p>
  <div class="two" style="grid-template-columns:1fr"><ul class="tierlist">{tiers}</ul></div>
</section>

<section class="page">
  <p class="eyebrow">Contents</p>
  <h2>The ten plates</h2>
  <p class="col">Each plate proves one claim. Where two would prove the same thing, one
  of them is wrong — so the set is not ten views of the architecture, it is ten separate
  arguments about it.</p>
  <ul class="toc">{toc}</ul>
</section>

<section class="page">
  <p class="eyebrow">What changed</p>
  <h2>The re-audit</h2>
  <p class="col">The previous set was drawn from notes and a repository read. On
  14 September every claim it made was checked against the factory's code: of 245 claims,
  98 held, 127 were corrected, 9 were removed and 11 were added. Most rows below are counts
  that were contested and are now measured. The rest are mechanisms the plates drew that
  the code does not have.</p>
  <table class="keep"><thead><tr><th>Figure</th><th>Was</th><th>Now</th><th>From</th></tr></thead>
  <tbody>{changed}</tbody></table>
  <p class="col" style="margin-top:6mm;color:var(--mute);font-size:8.4pt">The audit also
  found defects in the factory itself: a producer agent was handed no prompt the drift
  audit could read, a named skill section loaded the whole file, three connector tools
  called actor paths that do not exist, and agent 11's declare-hot question was specified
  and never asked. Each was fixed, with a check that fails without the fix, before the
  plates were redrawn from the fixed code. Where the code was wrong, the drawing did not
  move to hide it.</p>
</section>

{plate_pages}

<section class="page">
  <p class="eyebrow">Figures and evidence</p>
  <h2>Structure</h2>
  <p class="col">The counts that carry the structural argument, each measured at factory
  commit 5739a97. A count is audited, not shipped, because no file implements a number;
  the audit records how each one was measured.</p>
  <table><thead><tr><th>Figure</th><th>Value</th><th>Tier</th><th>Source</th>
  <th>Changed</th></tr></thead><tbody>{struct}</tbody></table>
  <hr class="rule">
  <h2>Mechanism</h2>
  <p class="col">Every mechanism the set draws and the file that implements it. The
  amendment lane is the one row that is a protocol rather than code.</p>
  <table><thead><tr><th>Mechanism</th><th>What it does</th><th>Implemented in</th><th>Tier</th></tr>
  </thead><tbody>{mech}</tbody></table>
</section>

<section class="page owed">
  <p class="eyebrow">Products and open items</p>
  <h2>Products</h2>
  <p class="col">Built with the factory. Status is audited from each project's Vercel
  production deployments on 14 September 2026; the repositories are private.</p>
  <table class="keep"><thead><tr><th>Product</th><th>What it is</th><th>Status</th></tr>
  </thead><tbody>{prods}</tbody></table>
  <hr class="rule">
  <h2>Not drawn</h2>
  <table><thead><tr><th>Figure</th><th>Previous value</th><th>Why it is out</th></tr>
  </thead><tbody>{outset}</tbody></table>
  <p class="col">One defect is recorded here because it is worth publishing rather than
  despite being embarrassing. <code>agent-00.config.ts</code> cited a section anchor that
  did not exist, so the spec validator — first in the pipeline, the gate every build
  passes through — was handed the literal string <code>[section not found]</code> where
  its constitution should have been. A citation that silently resolves to an error string
  is worse than one that throws, because the pipeline keeps running and everything
  downstream is confidently built on nothing. It was fixed on 12 September, and since
  14 September a citation to a section that does not exist fails in pre-commit and in CI.</p>
  <p class="colophon">The plates are compiled, not drawn. A grammar module holds the
  colour roles, ticks, gates and taper as primitives, and each plate is written in terms
  of those, so a grammar violation is impossible to express rather than something a
  reviewer has to catch. It is the argument plate 04 makes about schemas, applied to the
  artwork. The source and its regeneration instructions are in
  <code>tools/diagram-compiler</code>. The plates are committed as SVG, not raster: they
  render natively on GitHub, appear in diffs, and let a reviewer watch the architecture
  change over time.</p>
</section>
</body></html>'''

open(REPO + '/.build/reference-print.html', 'w', encoding='utf-8', newline='\n').write(HTML)
print('print html written,', len(HTML)//1024, 'KB')
