import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *

# ============================================================ 01 - the OS map
def d01(bare=False):
    b = []
    b.append(section(124, 96, "Products built with the factory"))
    prods = [("Ark", "Live"), ("Author", "Live"), ("Archer2", "Live"),
             ("Auteur", "Specced"), ("Whitespace", "Live")]
    px, pw = 124, 80
    for i, (n, st) in enumerate(prods):
        x = px + i * (pw + 8)
        b.append(box(x, 108, pw, 58, "purple"))
        b.append(text(x + pw / 2, 133, n, TITLE_PX, "purple", anchor="middle"))
        b.append(text(x + pw / 2, 150, st, SUB_PX, "purple",
                      anchor="middle", opacity="0.7"))
        b.append(conn(x + pw / 2, 166, x + pw / 2, 194, "gray", dashed=True,
                      arrow=False, opacity="0.5"))
    b.append(text(556, 133, "whitespace-hunter.vercel.app", SUB_PX, "purple",
                  anchor="start", opacity="0.0"))  # hidden anchor, URL sits in the caption

    b.append(labelled_box(105, 196, 470, 52, "Gates",
                          "Halt, route back, or warn", "coral",
                          right="30 CI gates", dashed=True))
    b.append(conn(340, 262, 340, 250, "gray", opacity="0.5"))

    b.append(labelled_box(70, 262, 264, 58, "Build-time factory",
                          "15 build agents, 5 research agents", "teal"))
    b.append(labelled_box(346, 262, 264, 58, "Model decisions",
                          "One recorded per LLM call site", "teal"))
    b.append(conn(202, 336, 202, 322, "gray", opacity="0.5"))
    b.append(conn(478, 336, 478, 322, "gray", opacity="0.5"))

    b.append(box(40, 336, 600, 62, "teal"))
    b.append(text(58, 361, "Knowledge substrate", TITLE_PX, "teal"))
    b.append(text(622, 361, "218 skill files", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(ticks(58, 372, 218, "teal", h=10, gap=1.19, w=1.4, opacity="0.42"))

    return svg("01", "The operating system",
               "Two halves, one substrate, five products.", "".join(b), 398,
               "The taper is the argument: one substrate of skill files carries both the "
               "factory that builds products and the discipline that governs every model "
               "call. Whitespace Hunter joined the band on 2 September and is the one "
               "product listed with a public URL, whitespace-hunter.vercel.app. The file "
               "count is drawn as ticks because it must reconcile with plate 06.",
               "shipped for the counts (218 files, 20 agents, 30 gates); product status "
               "audited from Vercel production deployments, 13 Sep",
               bare=bare)


# ============================================== 02 - the knowledge substrate
# Measured hubs, skills_internal from verification/skill-ref-counts.json, 13 Sep 2026.
# Radii are read from these counts, so a hub drawn larger is a hub cited more.
HUB_CITATIONS = [42, 40, 37, 37, 31, 30, 27, 25, 25, 21, 20, 20, 20]
LAYERS = ("Foundational", "Governance", "Coordination", "Engineering", "Connectors",
          "Intelligence", "Operational", "Tracking", "Meta")


def d02(bare=False):
    """Redrawn September 2026, and corrected on 13 September against the code:
    218 files, nine layers, and thirteen measured hubs sized by their measured
    citation counts rather than drawn at an invented equal size."""
    b = [section(M, 96, "218 skill files. The hubs are measured from the citation graph.")]

    GX, GY, GW, GH = M, 118, CW, 210
    b.append(box(GX, GY, GW, GH, "gray", dashed=True, r=8, fill=False))

    hubs = [(214, 172), (286, 154), (352, 184), (256, 216), (322, 234),
            (190, 242), (390, 150), (398, 224), (150, 198), (288, 272),
            (356, 282), (172, 150), (232, 286)]

    r = rng(20260912)
    pts = []
    for i in range(218):
        pts.append((GX + 18 + r() * (GW - 176), GY + 26 + r() * (GH - 44)))

    for hx, hy in hubs:
        near = sorted(pts, key=lambda q: (q[0] - hx) ** 2 + (q[1] - hy) ** 2)[:9]
        for nx, ny in near:
            b.append(hair(nx, ny, hx, hy, "teal", "0.2"))

    for x, y in pts:
        b.append(dot(x, y, 2.1, "gray", "0.4"))

    # the defect the gate now catches: one edge that resolved to nothing
    b.append(hair(474, 170, 396, 150, "coral", "0.85", dashed=True))
    b.append(f'<path d="M476,167 l6,6 M482,167 l-6,6" stroke="{L("coral","s")}" '
             f'stroke-width="1.3" stroke-linecap="round" class="coral-o"/>')

    for (hx, hy), n in zip(hubs, HUB_CITATIONS):
        radius = round(3.5 + (n - 20) * 4.5 / 22, 2)
        b.append(f'<circle cx="{hx}" cy="{hy}" r="{radius}" fill="{L("teal","f")}" '
                 f'stroke="{L("teal","s")}" stroke-width="1" class="teal-f"/>')

    b.append(box(132, 134, 292, 168, "teal", dashed=True, r=10, fill=False))
    b.append(text(138, 128, "Level-0 hubs", SUB_PX, "teal"))
    b.append(numeral(424, 128, "13 hubs at 20 or more citations", "teal", SUB_PX,
                     anchor="end"))
    b.append(text(GX + GW - 16, GY + GH - 12, "205 others", SUB_PX, "gray",
                  anchor="end", opacity="0.7"))

    # two panels: the gate, and the defect it exists for
    y = 352
    b.append(section(M, y - 12, "Derived, then enforced"))
    b.append(box(M, y, 306, 104, "coral", dashed=True))
    b.append(text(M + 16, y + 26, "skill-ref-count.ts --check-level0", TITLE_PX, "coral"))
    b.append(text(M + 16, y + 45, "Counts citations between skill files and",
                  SUB_PX, "coral", opacity="0.74"))
    b.append(text(M + 16, y + 61, "fails a commit when CLAUDE.md stops",
                  SUB_PX, "coral", opacity="0.74"))
    b.append(text(M + 16, y + 77, "naming a measured hub", SUB_PX, "coral",
                  opacity="0.74"))
    b.append(text(M + 16, y + 96, "Wired to .husky/pre-commit, 12 Sep", SUB_PX,
                  "coral", opacity="0.55"))

    b.append(box(346, y, 306, 104, "gray"))
    b.append(text(362, y + 26, "The defect it was built for", TITLE_PX, "gray"))
    b.append(text(362, y + 47, "agent-00 cited a section anchor that did",
                  SUB_PX, "gray", opacity="0.74"))
    b.append(text(362, y + 63, "not resolve. The spec validator was handed",
                  SUB_PX, "gray", opacity="0.74"))
    b.append(text(362, y + 79, "[section not found] where its constitution",
                  SUB_PX, "gray", opacity="0.74"))
    b.append(text(362, y + 95, "should have been. Fixed 12 Sep.", SUB_PX, "gray",
                  opacity="0.74"))

    # the taxonomy, demoted to background, wrapped so nothing leaves the frame
    y2 = y + 130
    b.append(section(M, y2, "Nine layers group the graph; they do not rank it"))
    cx, cy = M, y2 + 12
    for name in LAYERS:
        w = 6.4 * len(name) + 22
        if cx + w > M + CW:
            cx, cy = M, cy + 30
        b.append(box(cx, cy, w, 24, "teal"))
        b.append(text(cx + w / 2, cy + 16, name, SUB_PX, "teal", anchor="middle",
                      opacity="0.8"))
        cx += w + 6
    end = cy + 24

    return svg("02", "The knowledge substrate",
               "A citation graph whose important nodes are measured, not nominated.",
               "".join(b), end,
               "A skill file is a measured hub when twenty or more other skill files cite "
               "it, and each hub is drawn at a size read from that count. Three files are "
               "also declared Level 0 by hand; the pre-commit check keeps the written "
               "register naming every measured hub, so the two cannot quietly drift apart. "
               "The one coral edge is the anchor that resolved to nothing.",
               "shipped - skill-ref-count.ts --check-level0, .husky/pre-commit; "
               "counts measured 13 Sep",
               bare=bare)


# =================================================== 03 - the compiler spine
BUILD_AGENTS = [
    "Spec Validator · Foundation · API Integration · Collection · Analysis",
    "Synthesis · Frontend Core · Frontend Intelligence · Admin · Testing",
    "Browser Testing · Craftsmanship · Deployment · Sugar Trainer · Prompt Manager",
]


def d03(bare=False):
    """Corrected 13 September. The previous plate drew three agents working
    concurrently and contending for the merge lock. The orchestrator awaits
    each agent in dependency order; the lock is real and serialises the merge,
    but nothing ever waits on it."""
    b = [section(M, 96, "Before the orchestrator runs")]
    b.append(box(M, 106, CW, 48, "coral", dashed=True))
    b.append(text(M + 18, 128, "Preflight", TITLE_PX, "coral"))
    b.append(text(M + 18, 145, "Checked by the build-start prompt before any agent is dispatched",
                  SUB_PX, "coral", opacity="0.72"))
    b.append(text(M + CW - 18, 128, "19 preflight features", SUB_PX, "coral",
                  anchor="end", opacity="0.78"))
    b.append(ticks(M + CW - 18 - ticks_width(19), 136, 19, "coral", h=9, opacity="0.6"))
    b.append(conn(340, 156, 340, 182, "gray", opacity="0.6"))

    b.append(section(M, 202, "One agent at a time, in dependency order"))
    lx, lw = M, 194
    labels = ("Agent n", "Agent n + 1", "Agent n + 2")
    for i, label in enumerate(labels):
        x = lx + i * (lw + 21)
        b.append(box(x, 212, lw, 48, "gray", dashed=True))
        b.append(text(x + lw / 2, 233, label, TITLE_PX, "gray", anchor="middle"))
        b.append(text(x + lw / 2, 250, "its own git worktree", SUB_PX,
                      "gray", anchor="middle", opacity="0.72"))
        b.append(conn(x + lw / 2, 260, x + lw / 2, 274, "gray", arrow=False,
                      opacity="0.55"))
        if i < 2:
            b.append(conn(x + lw, 236, x + lw + 19, 236, "gray", opacity="0.7"))
    b.append(conn(126, 274, 558, 274, "gray", arrow=False, opacity="0.55"))
    b.append(conn(342, 274, 342, 292, "gray", opacity="0.6"))

    b.append(box(200, 294, 280, 46, "coral", dashed=True))
    b.append(text(340, 315, ".merge.lock", TITLE_PX, "coral", anchor="middle"))
    b.append(text(340, 331, "Rebase, then fast-forward to trunk", SUB_PX, "coral",
                  anchor="middle", opacity="0.72"))
    b.append(conn(342, 342, 342, 362, "gray", opacity="0.6"))

    b.append(box(M, 364, CW, 84, "teal"))
    b.append(text(M + 18, 388, "Trunk", TITLE_PX, "teal"))
    b.append(text(M + CW - 18, 388, "15 build agents", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(ticks(M + CW - 18 - ticks_width(15), 398, 15, "teal", h=9, opacity="0.5"))
    for i, line in enumerate(BUILD_AGENTS):
        b.append(text(M + 18, 410 + i * 16, line, SUB_PX, "teal", opacity="0.7"))
    b.append(text(M, 468, "Human review pauses the chain after Synthesis (gate A) and "
                          "Frontend Core (gate B)", SUB_PX, "coral", opacity="0.8"))

    b.append(section(M, 494, "Research cluster, opt-in with --include-research"))
    b.append(box(M, 504, CW, 62, "teal"))
    b.append(text(M + 18, 528, "Research pipeline", TITLE_PX, "teal"))
    b.append(text(M + CW - 18, 528, "5 agents", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(ticks(M + CW - 18 - ticks_width(5), 538, 5, "teal", h=9, opacity="0.5"))
    b.append(text(M + 18, 546, "research-reader · research-graph-builder · "
                  "research-synthesizer", SUB_PX, "teal", opacity="0.7"))
    b.append(text(M + 18, 561, "marketing-availability-builder · "
                  "marketing-availability-validator", SUB_PX, "teal", opacity="0.7"))

    return svg("03", "The compiler spine",
               "A dependency-ordered chain, each agent isolated in its own worktree.",
               "".join(b), 566,
               "Agents run one at a time in dependency order. Each works in its own git "
               "worktree, and its result reaches trunk through a rebase and fast-forward "
               "under a file lock; human review pauses the chain at two gates. The nineteen "
               "preflight features are checked by the build-start prompt, a different object "
               "from the thirty CI gates in verify-all.ts.",
               "shipped - master-agentic-orchestrator.ts (sequential dispatch, worktrees, "
               ".merge.lock, gates A and B); prompts/feature-descriptor.md",
               bare=bare)


for n, fn in [("01-operating-system", d01), ("02-knowledge-substrate", d02),
              ("03-compiler-spine", d03)]:
    emit(n, fn)
