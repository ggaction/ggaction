"""Read-only rendered documentation audit; uses existing built site and Chromium."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2] / 'ggaction'
OUT = Path(__file__).resolve().parent / 'evidence'
OUT.mkdir(exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/ggaction/'):
            self.path = self.path[len('/ggaction'):]
        super().do_GET()
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=ROOT / '_site'))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/ggaction/'
queries = ['editAxisTitle', 'axis title', 'axis label', 'change axis label',
           'how do I change the axis label', 'change colors', 'change the colors',
           'resize chart', 'update data', 'replace data', 'missing values', 'tooltip',
           'confidence interval', 'linear regression', 'scatter plot', 'scatterplot',
           'horizontal bar chart', 'log scale', 'save SVG', 'export svg',
           'API', 'facet', 'animation', 'createScatterPlot', 'line chart', 'linechart']
result = {'base': base, 'queries': [], 'pages': [], 'consoleErrors': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Users/hj/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
        page.on('pageerror', lambda error: result['consoleErrors'].append(str(error)))
        page.goto(base, wait_until='networkidle')
        page.screenshot(path=str(OUT/'home-desktop.png'))
        for query in queries:
            search = page.locator('#docs-search-input')
            search.press('Escape')
            search.fill(query)
            page.wait_for_function("document.querySelector('#docs-search-input').getAttribute('aria-expanded') === 'true'")
            matches = page.locator('#docs-search-results a').evaluate_all("els => els.map(e => ({title:e.querySelector('.docs-search-title')?.textContent, url:e.getAttribute('href'), kind:e.querySelector('.docs-search-kind')?.textContent, snippet:e.querySelector('.docs-search-snippet')?.textContent}))")
            result['queries'].append({'query': query, 'results': matches})
            if query in ['axis title', 'how do I change the axis label', 'update data']:
                page.screenshot(path=str(OUT/f'search-{query.replace(" ","-")}.png'))
        for route in ['getting-started/', 'api/data/', 'api/scales/', 'reference/actions/', 'reference/actions/guides/', 'mcp/']:
            page.goto(base+route, wait_until='networkidle')
            result['pages'].append(page.locator('main').evaluate("el => ({url:location.pathname, textChars:el.innerText.length, height:el.scrollHeight, headings:el.querySelectorAll('h1,h2,h3').length, codeBlocks:el.querySelectorAll('pre').length, links:el.querySelectorAll('a').length, horizontalOverflow:document.documentElement.scrollWidth>innerWidth, filter:!!el.querySelector('input[type=search]')})"))
        page.goto(base+'getting-started/', wait_until='networkidle')
        page.screenshot(path=str(OUT/'getting-started-desktop.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.goto(base, wait_until='networkidle')
        page.screenshot(path=str(OUT/'home-mobile.png'))
        page.get_by_role('button', name='Open documentation navigation').click()
        page.wait_for_function("document.querySelector('#docs-sidebar').getBoundingClientRect().x >= -0.1")
        page.locator('#docs-search-input').fill('axis title')
        page.wait_for_function("document.querySelector('#docs-search-input').getAttribute('aria-expanded') === 'true'")
        page.screenshot(path=str(OUT/'search-mobile.png'))
        result['mobileSidebar'] = page.locator('#docs-sidebar').evaluate("e => ({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})")
        browser.close()
finally:
    server.shutdown()
(OUT/'site-probe.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'queries':[{'query':q['query'],'count':len(q['results']),'top':[r['title'] for r in q['results'][:3]]} for q in result['queries']], 'pages':result['pages'], 'consoleErrors':result['consoleErrors']},ensure_ascii=False,indent=2))
