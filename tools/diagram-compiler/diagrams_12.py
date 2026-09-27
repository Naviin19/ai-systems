import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import *


def pbox(x, y, w, h, title, sub=None, role="gray", dashed=False, pad=16, mono=True):
    """A box whose title is a path or an identifier, so it is set in the mono voice."""
    o = [box(x, y, w, h, role, dashed)]
    half_cap = CAP * TITLE_PX / 2
    ty = y + h / 2 + half_cap if not sub else y + h / 2 + half_cap - LH_SUB / 2 - 0.5
    o.append(text(x + pad, ty, title, TITLE_PX, role, weight=500, mono=mono))
    if sub:
        o.append(text(x + pad, ty + LH_SUB, sub, SUB_PX, role))
    return "".join(o)


# ======================================================= 12 - the writable surface
def d12(bare=False):
    """One row per persistent surface that code writes or that reaches an agent
    or a session. Three tick rows reconcile: every surface, the subset that
    reaches a prompt or a session context, and the subset of those where a
    rewrite by another process is noticed by nothing. The detector is a gate
    and is drawn dashed; it runs advisory."""
    b = [section(M, 112, "Registered surfaces, counted")]

    # --- three reconciling tick rows ---------------------------------------------
    TX = 396                                  # ticks share one left edge
    rows = [(39, "gray",  "39 surfaces, one row each"),
            (21, "teal",  "21 reach an agent prompt (16) or a session context (5)"),
            (19, "coral", "19 of those 21 are rewrite-invisible")]
    y = 132
    for n, role, label in rows:
        b.append(text(M, y + 10, label, SUB_PX, role, weight=500))
        b.append(ticks(TX, y, n, role))
        y += 30
    b.append(text(M, y + 4, "Rewrite-invisible: a rewrite by another process would be noticed "
                            "by nothing.", SUB_PX, ink="mute"))

    # --- the two figures that are labels, not counts -------------------------------
    ly = y + 22
    b.append(box(M, ly, 196, 32, "coral"))
    b.append(text(M + 16, ly + 21, "4 watched by nothing", SUB_PX, "coral", weight=500))
    b.append(box(M + 208, ly, 292, 32, "teal"))
    b.append(text(M + 224, ly + 21, "18 free-text keys on the envelope", SUB_PX, "teal",
                  weight=500))

    # --- the detector holds the registry to the tree --------------------------------
    sy = ly + 70
    b.append(section(M, sy, "The detector holds the registry to the tree"))
    by = sy + 20
    bw = (CW - 12) / 2
    b.append(pbox(M, by, bw, 52, "writable-surface-registry.json",
                  "One row per surface, one entry per free-text key", "gray"))
    b.append(pbox(M + bw + 12, by, bw, 52, "the tree",
                  "Files that write to disk, and prompt paths", "gray",
                  mono=False))
    gy = by + 84
    for cx in (M + bw / 2, M + bw + 12 + bw / 2):
        b.append(conn(cx, by + 52, cx, gy - 2, "gray"))
    b.append(pbox(M, gy, CW, 54, "scripts/detect-unregistered-write-surfaces.mjs",
                  "held to the tree · advisory", "coral", dashed=True))

    # --- the typed field for a note about the dispatch itself ------------------------
    ry = gy + 82
    b.append(section(M, ry, "The typed channel"))
    rh = 36
    b.append(box(M, ry + 14, 470, rh, "teal"))
    b.append(text(M + 16, ry + 14 + 23, "route_reports: blocked · better_route · open_question",
                  SUB_PX, "teal", weight=500, mono=True))
    end = ry + 14 + rh

    return svg("12", "The writable surface",
               "Every place a note can land is on a row.",
               "".join(b), end,
               "Each row records who writes the surface, who reads it back and where, whether "
               "the content is free text, what the write path permits, whether a rewrite by "
               "another process would be noticed, and what watches it. The detector compares "
               "the registry to the tree: a file that writes to disk and sits on no row, an "
               "anchor that has left its file, an allowlisted write aimed at a prompt path, and "
               "a free-text envelope key whose declared count is not the schema's.",
               "shipped - configs/writable-surface-registry.json, "
               "scripts/detect-unregistered-write-surfaces.mjs, "
               "contracts/types/operational/route-report.ts; audited - counts at factory 5d5fb3f1",
               bare=bare)


for n, fn in [("12-writable-surface", d12)]:
    emit(n, fn)
