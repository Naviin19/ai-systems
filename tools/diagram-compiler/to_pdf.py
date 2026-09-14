import os, pathlib, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grammar import OUT_FULL, OUT_BARE, REPO
from playwright.sync_api import sync_playwright
FOOT = ('<div style="font-family:DejaVu Sans Mono,monospace;font-size:6.5pt;color:#9a948c;'
        'width:100%;padding:0 18mm;display:flex;justify-content:space-between;">'
        '<span>AI operating system · reference set</span>'
        '<span class="pageNumber"></span></div>')
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.emulate_media(media='print', color_scheme='light')
    pg.goto(pathlib.Path(REPO, '.build', 'reference-print.html').as_uri())
    pg.wait_for_timeout(1500)
    pg.pdf(path=REPO + '/docs/ai-operating-system.pdf', format='A4',
           print_background=True, display_header_footer=True,
           header_template='<div></div>', footer_template=FOOT,
           margin={'top':'18mm','bottom':'20mm','left':'0','right':'0'})
    b.close()
