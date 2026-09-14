import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *

# ===================================================== 04 - the contract spine
def d04(bare=False):
    """Corrected 13 September. The previous plate drew contract-compiler.ts
    asserting structural subtyping at every boundary before execution, and
    TypeScript types as generated. The compiler checks field names on fourteen
    legacy edges and runs only under npm test; types are inferred from Zod.
    What is generated and gated is JSON Schema, and the boundary is enforced
    when an agent emits."""
    b = [section(M, 96, "One source, written by hand")]
    b.append(box(M, 106, CW, 56, "teal"))
    b.append(text(M + 18, 130, "contracts/types", TITLE_PX, "teal"))
    b.append(text(M + 18, 149, "52 Zod source files in six families", SUB_PX, "teal",
                  opacity="0.74"))
    b.append(text(M + CW - 18, 130, "48 in SCHEMA_REGISTRY", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(conn(340, 162, 340, 184, "gray", opacity="0.6"))

    b.append(box(150, 186, 380, 48, "coral", dashed=True))
    b.append(text(340, 206, "generate-json-schemas.ts", TITLE_PX, "coral", anchor="middle"))
    b.append(text(340, 223, "Regenerated and deep-diffed by R22, blocking in CI",
                  SUB_PX, "coral", anchor="middle", opacity="0.74"))
    b.append(conn(340, 236, 340, 256, "gray", opacity="0.6"))

    b.append(section(M, 272, "What the source reaches"))
    surfaces = [("JSON Schema",           "48 generated, drift blocks CI",               "teal"),
                ("TypeScript types",      "Inferred from the source, typechecked in CI", "teal"),
                ("Contract examples",     "26 validated on every verify-all run",        "teal"),
                ("Per-agent I/O schemas", "46 hand-authored JSON files",                 "coral"),
                ("Database columns",      "Hand-written migrations, parity advisory",    "coral")]
    y = 282
    for name, mech, role in surfaces:
        b.append(box(M, y, CW, 34, role))
        b.append(text(M + 18, y + 22, name, TITLE_PX, role))
        b.append(text(M + CW - 18, y + 22, mech, SUB_PX, role, anchor="end", opacity="0.74"))
        y += 40
    b.append(swatch(M, y + 22, "Generated or gated in CI", "teal"))
    b.append(swatch(M + 250, y + 22, "Kept by hand, can drift", "coral"))

    y += 46
    b.append(section(M, y + 14, "At the agent boundary"))
    b.append(box(M, y + 24, CW, 54, "coral", dashed=True))
    b.append(text(M + 18, y + 46, "emit_handoff, then HandoffEnvelopeSchema", TITLE_PX, "coral"))
    b.append(text(M + 18, y + 64, "A forced tool call, then safeParse on every agent's output",
                  SUB_PX, "coral", opacity="0.74"))

    y += 94
    b.append(section(M, y, "Change impact"))
    b.append(box(M, y + 10, CW, 60, "teal"))
    b.append(text(M + 18, y + 34, "blast-radius.ts", TITLE_PX, "teal"))
    b.append(text(M + 18, y + 52, "Import-graph walk, 22 registered schemas, run by hand",
                  SUB_PX, "teal", opacity="0.72"))
    frontier, bx = [1, 3, 7], M + CW - 150
    pts = []
    for col, n in enumerate(frontier):
        cx = bx + col * 46
        pts.append([(cx, y + 40 - (n - 1) * 4 + k * 8) for k in range(n)])
    for col in range(2):
        for a in pts[col]:
            for c in pts[col + 1]:
                b.append(hair(a[0] + 3, a[1], c[0] - 3, c[1], "teal", "0.22"))
    for col in pts:
        for cx, cy in col:
            b.append(dot(cx, cy, 2.8, "teal", "0.6"))
    end = y + 70

    return svg("04", "The contract spine",
               "Zod is the source: what is generated is gated, what is hand-kept is marked.",
               "".join(b), end,
               "JSON Schema is regenerated from the Zod source and CI blocks on any "
               "difference; types come from the same source by inference. What is kept by "
               "hand is drawn in coral because it can drift. The boundary is enforced when "
               "an agent emits. contract-compiler.ts, a field-name check over fourteen "
               "legacy edges run only by npm test, is not drawn as a gate because it is not one.",
               "shipped - generate-json-schemas.ts and contracts-vs-json-schema.ts (R22), "
               "HandoffEnvelopeSchema; blast-radius.ts run by hand",
               bare=bare)


# =================================================== 05 - the verification stack
def d05(bare=False):
    """Corrected 13 September against the orchestrator's per-agent path, in the
    order the code runs it. Direction encodes outcome: up and left returns,
    down terminates, straight continues.

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
    b.append(path(f"M{RX},176 L{RX},112 L40,112 L40,139 L{SX - 4},139", "coral",
                  opacity="0.85"))

    b.append(labelled_box(SX, 122, SW, 34, "Agent output", None, "gray", pad=18,
                          right="forced emit_handoff call"))
    b.append(conn(CX, 156, CX, 166, "gray", opacity="0.6"))

    layers = [("Quality gates",      "Per-agent commands, such as tsc",           "blocking"),
              ("Schema on write",    "HandoffEnvelopeSchema.safeParse",           "blocking"),
              ("D3 absorption",      "Declared absorption must validate",         "when declared"),
              ("Faithfulness judge", "Markdown against JSON, scored 0-10",        "warns; halts at gates A, B"),
              ("Step attestation",   "Re-runs each step's verify against the claim", "halts on mismatch"),
              ("Drift audit",        "Every declared skill must be cited",        "blocking")]
    y, mids = 168, []
    for name, sub, level in layers:
        b.append(labelled_box(SX, y, SW, 40, name, sub, "teal", right=level))
        mids.append(y + 20)
        if y > 168:
            b.append(conn(CX, y - 8, CX, y - 2, "gray", opacity="0.6"))
        y += 48
    b.append(conn(CX, 448, CX, 460, "gray", opacity="0.6"))
    b.append(labelled_box(SX, 462, SW, 34, "Merged to trunk", None, "gray", pad=18,
                          right="under .merge.lock"))

    # route back: the first three layers collect into the classifier
    for i in (0, 1, 2):
        b.append(conn(SX + SW, mids[i], 452, mids[i], "coral", arrow=False, opacity="0.75"))
    b.append(conn(452, mids[0], 452, mids[2], "coral", arrow=False, opacity="0.6"))
    b.append(conn(452, mids[1], BX - 2, mids[1], "coral", opacity="0.8"))

    b.append(box(BX, 176, BW, 120, "coral", dashed=True))
    b.append(text(RX, 198, "classifyRouteBack", TITLE_PX, "coral", anchor="middle"))
    b.append(text(RX, 216, "3 retryable classes", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))
    b.append(text(RX, 232, "A-B-A oscillation cut", SUB_PX, "coral",
                  anchor="middle", opacity="0.74"))
    b.append(ticks(RX - ticks_width(3) / 2, 241, 3, "coral", h=8, opacity="0.7"))
    b.append(text(RX, 266, "3 attempts in all", SUB_PX, "coral", anchor="middle",
                  opacity="0.74"))
    b.append(text(RX, 283, "then the run halts", SUB_PX, "coral", anchor="middle",
                  opacity="0.6"))

    # halt: the classifier gives up, or a later layer fails hard
    b.append(conn(RX, 296, RX, 426, "coral", opacity="0.8"))
    b.append(conn(SX + SW, mids[3], 460, mids[3], "coral", arrow=False, dashed=True,
                  opacity="0.65"))
    for i in (4, 5):
        b.append(conn(SX + SW, mids[i], 460, mids[i], "coral", arrow=False, opacity="0.75"))
    b.append(conn(460, mids[3], 460, 433, "coral", arrow=False, opacity="0.6"))
    b.append(conn(460, 433, BX - 2, 433, "coral", opacity="0.8"))
    b.append(f'<rect x="{BX}" y="428" width="{BW}" height="10" rx="5" '
             f'fill="{L("coral","f")}" stroke="{L("coral","s")}" stroke-width="0.5" '
             f'class="coral-f"/>')
    b.append(text(RX, 460, "Run halts", TITLE_PX, "coral", anchor="middle"))
    b.append(text(RX, 477, "This agent emits nothing", SUB_PX, "coral", anchor="middle",
                  opacity="0.74"))
    b.append(text(RX, 493, "Earlier merges stand", SUB_PX, "coral", anchor="middle",
                  opacity="0.6"))

    # warn: the faithfulness judge by default turns and rejoins the spine
    b.append(path(f"M{SX},{mids[3]} L48,{mids[3]} L48,356 L{SX - 2},356", "coral",
                  opacity="0.8"))

    ly = 524
    for dy, label in ((0, "Route back: the failure becomes the next input, 3 attempts in all"),
                      (19, "Warn: annotated, the run continues")):
        b.append(f'<line x1="{M + 2}" y1="{ly + dy - 4}" x2="{M + 13}" y2="{ly + dy - 4}" '
                 f'stroke="{L("coral","s")}" stroke-width="1.5" '
                 f'marker-end="url(#ar-coral)" class="coral-o"/>')
        b.append(text(M + 21, ly + dy, label, SUB_PX, ink="mute"))
    b.append(swatch(M, ly + 39, "Halt: this agent emits nothing; earlier merges stand", "coral"))

    cy = ly + 56
    b.append(box(M, cy, CW, 70, "gray", dashed=True))
    b.append(text(M + 16, cy + 23, "Opt-in: the cross-family judge", TITLE_PX, "gray"))
    b.append(text(M + CW - 16, cy + 23, "PV_VERIFIER, 4 eligible agents", SUB_PX, "gray",
                  anchor="end", opacity="0.72"))
    b.append(text(M + 16, cy + 42, "Evidence is hash-locked with SHA-256 before the judge reads it,",
                  SUB_PX, "gray", opacity="0.72"))
    b.append(text(M + 16, cy + 58, "then a non-Anthropic judge accepts or rejects; it warns by default",
                  SUB_PX, "gray", opacity="0.72"))

    cy2 = cy + 84
    b.append(box(M, cy2, 306, 72, "gray"))
    b.append(text(M + 16, cy2 + 23, "The judge was calibrated", TITLE_PX, "gray"))
    b.append(text(M + 16, cy2 + 42, "5 defect classes, catch 0.89, floor 0.70",
                  SUB_PX, "gray", opacity="0.72"))
    b.append(text(M + 16, cy2 + 58, "False reject 0.00, ceiling 0.10, 3 Aug",
                  SUB_PX, "gray", opacity="0.72"))

    b.append(box(346, cy2, 306, 72, "gray"))
    b.append(text(362, cy2 + 23, "Drift is measured lexically", TITLE_PX, "gray"))
    b.append(text(362, cy2 + 42, "Trigram-hash embedder, cosine floor 0.82,",
                  SUB_PX, "gray", opacity="0.72"))
    b.append(text(362, cy2 + 58, "advisory on agent 11's hardening rounds",
                  SUB_PX, "gray", opacity="0.72"))

    return svg("05", "The verification stack",
               "Four outcomes, and a failure is classified before it is acted on.",
               "".join(b), cy2 + 72,
               "Direction encodes outcome: up and to the left returns, down terminates, "
               "straight continues. Three failure classes route back with the failure as the "
               "next input, three attempts in all: a quality gate such as tsc, schema on "
               "write, and D3. An attestation mismatch or a missing skill citation halts, and "
               "the faithfulness judge warns except at the two human gates, where it halts.",
               "shipped - master-agentic-orchestrator.ts, route-back.ts, post-emit-checks.ts, "
               "attestation-verifier.ts; evidence commitment on the opt-in judge path",
               bare=bare)


# ======================================================= 06 - context residency
def d06(bare=False):
    """Corrected 13 September: the reduction is the recorded one (196K-521K to
    7K-31K tokens per agent, commit f0e35c1), and receipts record index entries
    and characters, not sections and tokens."""
    b = [section(M, 96, "Context window"), section(388, 96, "Skill corpus on disk")]
    FX, FW, FY, FH = M, 320, 106, 296
    b.append(box(FX, FY, FW, FH, "gray", dashed=True, r=8, fill=False))

    b.append(text(FX + 24, 133, "Full inlining: 196K to 521K tokens", SUB_PX, ink="mute"))
    b.append(text(FX + 24, 154, "Kernel and index: 7K to 31K tokens", TITLE_PX, ink="mute"))
    b.append(text(FX + 24, 174, "Per agent, estimated, 1 June 2026", SUB_PX, ink="mute"))

    for y, name, sub, role in [
            (186, "Agent kernel",         "Inlined verbatim into every agent",  "teal"),
            (244, "Skill citation index", "One @skill line and its description", "teal"),
            (302, "load_skill(file, §N)", "Fetched when a step needs it",        "gray")]:
        b.append(labelled_box(FX + 16, y, FW - 32, 50, name, sub, role))
    b.append(text(FX + 24, 382, "Also resident: step plan, lessons", SUB_PX, ink="mute"))

    GX, GY, cols = 388, 112, 20
    for i in range(218):
        b.append(f'<rect x="{GX + (i % cols) * 13}" y="{GY + (i // cols) * 13}" '
                 f'width="7" height="9" rx="1.5" fill="{L("gray","s")}" '
                 f'opacity="0.45" class="gray-f"/>')
    b.append(text(GX, GY + 166, "218 files", TITLE_PX, "gray"))
    b.append(text(GX, GY + 184, "Paged in on demand, never inlined", SUB_PX, "gray",
                  opacity="0.72"))

    b.append(path(f"M{GX - 8},{GY + 60} L{GX - 32},{GY + 60} L{GX - 32},327 "
                  f"L{FX + FW - 12},327", "teal", opacity="0.8"))

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
    b.append(text(372, y2 + 56, "given · cited · gate verdicts · outcome",
                  SUB_PX, "teal", opacity="0.74"))
    b.append(text(372, y2 + 72, "Assembled after every gate has run",
                  SUB_PX, "teal", opacity="0.6"))

    b.append(conn(176, y2 + 90, 176, y2 + 108, "gray", arrow=False, opacity="0.6"))
    b.append(conn(504, y2 + 90, 504, y2 + 108, "gray", arrow=False, opacity="0.6"))
    b.append(conn(176, y2 + 108, 504, y2 + 108, "gray", arrow=False, opacity="0.6"))
    b.append(conn(340, y2 + 108, 340, y2 + 124, "gray", opacity="0.6"))

    b.append(box(130, y2 + 126, 420, 56, "coral", dashed=True))
    b.append(text(340, y2 + 150, "given_not_cited", TITLE_PX, "coral", anchor="middle"))
    b.append(text(340, y2 + 168, "Indexed and never cited: paid for, with no recorded use",
                  SUB_PX, "coral", anchor="middle", opacity="0.74"))
    b.append(text(M, y2 + 206, "A citation proves injection, not influence.", TITLE_PX,
                  ink="mute"))

    return svg("06", "Context residency",
               "Budgeting is a measurement, and so is uptake.", "".join(b), y2 + 210,
               "Skill files are cited, not inlined: an agent carries the kernel and a "
               "one-line index, and fetches a section when a step needs it. Receipts record "
               "what was given at dispatch against what the agent cited, and the receipt "
               "contract states what that cannot show: a citation proves injection, not "
               "influence.",
               "shipped - PROGRESSIVE_DISCLOSURE and load_skill (master-agentic-orchestrator.ts), "
               "receipt.ts; reduction audited from commit f0e35c1, estimate mode",
               bare=bare)


for n, fn in [("04-contract-spine", d04), ("05-verification-stack", d05),
              ("06-context-residency", d06)]:
    emit(n, fn)
