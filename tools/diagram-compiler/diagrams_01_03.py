import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *

# ============================================================ 01 - the OS map
def d01(bare=False):
    """Redrawn 14 September. Four products are built and live, audited from their
    Vercel production deployments; Auteur is specced. The gates are the thirty-three
    CI gate ids in verify-all.ts, measured at factory 5739a97."""
    b = []
    b.append(section(124, 96, "Products built with the factory"))
    prods = [("Ark", "Live"), ("Author", "Live"), ("Archer", "Live"),
             ("Whitespace", "Live"), ("Auteur", "Specced")]
    px, pw = 124, 80
    for i, (n, st) in enumerate(prods):
        x = px + i * (pw + 8)
        b.append(box(x, 112, pw, 44, "purple", dashed=(st == "Specced")))
        b.append(text(x + pw / 2, 130, n, TITLE_PX, "purple", anchor="middle",
                      weight=500))
        b.append(text(x + pw / 2, 146, st, SUB_PX, "purple", anchor="middle"))
        b.append(conn(x + pw / 2, 156, x + pw / 2, 194, "gray", arrow=False))

    b.append(labelled_box(105, 196, 470, 52, "Gates",
                          "Halt, route back, or warn", "coral",
                          right="39 CI gate ids", dashed=True))
    b.append(conn(340, 262, 340, 250, "gray", opacity="0.5"))

    b.append(labelled_box(70, 262, 264, 58, "Build-time factory",
                          "15 build agents, 5 research agents", "teal"))
    b.append(labelled_box(346, 262, 264, 58, "Model decisions",
                          "One recorded per LLM call site", "teal"))
    b.append(conn(202, 336, 202, 322, "gray", opacity="0.5"))
    b.append(conn(478, 336, 478, 322, "gray", opacity="0.5"))

    b.append(box(40, 336, 600, 62, "teal", sw=1.75))
    b.append(text(58, 361, "Knowledge substrate", TITLE_PX, "teal", weight=500))
    b.append(text(622, 361, "219 skill files", SUB_PX, "teal",
                  anchor="end", weight=500, mono=True))
    b.append(ticks(58, 366, 110, "teal", h=6, gap=2.6, w=2.4))
    b.append(ticks(58, 376, 109, "teal", h=6, gap=2.6, w=2.4))

    return svg("01", "The operating system",
               "A build side and a run side over one corpus; four products built, one specced.",
               "".join(b), 398,
               "The taper is the argument: one corpus of skill files carries the factory that "
               "builds products and the call-site discipline for each model call the factory "
               "scan or the gateway sees. Four products are built and live; Auteur is specced, "
               "with no repository yet. Whitespace Hunter is the one with a public URL, "
               "whitespace-hunter.vercel.app. The file count is drawn as ticks because it must "
               "reconcile with plate 06.",
               "audited - counts at factory 2fe954ea (219 files, 20 agents, 39 CI gate ids); "
               "product status from Vercel production deployments, 14 Sep",
               bare=bare)


# ============================================== 02 - the knowledge substrate
# Measured at factory 5739a97, verification/skill-ref-counts.json, per_skill[].skills_internal:
# the number of other skill files that cite each skill. Every node is drawn at a radius read
# from its own count, so a larger node is a skill more files cite.
HUB_CITATIONS = [42, 40, 38, 38, 31, 30, 27, 26, 25, 23, 21, 20, 20]
DECLARED_ONLY = 18          # master-prompt-architecture.md: declared Level 0, measures 18
OTHER_CITATIONS = (
    [19] * 2 + [17] * 3 + [16] * 2 + [15] * 2 + [14] + [13] * 3 + [12] * 2 + [11] * 5
    + [10] * 8 + [9] * 2 + [8] * 4 + [7] * 9 + [6] * 12 + [5] * 15 + [4] * 22
    + [3] * 27 + [2] * 39 + [1] * 22 + [0] * 25)
LAYERS = ("Foundational", "Governance", "Coordination", "Engineering", "Connectors",
          "Intelligence", "Operational", "Tracking", "Meta")


def radius(n):
    """One scale for every node: hubs from 3.5 at twenty citations, the rest below."""
    return round(3.5 + (n - 20) * 4.5 / 22, 2) if n >= 20 else round(1.3 + n * 0.1, 2)


def d02(bare=False):
    """Redrawn 14 September. Every node is sized by its measured count, not only the
    hubs, and the invented nearest-neighbour edges are gone: the factory records how
    often each skill is cited, not by whom. The Level-0 set is fourteen, thirteen
    measured and one declared. The defect edge comes from agent 00's config, outside
    the skill graph, and the checks named are the ones that catch its class."""
    assert len(HUB_CITATIONS) + 1 + len(OTHER_CITATIONS) == 219
    b = [section(M, 96, "219 skill files, each drawn at its measured citation count")]

    GX, GY, GW, GH = M, 118, CW, 210
    b.append(region(GX, GY, GW, GH, "gray", r=8))

    hubs = [(214, 172), (286, 154), (352, 184), (256, 216), (322, 234),
            (190, 242), (390, 150), (398, 224), (150, 198), (288, 272),
            (356, 282), (172, 150), (232, 286)]
    declared = (404, 274)

    r = rng(20260912)
    for n in OTHER_CITATIONS:
        x, y = GX + 18 + r() * (GW - 176), GY + 26 + r() * (GH - 44)
        b.append(dot(x, y, radius(n), "gray", "0.4"))

    # the defect the checks now catch: a citation from a config, into a hub, to nothing
    b.append(box(520, 150, 116, 30, "gray"))
    b.append(text(578, 170, "agent-00 config", SUB_PX, "gray", anchor="middle"))
    b.append(hair(520, 165, 265, 214, "coral"))
    b.append(f'<path d="M270,209 l6,6 M276,209 l-6,6" stroke="{L("coral","s")}" '
             f'stroke-width="1.3" stroke-linecap="round" class="coral-o"/>')

    for (hx, hy), n in zip(hubs, HUB_CITATIONS):
        b.append(f'<circle cx="{hx}" cy="{hy}" r="{radius(n)}" fill="{L("teal","f")}" '
                 f'stroke="{L("teal","s")}" stroke-width="1" class="teal-f"/>')
    b.append(f'<circle cx="{declared[0]}" cy="{declared[1]}" r="{radius(DECLARED_ONLY) + 0.8}" '
             f'fill="none" stroke="{L("teal","s")}" stroke-width="1" stroke-dasharray="2 1.5" '
             f'class="teal-o"/>')

    b.append(region(132, 134, 292, 168, "teal", r=10))
    b.append(text(138, 128, "Level 0: 13 measured hubs, 1 declared", SUB_PX, "teal"))
    b.append(numeral(424, 318, "Measured: cited by 20 or more skill files", "teal", SUB_PX,
                     anchor="end"))
    b.append(text(GX + GW - 16, GY + GH - 12, "204 others", SUB_PX, "gray",
                  anchor="end", opacity="0.7"))

    # two panels: the checks, and the defect behind the third
    y = 352
    b.append(section(M, y - 12, "Enforced in pre-commit, and in CI as R33"))
    b.append(box(M, y, 306, 104, "coral", dashed=True))
    b.append(text(M + 16, y + 26, "Three checks on the hubs", TITLE_PX, "coral"))
    for k, line in enumerate(("The register names each measured hub",
                              "Anchors inside all 14 hubs resolve",
                              "No live file cites a missing section",
                              "Pre-commit; the last two also in R33")):
        b.append(text(M + 16, y + 45 + k * 16, line, SUB_PX, "coral",
                      opacity="0.74" if k < 3 else "0.55"))

    b.append(box(346, y, 306, 104, "gray"))
    b.append(text(362, y + 26, "The defect behind the third", TITLE_PX, "gray"))
    for k, line in enumerate(("agent-00 cited agent-constitution",
                              "§P1-§P2, a section that does not",
                              "exist, and was handed [section not",
                              "found]. Fixed 12 Sep.")):
        b.append(text(362, y + 45 + k * 16, line, SUB_PX, "gray", opacity="0.74"))

    # the taxonomy, demoted to background, wrapped so nothing leaves the frame
    y2 = y + 130
    b.append(section(M, y2, "Nine layers group the graph; they do not rank it"))
    cx, cy = M, y2 + 12
    for name in LAYERS:
        w = 7.4 * len(name) + 22
        if cx + w > M + CW:
            cx, cy = M, cy + 30
        b.append(box(cx, cy, w, 24, "teal"))
        b.append(text(cx + w / 2, cy + 16, name, SUB_PX, "teal", anchor="middle",
                      opacity="0.8"))
        cx += w + 6
    end = cy + 24

    return svg("02", "The knowledge substrate",
               "Thirteen hubs are measured, three files are declared, and the fourteen are checked.",
               "".join(b), end,
               "A skill file is a measured hub when twenty or more other skill files cite it, "
               "and every node is drawn at a size read from its own count; positions are "
               "arranged for legibility. Three files are also declared Level 0 by hand, and one "
               "of them measures eighteen, so the set is fourteen. The checks keep the register "
               "naming every measured hub and every hub's anchors resolving; the counts written "
               "in the register are not checked. The coral edge is the citation that resolved "
               "to nothing, drawn from the config that made it.",
               "shipped - skill-ref-count.ts --check-level0, verify-hub-integrity.mjs and "
               "audit-hub-citations.mjs (.husky/pre-commit, R33); audited - counts from "
               "skill-ref-counts.json at 5739a97",
               bare=bare)


# =================================================== 03 - the compiler spine
BUILD_AGENTS = [
    "Spec Validator · Foundation · API Integration · Collection · Analysis",
    "Synthesis · Frontend Core · Frontend Intelligence · Admin · Testing",
    "Browser Testing · Craftsmanship · Deployment · Sugar Trainer · Prompt Manager",
]
# The build graph's waves, computed from dependsOn in configs/agent-*.config.ts at 5739a97.
WAVES = [["00"], ["01"], ["02"], ["03a"], ["03b", "12"], ["03c"], ["04"],
         ["05", "08"], ["06", "09"], ["07"], ["10"], ["11"]]


def d03(bare=False):
    """Redrawn 14 September. The orchestrator runs a dependency-wave scheduler: every
    agent whose dependencies have finished starts, up to ORCH_MAX_PARALLEL. The strip
    is the build graph's real twelve waves. The orchestrator's own start gates are
    drawn beside the prompt-run preflight, and a human gate holds only its dependents."""
    assert sum(len(w) for w in WAVES) == 15
    b = [section(M, 96, "Before any agent is dispatched")]
    b.append(box(M, 106, CW, 46, "coral", dashed=True))
    b.append(text(M + 18, 127, "Preflight", TITLE_PX, "coral"))
    b.append(text(M + 18, 143, "Checked by the build-start prompt before dispatch",
                  SUB_PX, "coral", opacity="0.72"))
    b.append(text(M + CW - 18, 127, "20 preflight features", SUB_PX, "coral",
                  anchor="end", weight=500))
    b.append(ticks(M + CW - 18 - ticks_width(20), 134, 20, "coral", h=9))
    b.append(labelled_box(M, 158, CW, 40, "Start gates in main()", None, "coral",
                          right="baseline · install guard · preflight check", dashed=True))
    b.append(conn(340, 198, 340, 214, "gray", opacity="0.6"))

    b.append(section(M, 230, "Waves: each agent starts when its dependencies finish, in its own worktree"))
    gap, w = 4.36, 48
    for i, wave in enumerate(WAVES):
        x = round(M + i * (w + gap), 2)
        for k, agent in enumerate(wave):
            y = 240 + k * 23
            b.append(box(x, y, w, 20, "teal"))
            b.append(text(round(x + w / 2, 2), y + 14, agent, SUB_PX, "teal",
                          anchor="middle", opacity="0.85"))
    b.append(text(M, 304, "12 waves, at most 2 build agents at once; ORCH_MAX_PARALLEL caps it at 4",
                  SUB_PX, ink="mute"))
    b.append(conn(340, 312, 340, 332, "gray", opacity="0.6"))

    b.append(box(200, 334, 280, 46, "coral", dashed=True))
    b.append(text(340, 355, ".merge.lock", TITLE_PX, "coral", anchor="middle"))
    b.append(text(340, 371, "Rebase, then fast-forward to trunk", SUB_PX, "coral",
                  anchor="middle", opacity="0.72"))
    b.append(conn(342, 382, 342, 400, "gray", opacity="0.6"))

    b.append(box(M, 402, CW, 84, "teal"))
    b.append(text(M + 18, 426, "Trunk", TITLE_PX, "teal"))
    b.append(text(M + CW - 18, 426, "15 build agents", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(ticks(M + CW - 18 - ticks_width(15), 436, 15, "teal", h=9, opacity="0.5"))
    for i, line in enumerate(BUILD_AGENTS):
        b.append(text(M + 18, 448 + i * 16, line, SUB_PX, "teal", opacity="0.7"))
    b.append(text(M, 506, "Gate A after Synthesis and gate B after Frontend Core hold "
                          "only their dependents", SUB_PX, "coral", opacity="0.8"))

    b.append(section(M, 532, "Research cluster, opt-in with --include-research"))
    b.append(box(M, 542, CW, 62, "teal"))
    b.append(text(M + 18, 566, "Research pipeline", TITLE_PX, "teal"))
    b.append(text(M + CW - 18, 566, "5 agents", SUB_PX, "teal",
                  anchor="end", opacity="0.78"))
    b.append(ticks(M + CW - 18 - ticks_width(5), 576, 5, "teal", h=9, opacity="0.5"))
    b.append(text(M + 18, 584, "research-reader · research-graph-builder · "
                  "research-synthesizer", SUB_PX, "teal", opacity="0.7"))
    b.append(text(M + 18, 599, "marketing-availability-builder · "
                  "marketing-availability-validator", SUB_PX, "teal", opacity="0.7"))

    return svg("03", "The compiler spine",
               "A dependency graph run in waves, each agent in its own worktree.",
               "".join(b), 604,
               "Every agent whose dependencies have finished starts at once, up to four by "
               "default, each in its own git worktree; this graph lets at most two build agents "
               "overlap. Results reach trunk one at a time, through a rebase and fast-forward "
               "under a file lock, and a human gate holds only the agents that depend on it. "
               "The nineteen preflight features are run by the build-start prompt, a different "
               "object from the orchestrator's start gates and from the thirty-three CI gate "
               "ids in verify-all.ts.",
               "shipped - master-agentic-orchestrator.ts with agent-scheduler.ts, merge-lock.ts, "
               "review-gate.ts and preflight-gate.ts; prompts/feature-descriptor.md; audited - "
               "waves from the configs at 5739a97",
               bare=bare)


for n, fn in [("01-operating-system", d01), ("02-knowledge-substrate", d02),
              ("03-compiler-spine", d03)]:
    emit(n, fn)
