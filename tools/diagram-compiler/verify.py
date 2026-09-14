"""Verification for the plate set.

Three things are checked, in descending order of how easily they are missed:
a grammar violation (an off-palette colour, an unexpected text size), a count
that disagrees with its own label, and text geometry measured in a real browser
rather than estimated. The third is the one that actually catches problems."""
import glob, json, os, pathlib, re, sys
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import (ROLES, INK_LIGHT, INK_DARK, MUTE_LIGHT, MUTE_DARK,
                     RULE_LIGHT, RULE_DARK, OUT_FULL, OUT_BARE, REPO)

FILES = sorted(glob.glob(OUT_FULL + '*.svg'))
fails, warns = [], []

# --- 1. well-formed, and only grammar colours and text sizes appear -----------
allowed = {v for r in ROLES.values() for s in r.values() for v in s}
allowed |= {INK_LIGHT, INK_DARK, MUTE_LIGHT, MUTE_DARK, RULE_LIGHT, RULE_DARK, 'none'}
for f in FILES:
    raw = open(f, encoding='utf-8').read()
    try:
        ET.fromstring(raw)
    except Exception as e:
        fails.append(f"{os.path.basename(f)}: not well-formed XML -- {e}")
    for c in set(re.findall(r'#[0-9a-fA-F]{6}', raw)):
        if c not in allowed:
            fails.append(f"{os.path.basename(f)}: off-palette colour {c}")
    for px in set(re.findall(r'font-size="([\d.]+)"', raw)):
        if float(px) not in (14.0, 12.0, 18.0, 9.5, 10.0):
            fails.append(f"{os.path.basename(f)}: unexpected font-size {px}")

if len(FILES) != 10:
    fails.append(f"set has {len(FILES)} plates, expected 10")

d = {os.path.basename(x)[:2]: x for x in FILES}


def small_rects(key, maxw):
    return [w for w in re.findall(r"<rect [^>]*(?<!stroke-)width=\"([\d.]+)\"",
                                  open(d[key], encoding='utf-8').read()) if float(w) <= maxw]


def unit_ticks(key, role=None):
    src = open(d[key], encoding='utf-8').read()
    pat = r'<rect [^>]*width="2.4"[^>]*class="%s-f"' % role if role \
        else r'<rect [^>]*width="2.4"'
    return len(re.findall(pat, src))


# --- 2. counts reconcile against the evidence document, not against literals ---
# The plates and the figures table are edited by different hands at different times.
# Hard-coding the expected counts here would make this file a third place a number
# lives, which is the drift the whole set argues against. The evidence document is
# the source; this only checks the artwork agrees with it.
EV_PATH = REPO + '/docs/evidence.md'
ev = open(EV_PATH, encoding='utf-8').read()
blocks = re.findall(r'```json\s*(\{.*?\})\s*```', ev, re.S)
if not blocks:
    fails.append("evidence doc has no machine-readable figures block -- nothing to check "
                 "the artwork against")
    FIG = {"drawn": {}, "stated_not_drawn": {}}
else:
    try:
        FIG = json.loads(blocks[-1])
    except Exception as e:
        fails.append(f"machine-readable figures block is not valid JSON -- {e}")
        FIG = {"drawn": {}, "stated_not_drawn": {}}
DRAWN = FIG.get("drawn", {})


def expect(key):
    if key not in DRAWN:
        fails.append(f"evidence doc does not declare '{key}', but a plate draws it")
        return None
    return DRAWN[key]["value"]


for k, key, mw, what in [("01", "skill_files", 3.0, "substrate ticks"),
                         ("06", "skill_files", 7.0, "corpus grid")]:
    want = expect(key)
    if want is None:
        continue
    got = len(small_rects(k, mw))
    (fails if got != want else warns).append(
        f"d{k}: {what} -> {got} drawn, evidence doc says {want}"
        + ("" if got == want else "  MISMATCH"))

TICKS = [("03", "coral", "preflight_gates"),
         ("03", "teal",  "total_agents"),
         ("05", "coral", "route_back_cap"),
         ("07", "coral", "hardening_clean_rounds"),
         ("07", "gray",  "hardening_round_cap"),
         ("08", "coral", "promotion_sessions")]
for k, role, key in TICKS:
    want = expect(key)
    if want is None:
        continue
    got = unit_ticks(k, role)
    (fails if got != want else warns).append(
        f"d{k}: {got} {role} unit ticks, evidence doc says {key} = {want}"
        + ("" if got == want else "  MISMATCH"))

# the two halves of the agent count must also agree with each other
if {"build_agents", "research_agents", "total_agents"} <= set(DRAWN):
    parts = DRAWN["build_agents"]["value"] + DRAWN["research_agents"]["value"]
    if parts != DRAWN["total_agents"]["value"]:
        fails.append(f"evidence doc is internally inconsistent: build + research = {parts}, "
                     f"total_agents = {DRAWN['total_agents']['value']}")

# plate 02 draws each measured hub as a teal circle; the count is a figure like any other
if "level0_hubs" in DRAWN:
    got = len(re.findall(r'<circle [^>]*class="teal-f"', open(d["02"], encoding='utf-8').read()))
    want = DRAWN["level0_hubs"]["value"]
    (fails if got != want else warns).append(
        f"d02: {got} hub circles, evidence doc says level0_hubs = {want}"
        + ("" if got == want else "  MISMATCH"))

# a figure declared as a numeral must not appear as ticks anywhere
for key, spec in DRAWN.items():
    if spec.get("form") == "numeral":
        for k in spec.get("plates", []):
            if unit_ticks(k):
                fails.append(f"d{k}: '{key}' is declared form=numeral but the plate emits "
                             f"unit ticks -- under the reconciliation rule that reads as "
                             f"agreement with an unrelated count of the same size")

# --- 3. every drawn figure is accounted for in the evidence document ----------
for n in ("152", "0.82", "0.70", "0.10", "30%", "20%", "10", "SHA-256",
          "classifyRouteBack", "receipt.ts", "residual-baseline.ts",
          "skill-ref-count.ts", "divergence_id", "AGENTS.md", "43", "11"):
    if n not in ev:
        warns.append(f"evidence doc does not mention {n}")

# a plate that draws a contested figure must say so on its own face. Which plates
# those are is read from the evidence document, so resolving a figure there is what
# lifts the obligation -- not editing a list in this file.
contested_plates = sorted({k for s in DRAWN.values() if s.get("tier") == "contested"
                           for k in s.get("plates", [])})
for k in contested_plates:
    src = open(d[k], encoding='utf-8').read()
    if "contested" not in src:
        fails.append(f"d{k}: draws a contested figure but the plate does not say so")

# --- 3b. the text-only architecture doc carries every claim -------------------
# Applicant systems and terminal readers never render the plates. A claim that
# survives only as a picture is a claim half the audience does not receive.
ARCH = REPO + '/docs/architecture.md'
try:
    arch = open(ARCH, encoding='utf-8').read()
except FileNotFoundError:
    fails.append("docs/architecture.md is missing -- the claims do not survive without images")
    arch = ""
if arch:
    import re as _re
    heads = _re.findall(r'^## (\d+)\. (.+)$', arch, _re.M)
    nums = {int(n) for n, _ in heads}
    for i in range(1, 11):
        if i not in nums:
            fails.append(f"architecture.md has no section for plate {i:02d}")
    for f in FILES:
        title = _re.search(r'aria-label="([^.]+)\.', open(f, encoding='utf-8').read())
        if title:
            t = title.group(1).strip()
            stem = t.split(None, 1)[1] if t.lower().startswith("the ") else t
            if stem.lower() not in arch.lower():
                warns.append(f"architecture.md does not name '{t}'")
    # anything contested on a plate must be named as contested in the prose too
    if "Contested figures" not in arch:
        fails.append("architecture.md does not declare the contested figures")

# --- 4. real text geometry, measured in a browser ----------------------------
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    for f in FILES:
        n = os.path.basename(f)
        pg.goto(pathlib.Path(f).as_uri()); pg.wait_for_timeout(220)
        r = pg.evaluate("""() => {
            const vb = document.documentElement.viewBox.baseVal;
            return {w: vb.width, h: vb.height, t: [...document.querySelectorAll('text')]
              .map(e => { const b = e.getBBox();
                return {s: e.textContent.slice(0,30), x:b.x, y:b.y, w:b.width, h:b.height,
                        o: e.getAttribute('opacity')}; })};
        }""")
        for t in r['t']:
            if t['o'] == '0.0':
                continue
            if t['x'] < -0.5 or t['x'] + t['w'] > r['w'] + 0.5:
                fails.append(f"{n}: text overflows the frame -- {t['s']!r} "
                             f"ends at {t['x']+t['w']:.0f} of {r['w']:.0f}")
            if t['y'] + t['h'] > r['h'] + 0.5:
                fails.append(f"{n}: text below the frame -- {t['s']!r}")
        ts = [t for t in r['t'] if t['o'] != '0.0']
        for i in range(len(ts)):
            for j in range(i + 1, len(ts)):
                a, c = ts[i], ts[j]
                ox = min(a['x']+a['w'], c['x']+c['w']) - max(a['x'], c['x'])
                oy = min(a['y']+a['h'], c['y']+c['h']) - max(a['y'], c['y'])
                if ox > 1.5 and oy > 1.5:
                    fails.append(f"{n}: text collision -- {a['s']!r} / {c['s']!r}")
    b.close()

print("=== PASS ===" if not fails else "=== FAILURES ===")
for x in fails: print(" !", x)
print("--- notes ---")
for x in warns: print(" .", x)

# A verifier that prints its failures and exits 0 is a gate CI can never see close.
sys.exit(1 if fails else 0)
