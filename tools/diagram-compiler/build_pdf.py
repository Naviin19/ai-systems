import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import OUT_FULL, OUT_BARE, REPO
import re, os, datetime

BARE = OUT_BARE

# num, slug, title, claim, reading (the diagram's own caption), what changed, tiers
FIGS = [
 ("01","01-operating-system","The operating system",
  "A system with a build side and a run side, not a folder of scripts.",
  "The taper is the argument: one substrate carries a build side and a run side. "
  "Narrower layers sit above wider ones, so the compression from the corpus to the "
  "products is visible rather than asserted.",
  "A fifth product joined the band. Whitespace Hunter went live on 2 September at a "
  "public URL, which makes it the only claim on this plate a reader can settle without "
  "trusting the plate.",
  [("audited","agent counts"),("contested","152 files, gate count"),
   ("unverified","product status")]),

 ("02","02-knowledge-substrate","The knowledge substrate",
  "A citation graph whose important nodes are computed, not nominated.",
  "A skill file becomes Level-0 by being cited twenty times by other skill files. "
  "Nobody nominates it, and a pre-commit hook gates on the set the graph produces. "
  "Hubs are drawn at equal size because the ranking exists but the per-hub counts were "
  "never recorded.",
  "Redrawn, not corrected. The plate stacked eight named layers, which is a filing "
  "cabinet: it said the corpus was organised, the least interesting true thing about "
  "it. The taxonomy survives as background; the graph is now the subject.",
  [("shipped","skill-ref-count.ts, .husky/pre-commit"),("audited","11 hubs"),
   ("contested","152 files, 8 or 9 layers")]),

 ("03","03-compiler-spine","The compiler spine",
  "Orchestration with isolation, not a prompt chain.",
  "Agents run concurrently in separate git worktrees and contend for the trunk through "
  "a file-lock mutex. Drawn as a linear chain, this was wrong.",
  "Only the gate label moved. feature-descriptor.md reports nineteen preflight gates "
  "and verify-all.ts reports thirty checks; whether that is a superset or a different "
  "object is unresolved, so the plate draws the narrower claim and says why.",
  [("shipped","master-agentic-orchestrator.ts"),("contested","19 against 30")]),

 ("04","04-contract-spine","The contract spine",
  "One source of truth, and the impact of changing it is computed.",
  "A single schema derives every downstream surface. Generated surfaces and "
  "hand-maintained ones are drawn at equal prominence: the drift is labelled rather "
  "than airbrushed.",
  "Nineteen hand-authored contracts are reported to derive forty-three generated "
  "schemas. If that holds it is the compression argument as a number, so it is drawn "
  "as a label rather than as structure until the two counts are reconciled.",
  [("shipped","contract-compiler.ts, blast-radius.ts"),("contested","19 against 43")]),

 ("05","05-verification-stack","The verification stack",
  "Four paths, and the evidence is frozen before any of them is chosen.",
  "Direction encodes outcome: up and to the left returns, down terminates, straight "
  "continues. A failure is classified before it is acted on, so a compiler error is "
  "re-dispatched with its traceback as input while a fabrication halts. The attempt "
  "cap is drawn because a retry loop without a visible ceiling is the thing an "
  "experienced reader is already worried about.",
  "The most consequential correction in this revision. The plate drew two outcomes for "
  "the fortnight after the system grew a third. It also began at the first check, when "
  "the stack actually begins one step earlier: evidence is hash-locked before anything "
  "reads it, so the judge cannot be accused of grading a moving target.",
  [("shipped","EvidenceCommitmentSchema, classifyRouteBack, residual-baseline.ts")]),

 ("06","06-context-residency","Context residency",
  "Budgeting is a measurement, and so is uptake.",
  "What sits inside the window and what waits outside it. Token reduction is a cost "
  "claim; receipts make the harder one, recording what was injected against what the "
  "model actually cited. The industry treats those as the same event.",
  "The efficiency figure is now half the plate rather than all of it. The two receipt "
  "records are drawn as structure rather than as bars, because no measured series has "
  "been recorded and drawing one would be inventing it.",
  [("shipped","PROGRESSIVE_DISCLOSURE, receipt.ts"),("audited","~70% reduction"),
   ("unverified","class counts")]),

 ("07","07-hardening-loop","The hardening loop",
  "Promotion requires a proof of convergence.",
  "The loop has an exit condition rather than an operator's judgement: two clean rounds "
  "in a row, or it keeps going. The human sits inside the loop as a steering call, not "
  "above it as an approver.",
  "Unchanged but for its ticks. The termination condition now draws its two rounds as "
  "unit marks, so the count and the claim cannot drift apart.",
  [("shipped","agent-11-sugar-trainer.config.ts")]),

 ("08","08-learning-loops","The learning loops",
  "Two loops: one a person gates, one that earns its own entries.",
  "A rule reaches permanent context only after it has been observed in two independent "
  "sessions, and it leaves again when its retire condition fires. A memory that only "
  "grows is a memory nobody trusts, so the decay rule is drawn rather than described.",
  "Promoted from designed protocol to shipped code, which is the most valuable kind of "
  "change in this corpus. The convention lane, the promotion threshold and the decay "
  "rule are files, not intentions, and the ledger both lanes write to is append-only.",
  [("shipped","capture-rule.mjs, promote.mjs, AGENTS.md, decision-ledger.jsonl")]),

 ("09","09-runtime-engine","The runtime engine",
  "Production operation with cost governance, not just a build pipeline.",
  "Routing is a decision the system makes per task, and cost is a condition that can "
  "stop a run, so both belong in the same grammar as the build-time gates.",
  "The telemetry that leaves this engine now includes receipts and residual margins, "
  "and the last row names a running service. A URL either loads or it does not, which "
  "makes it the cheapest evidence in the set.",
  [("shipped","model-router, llm-gateway, mcp-infra, whitespace-hunter")]),

 ("10","10-two-lane-execution","Two-lane execution",
  "The constraint is scoped, not total.",
  "Lane 2 is drawn dashed throughout because it is entirely boundary condition, and the "
  "boundary has exactly one opening. What crosses is an identifier under a parity "
  "check, never a payload, so the guarantee is visible as the absence of a second "
  "crossing rather than as a labelled box.",
  "New. Every other plate argues that the system refuses things, which leaves an "
  "unanswered objection: a pipeline this rigid cannot produce anything new. This is "
  "also the least evidenced plate in the set, and its caption says so.",
  [("audited","imagination protocol v1.1, no implementing file named")]),
]

CHANGED = [
 ("Plates","9","10","protocol"),
 ("Verification outcomes","halt or warn","pass, warn, route back, halt","code"),
 ("Where the stack begins","at the first check","at the evidence commitment","code"),
 ("Knowledge substrate","8 named layers","a citation graph, 11 derived hubs","code"),
 ("Context claim","~70% fewer tokens","tokens given against tokens used","code"),
 ("Learning","one human-gated loop","two loops, one of them automatic","code"),
 ("Products","four","five, one at a public URL","code"),
 ("Exploration","absent","plate 10","audit"),
 ("Preflight gates","19","19 or 30, unresolved","contested"),
 ("Architecture layers","8","8 or 9, unresolved","contested"),
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
 ("shipped","A named file or package in the repository implements it. Ask to see the file."),
 ("audited","Counted or observed during a repository read, or confirmed by the author without a named file. Not re-counted from code."),
 ("contested","Two sources give different values and the conflict is unresolved. Treat as unknown, not as an average."),
 ("unverified","No traceable source. Disregard until checked."),
]

STRUCTURE = [
 ("Skill files","152, possibly 164","contested","note; Stage 7 wired 12 parked skills","was 204"),
 ("Architecture layers","8 or 9","contested","note gives 8; the September read gives 9","was 9, unnamed"),
 ("Preflight gates","19","contested","feature-descriptor.md","was 21"),
 ("Verification checks","30","contested","verify-all.ts; relationship to the 19 unknown","absent"),
 ("Typed handoff contracts","19","contested","contracts/CONTRACT_CATALOG.md","absent"),
 ("Generated JSON schemas","43","contested","unified Zod tree","absent"),
 ("Contract families","3","audited","note","absent"),
 ("Build agents","15","audited","note, corroborated twice","was six stages summing to 20"),
 ("Research agents","5, named","audited","note, corroborated twice","absent"),
 ("Total agents","20","audited","two independent sources agree","the one figure drawn bare"),
 ("Level-0 hub skills","11","audited","skills at 20 or more citations","absent"),
 ("Graded prompt corpus","471","audited","residual baseline corpus","absent"),
]

MECHANISM = [
 ("Pipeline topology","Parallel, git-worktree isolated, mutex-gated merge","master-agentic-orchestrator.ts","standing"),
 ("Merge serialisation",".sandboxes/.merge.lock","master-agentic-orchestrator.ts","standing"),
 ("Contract enforcement","Structural subtyping asserted at build time","contract-compiler.ts","standing"),
 ("Change impact","Breadth-first traversal of the contract import graph","blast-radius.ts","standing"),
 ("Runtime prompt surface","Compiled from contracts, not hand-written","agent-12-prompt-manager.config.ts","standing"),
 ("Decode discipline","Constrained decoding via forced emit_handoff","master-agentic-orchestrator.ts","standing"),
 ("Faithfulness judge","Markdown against JSON, temperature 0.2, scored 0-10","verify-handoff-faithfulness.ts","standing"),
 ("Drift embedder","trigram-hash-64-v1, deterministic, zero cost","detect-semantic-drift.ts","standing"),
 ("Drift threshold","0.82 cosine against baseline","detect-semantic-drift.ts","standing"),
 ("Enforcement ladder","disabled, advisory, enforcing","detect-semantic-drift.ts","standing"),
 ("Judge catch rate floor","At least 0.70","measure-judge-catch-rate.ts","standing"),
 ("Judge false reject ceiling","At most 0.10","measure-judge-catch-rate.ts","standing"),
 ("Context reduction","Roughly 70% of system prompt tokens","PROGRESSIVE_DISCLOSURE","standing"),
 ("Hardening round size","10 Playwright runs per round","agent-11-sugar-trainer.config.ts","standing"),
 ("Termination condition","Two consecutive clean rounds","agent-11-sugar-trainer.config.ts","standing"),
 ("Router tiers","Forensic, Precision, Synthesis, Narrative","packages/model-router","standing"),
 ("Cost circuit breaker","Cost drift past 30% of SLA","packages/llm-gateway","standing"),
 ("Wall-time circuit breaker","Wall-time drift past 20% of SLA","packages/llm-gateway","standing"),
 ("MCP connectors","6, named","packages/mcp-infra","standing"),
 ("Market discovery service","Live, public, DataForSEO-backed","whitespace-hunter.vercel.app","1-2 Sep"),
 ("Decision ledger","Append-only JSONL, schema-validated","build-log/decision-ledger.jsonl","1-6 Sep"),
 ("Evidence commitment","SHA-256 hash-lock taken before the judge reads anything","EvidenceCommitmentSchema","1-6 Sep"),
 ("Route-back classifier","Failure traceback re-dispatched as structured input","classifyRouteBack","1-6 Sep"),
 ("Route-back cap","At most 3 attempts, A-B-A oscillation detected","classifyRouteBack","1-6 Sep"),
 ("Given-vs-done receipts","RECEIPT_GIVEN against RECEIPT","receipt.ts","1-6 Sep"),
 ("Residual baseline","score, floor and margin tracked over time","residual-baseline.ts","1-6 Sep"),
 ("Two-lane execution","Lane 1 strict, Lane 2 exploratory, one crossing","imagination protocol v1.1","6-13 Sep"),
 ("Divergence transport","divergence_id under K4 parity check","agent 03c explore mode","6-13 Sep"),
 ("Level-0 hub gate","Commits gated on hub-skill integrity, 20 citations","skill-ref-count.ts, .husky/pre-commit","12 Sep"),
 ("Convention flywheel","Rule promoted after 2 independent sessions","capture-rule.mjs, promote.mjs, AGENTS.md","12 Sep"),
 ("Rule decay","Declarative stale-when and retire-when","convention lane","12 Sep"),
]

OUT_OF_SET = [
 ("Residency class counts","12 resident / 60 index / 132 paged",
  "Sums to 204, which was the wrong total. The three classes survive; the counts do not."),
 ("Product status","Ark live, Author live, Archer2 dormant, Auteur specced",
  "Not corroborated by any source document. Drawn, but plate 01 says so."),
 ("Per-layer file counts","never stated",
  "No source gives a distribution. Plate 02 draws the corpus as a graph rather than as "
  "equal rows, so it implies none."),
 ("Build-time compression","2-4 weeks against 6-9 months",
  "A comparative claim with no measured baseline on either side."),
 ("Intervention reduction","up to 80% fewer manual interventions",
  "No instrument produces this number. The phrase 'up to' is doing all the work."),
 ("Trend surge magnitudes","18x, +1800%",
  "Real outputs of a real tool, presented as headline figures rather than as one run's "
  "result. If used at all they belong to a named query on a named date."),
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
    <div><p class="lab">Changed from the previous set</p><p>{note}</p>
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
               f'<td class="tier">{dte}</td></tr>' for a, b, c, dte in MECHANISM)
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
  <p class="eyebrow">Reference set · ten plates · revised September 2026</p>
  <h1>AI operating system</h1>
  <p class="stand">Ten diagrams, each proving a different claim about the same system.
  Six architecture changes landed in the three weeks before this revision; four plates
  were redrawn and one is new. Prepared as reference artwork for the public
  <span style="font-family:var(--mono);font-size:.9em">ai-systems</span>
  repository.</p>
  <ul class="facts">
    <li><b>10</b>plates</li><li><b>05</b>redrawn or added</li>
    <li><b>04</b>figures contested</li><li><b>{today}</b>compiled</li>
  </ul>
  <div class="derived">
    <p class="lab">Derived from</p>
    <ul>
      <li>ai-systems-brief.md <em>— positioning, visual grammar, corrections table</em></li>
      <li>skill-ecosystem-note.md <em>— architecture inventory and counts</em></li>
      <li>resume-bullets <em>— twelve named engineering mechanisms</em></li>
      <li>the September repository read <em>— six dated upgrades, 23 Aug to 13 Sep</em></li>
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
  its weakest input: a plate whose structure is shipped but whose count is audited is
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
  <h2>Corrections and additions</h2>
  <p class="col">The previous set was compiled before six architecture changes landed
  between 23 August and 13 September. Most of these rows are additions. Two are
  corrections to claims the set was actively making: the verification plate drew two
  outcomes for a fortnight after the system grew a third, and it began the stack at the
  first check when the stack in fact begins one step earlier. The last two rows are
  neither: they are figures that were stated with more confidence than the sources
  support, and they have been demoted rather than quietly picked.</p>
  <table class="keep"><thead><tr><th>Figure</th><th>Was</th><th>Now</th><th>From</th></tr></thead>
  <tbody>{changed}</tbody></table>
  <p class="col" style="margin-top:6mm;color:var(--mute);font-size:8.4pt">Rows sourced
  from <em>code</em> rest on named files. Rows marked <em>contested</em> are the ones
  worth dwelling on: two sources disagree, and the set draws the narrower claim with the
  conflict on the face of the plate rather than averaging them or choosing the more
  impressive. A reader who finds one undeclared conflict stops trusting every other
  number, which is why declaring them costs less than hiding them.</p>
</section>

{plate_pages}

<section class="page">
  <p class="eyebrow">Figures and evidence</p>
  <h2>Structure</h2>
  <p class="col">The counts that carry the structural argument. None has been re-counted
  from code, and six are actively contested between two sources. Author confirmation
  raises a <em>mechanism</em> to shipped when the source names the file that implements
  it, because a file is a thing a reader can be shown. It does not raise a <em>count</em>,
  because a count has no file to point at — only an arithmetic nobody has re-run.</p>
  <table><thead><tr><th>Figure</th><th>Value</th><th>Tier</th><th>Source</th>
  <th>Changed</th></tr></thead><tbody>{struct}</tbody></table>
  <hr class="rule">
  <h2>Mechanism</h2>
  <p class="col">Every mechanism drawn in the set, the file that implements it, and when
  it landed. The dates are part of the evidence: a corpus showing eleven dated changes in
  three weeks is a system under active development, which is a different and better claim
  than a finished portfolio piece.</p>
  <table><thead><tr><th>Figure</th><th>Value</th><th>Source</th><th>Landed</th></tr>
  </thead><tbody>{mech}</tbody></table>
</section>

<section class="page owed">
  <p class="eyebrow">Open items</p>
  <h2>Unverified, and therefore not drawn</h2>
  <table><thead><tr><th>Figure</th><th>Previous value</th><th>Why it is out</th></tr>
  </thead><tbody>{outset}</tbody></table>
  <hr class="rule">
  <h2>Still owed to the repository</h2>
  <p class="col">Contested is the weak rank in this set and audited is the next weakest.
  Twelve figures carry the structural argument and none has been re-counted from code.
  Record the command beside each number, not just the number: a figure with the command
  that produced it is evidence, and a figure without one is a claim.</p>
  <ul>
    <li>Count <code>SKILL.md</code> under the skills tree, against <b>152</b> or <b>164</b>, and state which definition was used</li>
    <li>Read the layer taxonomy in the skill-file standard: is <code>connectors</code> a ninth layer, against <b>8</b> or <b>9</b></li>
    <li>Count gate definitions in the pipeline config, against <b>19</b></li>
    <li>Count checks in <code>verify-all.ts</code>, against <b>30</b>, and settle whether they are a superset of the 19</li>
    <li>Count entries in <code>contracts/CONTRACT_CATALOG.md</code>, against <b>19</b></li>
    <li>Count generated JSON schemas, against <b>43</b>, and confirm they derive from the 19</li>
    <li>Run <code>skill-ref-count.ts --check-level0</code> and record its output verbatim, against <b>11</b></li>
    <li>Count the residual baseline corpus, against <b>471</b></li>
    <li>Run the dual assembly and record what it actually prints, against <b>~70%</b></li>
    <li>Name the file that implements two-lane execution — plate 10 is the only plate resting on a single unnamed source</li>
  </ul>
  <p class="col">One figure is documented but deliberately undrawn: the six-second
  type-check saving per dispatch from incremental <code>tsbuildinfo</code> seeding. No
  plate in this set makes a claim it would support, and a figure without a claim is
  decoration.</p>
  <p class="col">One defect is recorded here because it is worth publishing rather than
  despite being embarrassing. <code>agent-00.config.ts</code> cited a section anchor that
  did not resolve, so the spec validator — first in the pipeline, the gate every build
  passes through — was handed the literal string <code>[section not found]</code> where
  its constitution should have been. A citation that silently resolves to an error string
  is worse than one that throws, because the pipeline keeps running and everything
  downstream is confidently built on nothing. Found by audit rather than by symptom,
  fixed on 12 September, and the Level-0 gate on plate 02 now catches the class.</p>
  <p class="colophon">The plates are compiled, not drawn. A grammar module holds the
  colour roles, ticks, gates and taper as primitives, and each plate is written in terms
  of those, so a grammar violation is impossible to express rather than something a
  reviewer has to catch. It is the argument plate 04 makes about schemas, applied to the
  artwork. Source and regeneration instructions ship beside the SVGs in
  <code>diagrams/_src</code>. Committed as SVG, not raster: it renders natively on
  GitHub, appears in diffs, and lets a reviewer watch the architecture change over time.</p>
</section>
</body></html>'''

open(REPO + '/.build/reference-print.html', 'w', encoding='utf-8', newline='\n').write(HTML)
print('print html written,', len(HTML)//1024, 'KB')
