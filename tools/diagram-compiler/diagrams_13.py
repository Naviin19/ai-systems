import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *


def rung(x, y, w, h, n, label, role):
    """One rung: a reconciling tick row over its label. The count is the ticks."""
    return (box(x, y, w, h, role) +
            ticks(x + 16, y + 12, n, role) +
            text(x + 16, y + 44, label, SUB_PX, role, weight=500))


# ============================================================ 13 - the gate ladder
def d13(bare=False):
    """Every mode-gated switch defaults to block, advisory or off. The advisory
    rung is the only one a gate holds: a new advisory switch cannot ship without
    a written flip condition beside it. Switches that climbed to block on that
    condition are drawn as dots on the arrow between the two rungs."""
    b = [section(M, 112, "Every mode-gated switch, by its default")]

    RX, RW, RH = 40, 400, 56

    # --- rung 1: block ----------------------------------------------------------
    y_block = 132
    b.append(rung(RX, y_block, RW, RH, 20, "block", "coral"))

    # --- rung 2: advisory, inside the one gate ------------------------------------
    gy = 210
    gh = 116
    b.append(box(M, gy, RW + 24, gh, "coral", dashed=True))
    y_adv = gy + 12
    b.append(rung(RX, y_adv, RW, RH, 30,
                  "advisory — a written condition beside every switch", "teal"))
    gate_label = wrap("a new advisory switch cannot ship without its condition · "
                      "holds this rung only", 50)
    for i, ln in enumerate(gate_label):
        b.append(text(RX + 4, y_adv + RH + 22 + i * 17, ln, SUB_PX, "coral"))

    # --- rung 3: off and bespoke ----------------------------------------------------
    y_off = gy + gh + 22
    b.append(rung(RX, y_off, RW, RH, 8, "2 off · 6 bespoke", "gray"))

    # --- the climb: advisory up to block, one dot per recorded flip -----------------
    ax = 488
    y_from = y_adv + RH / 2
    y_to = y_block + RH / 2
    b.append(path(f"M{M + RW + 24},{y_from} H{ax} V{y_to} H{RX + RW + 4}", "teal"))
    for i in range(7):
        b.append(dot(ax, y_from - 10 - i * 10, 3, "teal"))
    for i, ln in enumerate(wrap("7 climbed on their written condition", 20)):
        b.append(text(ax + 14, 202 + i * 17, ln, SUB_PX, "teal", weight=500))

    body_end = y_off + RH

    return svg("13", "The gate ladder",
               "Enforcement is a ladder, not a wall.",
               "".join(b), body_end,
               "A switch defaults to block, advisory or off. An advisory default states "
               "beside it the condition that ends it, and a gate refuses a new advisory "
               "switch without one. UNEVALUATED is a third outcome and never a pass.",
               "shipped - lib/env-mode.ts, verify-flip-conditions.mjs, verify-all.ts; "
               "audited - counts at factory 5d5fb3f1",
               bare=bare)


for n, fn in [("13-gate-ladder", d13)]:
    emit(n, fn)
