import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import OUT_FULL, OUT_BARE, REPO
"""Verification for the print build: the plates must not overflow or collide once
re-set in Carlito, and the PDF must keep its artwork vector and its text selectable."""
import glob, os, re, warnings
warnings.filterwarnings('ignore')
from playwright.sync_api import sync_playwright


fails = []

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    for f in sorted(glob.glob(OUT_BARE + '*.svg')):
        n = os.path.basename(f)
        s = open(f, encoding='utf-8').read().replace('<style>', '<style>text{font-family:Carlito,sans-serif}', 1)
        pg.set_content(s); pg.wait_for_timeout(200)
        r = pg.evaluate("""() => {
          const vb = document.querySelector('svg').viewBox.baseVal;
          return {w: vb.width, t: [...document.querySelectorAll('text')].map(e => {
            const b = e.getBBox();
            return {s: e.textContent.slice(0,26), x:b.x, y:b.y, w:b.width, h:b.height,
                    o: e.getAttribute('opacity')};
          })};
        }""")
        ts = [t for t in r['t'] if t['o'] != '0.0']
        for t in ts:
            if t['x'] + t['w'] > r['w'] + 0.5:
                fails.append(f"{n}: '{t['s']}' overflows the frame in Carlito")
        for i in range(len(ts)):
            for j in range(i+1, len(ts)):
                a, c = ts[i], ts[j]
                if (min(a['x']+a['w'], c['x']+c['w']) - max(a['x'], c['x']) > 1.5 and
                    min(a['y']+a['h'], c['y']+c['h']) - max(a['y'], c['y']) > 1.5):
                    fails.append(f"{n}: '{a['s']}' collides with '{c['s']}' in Carlito")
    b.close()

# The compiler must not write outside the repository. This check exists because
# to_pdf.py kept an absolute output path through a relocation and quietly published a
# stale reference set for one build -- the PDF said the right things about the wrong
# repository name, and nothing caught it but a manual read of page one.
import subprocess as _sp
for _f in ('to_pdf.py', 'build_pdf.py', 'verify.py', 'grammar.py'):
    _src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), _f), encoding='utf-8').read()
    if '/home/' in _src or 'C:\\\\' in _src:
        fails.append(f"{_f}: contains an absolute path -- the compiler must locate the "
                     f"repository from its own position on disk")

from pypdf import PdfReader
r = PdfReader(REPO + '/docs/ai-operating-system.pdf')
imgs = sum(len(pg.images) for pg in r.pages)
if imgs:
    fails.append(f"{imgs} raster image(s) embedded -- plates should be vector")

alltext = "\n".join(pg.extract_text() for pg in r.pages)
# the typeface sets fi/fl as ligatures, so probes are compared against unligatured text
for lig, plain in (("\ufb00","ff"),("\ufb01","fi"),("\ufb02","fl"),
                   ("\ufb03","ffi"),("\ufb04","ffl")):
    alltext = alltext.replace(lig, plain)
# one probe per plate, so a plate that silently failed to embed is caught
for probe in ("33 CI gate ids", "13 measured hubs", "merge.lock", "19 preflight",
              "contract-compiler.ts", "classifyRouteBack", "RECEIPT_GIVEN", "Declare hot?",
              "AGENTS.md", "decision-ledger.jsonl", "gatewayCall", "divergence_id",
              "whitespace-hunter"):
    if probe not in alltext:
        fails.append(f"plate text not selectable in the PDF: {probe!r} missing")

# every plate reached the document
for n in range(1, 11):
    if f"plate {n:02d} of 10" not in alltext.lower():
        fails.append(f"plate {n:02d} missing from the document")

# counts still reconcile in the files that ship to the repo, against the evidence document's
# figures rather than a literal, so this file is not a third place the number lives
import json
_ev = open(os.path.join(REPO, 'docs', 'evidence.md'), encoding='utf-8').read()
_files = json.loads(re.findall(r'```json\s*(\{.*?\})\s*```', _ev, re.S)[-1])['drawn']['skill_files']['value']
for f, want, mw in (('01-operating-system', _files, 3.0), ('06-context-residency', _files, 7.0)):
    src = open(OUT_FULL + f + '.svg', encoding='utf-8').read()
    got = len([w for w in re.findall(r'<rect [^>]*(?<!stroke-)width="([\d.]+)"', src)
               if float(w) <= mw])
    if got != want:
        fails.append(f"{f}: {got} ticks drawn, {want} labelled")

print("=== PASS ===" if not fails else "=== FAILURES ===")
for x in fails: print(" !", x)
print(f"pages {len(r.pages)} · raster images {imgs} · 10 plates · text selectable")
sys.exit(1 if fails else 0)
