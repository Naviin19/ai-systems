"""
Shared visual grammar for the ai-systems diagram set.

Every diagram in the set is emitted from these primitives so that the grammar
is enforced by construction rather than maintained by hand.

Grammar (from the build brief, section 5):
  teal   - platform substrate: layers, stages, checks
  purple - products only
  coral  - enforcement: gates, halts, drift-prone surfaces
  gray   - structural and neutral: frames, origins, inputs, outputs
  dashed - a gate or boundary condition, never decorative
  ticks  - a count; ticks reconcile across diagrams
  taper  - distillation; narrower sits above wider
"""

W = 680
M = 28                      # page margin
CW = W - 2 * M              # content width = 624

TITLE_PX = 14               # the only two in-figure text sizes
SUB_PX = 12
EYEBROW_PX = 9.5            # label furniture, outside the figure body
CAPTION_PX = 10

STROKE_SHAPE = 0.5
STROKE_CONN = 1.5

FONT = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif"

# Colour roles. Each role means exactly one thing.
ROLES = {
    "teal":   dict(light=("#e8f5f0", "#2d9184", "#1f6f65"),
                   dark=("#16302c", "#4fb3a3", "#82d6c6")),
    "purple": dict(light=("#eeeafa", "#6b5bb5", "#4a3f8a"),
                   dark=("#221f38", "#8b7dd0", "#ada0e4")),
    "coral":  dict(light=("#fdeeea", "#d4674a", "#a84a30"),
                   dark=("#35211b", "#e08a6c", "#f2ab8e")),
    "gray":   dict(light=("#f4f3f1", "#b0aca6", "#6b6660"),
                   dark=("#232220", "#57534e", "#a8a29b")),
}

INK_LIGHT, INK_DARK = "#1a1a1a", "#ededea"
MUTE_LIGHT, MUTE_DARK = "#6b6660", "#a8a29b"
RULE_LIGHT, RULE_DARK = "#ddd9d4", "#3a3835"


def L(role, part):
    """Literal light-mode value. Emitted as a presentation attribute so that
    every renderer -- browser, rasteriser, PDF converter -- gets a correct
    light rendering. Dark mode arrives as a CSS override on top."""
    return ROLES[role]['light'][{"f": 0, "s": 1, "t": 2}[part]]


def _rules(scheme, prefix=""):
    """Emit the whole palette as class rules, optionally scoped to a selector
    prefix so an inlined figure can follow an explicit page theme."""
    r = []
    for name, c in ROLES.items():
        f, s, t = c[scheme]
        r.append(f"{prefix}.{name}-f{{fill:{f};stroke:{s}}}")
        r.append(f"{prefix}.{name}-o{{stroke:{s}}}")
        r.append(f"{prefix}.{name}-t{{fill:{t}}}")
    ink = INK_DARK if scheme == "dark" else INK_LIGHT
    mute = MUTE_DARK if scheme == "dark" else MUTE_LIGHT
    rule = RULE_DARK if scheme == "dark" else RULE_LIGHT
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
         ls=None, opacity=None, ink="ink"):
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
    o = f' opacity="{opacity}"' if opacity else ""
    return (f'<text x="{x}" y="{y}" font-size="{px}" fill="{fill}"'
            f'{a}{w}{l}{o}{_cls(cls)}>{esc(s)}</text>')


def box(x, y, w, h, role="teal", dashed=False, r=5, fill=True, sw=STROKE_SHAPE):
    f = L(role, "f") if fill else "none"
    d = ' stroke-dasharray="4 3"' if dashed else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" '
            f'fill="{f}" stroke="{L(role, "s")}" stroke-width="{sw}"{d}'
            f'{_cls(role + "-f" if fill else role + "-o")}/>')


def labelled_box(x, y, w, h, title, sub=None, role="teal", right=None,
                 dashed=False, pad=18):
    o = [box(x, y, w, h, role, dashed)]
    ty = y + (h / 2 + 5) if not sub else y + h / 2 - 4
    o.append(text(x + pad, ty, title, TITLE_PX, role))
    if sub:
        o.append(text(x + pad, y + h / 2 + 13, sub, SUB_PX, role, opacity="0.72"))
    if right:
        o.append(text(x + w - pad, ty, right, SUB_PX, role, anchor="end",
                      opacity="0.78"))
    return "".join(o)


def ticks(x, y, n, role="teal", h=11, gap=4.2, w=2.4, opacity="0.55"):
    """A count, rendered as unit ticks. Ticks reconcile across diagrams."""
    return "".join(
        f'<rect x="{round(x + i * (w + gap), 2)}" y="{y}" width="{w}" '
        f'height="{h}" rx="1" fill="{L(role, "s")}" opacity="{opacity}"'
        f'{_cls(role + "-f")}/>' for i in range(n))


def ticks_width(n, gap=4.2, w=2.4):
    return n * w + (n - 1) * gap if n else 0


def conn(x1, y1, x2, y2, role="gray", arrow=True, dashed=False, opacity="0.85"):
    d = ' stroke-dasharray="4 3"' if dashed else ""
    a = f' marker-end="url(#ar-{role})"' if arrow else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{L(role, "s")}" stroke-width="{STROKE_CONN}" '
            f'opacity="{opacity}"{d}{a}{_cls(role + "-o")}/>')


def path(d, role="gray", arrow=True, dashed=False, opacity="0.85"):
    da = ' stroke-dasharray="4 3"' if dashed else ""
    a = f' marker-end="url(#ar-{role})"' if arrow else ""
    return (f'<path d="{d}" fill="none" stroke="{L(role, "s")}" '
            f'stroke-width="{STROKE_CONN}" opacity="{opacity}"{da}{a}'
            f'{_cls(role + "-o")}/>')


def section(x, y, s):
    """Zone label. Structural furniture, so it sits in muted ink."""
    return text(x, y, s, SUB_PX, ink="mute")


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
        text(M, 22, f"DIAGRAM {num}", EYEBROW_PX, ink="mute", ls="1.1"),
        text(M, 44, title, TITLE_PX + 4, weight=500),
        text(M, 61, sub, SUB_PX, ink="mute"),
    ]

    cap = wrap(caption, 104)
    rule_y = body_end + 26
    foot = [f'<line x1="{M}" y1="{rule_y}" x2="{W - M}" y2="{rule_y}" '
            f'stroke="{RULE_LIGHT}" stroke-width="0.5" class="rule"/>']
    y = rule_y + 17
    for line in cap:
        foot.append(text(M, y, line, CAPTION_PX, ink="mute"))
        y += 13
    # The evidence line wraps like the caption. A one-line tier lands exactly
    # where it always did, so plates whose tier fits are byte-identical.
    y += 4
    for line in wrap(f"Evidence: {tier}", 104):
        foot.append(text(M, y, line, CAPTION_PX, ink="mute", opacity="0.72"))
        y += 13
    height = y + 1

    if bare:
        LIFT = 78
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
             f'@media (prefers-color-scheme:dark){{{_rules("dark")}}}'
             f'{_rules("dark", "[data-theme=dark] ")}'
             f'{_rules("light", "[data-theme=light] ")}')

    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}" '
            f'width="100%" role="img" aria-label="{esc(title)}. {esc(sub)}">'
            f'<style>{style}</style><defs>{markers}</defs>'
            f'{"".join(head)}{body}{"".join(foot)}</svg>')


# ------------------------------------------------- additions, September 2026

import os as _os

# The compiler locates the repository from its own position on disk, so a clone
# runs the first command without configuration.
_HERE = _os.path.dirname(_os.path.abspath(__file__))
REPO = _os.path.dirname(_os.path.dirname(_HERE))
OUT_FULL = _os.path.join(REPO, 'docs', 'diagrams') + _os.sep
OUT_BARE = _os.path.join(REPO, '.build', 'diagrams-bare') + _os.sep


def dot(cx, cy, r, role="gray", opacity="0.45"):
    """A node. Used where a count is large enough that ticks would read as a bar."""
    return (f'<circle cx="{round(cx,2)}" cy="{round(cy,2)}" r="{r}" '
            f'fill="{L(role,"s")}" opacity="{opacity}"{_cls(role + "-f")}/>')


def hair(x1, y1, x2, y2, role="teal", opacity="0.22", dashed=False):
    """A citation edge. Thinner than a connector because it is a relation, not a flow."""
    d = ' stroke-dasharray="3 2"' if dashed else ""
    return (f'<line x1="{round(x1,2)}" y1="{round(y1,2)}" x2="{round(x2,2)}" '
            f'y2="{round(y2,2)}" stroke="{L(role,"s")}" stroke-width="0.5" '
            f'opacity="{opacity}"{d}{_cls(role + "-o")}/>')


def numeral(x, y, s, role="teal", px=TITLE_PX, anchor="start"):
    """A threshold written as a number.

    Ticks mean a count of agents or stages and reconcile across the set. A
    threshold that happens to equal one of those counts must not render as the
    same mark, or the reconciliation rule reads a collision as agreement."""
    return text(x, y, s, px, role, anchor=anchor, weight=500)


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
