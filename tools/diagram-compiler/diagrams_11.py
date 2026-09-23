import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *


def cbox(x, y, w, h, title, sub=None, role="teal", dashed=False):
    o = [box(x, y, w, h, role, dashed)]
    cx = x + w / 2
    ty = y + h / 2 + 5 if not sub else y + h / 2 - 3
    o.append(text(cx, ty, title, TITLE_PX, role, anchor="middle"))
    if sub:
        o.append(text(cx, y + h / 2 + 14, sub, SUB_PX, role, anchor="middle", opacity="0.72"))
    return "".join(o)


# ============================================== 11 - prompts as specifications
def d11(bare=False):
    """A prompt is an artifact with a declared shape, graded against a floor set
    by what the prompt is for, before it is allowed to be used. The score is the
    lowest of five dimensions, never their mean, so a prompt cannot compensate
    for being unactionable by being well structured. Floors, being thresholds
    rather than counts, are drawn as numerals: ticks reconcile across the set and
    a threshold that equalled one of those counts would read as agreement."""
    b = [section(M, 112, "What a prompt must declare")]

    # --- the three specifications ------------------------------------------------
    specs = [("Input", "What data it is given"),
             ("Transformation", "What operation it performs"),
             ("Output", "What result it must return")]
    xs = [28, 236, 444]
    for (t, s_), x in zip(specs, xs):
        b.append(cbox(x, 132, 208 if x == 444 else 200, 54, t, s_, "teal"))
    for i in range(2):
        b.append(conn(xs[i] + 200, 159, xs[i + 1] - 2, 159, "gray", opacity="0.7"))

    # --- the five dimensions, and the minimum rule --------------------------------
    b.append(section(M, 222, "Scored on five dimensions; the score is the lowest, never the mean"))
    dims = [("Specificity", 7.50), ("Structure", 7.74), ("Constraints", 7.43),
            ("Completeness", 7.19), ("Actionability", 7.37)]
    lowest = min(d[1] for d in dims)
    dx = 28
    for name, mean in dims:
        w = 116
        lo = mean == lowest
        role = "coral" if lo else "teal"
        b.append(box(dx, 242, w, 52, role, dashed=lo))
        b.append(text(dx + w / 2, 263, name, SUB_PX, role, anchor="middle"))
        b.append(numeral(dx + w / 2, 283, f"{mean:.2f}", role, px=TITLE_PX, anchor="middle"))
        dx += w + 11

    b.append(text(340, 312, "The lowest dimension is the score. Corpus mean per dimension shown; "
                            "completeness is the weakest.", SUB_PX, ink="mute", anchor="middle"))

    # --- the floor ladder ----------------------------------------------------------
    b.append(section(M, 360, "The floor is set by consequence, not by length"))
    ladder = [("8.5", 9, "System prompts, scorers, adversarial judges, fan-out and HITL questions", "coral"),
              ("8.0", 2, "Session dispatch, handoff narrative", "coral"),
              ("7.5", 14, "Instructions, build prompts, playbooks, step files, CLAUDE.md", "teal"),
              ("7.0", 3, "MCP tool descriptions, Zod and config descriptions", "teal"),
              ("4.0", 2, "Directory indexes, templates", "gray")]
    y = 380
    for floor, n, what, role in ladder:
        b.append(box(28, y, 624, 30, role, dashed=(role == "gray")))
        b.append(numeral(46, y + 20, floor, role, px=TITLE_PX))
        b.append(text(96, y + 20, f"{n} surfaces", SUB_PX, role, opacity="0.8"))
        b.append(text(196, y + 20, what, SUB_PX, role, opacity="0.72"))
        y += 36

    b.append(text(340, y + 12, "Thirty declared surfaces. The highest bar sits on the prompts that "
                               "judge other work.", SUB_PX, ink="mute", anchor="middle"))

    # --- elevate once, then block ---------------------------------------------------
    gy = y + 44
    b.append(section(M, gy, "Below the floor: elevated once, then blocked"))
    steps = [("Graded", "Against its own floor", "teal"),
             ("Below", "One automatic rewrite", "coral"),
             ("Re-graded", "The same floor", "teal"),
             ("Blocked", "A second failure stops", "coral")]
    sx = [28, 186, 344, 502]
    for (t, s_, r), x in zip(steps, sx):
        b.append(cbox(x, gy + 20, 150, 54, t, s_, r, dashed=(r == "coral")))
    for i in range(3):
        b.append(conn(sx[i] + 150, gy + 47, sx[i + 1] - 2, gy + 47, "gray", opacity="0.7"))

    # --- what the gate does not reach -----------------------------------------------
    # Wrapped, not hand-broken. These two lines were fitted to the font this plate
    # happened to be drawn under; the second measured 760 units against a 680-unit
    # frame on the Linux CI runner, whose default sans is wider. The measure is the
    # same 82 characters the caption uses, and the box takes its height from the
    # number of lines that come back, so a longer sentence grows the box instead of
    # leaving the frame.
    ny = gy + 94
    notes = (wrap("The score judges a prompt, not the output that prompt produces; "
                  "nothing here connects the two.", 82)
             + wrap("313 of 1,116 graded prompts sit below their floor and are in the "
                    "corpus anyway: the gate holds what passes through it.", 82))
    nh = 30 + 17 * len(notes)
    b.append(box(28, ny, 624, nh, "gray", dashed=True))
    b.append(text(44, ny + 22, "What this does not reach", SUB_PX, "gray", weight=500))
    for _i, _ln in enumerate(notes):
        b.append(text(44, ny + 41 + _i * 17, _ln, SUB_PX, "gray"))

    return svg("11", "Prompts as specifications",
               "A prompt is an artifact with a declared shape, graded before it is used.",
               "".join(b), ny + nh,
               "Every prompt the system writes, uses or embeds declares an input, a transformation "
               "and an output, and is scored on five dimensions before it is allowed to run. The "
               "score is the lowest dimension rather than the mean, so a prompt cannot compensate "
               "for being unactionable by being well structured. Each of thirty surfaces carries "
               "its own floor, from 4.0 for a directory index to 8.5 for a scorer or an adversarial "
               "judge: the bar is a claim about consequence. A prompt below its floor is rewritten "
               "once automatically and blocked on a second failure.",
               "shipped - craftsmanship-gate.ts, enrich-prompt.ts, SURFACE_FLOORS in "
               "craftsmanship-surface-policy.ts, prompt-multiplier.md; audited - 30 surfaces, "
               "5 floor levels, 1,116 graded prompts of which 313 below floor",
               bare=bare)


for n, fn in [("11-prompts-as-specifications", d11)]:
    emit(n, fn)
