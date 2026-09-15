import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *

# ===================================================== 04 - the contract spine
def d04(bare=False):
    """Redrawn 14 September against the factory at 5739a97. The registry and its
    catalog are generated and gated (R32), and contract-compiler.ts is a blocking CI
    gate (R31) that checks declared consumer reads by structural subtyping. It does not
    run at dispatch: what runs at each boundary during a build is schema on write. The
    blast-radius frontier is the largest one the registry holds, not an illustration."""
    b = [section(M, 96, "One source, written by hand")]
    b.append(box(M, 106, CW, 56, "teal"))
    b.append(text(M + 18, 130, "contracts/types", TITLE_PX, "teal"))
    b.append(text(M + 18, 149, "52 Zod source files; the registry sorts them into five tiers",
                  SUB_PX, "teal", opacity="0.74"))
    b.append(text(M + CW - 18, 130, "48 in SCHEMA_REGISTRY", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(conn(340, 162, 340, 184, "gray", opacity="0.6"))

    b.append(box(150, 186, 380, 48, "coral", dashed=True))
    b.append(text(340, 206, "generate-json-schemas.ts", TITLE_PX, "coral", anchor="middle"))
    b.append(text(340, 223, "Regenerated and deep-diffed by R22, blocking in CI",
                  SUB_PX, "coral", anchor="middle", opacity="0.74"))
    b.append(conn(340, 236, 340, 256, "gray", opacity="0.6"))

    b.append(section(M, 272, "What the source reaches"))
    surfaces = [("JSON Schema",           "48 generated, drift blocks CI",                  "teal"),
                ("TypeScript types",      "Inferred from the source, typechecked in CI",    "teal"),
                ("Contract examples",     "27 checked with safeParse on every verify-all",  "teal"),
                ("Registry and catalog",  "Generated; R32 fails when either is stale",      "teal"),
                ("Per-agent I/O schemas", "46 hand-kept JSON files",                        "coral"),
                ("Database columns",      "Hand-written migrations, parity advisory",       "coral")]
    y = 282
    for name, mech, role in surfaces:
        b.append(box(M, y, CW, 32, role))
        b.append(text(M + 18, y + 21, name, TITLE_PX, role))
        b.append(text(M + CW - 18, y + 21, mech, SUB_PX, role, anchor="end", opacity="0.74"))
        y += 38
    b.append(swatch(M, y + 12, "Generated or gated in CI", "teal"))
    b.append(swatch(M + 250, y + 12, "Kept by hand, can drift", "coral"))

    y += 36
    b.append(section(M, y, "At the agent boundary, and before any build"))
    by = y + 10
    b.append(box(M, by, 300, 62, "coral", dashed=True))
    b.append(text(M + 16, by + 22, "HandoffEnvelopeSchema", TITLE_PX, "coral"))
    b.append(text(M + 16, by + 40, "safeParse on each emitted payload,", SUB_PX, "coral",
                  opacity="0.74"))
    b.append(text(M + 16, by + 55, "before anything downstream reads it", SUB_PX, "coral",
                  opacity="0.74"))
    b.append(box(M + 324, by, 300, 62, "coral", dashed=True))
    b.append(text(M + 340, by + 22, "contract-compiler.ts · R31", TITLE_PX, "coral"))
    b.append(text(M + 340, by + 40, "Consumer reads checked by subtyping", SUB_PX, "coral",
                  opacity="0.74"))
    b.append(text(M + 340, by + 55, "on 23 edges, blocking in CI", SUB_PX, "coral",
                  opacity="0.74"))

    y = by + 88
    b.append(section(M, y, "Change impact"))
    b.append(box(M, y + 10, CW, 56, "teal"))
    b.append(text(M + 18, y + 33, "blast-radius.ts", TITLE_PX, "teal"))
    b.append(text(M + 18, y + 51, "Walks 48 schemas and 32 traced prompts; run by hand",
                  SUB_PX, "teal", opacity="0.72"))
    # the widest reach the generated registry holds: one schema, five importers
    fx, fy = M + CW - 120, y + 38
    reach = [(fx + 60, fy - 20 + k * 10) for k in range(5)]
    for rx, ry in reach:
        b.append(hair(fx + 3, fy, rx - 3, ry, "teal", "0.3"))
        b.append(dot(rx, ry, 2.8, "teal", "0.6"))
    b.append(dot(fx, fy, 2.8, "teal", "0.6"))
    end = y + 66

    return svg("04", "The contract spine",
               "Zod is the source: what is generated is gated, what is hand-kept is marked.",
               "".join(b), end,
               "JSON Schema, the contract registry and its catalog are generated from the Zod "
               "source, and CI blocks on any difference; types come from the same source by "
               "inference. What is kept by hand is drawn in coral because it can drift. Each "
               "emitted handoff is parsed against its boundary schema, and in CI "
               "contract-compiler.ts checks each consumer's declared reads against its "
               "producer's schema; five of its twenty-three edges declare typed reads so far. "
               "The frontier beside blast-radius.ts is the widest the registry holds: one "
               "schema with five importers.",
               "shipped - generate-json-schemas.ts and contracts-vs-json-schema.ts (R22), "
               "generate-registry.ts (R32), contract-compiler.ts and edge-registry.ts (R31), "
               "HandoffEnvelopeSchema; blast-radius.ts run by hand",
               bare=bare)


# =================================================== 05 - the verification stack
def d05(bare=False):
    """Redrawn 14 September against the orchestrator's per-agent path, in the order
    the code runs it. Direction encodes outcome: up and left returns, down terminates,
    straight continues. Only failures inside the route-back loop are classified; every
    later failure halts, and the drift audit runs after the merge.

    Nothing is placed above y=96, because the print build crops the plate to its
    artwork and anything higher is silently lost."""
    SX, SW = 64, 380
    CX = SX + SW / 2
    BX, BW = 470, 182                           # the failure column
    RX = BX + BW / 2
    b = []

    # the return path, drawn first so everything else sits over it
    b.append(text(300, 100, "Re-dispatched to the same agent with the failure as ROLLBACK_CONTEXT",
                  SUB_PX, "coral", anchor="middle", opacity="0.8"))
    b.append(path(f"M{RX},196 L{RX},110 L40,110 L40,134 L{SX - 4},134", "coral",
                  opacity="0.85"))

    b.append(labelled_box(SX, 118, SW, 32, "Agent output", None, "gray", pad=18,
                          right="emit_handoff, or an emit script"))
    b.append(conn(CX, 150, CX, 158, "gray", opacity="0.6"))
    b.append(labelled_box(SX, 160, SW, 28, "Evidence committed", None, "coral", pad=18,
                          right="SHA-256, before any gate", dashed=True))
    b.append(conn(CX, 188, CX, 194, "gray", opacity="0.6"))

    layers = [("Quality gates",      "Per-agent commands, such as tsc",           "routes back",       "teal"),
              ("Schema on write",    "HandoffEnvelopeSchema.safeParse",           "routes back",       "teal"),
              ("D3 absorption",      "When absorption is declared",               "routes back",       "teal"),
              ("Commitment verified", "The evidence has not moved",               "halts on mismatch", "teal"),
              ("Faithfulness judge", "Markdown against JSON, 0 to 10",            "warns; halts at A, B", "teal"),
              ("R24, drift, release gate", "Contradictions, semantic drift, release", "warn or halt", "teal"),
              ("Step attestation",   "Re-runs each step's verify against the claim", "halts",          "teal")]
    y, mids = 196, []
    for name, sub, level, role in layers:
        b.append(labelled_box(SX, y, SW, 36, name, sub, role, right=level))
        mids.append(y + 18)
        if y > 196:
            b.append(conn(CX, y - 6, CX, y - 1, "gray", opacity="0.6"))
        y += 42
    b.append(conn(CX, y - 6, CX, y - 1, "gray", opacity="0.6"))
    b.append(labelled_box(SX, y, SW, 30, "Merged to trunk", None, "gray", pad=18,
                          right="under .merge.lock"))
    y += 36
    b.append(conn(CX, y - 6, CX, y - 1, "gray", opacity="0.6"))
    b.append(labelled_box(SX, y, SW, 36, "Drift audit", "Every declared skill indexed in the prompt",
                          "teal", right="halts, after the merge"))
    mids.append(y + 18)
    spine_end = y + 36

    # route back: the first three layers collect into the classifier
    for i in (0, 1, 2):
        b.append(conn(SX + SW, mids[i], 452, mids[i], "coral", arrow=False, opacity="0.75"))
    b.append(conn(452, mids[0], 452, mids[2], "coral", arrow=False, opacity="0.6"))
    b.append(conn(452, mids[1], BX - 2, mids[1], "coral", opacity="0.8"))

    b.append(box(BX, 196, BW, 120, "coral", dashed=True))
    b.append(text(RX, 218, "classifyRouteBack", TITLE_PX, "coral", anchor="middle"))
    b.append(text(RX, 236, "3 retryable classes", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))
    b.append(text(RX, 252, "A-B-A oscillation cut", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))
    b.append(ticks(RX - ticks_width(3) / 2, 261, 3, "coral", h=8, opacity="0.7"))
    b.append(text(RX, 286, "3 attempts in all", SUB_PX, "coral", anchor="middle",
                  opacity="0.74"))
    b.append(text(RX, 303, "needs an error heuristic", SUB_PX, "coral", anchor="middle",
                  opacity="0.6"))

    # halt: the classifier gives up, or a later layer fails
    rail = spine_end + 16
    b.append(conn(RX, 316, RX, rail - 6, "coral", opacity="0.8"))
    for i in (3, 6, 7):
        b.append(conn(SX + SW, mids[i], 460, mids[i], "coral", arrow=False, opacity="0.75"))
    for i in (4, 5):
        b.append(conn(SX + SW, mids[i], 460, mids[i], "coral", arrow=False, dashed=True,
                      opacity="0.65"))
    b.append(conn(460, mids[3], 460, rail + 5, "coral", arrow=False, opacity="0.6"))
    b.append(conn(460, rail + 5, BX - 2, rail + 5, "coral", opacity="0.8"))
    b.append(f'<rect x="{BX}" y="{rail}" width="{BW}" height="10" rx="5" '
             f'fill="{L("coral","f")}" stroke="{L("coral","s")}" stroke-width="0.5" '
             f'class="coral-f"/>')
    b.append(text(RX, rail + 32, "Run halts", TITLE_PX, "coral", anchor="middle"))
    b.append(text(RX, rail + 49, "No new agents start", SUB_PX, "coral", anchor="middle",
                  opacity="0.74"))
    b.append(text(RX, rail + 65, "Earlier merges stand", SUB_PX, "coral", anchor="middle",
                  opacity="0.6"))

    # warn: the judge and the checks after it, by default, turn and rejoin the spine
    rejoin = mids[5] + 21
    b.append(conn(SX, mids[4], 48, mids[4], "coral", arrow=False, opacity="0.8"))
    b.append(conn(SX, mids[5], 48, mids[5], "coral", arrow=False, opacity="0.8"))
    b.append(path(f"M48,{mids[4]} L48,{rejoin} L{SX - 2},{rejoin}", "coral", opacity="0.8"))

    ly = spine_end + 32
    for dy, label in ((0, "Route back: the failure is the next input, 3 attempts"),
                      (19, "Warn: recorded, and the run continues")):
        b.append(f'<line x1="{M + 2}" y1="{ly + dy - 4}" x2="{M + 13}" y2="{ly + dy - 4}" '
                 f'stroke="{L("coral","s")}" stroke-width="1.5" '
                 f'marker-end="url(#ar-coral)" class="coral-o"/>')
        b.append(text(M + 21, ly + dy, label, SUB_PX, ink="mute"))
    b.append(swatch(M, ly + 39, "Halt: no new agents start", "coral"))

    cy = rail + 92
    for x, title, lines in (
            (M, "Two judges, both calibrated",
             ("Faithfulness: 10 of 10 blocked", "Cross-family, opt-in: 11 of 12",
              "No clean handoff rejected, 14 Sep")),
            (346, "Drift is lexical, per agent",
             ("Trigram-hash embedder, floor 0.82", "Halts once two baselines exist",
              "Only agent 12 has two today"))):
        b.append(box(x, cy, 306, 86, "gray"))
        b.append(text(x + 16, cy + 23, title, TITLE_PX, "gray"))
        for k, line in enumerate(lines):
            b.append(text(x + 16, cy + 42 + k * 16, line, SUB_PX, "gray", opacity="0.72"))

    return svg("05", "The verification stack",
               "Four outcomes; only a failure inside the route-back loop is classified.",
               "".join(b), cy + 86,
               "Direction encodes outcome: up and to the left returns, down terminates, "
               "straight continues. Evidence is committed when an agent emits and verified "
               "before any judge reads it; a producer's handoff is committed when the "
               "orchestrator first sees it. Three failure classes route back with the failure "
               "as the next input, three attempts in all, when an error heuristic matches: a "
               "quality gate such as tsc, schema on write, and D3. Every later failure halts, "
               "the drift audit after the agent's work has merged, and the faithfulness judge "
               "warns except at the two human gates.",
               "shipped - master-agentic-orchestrator.ts, route-back.ts, evidence-commitment.ts, "
               "post-emit-checks.ts, semantic-drift.ts, attestation-verifier.ts, drift-audit.ts; "
               "calibration runs of 13 and 14 Sep",
               bare=bare)


# ======================================================= 06 - context residency
def d06(bare=False):
    """Redrawn 14 September. The reduction is the recorded one (196K-521K to 7K-31K
    tokens per agent, commit f0e35c1), beside today's estimated loads. A named section
    now loads only that section (AIS7-6). Receipts record index entries and characters,
    not sections and tokens."""
    b = [section(M, 96, "Context window"), section(388, 96, "Skill corpus on disk")]
    FX, FW, FY, FH = M, 320, 106, 296
    b.append(box(FX, FY, FW, FH, "gray", dashed=True, r=8, fill=False))

    b.append(text(FX + 24, 130, "Full inlining: 196K to 521K tokens", SUB_PX, ink="mute"))
    b.append(text(FX + 24, 150, "Kernel and index: 7K to 31K tokens", TITLE_PX, ink="mute"))
    b.append(text(FX + 24, 168, "Per agent, estimated, 1 June 2026", SUB_PX, ink="mute"))
    b.append(text(FX + 24, 186, "Today 6.9K to 17.7K, estimated 14 Sep", SUB_PX, ink="mute"))

    for y, name, sub, role in [
            (200, "Agent kernel",               "Inlined into every assembled prompt", "teal"),
            (256, "Skill citation index",       "One @skill line and its description", "teal"),
            (312, "load_skill(file, §section)", "A numbered or named section",         "gray")]:
        b.append(labelled_box(FX + 16, y, FW - 32, 48, name, sub, role))
    b.append(text(FX + 24, 386, "Also resident: step plan and lessons", SUB_PX, ink="mute"))

    GX, GY, cols = 388, 112, 20
    for i in range(218):
        b.append(f'<rect x="{GX + (i % cols) * 13}" y="{GY + (i // cols) * 13}" '
                 f'width="7" height="9" rx="1.5" fill="{L("gray","s")}" '
                 f'opacity="0.45" class="gray-f"/>')
    b.append(text(GX, GY + 166, "218 files", TITLE_PX, "gray"))
    b.append(text(GX, GY + 184, "Paged in on demand, except the kernel", SUB_PX, "gray",
                  opacity="0.72"))

    b.append(path(f"M{GX - 8},{GY + 60} L{GX - 32},{GY + 60} L{GX - 32},336 "
                  f"L{FX + FW - 12},336", "teal", opacity="0.8"))

    # given against done: the structure, not a fabricated series
    y2 = FY + FH + 32
    b.append(section(M, y2, "Given against done"))
    b.append(box(M, y2 + 12, 296, 78, "teal"))
    b.append(text(M + 16, y2 + 36, "RECEIPT_GIVEN", TITLE_PX, "teal"))
    b.append(text(M + 16, y2 + 56, "agent · index entries · prompt chars",
                  SUB_PX, "teal", opacity="0.74"))
    b.append(text(M + 16, y2 + 72, "Emitted at dispatch, before the call",
                  SUB_PX, "teal", opacity="0.6"))

    b.append(box(356, y2 + 12, 296, 78, "teal"))
    b.append(text(372, y2 + 36, "RECEIPT", TITLE_PX, "teal"))
    b.append(text(372, y2 + 56, "given · loaded · cited · gate verdicts",
                  SUB_PX, "teal", opacity="0.74"))
    b.append(text(372, y2 + 72, "Built after the human gates",
                  SUB_PX, "teal", opacity="0.6"))

    b.append(conn(176, y2 + 90, 176, y2 + 108, "gray", arrow=False, opacity="0.6"))
    b.append(conn(504, y2 + 90, 504, y2 + 108, "gray", arrow=False, opacity="0.6"))
    b.append(conn(176, y2 + 108, 504, y2 + 108, "gray", arrow=False, opacity="0.6"))
    b.append(conn(340, y2 + 108, 340, y2 + 124, "gray", opacity="0.6"))

    b.append(box(130, y2 + 126, 420, 56, "coral", dashed=True))
    b.append(text(340, y2 + 150, "given_not_cited", TITLE_PX, "coral", anchor="middle"))
    b.append(text(340, y2 + 168, "In the index and never cited; it may still have loaded",
                  SUB_PX, "coral", anchor="middle", opacity="0.74"))
    b.append(text(M, y2 + 206, "A citation proves injection, not influence.", TITLE_PX,
                  ink="mute"))

    return svg("06", "Context residency",
               "Budgeting is a measurement, and so is uptake.", "".join(b), y2 + 210,
               "Skill files are cited, not inlined: an agent the orchestrator dispatches "
               "carries the kernel and a one-line index, and fetches a numbered or named "
               "section when a step needs it. A producer is handed its playbook instead, "
               "which carries its citations but not the kernel. Receipts record what was "
               "given at dispatch against what the agent cited, and the receipt contract "
               "states what that cannot show: a citation proves injection, not influence.",
               "shipped - PROGRESSIVE_DISCLOSURE and load_skill (master-agentic-orchestrator.ts), "
               "skill-sections.ts, receipt.ts; audited - the recorded reduction (f0e35c1) and "
               "today's loads, estimate mode",
               bare=bare)


for n, fn in [("04-contract-spine", d04), ("05-verification-stack", d05),
              ("06-context-residency", d06)]:
    emit(n, fn)
