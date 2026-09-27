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
                     RULE_LIGHT, RULE_DARK, SURF_LIGHT, SURF_DARK,
                     SCALE, TICK_W, OUT_FULL, OUT_BARE, REPO)

FILES = sorted(glob.glob(OUT_FULL + '*.svg'))
fails, warns = [], []

# --- 1. well-formed, and only grammar colours and text sizes appear -----------
allowed = {v for r in ROLES.values() for s in r.values() for v in s}
allowed |= {INK_LIGHT, INK_DARK, MUTE_LIGHT, MUTE_DARK, RULE_LIGHT, RULE_DARK,
            SURF_LIGHT, SURF_DARK, 'none'}
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
        if float(px) not in SCALE:
            fails.append(f"{os.path.basename(f)}: unexpected font-size {px}")

# The plates the modules declare -- every svg("NN", ...) a module returns -- must be exactly
# the plates the build emitted. Derived from the sources, so adding a plate cannot leave this
# asserting an old number; a module that declares a plate the build did not write, or a file
# no module declares, fails by name.
_HERE = os.path.dirname(os.path.abspath(__file__))
DECLARED = set()
for m in glob.glob(os.path.join(_HERE, 'diagrams_*.py')):
    DECLARED |= set(re.findall(r'\bsvg\("(\d\d)"', open(m, encoding='utf-8').read()))
if len(FILES) < 1:
    fails.append("no plates were emitted -- the gate has nothing to check")

d = {os.path.basename(x)[:2]: x for x in FILES}
if not DECLARED:
    fails.append("no plate module declares a plate -- the gate cannot see the set")
elif set(d) != DECLARED:
    # Report and stop here: every check below opens plates by id, so a missing one would
    # crash before this finding could be printed.
    fails.append("plate set drifted: declared %s, emitted %s" % (sorted(DECLARED), sorted(d)))
    print("=== FAILURES ===")
    for x in fails: print(" !", x)
    sys.exit(1)


def small_rects(key, maxw):
    return [w for w in re.findall(r"<rect [^>]*(?<!stroke-)width=\"([\d.]+)\"",
                                  open(d[key], encoding='utf-8').read()) if float(w) <= maxw]


def unit_ticks(key, role=None):
    src = open(d[key], encoding='utf-8').read()
    # Match on the mark class and the grammar's own width. Both moved once
    # already; a literal here would have gone on matching nothing and passing.
    w = f'width="{TICK_W}"'
    pat = (r'<rect [^>]*%s[^>]*class="%s-m"' % (re.escape(w), role) if role
           else r'<rect [^>]*%s' % re.escape(w))
    n = len(re.findall(pat, src))
    # A plate with no ticks is ordinary: plate 02 draws dots, plate 11 draws
    # numerals. A plate that HAS marks and yet matches none of them means the
    # detector has stopped describing the artwork, which is the failure this
    # guard exists for -- it is the difference between nothing to count and
    # having lost the ability to count.
    if n == 0 and re.search(r'<rect [^>]*class="[a-z]+-m"', src):
        fails.append(f"{os.path.basename(d[key])}: tick detector matched no marks, "
                     f"but the plate draws some -- it is looking for {w}")
    return n


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

TICKS = [("03", "coral", "preflight_features"),
         ("03", "teal",  "total_agents"),
         ("05", "coral", "route_back_cap"),
         ("07", "coral", "hardening_clean_rounds"),
         ("07", "gray",  "hardening_round_cap"),
         ("08", "coral", "promotion_sessions"),
         ("12", "gray",  "write_surfaces"),
         ("12", "teal",  "surfaces_reaching"),
         ("12", "coral", "surfaces_rewrite_invisible"),
         ("13", "coral", "switches_block"),
         ("13", "teal",  "switches_advisory"),
         ("13", "gray",  "switches_outside_ladder")]
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

# the corpus must partition: every skill file is in an active manifest or parked, never both,
# never neither. The table once said 202 + 30 against 221 and nothing here added it up.
_stated = FIG.get("stated_not_drawn", {})
if "skill_files" in DRAWN and {"skills_in_manifests", "retired_skills"} <= set(_stated):
    parts = _stated["skills_in_manifests"]["value"] + _stated["retired_skills"]["value"]
    if parts != DRAWN["skill_files"]["value"]:
        fails.append(f"evidence doc is internally inconsistent: in a manifest + parked = {parts}, "
                     f"skill_files = {DRAWN['skill_files']['value']}")

# plate 13 draws each recorded flip as a teal dot (dot() emits the mark class, role-m, not
# the fill class the hub circles carry); the count is a figure like any other
if "flips_on_condition" in DRAWN and "13" in d:
    got = len(re.findall(r'<circle [^>]*class="teal-m"', open(d["13"], encoding='utf-8').read()))
    want = DRAWN["flips_on_condition"]["value"]
    (fails if got != want else warns).append(
        f"d13: {got} flip dots, evidence doc says flips_on_condition = {want}"
        + ("" if got == want else "  MISMATCH"))

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

# a figure declared form=label is written on the plate as text, not drawn as marks; the
# digits must be present in the plate's text, whole, so a label cannot silently go stale
for key, spec in DRAWN.items():
    if spec.get("form") == "label":
        for k in spec.get("plates", []):
            if k not in d:
                continue
            words = " ".join(re.findall(r'<text[^>]*>([^<]*)</text>',
                                        open(d[k], encoding='utf-8').read()))
            if not re.search(r'(?<![\d,.])%s(?![\d,.])' % re.escape(str(spec["value"])), words):
                fails.append(f"d{k}: '{key}' is declared form=label but the plate's text "
                             f"does not carry {spec['value']}")

# --- 3. every drawn figure is accounted for in the evidence document ----------
for n in ("221", "0.82", "0.70", "0.10", "30%", "20%", "SHA-256",
          "classifyRouteBack", "receipt.ts", "skill-ref-count.ts", "contract-compiler.ts",
          "askDeclareHot", "divergence_id", "AGENTS.md", "5739a97"):
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
    for i in range(1, len(FILES) + 1):
        if i not in nums:
            fails.append(f"architecture.md has no section for plate {i:02d}")
    for f in FILES:
        title = _re.search(r'aria-label="([^.]+)\.', open(f, encoding='utf-8').read())
        if title:
            t = title.group(1).strip()
            stem = t.split(None, 1)[1] if t.lower().startswith("the ") else t
            if stem.lower() not in arch.lower():
                warns.append(f"architecture.md does not name '{t}'")

# --- 3c. the prose carries the audited numbers, never its own copies -------------
# This file held the plates to evidence.md and never read architecture.md, so the prose
# published 219 files, 52 Zod files and 48 contracts against an evidence table that said
# 221, 55 and 50 -- two of them stale since the previous audit. Every count the prose
# attaches to one of these nouns must equal the figure evidence.md holds for it.
if arch:
    def _ev_row(label):
        m = re.search(r'^\| ' + re.escape(label) + r' \| (\d[\d,]*)', ev, re.M)
        return int(m.group(1).replace(',', '')) if m else None
    PROSE = [
        (r'(\d[\d,]*) skill files',           DRAWN.get("skill_files", {}).get("value")),
        (r'(\d[\d,]*) files in nine layers',  DRAWN.get("skill_files", {}).get("value")),
        (r'(\d+) CI gate ids',                DRAWN.get("ci_gate_ids", {}).get("value")),
        (r'Zod: (\d+) files',                 DRAWN.get("zod_source_files", {}).get("value")),
        (r'registers (\d+) contracts',        _ev_row("Registered contracts")),
        (r'Audited — (\d+) contracts',   _ev_row("Registered contracts")),
        (r'(\d+) generated schemas',          DRAWN.get("generated_schemas", {}).get("value")),
        (r'(\d+) hand-kept schemas',          DRAWN.get("per_agent_schemas", {}).get("value")),
    ]
    for pat, want in PROSE:
        if want is None:
            continue
        for m in re.finditer(pat, arch):
            got = int(m.group(1).replace(',', ''))
            if got != want:
                fails.append(f"architecture.md says '{m.group(0)}' but evidence.md holds {want}")
    # anything contested on a plate must be named as contested in the prose too
    if "Contested figures" not in arch:
        fails.append("architecture.md does not declare the contested figures")

# --- 4. real text geometry, measured in a browser ----------------------------
# The plates' font stack resolves to Segoe UI on Windows and to a wider face such
# as DejaVu Sans on a Linux runner, so a label that fits on one can overflow on
# the other. VERIFY_FONT measures every plate set in one named font instead. A
# font the browser does not have would fall back silently and prove nothing, so
# it is refused.
FONT = os.environ.get("VERIFY_FONT", "").strip()
print(f"geometry font: {FONT or 'the plates own font stack'}")
FONT_PROBE = """(font) => {
    const ns = 'http://www.w3.org/2000/svg';
    const width = (family) => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('font-size', '40'); t.style.fontFamily = family;
      t.textContent = 'mmmmmmmmmmlli WWW 0123';
      document.documentElement.appendChild(t);
      const w = t.getBBox().width; t.remove(); return w;
    };
    const installed = ['monospace', 'serif'].some((g) => width(`"${font}", ${g}`) !== width(g));
    for (const e of document.querySelectorAll('text')) e.style.fontFamily = `"${font}"`;
    return installed;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    for f in FILES:
        n = os.path.basename(f)
        pg.goto(pathlib.Path(f).as_uri()); pg.wait_for_timeout(220)
        if FONT and not pg.evaluate(FONT_PROBE, FONT):
            fails.append(f"VERIFY_FONT={FONT!r} is not installed in the browser, so its text would fall back to another face")
            break
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
