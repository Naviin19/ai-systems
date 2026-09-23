import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *


def cbox(x, y, w, h, title, sub=None, role="teal", dashed=False):
    o = [box(x, y, w, h, role, dashed)]
    cx = x + w / 2
    ty = y + h / 2 + 5 if not sub else y + h / 2 - 3
    o.append(text(cx, ty, title, TITLE_PX, role, anchor="middle"))
    if sub:
        o.append(text(cx, y + h / 2 + 14, sub, SUB_PX, role, anchor="middle",
                      opacity="0.72"))
    return "".join(o)


# ====================================================== 07 - the hardening loop
def d07(bare=False):
    """Redrawn 14 September against the loop as merged in AIS-7 (factory 5739a97).
    After two clean rounds the orchestrator asks the declare-hot question between
    rounds: yes, the default, ends hot; stop ends as human_stop; extend runs one more
    round, twice at most. At the cap the loop ends as max_iterations and nobody is
    asked. Every ending reaches learning-close in one aggregated handoff."""
    b = [section(M, 112, "One hardening round, against staging")]
    steps = [("Playwright ×10", "Against staging", "teal"),
             ("Dedupe", "Collapse failures", "teal"),
             ("Human Q1 · Q2", "Approves each edit", "coral"),
             ("Patch, re-run", "Redeploy, 10× again", "teal")]
    xs = [28, 186, 344, 502]
    for (t, s_, r), x in zip(steps, xs):
        b.append(cbox(x, 170, 150, 60, t, s_, r, dashed=(r == "coral")))
    for i in range(3):
        b.append(conn(xs[i] + 150, 200, xs[i + 1] - 2, 200, "gray", opacity="0.7"))
    b.append(path("M577,170 L577,146 L103,146 L103,168", "gray", opacity="0.7"))
    b.append(text(340, 140, "Next round", SUB_PX, ink="mute", anchor="middle"))

    b.append(conn(577, 230, 577, 262, "gray", opacity="0.7"))
    b.append(text(569, 250, "Clean: all ten runs pass and no failure is left", SUB_PX,
                  ink="mute", anchor="end"))

    # the two conditions the loop counts
    b.append(box(28, 264, 280, 58, "gray"))
    b.append(text(168, 287, "A cap of five rounds", TITLE_PX, "gray", anchor="middle"))
    b.append(ticks(168 - ticks_width(5) / 2, 294, 5, "gray", h=8, opacity="0.7"))
    b.append(text(168, 316, "plus one per extend, two at most", SUB_PX, "gray",
                  anchor="middle", opacity="0.74"))

    b.append(box(330, 264, 322, 58, "coral", dashed=True))
    b.append(text(491, 287, "Two clean rounds in a row", TITLE_PX, "coral", anchor="middle"))
    b.append(ticks(491 - ticks_width(2) / 2, 294, 2, "coral", h=8, opacity="0.7"))
    b.append(text(491, 316, "then the declare-hot question", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))

    # the question, asked by the orchestrator, never by the agent
    b.append(conn(491, 322, 491, 344, "gray", opacity="0.7"))
    b.append(box(330, 346, 322, 50, "coral", dashed=True))
    b.append(text(491, 367, "Declare hot?", TITLE_PX, "coral", anchor="middle"))
    b.append(text(491, 385, "Asked between rounds; the default is yes", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))

    # four endings
    b.append(path("M168,322 L168,406 L124,406 L124,426", "gray", opacity="0.7"))
    b.append(conn(491, 396, 491, 412, "gray", arrow=False, opacity="0.7"))
    b.append(conn(302, 412, 594, 412, "gray", arrow=False, opacity="0.7"))
    for cx in (302, 454, 594):
        b.append(conn(cx, 412, cx, 426, "gray", opacity="0.7"))
    endings = [(28, 192, "max_iterations", "Build-end surfaces it"),
               (232, 140, "yes: hot", "warm → hot"),
               (384, 140, "extend", "One more round"),
               (536, 116, "stop", "human_stop")]
    for x, w, t, s_ in endings:
        b.append(cbox(x, 428, w, 50, t, s_, "gray"))
        b.append(conn(x + w / 2, 478, x + w / 2, 496, "gray", opacity="0.6"))

    b.append(box(M, 498, CW, 50, "teal"))
    b.append(text(M + 18, 519, "The aggregated handoff", TITLE_PX, "teal"))
    b.append(text(M + CW - 18, 519, "to learning-close", SUB_PX, "teal", anchor="end",
                  opacity="0.78"))
    b.append(text(M + 18, 537, "Every round, with termination_reason and hot_reached from "
                  "the loop", SUB_PX, "teal", opacity="0.72"))
    b.append(text(M, 572, "Production deploy after hot stays a separate human step", SUB_PX,
                  ink="mute"))
    return svg("07", "The hardening loop",
               "Promotion requires a proof of convergence.", "".join(b), 576,
               "The loop ends hot when two rounds in a row come back clean and the "
               "declare-hot question, which the orchestrator asks between rounds, is "
               "answered yes, the default. Stop ends it there, and extend runs one more "
               "round, twice at most. At the round cap it ends as max_iterations, which "
               "build-end surfaces. Within a round the agent asks a person twice, through "
               "the steering tool a build enables: to interpret the failures, then to "
               "approve each edit before it is applied, redeployed and re-run.",
               "shipped - agent-11-sugar-trainer.config.ts, hardening-state.ts "
               "(checkTermination, aggregateHardeningPayload), askDeclareHot in "
               "master-agentic-orchestrator.ts, agent-11-steps.md (Q1, Q2)",
               bare=bare)


# ======================================================= 08 - the learning loops
def d08(bare=False):
    """Redrawn 14 September. The build telemetry is stored and no loop reads it yet,
    so nothing flows from it into a lane. The amendment lane's human gate is the only
    route by rule: the tiers that would skip it are not in force (operator ruling,
    14 September). The two-session threshold gates promotion."""
    b = [section(M, 96, "Recorded, and not yet read by either loop")]
    b.append(box(M, 106, CW, 46, "gray", fill=False))
    b.append(text(M + 18, 128, "verification/feedback/feedback.jsonl", TITLE_PX, "gray"))
    b.append(text(M + 18, 145, "Gate outcomes · receipt counts · tokens and wall time · "
                  "craftsmanship margins", SUB_PX, "gray", opacity="0.72"))

    # --- lane A: a documented protocol with a human gate
    b.append(section(M, 178, "Amendment lane, a protocol"))
    stages = [("Capture", "learning event"), ("Structure", "dedupe · rank"),
              ("Propose", "a proposal"), ("Apply", "edit + cascade"), ("Verify", "re-scored")]
    xs = [30, 146, 262, 416, 532]
    for (t, s_), x in zip(stages, xs):
        b.append(cbox(x, 210, 102, 52, t, s_, "teal"))
    for a, c in ((132, 146), (248, 262), (364, 368), (412, 416), (518, 532)):
        b.append(conn(a, 236, c - 2, 236, "gray", opacity="0.7"))

    # the gate breaks the rhythm: taller, in a double-width gap
    b.append(box(368, 190, 44, 92, "coral", dashed=True))
    b.append(text(390, 184, "Human approval", TITLE_PX, "coral", anchor="middle"))
    b.append(text(390, 300, "Loop stops here", SUB_PX, "coral", anchor="middle"))
    b.append(text(390, 316, "Tiers 1 and 2: not in force", SUB_PX, ink="mute",
                  anchor="middle"))
    b.append(path("M583,262 L583,338 L81,338 L81,266", "gray", opacity="0.7"))

    # --- lane B: captured automatically, promoted by a person
    b.append(section(M, 370, "Convention lane: capture is automatic, promotion is not"))
    lane = [("capture-rule.mjs", "Captures directives", "teal", False),
            ("Seen in 2 sessions", None, "coral", True),
            ("promote.mjs", "A person promotes it", "teal", False),
            ("AGENTS.md", "The learned block", "teal", False)]
    lx, lw = M, 144
    for i, (t, s_, role, dash) in enumerate(lane):
        x = lx + i * (lw + 16)
        if i == 1:
            b.append(box(x, 384, lw, 56, role, dashed=True))
            b.append(text(x + lw / 2, 406, t, TITLE_PX, role, anchor="middle"))
            b.append(ticks(x + lw / 2 - ticks_width(2) / 2, 414, 2, role, h=8,
                           opacity="0.7"))
            b.append(text(x + lw / 2, 434, "gates promotion", SUB_PX, role,
                          anchor="middle", opacity="0.7"))
        else:
            b.append(cbox(x, 384, lw, 56, t, s_, role, dash))
        if i:
            b.append(conn(x - 16, 412, x - 2, 412, "gray", opacity="0.7"))

    b.append(conn(260, 440, 260, 462, "gray", opacity="0.7"))
    b.append(box(152, 464, 216, 44, "gray"))
    b.append(text(260, 485, "run/board/", TITLE_PX, "gray", anchor="middle"))
    b.append(text(260, 501, "Seen once; decays when swept", SUB_PX, "gray",
                  anchor="middle", opacity="0.74"))

    b.append(conn(368, 486, 450, 486, "gray"))
    b.append(box(452, 464, 200, 44, "coral", dashed=True))
    b.append(text(552, 485, "Retire", TITLE_PX, "coral", anchor="middle"))
    b.append(text(552, 501, "retire-when, on --review", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))

    # --- the separate store the pipeline reads back
    b.append(section(M, 542, "Settled decisions live in a separate ledger"))
    b.append(box(M, 554, CW, 70, "gray"))
    b.append(text(M + 18, 578, "build-log/decision-ledger.jsonl", TITLE_PX, "gray"))
    b.append(text(M + 18, 598, "Append-only, schema-validated. R23 injects matching rows "
                  "into agent context,", SUB_PX, "gray", opacity="0.72"))
    b.append(text(M + 18, 616, "and R24 flags an output that contradicts one, in warn "
                  "mode.", SUB_PX, "gray", opacity="0.72"))
    b.append(text(M, 652, "Verified change re-enters the corpus, plate 02", SUB_PX,
                  ink="mute"))
    return svg("08", "The learning loops",
               "Two loops, and in both a person decides what becomes permanent.",
               "".join(b), 658,
               "A rule that recurs across two sessions is listed as a convention and "
               "promoted by hand; below that, a person has to give a reason. A finding seen "
               "once goes to the board when a person routes it there, and decays when the "
               "board is swept. The amendment lane is a documented protocol whose human "
               "approval is the only route, because the tiers that would skip it are not in "
               "force. The decision ledger is a third store, which the pipeline reads back "
               "into context.",
               "shipped - capture-rule.mjs, promote.mjs, board.mjs, AGENTS.md, "
               "decision-ledger.jsonl (R23, R24); audited - the amendment lane, a protocol "
               "in learning-loop.md with no implementing code",
               bare=bare)


# ======================================================= 09 - the runtime engine
def d09(bare=False):
    """Redrawn 14 September. The caller names the tier; nothing classifies task
    complexity, and no request carries session context or passes a load estimator.
    The registry's tiers are FORENSIC, SYNTHESIS, NARRATIVE and VISION. No circuit
    breaker stops a run on cost. The product on the gateway is Author, not
    Whitespace Hunter, which uses none of these packages."""
    b = [section(M, 96, "Request path, as the packages implement it")]
    b.append(cbox(28, 106, 292, 48, "Caller", "Names a tier and a call site", "gray"))
    b.append(cbox(360, 106, 292, 48, "Model router", "Resolves a model for the tier", "teal"))
    b.append(conn(320, 130, 358, 130, "gray", opacity="0.7"))
    b.append(conn(506, 154, 506, 166, "gray", arrow=False, opacity="0.6"))
    b.append(conn(103, 166, 577, 166, "gray", arrow=False, opacity="0.6"))
    for t, x in zip(["FORENSIC", "SYNTHESIS", "NARRATIVE", "VISION"], [28, 186, 344, 502]):
        b.append(conn(x + 75, 166, x + 75, 174, "gray", opacity="0.6"))
        b.append(cbox(x, 176, 150, 46, t, None, "teal"))
        b.append(conn(x + 75, 222, x + 75, 236, "gray", arrow=False, opacity="0.6"))
    b.append(conn(103, 236, 577, 236, "gray", arrow=False, opacity="0.6"))
    b.append(conn(178, 236, 178, 252, "gray", opacity="0.6"))

    b.append(box(28, 254, 300, 84, "teal"))
    b.append(text(46, 278, "LLM gateway", TITLE_PX, "teal"))
    b.append(text(46, 298, "Provider-agnostic dispatch", SUB_PX, "teal", opacity="0.72"))
    b.append(text(46, 314, "Latency recorded per call", SUB_PX, "teal", opacity="0.72"))
    b.append(text(46, 330, "Cost cap priced at zero tokens", SUB_PX, "teal", opacity="0.55"))
    b.append(box(352, 254, 300, 84, "teal"))
    b.append(text(370, 278, "MCP host", TITLE_PX, "teal"))
    b.append(text(634, 278, "3 default servers", SUB_PX, "teal", anchor="end", opacity="0.78"))
    b.append(text(370, 298, "Apify · Apollo · Human Steering", SUB_PX, "teal", opacity="0.72"))
    b.append(text(370, 314, "Replayed in CI from recordings", SUB_PX, "teal", opacity="0.72"))
    b.append(text(370, 330, "Off in builds unless enabled", SUB_PX, "teal", opacity="0.55"))

    b.append(box(M, 362, CW, 50, "gray"))
    b.append(text(M + 18, 384, "Cost and latency are measured, not enforced", TITLE_PX, "gray"))
    b.append(text(M + 18, 402, "No cost cap can fire, and the factory's build-end deltas "
                  "only flag", SUB_PX, "gray", opacity="0.72"))

    b.append(section(M, 440, "The product on the gateway"))
    b.append(box(M, 452, CW, 50, "purple"))
    b.append(text(M + 18, 474, "Author", TITLE_PX, "purple"))
    b.append(text(M + CW - 18, 474, "Live", SUB_PX, "purple", anchor="end", opacity="0.78"))
    b.append(text(M + 18, 492, "Its app calls gatewayCall on its own copy of llm-gateway, "
                  "per stage", SUB_PX, "purple", opacity="0.74"))
    b.append(text(M, 526, "Whitespace Hunter uses none of these packages: DataForSEO "
                  "and a weekly cron.", SUB_PX, ink="mute"))
    return svg("09", "The runtime engine",
               "The packages a product runs on, and the product that runs on them.",
               "".join(b), 530,
               "The caller names a tier and a call site; the router resolves a model and "
               "the gateway dispatches it, recording each call's latency. Cost does not "
               "stop a run: the gateway's cap prices a call at zero tokens, and the "
               "factory's build-end token and wall-time comparison only flags. Author's app "
               "is the production caller, on its own copy of the gateway. Whitespace Hunter, "
               "the product with a public URL, uses none of this.",
               "shipped - llm-gateway, model-router and mcp-infra packages; audited - "
               "Author's gateway-client.ts at 833dec6, Whitespace Hunter at 1c0529c",
               bare=bare)


# ==================================================== 10 - two-lane execution
def d10(bare=False):
    """Redrawn 14 September against imagination-protocol v1.1 and the code. The lanes
    run in separate contexts but share one candidate contract and one verdict bridge,
    so the divider is structural, not a wall. The orchestrator strips riders when the
    flag is off, and the guard is a check over written handoffs."""
    LX, LW, RX_, RW = M, 292, 360, 292
    b = [section(M, 96, "One capability, two lanes")]
    b.append(text(LX, 116, "Lane A · factory", TITLE_PX, "teal"))
    b.append(text(LX + LW, 116, "default off", SUB_PX, "teal", anchor="end", opacity="0.7"))
    b.append(text(RX_, 116, "Lane B · product", TITLE_PX, "teal"))
    b.append(text(RX_ + RW, 116, "primary", SUB_PX, "teal", anchor="end", opacity="0.7"))

    left = [("Agent 03c, synthesis", "One candidate, when the flag is on", "teal", True),
            ("Gate A handoff", "It rides an opaque rider", "gray", False),
            ("A person judges it", "record-divergence-verdict.ts", "gray", False)]
    right = [("K4 playbook", "Authored by agent 03b, on opt-in", "teal", False),
             ("reimagine()", "Mints a divergence_id per candidate", "teal", False),
             ("A person judges it", "No candidate applies itself", "gray", False)]
    ys = [130, 220, 346]
    for (t, s_, role, dash), y in zip(left, ys):
        b.append(cbox(LX, y, LW, 56, t, s_, role, dashed=dash))
    for (t, s_, role, dash), y in zip(right, ys):
        b.append(cbox(RX_, y, RW, 56, t, s_, role, dashed=dash))
    b.append(conn(LX + LW / 2, ys[0] + 56, LX + LW / 2, ys[1] - 2, "gray", opacity="0.65"))
    b.append(conn(LX + LW / 2, ys[1] + 56, LX + LW / 2, 284, "gray", opacity="0.65"))
    b.append(conn(LX + LW / 2, 330, LX + LW / 2, ys[2] - 2, "gray", opacity="0.65"))
    b.append(conn(RX_ + RW / 2, ys[0] + 56, RX_ + RW / 2, ys[1] - 2, "gray", opacity="0.65"))
    b.append(conn(RX_ + RW / 2, ys[1] + 56, RX_ + RW / 2, ys[2] - 2, "gray", opacity="0.65"))

    # the guard on lane A: a check over the written handoffs
    b.append(cbox(LX, 286, LW, 44, "IMAGINATION_GUARD_MODE", "Flags a rider from any other agent",
                  "coral", dashed=True))

    # separate execution, shared contract: the divider stops at the shared band
    b.append(conn(340, 124, 340, 402, "gray", arrow=False))
    for cx in (LX + LW / 2, RX_ + RW / 2):
        b.append(conn(cx, 402, cx, 420, "gray", opacity="0.65"))
    b.append(box(M, 422, CW, 46, "teal"))
    b.append(text(M + 18, 443, "Shared by both lanes", TITLE_PX, "teal"))
    b.append(text(M + 18, 460, "One candidate contract, and one verdict bridge: "
                  "recordDivergenceVerdict", SUB_PX, "teal", opacity="0.72"))

    b.append(box(M, 486, CW, 76, "gray"))
    b.append(text(M + 18, 510, "The only metric is how many candidates survive a person",
                  TITLE_PX, "gray"))
    b.append(text(M + 18, 530, "Divergence-survival rate, never quality lift. Never run "
                  "live: the flag is off,", SUB_PX, "gray", opacity="0.72"))
    b.append(text(M + 18, 546, "and no other agent is wired until 10 candidates are "
                  "judged. Last read: 0.", SUB_PX, "gray", opacity="0.72"))
    return svg("10", "Two-lane execution",
               "Exploration rides beside the typed payload, never inside a fidelity field.",
               "".join(b), 562,
               "Every other plate argues that the system refuses things. This one shows "
               "where it is allowed to explore, and how that is fenced: a candidate travels "
               "as an opaque rider that no typed field reads, the orchestrator strips riders "
               "when the flag is off, a check over the written handoffs flags a rider from "
               "the wrong agent, and a person judges each one. The two lanes share one "
               "candidate contract and one verdict path. The code is shipped; the factory "
               "lane has never been switched on.",
               "shipped - divergence-candidate.ts and the envelope rider, applyImaginationFlag, "
               "runtime-imagination (reimagine), validate-handoff.ts guard, "
               "record-divergence-verdict.ts; audited - never run live, 0 of 10 verdicts",
               bare=bare)


for n, fn in [("07-hardening-loop", d07), ("08-learning-loops", d08),
              ("09-runtime-engine", d09), ("10-two-lane-execution", d10)]:
    emit(n, fn)
