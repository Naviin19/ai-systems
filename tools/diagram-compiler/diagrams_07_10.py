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
    """Corrected 13 September. The loop also stops at a cap of five rounds and
    escalates, and the human is an approver of every edit, not only a
    steering call."""
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
    b.append(text(569, 250, "Clean: 10 of 10 pass", SUB_PX, ink="mute", anchor="end"))

    b.append(box(330, 264, 322, 58, "coral", dashed=True))
    b.append(text(491, 287, "Two clean rounds in a row", TITLE_PX, "coral", anchor="middle"))
    b.append(ticks(491 - ticks_width(2) / 2, 294, 2, "coral", h=8, opacity="0.7"))
    b.append(text(491, 316, "The success exit", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))

    b.append(box(28, 264, 280, 58, "gray", dashed=True))
    b.append(text(168, 287, "Or a cap of five rounds", TITLE_PX, "gray", anchor="middle"))
    b.append(ticks(168 - ticks_width(5) / 2, 294, 5, "gray", h=8, opacity="0.7"))
    b.append(text(168, 316, "Whichever comes first", SUB_PX, "gray",
                  anchor="middle", opacity="0.74"))

    b.append(conn(491, 322, 491, 346, "gray", opacity="0.7"))
    b.append(cbox(331, 348, 320, 54, "Status: warm → hot",
                  "Production deploy is a separate human step", "gray"))
    b.append(conn(168, 322, 168, 346, "gray", opacity="0.7"))
    b.append(cbox(28, 348, 280, 54, "Escalate", "A person decides what happens next", "gray"))
    return svg("07", "The hardening loop",
               "Promotion requires a proof of convergence.", "".join(b), 402,
               "The loop ends when two rounds in a row come back clean, or after five "
               "rounds, when it stops and hands the decision to a person. The human is "
               "inside every round twice: first interpreting the failures, then approving "
               "each edit before it is applied, redeployed and re-run.",
               "shipped - agent-11-sugar-trainer.config.ts, hardening-state.ts "
               "(checkTermination), agent-11-steps.md (Q1, Q2)",
               bare=bare)


# ======================================================= 08 - the learning loops
def d08(bare=False):
    """Corrected 13 September. Both lanes end with a person deciding what becomes
    permanent: the convention lane captures automatically but promotes by hand,
    and the decision ledger is a third store, not one both lanes write to."""
    b = [section(M, 96, "Signals the loops read")]
    b.append(box(M, 106, CW, 46, "gray"))
    b.append(text(M + 18, 128, "Telemetry", TITLE_PX, "gray"))
    b.append(text(M + 18, 145, "Gate outcomes · receipts · route-backs · residual margins",
                  SUB_PX, "gray", opacity="0.72"))

    # --- lane A: human-gated
    b.append(section(M, 178, "Amendment lane, human-gated"))
    stages = [("Capture", "learning event"), ("Structure", "dedupe · rank"),
              ("Propose", "a proposal"), ("Apply", "edit + cascade"), ("Verify", "re-scored")]
    xs = [30, 146, 262, 416, 532]
    for (t, s_), x in zip(stages, xs):
        b.append(cbox(x, 210, 102, 52, t, s_, "teal"))
    for a, c in ((132, 146), (248, 262), (364, 368), (412, 416), (518, 532)):
        b.append(conn(a, 236, c - 2, 236, "gray", opacity="0.7"))
    b.append(conn(81, 152, 81, 166, "gray", arrow=False, opacity="0.7"))
    b.append(conn(81, 188, 81, 208, "gray", opacity="0.7"))

    # the gate breaks the rhythm on purpose: taller, in a double-width gap
    b.append(box(368, 190, 44, 92, "coral", dashed=True))
    b.append(text(390, 184, "Human approval", TITLE_PX, "coral", anchor="middle"))
    b.append(text(390, 300, "Loop stops here", SUB_PX, "coral", anchor="middle"))
    b.append(text(390, 316, "Tier-1 changes apply without it", SUB_PX,
                  ink="mute", anchor="middle"))
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
            b.append(text(x + lw / 2, 434, "sorts the inbox", SUB_PX, role,
                          anchor="middle", opacity="0.7"))
        else:
            b.append(cbox(x, 384, lw, 56, t, s_, role, dash))
        if i:
            b.append(conn(x - 16, 412, x - 2, 412, "gray", opacity="0.7"))

    b.append(conn(260, 440, 260, 462, "gray", opacity="0.7"))
    b.append(box(152, 464, 216, 44, "gray", dashed=True))
    b.append(text(260, 485, "run/board/", TITLE_PX, "gray", anchor="middle"))
    b.append(text(260, 501, "Seen once: noted, and it decays", SUB_PX, "gray",
                  anchor="middle", opacity="0.74"))

    b.append(conn(580, 440, 580, 462, "gray", opacity="0.7"))
    b.append(box(452, 464, 200, 44, "coral", dashed=True))
    b.append(text(552, 485, "Retire", TITLE_PX, "coral", anchor="middle"))
    b.append(text(552, 501, "retire-when, on --review", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))

    # --- the separate store the pipeline reads back
    b.append(section(M, 542, "Settled decisions live in a separate ledger"))
    b.append(box(M, 554, CW, 70, "gray"))
    b.append(text(M + 18, 578, "build-log/decision-ledger.jsonl", TITLE_PX, "gray"))
    b.append(text(M + 18, 597, "Append-only, schema-validated. R23 injects matching rows "
                  "into agent context,", SUB_PX, "gray", opacity="0.72"))
    b.append(text(M + 18, 612, "and R24 flags an output that contradicts one, in warn "
                  "mode.", SUB_PX, "gray", opacity="0.72"))
    b.append(text(M, 652, "Verified change re-enters the corpus, plate 02", SUB_PX,
                  ink="mute"))
    return svg("08", "The learning loops",
               "Two loops, and in both a person decides what becomes permanent.",
               "".join(b), 658,
               "A rule that recurs across two sessions is listed as a convention and "
               "promoted by hand; a finding seen once goes to the board and decays. The "
               "amendment lane is a documented protocol with a human approval step. The "
               "decision ledger is a third store, which the pipeline reads back into context.",
               "shipped - capture-rule.mjs, promote.mjs, board.mjs, AGENTS.md, "
               "decision-ledger.jsonl (R23, R24); amendment lane in learning-loop.md",
               bare=bare)


# ======================================================= 09 - the runtime engine
def d09(bare=False):
    b = [section(M, 96, "Request path")]
    b.append(cbox(28, 106, 180, 48, "Session context", "Personalization state", "gray"))
    b.append(cbox(236, 106, 180, 48, "Load estimator", "Tokens and latency", "teal"))
    b.append(cbox(444, 106, 208, 48, "Model router", "Tier by task complexity", "teal"))
    b.append(conn(208, 130, 234, 130, "gray", opacity="0.7"))
    b.append(conn(416, 130, 442, 130, "gray", opacity="0.7"))
    b.append(conn(548, 154, 548, 166, "gray", arrow=False, opacity="0.6"))
    b.append(conn(103, 166, 577, 166, "gray", arrow=False, opacity="0.6"))
    for t, x in zip(["Forensic", "Precision", "Synthesis", "Narrative"],
                    [28, 186, 344, 502]):
        b.append(conn(x + 75, 166, x + 75, 174, "gray", opacity="0.6"))
        b.append(cbox(x, 176, 150, 46, t, None, "teal"))
        b.append(conn(x + 75, 222, x + 75, 236, "gray", arrow=False, opacity="0.6"))
    b.append(conn(103, 236, 577, 236, "gray", arrow=False, opacity="0.6"))
    for cx in (178, 502):
        b.append(conn(cx, 236, cx, 252, "gray", opacity="0.6"))

    b.append(box(28, 254, 300, 84, "teal"))
    b.append(text(46, 278, "LLM gateway", TITLE_PX, "teal"))
    b.append(text(46, 298, "Provider-agnostic dispatch", SUB_PX, "teal", opacity="0.72"))
    b.append(text(46, 314, "Latency profiled per call", SUB_PX, "teal", opacity="0.72"))
    b.append(box(352, 254, 300, 84, "teal"))
    b.append(text(370, 278, "MCP host", TITLE_PX, "teal"))
    b.append(text(634, 278, "6 connectors", SUB_PX, "teal", anchor="end", opacity="0.78"))
    b.append(text(370, 298, "Human Steering · Apify · Apollo", SUB_PX, "teal", opacity="0.72"))
    b.append(text(370, 314, "Google News · SerpAPI · YouTube", SUB_PX, "teal", opacity="0.72"))
    b.append(text(370, 330, "Replayed in CI from fixtures", SUB_PX, "teal", opacity="0.55"))

    for cx in (178, 502):
        b.append(conn(cx, 338, cx, 360, "gray", opacity="0.6"))
    b.append(box(M, 362, CW, 50, "coral", dashed=True))
    b.append(text(M + 18, 385, "Circuit breakers", TITLE_PX, "coral"))
    b.append(text(M + 18, 403, "The build fails if cost drifts past 30% or wall-time "
                  "past 20% of the configured SLA", SUB_PX, "coral", opacity="0.74"))
    b.append(conn(340, 412, 340, 436, "gray", opacity="0.7"))

    b.append(box(M, 438, CW, 50, "gray"))
    b.append(text(M + 18, 460, "Telemetry out", TITLE_PX, "gray"))
    b.append(text(M + 18, 479, "Gate outcomes, given-against-done receipts and residual "
                  "margins return to the loops, plate 08", SUB_PX, "gray", opacity="0.72"))

    b.append(section(M, 516, "What this engine is currently serving"))
    b.append(box(M, 528, CW, 48, "purple"))
    b.append(text(M + 18, 552, "whitespace-hunter.vercel.app", TITLE_PX, "purple"))
    b.append(text(M + CW - 18, 552, "Deployed 2 Sep · DataForSEO · weekly digest via Resend",
                  SUB_PX, "purple", anchor="end", opacity="0.74"))
    return svg("09", "The runtime engine",
               "Production operation with cost governance, not just a build pipeline.",
               "".join(b), 576,
               "Routing is a decision the system makes per task, and cost is a condition "
               "that can stop a run, so both belong in the same grammar as the build-time "
               "gates. The last row is the only claim in this set a reader can settle "
               "without trusting the set: the URL either loads or it does not.",
               "shipped - model-router, llm-gateway, mcp-infra, whitespace-hunter",
               bare=bare)


# ==================================================== 10 - two-lane execution
def d10(bare=False):
    """Corrected 13 September against imagination-protocol v1.1 and the code.
    The lanes are the factory's flag-gated explore branch and the product
    runtime, not strict generation against explore mode; what travels is an
    opaque candidate, not an identifier under a parity check."""
    LX, LW, RX_, RW = M, 292, 360, 292
    b = [section(M, 96, "One capability, two lanes")]
    b.append(text(LX, 116, "Lane A · factory", TITLE_PX, "teal"))
    b.append(text(LX + LW, 116, "default off", SUB_PX, "teal", anchor="end", opacity="0.7"))
    b.append(text(RX_, 116, "Lane B · product", TITLE_PX, "teal"))
    b.append(text(RX_ + RW, 116, "primary", SUB_PX, "teal", anchor="end", opacity="0.7"))

    left = [("Agent 03c, synthesis", "Offers one divergent candidate", "teal", True),
            ("Gate A handoff", "It rides an opaque rider", "gray", False),
            ("A person judges it", "record-divergence-verdict.ts", "gray", False)]
    right = [("K4 playbook", "Authored per product by agent 03b", "teal", False),
             ("reimagine()", "Mints a divergence_id per candidate", "teal", False),
             ("A person judges it", "recordDivergenceVerdict bridge", "gray", False)]
    ys = [130, 220, 346]
    for (t, s_, role, dash), y in zip(left, ys):
        b.append(cbox(LX, y, LW, 56, t, s_, role, dashed=dash))
    for (t, s_, role, dash), y in zip(right, ys):
        b.append(cbox(RX_, y, RW, 56, t, s_, role, dashed=dash))
    # lane A: handoff, then the guard, then the person; lane B runs straight down
    b.append(conn(LX + LW / 2, ys[0] + 56, LX + LW / 2, ys[1] - 2, "gray", opacity="0.65"))
    b.append(conn(LX + LW / 2, ys[1] + 56, LX + LW / 2, 284, "gray", opacity="0.65"))
    b.append(conn(LX + LW / 2, 330, LX + LW / 2, ys[2] - 2, "gray", opacity="0.65"))
    b.append(conn(RX_ + RW / 2, ys[0] + 56, RX_ + RW / 2, ys[1] - 2, "gray", opacity="0.65"))
    b.append(conn(RX_ + RW / 2, ys[1] + 56, RX_ + RW / 2, ys[2] - 2, "gray", opacity="0.65"))

    # the guard on lane A: a rider anywhere else is flagged
    b.append(cbox(LX, 286, LW, 44, "IMAGINATION_GUARD_MODE", "Flags a rider from any other agent",
                  "coral", dashed=True))

    # the lanes do not touch
    b.append(conn(340, 124, 340, 406, "coral", arrow=False, dashed=True, opacity="0.6"))

    b.append(box(M, 430, CW, 76, "gray"))
    b.append(text(M + 18, 454, "The only metric is how many candidates survive a person",
                  TITLE_PX, "gray"))
    b.append(text(M + 18, 474, "Divergence-survival rate, never quality lift. Never run "
                  "live: the flag is off,", SUB_PX, "gray", opacity="0.72"))
    b.append(text(M + 18, 490, "and Lane A widens beyond 03c only after 10 judged "
                  "verdicts. Today: 0.", SUB_PX, "gray", opacity="0.72"))
    return svg("10", "Two-lane execution",
               "Exploration rides beside the contract, never inside it.", "".join(b), 506,
               "Every other plate argues that the system refuses things. This one shows "
               "where it is allowed to explore, and how that is fenced: a candidate travels "
               "as an opaque rider no typed field reads, a guard flags a rider from the "
               "wrong agent, and a person judges each one. The code is shipped; the factory "
               "lane has never been switched on.",
               "shipped - divergence-candidate.ts, runtime-imagination (reimagine), "
               "validate-handoff.ts guard, record-divergence-verdict.ts; never run live, "
               "0 of 10 verdicts",
               bare=bare)


for n, fn in [("07-hardening-loop", d07), ("08-learning-loops", d08),
              ("09-runtime-engine", d09), ("10-two-lane-execution", d10)]:
    emit(n, fn)
