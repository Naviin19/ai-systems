"""
Shared visual grammar for the ai-systems diagram set.

Every diagram in the set is emitted from these primitives so that the grammar
is enforced by construction rather than maintained by hand.

Grammar (from the build brief, section 5):
  teal   - platform substrate: layers, stages, checks
  purple - products only
  coral  - enforcement: gates, halts, drift-prone surfaces
  gray   - structural and neutral: frames, origins, inputs, outputs
  dashed - a gate or boundary condition, never decorative, never mere grouping
  region - a common region: grouped, but not gated
  ticks  - a count; ticks reconcile across diagrams
  taper  - distillation; narrower sits above wider
"""

W = 680
M = 28                      # page margin
CW = W - 2 * M              # content width = 624

# Four sizes went in and two of them were not a step: 9.5 and 10 differ by 5%, never
# appear within 450 units of each other, and print at 6.55pt and 6.89pt -- fine print
# under any typographic floor. Both are gone. What remains is three sizes with a real
# floor at 12, and the rank that 9.5 was carrying moves onto case, weight and the mono
# voice, which are within-level devices and do not cost a step.
TITLE_PX = 14               # in-figure primary: box titles, values, thresholds
SUB_PX = 12                 # in-figure secondary, and the floor of the whole set
EYEBROW_PX = 12             # furniture: zone labels, the plate number. Was 9.5.
CAPTION_PX = 12             # caption and evidence line. Was 10.
DISPLAY_PX = 21             # the plate title. Was TITLE_PX + 4, i.e. chained to a
                            # size it has no relationship with, so their ratio drifted
                            # on any edit to TITLE_PX.

# Tick geometry lives here, not in the verifier. A gate that matches on its own
# copy of a literal stops matching the moment the literal moves, and reports the
# silence as a pass.
TICK_W, TICK_H, TICK_GAP = 2.4, 11, 4.2

# The set's own size ladder. The verifier reads this rather than repeating it.
SCALE = (12.0, 14.0, 21.0)

STROKE_SHAPE = 1.0          # was 0.5 = 0.34pt in print, under the hairline floor
STROKE_CONN = 1.75
STROKE_HAIR = 0.75

FONT = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif"
# Two voices. The machine speaks in mono: identifiers, env vars, paths, gate ids
# and commit hashes exist verbatim on disk, and setting them in prose type is one
# remove from the truth.
FONT_MONO = ("ui-monospace,'SFMono-Regular','Cascadia Mono','Segoe UI Mono',"
             "'DejaVu Sans Mono','Liberation Mono',monospace")

# Colour roles. Each role means exactly one thing.
# Generated as (one H per role, one shared C-curve, the shared L ladder) rather
# than picked. Hues: teal 182, purple 290, coral 38, gray 75. L ladder from
# oklch-color-system.md S3. Dark keeps H exactly and mirrors on the ladder;
# the fill re-anchors to the dark surface instead of mirroring, because a dark
# panel's job is elevation above the surface, not the inverse of a light tint.
#
# Five parts, not three. `mark` and `hair` exist because ticks and citation
# edges were painting a stroke hex under a fill class, so any matching CSS rule
# repainted them to the panel colour and they vanished.
ROLES = {                      # (fill, stroke, text, mark, hair)
    "teal":   dict(light=("#dff4ef", "#228c7e", "#0f5950", "#228c7e", "#32a091"),
                   dark=("#122925", "#61c2b2", "#bee8e0", "#61c2b2", "#32a091")),
    "purple": dict(light=("#eeecfd", "#7a70af", "#4d4671", "#7a70af", "#8b81c5"),
                   dark=("#242232", "#ada4e6", "#dddafb", "#ada4e6", "#8b81c5")),
    "coral":  dict(light=("#fdeae4", "#aa6550", "#6e3f30", "#aa6550", "#c0765f"),
                   dark=("#311f19", "#e39982", "#fad5c9", "#e39982", "#c0765f")),
    "gray":   dict(light=("#f2eee9", "#7d7a75", "#504c48", "#7d7a75", "#8f8b87"),
                   dark=("#262421", "#b1ada8", "#e1ddd8", "#b1ada8", "#8f8b87")),
}

SURF_LIGHT, SURF_DARK = "#ffffff", "#0d0b08"
INK_LIGHT, INK_DARK = "#1d1a17", "#ebe7e2"
MUTE_LIGHT, MUTE_DARK = "#66635e", "#dbd7d2"
RULE_LIGHT, RULE_DARK = "#c1bdb8", "#5b5753"


def L(role, part):
    """Literal light-mode value. Emitted as a presentation attribute so that
    every renderer -- browser, rasteriser, PDF converter -- gets a correct
    light rendering. Dark mode arrives as a CSS override on top."""
    return ROLES[role]['light'][{"f": 0, "s": 1, "t": 2, "m": 3, "h": 4}[part]]


def _rules(scheme, prefix=""):
    """Emit the whole palette as class rules, optionally scoped to a selector
    prefix so an inlined figure can follow an explicit page theme."""
    r = []
    for name, c in ROLES.items():
        f, s, t, m, h = c[scheme]
        r.append(f"{prefix}.{name}-f{{fill:{f};stroke:{s}}}")
        r.append(f"{prefix}.{name}-o{{stroke:{s}}}")
        r.append(f"{prefix}.{name}-t{{fill:{t}}}")
        r.append(f"{prefix}.{name}-m{{fill:{m}}}")
        r.append(f"{prefix}.{name}-h{{stroke:{h}}}")
    ink = INK_DARK if scheme == "dark" else INK_LIGHT
    mute = MUTE_DARK if scheme == "dark" else MUTE_LIGHT
    rule = RULE_DARK if scheme == "dark" else RULE_LIGHT
    surf = SURF_DARK if scheme == "dark" else SURF_LIGHT
    r.append(f"{prefix}.surface{{fill:{surf}}}")
    r.append(f"{prefix}.ink{{fill:{ink}}}")
    r.append(f"{prefix}.mute{{fill:{mute}}}")
    r.append(f"{prefix}.rule{{stroke:{rule}}}")
    return "".join(r)


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


# ---------------------------------------------------------------- primitives

def _cls(*c):
    c = [x for x in c if x]
    return f' class="{" ".join(c)}"' if c else ""


def text(x, y, s, px=SUB_PX, role=None, part="t", anchor="start", weight=400,
         ls=None, opacity=None, ink="ink", mono=False):
    """Text. `role` picks a grammar colour; without one it falls back to page
    ink ("ink") or muted furniture ("mute")."""
    if role:
        fill, cls = L(role, part), f"{role}-{part}"
    else:
        fill = INK_LIGHT if ink == "ink" else MUTE_LIGHT
        cls = ink
    a = f' text-anchor="{anchor}"' if anchor != "start" else ""
    w = f' font-weight="{weight}"' if weight != 400 else ""
    l = f' letter-spacing="{ls}"' if ls else ""
    m = " mono" if mono else ""
    # opacity is accepted and IGNORED. It composites differently over every fill,
    # so one authored value produced two dozen different contrasts, none declared
    # anywhere, and every one of them below the floor. Rank comes from size,
    # weight and case instead.
    return (f'<text x="{x}" y="{y}" font-size="{px}" fill="{fill}"'
            f'{a}{w}{l}{_cls(cls + m)}>{esc(s)}</text>')


def box(x, y, w, h, role="teal", dashed=False, r=5, fill=True, sw=STROKE_SHAPE):
    f = L(role, "f") if fill else "none"
    d = ' stroke-dasharray="5 4"' if dashed else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" '
            f'fill="{f}" stroke="{L(role, "s")}" stroke-width="{sw}"{d}'
            f'{_cls(role + "-f" if fill else role + "-o")}/>')


# Half the cap height of the title size. The old literals -- +5 and -4 -- are this
# number computed for 14px and nothing else, which is why the type scale could not be
# changed without silently mis-centring every label in the set.
CAP = 0.72                  # cap height as a fraction of em, for a humanist sans
LH_SUB = 17                 # title baseline to sub baseline


def labelled_box(x, y, w, h, title, sub=None, role="teal", right=None,
                 dashed=False, pad=18):
    o = [box(x, y, w, h, role, dashed)]
    half_cap = CAP * TITLE_PX / 2
    ty = y + h / 2 + half_cap if not sub else y + h / 2 + half_cap - LH_SUB / 2 - 0.5
    o.append(text(x + pad, ty, title, TITLE_PX, role, weight=500))
    if sub:
        o.append(text(x + pad, ty + LH_SUB, sub, SUB_PX, role))
    if right:
        o.append(text(x + w - pad, ty, right, SUB_PX, role, anchor="end",
                      weight=500))
    return "".join(o)


def ticks(x, y, n, role="teal", h=TICK_H, gap=TICK_GAP, w=TICK_W, opacity=None):
    """A count, rendered as unit ticks. Ticks reconcile across diagrams.

    Full strength, always. A mark that carries the reconciliation contract is
    the last thing that may be dimmed: if a run reads as a bar, draw fewer of
    them or use dot(), never reduce the contrast. `opacity` is accepted and
    ignored so existing call sites keep working."""
    return "".join(
        f'<rect x="{round(x + i * (w + gap), 2)}" y="{y}" width="{w}" '
        f'height="{h}" rx="0" fill="{L(role, "m")}"'
        f'{_cls(role + "-m")}/>' for i in range(n))


def ticks_width(n, gap=4.2, w=2.4):
    return n * w + (n - 1) * gap if n else 0


def conn(x1, y1, x2, y2, role="gray", arrow=True, dashed=False, opacity=None):
    d = ' stroke-dasharray="5 4"' if dashed else ""
    a = f' marker-end="url(#ar-{role})"' if arrow else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{L(role, "s")}" stroke-width="{STROKE_CONN}" '
            f'stroke-linecap="round"{d}{a}{_cls(role + "-o")}/>')


def path(d, role="gray", arrow=True, dashed=False, opacity=None):
    da = ' stroke-dasharray="5 4"' if dashed else ""
    a = f' marker-end="url(#ar-{role})"' if arrow else ""
    return (f'<path d="{d}" fill="none" stroke="{L(role, "s")}" '
            f'stroke-width="{STROKE_CONN}" stroke-linecap="round"{da}{a}'
            f'{_cls(role + "-o")}/>')


def section(x, y, s):
    """Zone label: the name of a region, one rank above the boxes inside it.

    It used to render at SUB_PX in sentence case -- the same size as a box
    subtitle, distinguished only by hue, which makes colour the sole carrier of
    a rank. Uppercase mono at a smaller size reads as furniture at a glance and
    stops roughly thirty strings per plate competing with content."""
    return text(x, y, s.upper(), EYEBROW_PX, ink="mute", weight=500, ls="0.9",
                mono=True)


def region(x, y, w, h, role="gray", r=10):
    """A common region: these things belong together.

    Not a gate. The set had no primitive for enclosure, so nine frames, stores,
    counters and one partition borrowed `dashed` to say "grouped" -- including a
    box whose own text reads "measured, not enforced", where the label denied a
    gate and the dash asserted one. Enclosure is pre-conscious and a label is
    not, so the dash won. A solid hairline groups just as well and claims
    nothing."""
    return box(x, y, w, h, role, dashed=False, r=r, fill=False, sw=STROKE_HAIR)


def swatch(x, y, label, role, dashed=False):
    return (box(x, y - 10, 13, 13, role, dashed, r=3) +
            text(x + 21, y, label, SUB_PX, ink="mute"))


def wrap(s, limit):
    lines, cur = [], ""
    for word in s.split():
        if cur and len(cur) + 1 + len(word) > limit:
            lines.append(cur)
            cur = word
        else:
            cur = f"{cur} {word}".strip()
    if cur:
        lines.append(cur)
    return lines


# ------------------------------------------------------------------ document

def svg(num, title, sub, body, body_end, caption, tier, bare=False):
    """body_end is the y of the lowest drawn element; the footer is measured
    from it so no diagram has to know its own total height.

    bare drops the title block and caption and crops to the artwork, for
    embedding somewhere that supplies its own heading. The standalone file
    keeps both, because a file in a repo has to carry its own label."""
    head = [
        text(M, 24, f"DIAGRAM {num}", EYEBROW_PX, ink="mute", ls="1.1", mono=True),
        text(M, 52, title, DISPLAY_PX, weight=600),
        text(M, 73, sub, TITLE_PX, ink="mute"),
    ]

    cap = wrap(caption, 82)
    rule_y = body_end + 26
    foot = [f'<line x1="{M}" y1="{rule_y}" x2="{W - M}" y2="{rule_y}" '
            f'stroke="{RULE_LIGHT}" stroke-width="0.5" class="rule"/>']
    y = rule_y + 20
    for line in cap:
        foot.append(text(M, y, line, CAPTION_PX, ink="mute"))
        y += 18
    # The evidence line wraps like the caption. A one-line tier lands exactly
    # where it always did, so plates whose tier fits are byte-identical.
    y += 10
    for line in wrap(f"Evidence: {tier}", 82):
        foot.append(text(M, y, line, CAPTION_PX, ink="mute"))
        y += 18
    height = y + 1

    if bare:
        LIFT = 88
        head, foot = [], []
        body = f'<g transform="translate(0,{-LIFT})">{body}</g>'
        height = body_end - LIFT + 22

    markers = "".join(
        f'<marker id="ar-{r}" viewBox="0 0 10 10" refX="8.5" refY="5" '
        f'markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
        f'<path d="M0,1.5 L9,5 L0,8.5" fill="none" stroke="{L(r, "s")}" '
        f'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" '
        f'class="{r}-o"/></marker>' for r in ROLES)

    # Standalone (GitHub, an <img> tag, a viewer) follows the OS scheme.
    # Inlined in a page that states a theme, the scoped rules win on specificity.
    style = (f'text{{font-family:{FONT}}}'
             f'text.mono{{font-family:{FONT_MONO}}}'
             f'.num{{font-variant-numeric:tabular-nums}}'
             f'@media (prefers-color-scheme:dark){{{_rules("dark")}}}'
             f'{_rules("dark", "[data-theme=dark] ")}'
             f'{_rules("light", "[data-theme=light] ")}')

    # A figure supplies its own ground. Without this the dark palette activates
    # from the viewer's OS and lands on whatever the host page is painting, so a
    # dark-OS reader on a light page got #ebe7e2 title text on white at 1.2:1.
    ground = (f'<rect x="0" y="0" width="{W}" height="{height}" '
              f'fill="{SURF_LIGHT}" class="surface"/>')

    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}" '
            f'width="100%" role="img" aria-label="{esc(title)}. {esc(sub)}">'
            f'<style>{style}</style><defs>{markers}</defs>{ground}'
            f'{"".join(head)}{body}{"".join(foot)}</svg>')


# ------------------------------------------------- additions, September 2026

import os as _os

# The compiler locates the repository from its own position on disk, so a clone
# runs the first command without configuration.
_HERE = _os.path.dirname(_os.path.abspath(__file__))
REPO = _os.path.dirname(_os.path.dirname(_HERE))
OUT_FULL = _os.path.join(REPO, 'docs', 'diagrams') + _os.sep
OUT_BARE = _os.path.join(REPO, '.build', 'diagrams-bare') + _os.sep


def dot(cx, cy, r, role="gray", opacity=None):
    """A node. Used where a count is large enough that ticks would read as a bar."""
    return (f'<circle cx="{round(cx,2)}" cy="{round(cy,2)}" r="{r}" '
            f'fill="{L(role,"m")}"{_cls(role + "-m")}/>')


def hair(x1, y1, x2, y2, role="teal", opacity=None, dashed=False):
    """A citation edge. Thinner than a connector because it is a relation, not a flow."""
    d = ' stroke-dasharray="3 2"' if dashed else ""
    return (f'<line x1="{round(x1,2)}" y1="{round(y1,2)}" x2="{round(x2,2)}" '
            f'y2="{round(y2,2)}" stroke="{L(role,"h")}" '
            f'stroke-width="{STROKE_HAIR}"{d}{_cls(role + "-h")}/>')


def numeral(x, y, s, role="teal", px=TITLE_PX, anchor="start"):
    """A threshold written as a number.

    Ticks mean a count of agents or stages and reconcile across the set. A
    threshold that happens to equal one of those counts must not render as the
    same mark, or the reconciliation rule reads a collision as agreement."""
    return text(x, y, s, px, role, anchor=anchor, weight=500, mono=True)


def rng(seed):
    """Deterministic LCG. A scatter has to be reproducible or the artwork
    drifts from its source on every regeneration, which is the failure the
    whole compiler exists to prevent."""
    s = [seed]

    def nxt():
        s[0] = (s[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return s[0] / 0x7FFFFFFF
    return nxt


def emit(name, fn):
    """Write the standalone plate and its bare twin for the print build."""
    for d in (OUT_FULL, OUT_BARE):
        _os.makedirs(d, exist_ok=True)
    open(OUT_FULL + name + ".svg", "w", encoding="utf-8", newline="\n").write(fn())
    open(OUT_BARE + name + ".svg", "w", encoding="utf-8", newline="\n").write(fn(bare=True))
    print("wrote", name)
