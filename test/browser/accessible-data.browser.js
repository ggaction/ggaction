import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url))); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
test("canonical accessible item snapshot updates a safe host table beside Canvas and SVG", async () => {
  const source = await readFile(new URL("../../docs/api/rendering.md", import.meta.url), "utf8");
  const code = source.split("### Native item alternatives")[1].match(/```javascript\n([\s\S]*?)```/)[1];
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href, { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async source => {
      window.__inspectionSessions.forEach(session => session.destroy());
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/accessibility", "accessibility"]]) source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__accessibleProgram=program;window.__accessibleData=alternative;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js"), { exportAccessibleData } = await import("/src/accessibility.js");
      document.body.innerHTML = '<button id="filter">Keep B</button><canvas id="chart" aria-label="Mean values by group" aria-describedby="alternative"></canvas><div id="vector"></div><table id="alternative"><caption>Mean values by group</caption><thead><tr><th>Group</th><th>Mean</th><th>Selections</th></tr></thead><tbody></tbody></table>';
      const update = () => {
        const p = window.__accessibleProgram; render(p, document.querySelector("#chart").getContext("2d"), { pixelRatio: 2 }); document.querySelector("#vector").innerHTML = renderToSVG(p);
        const body = document.querySelector("tbody"); body.replaceChildren(); window.__accessibleData = exportAccessibleData(p, { format: "items" });
        for (const item of window.__accessibleData.views[0].items) {
          const row = body.insertRow(); row.dataset.key = item.key;
          for (const value of [item.channels.x, item.channels.y2, item.selectedBy.join(", ")]) row.insertCell().textContent = String(value);
        }
      };
      update(); document.querySelector("#filter").onclick = () => { window.__accessibleProgram = window.__accessibleProgram.filterMarks({ target: "bars", field: "group", op: "eq", value: "B" }); update(); };
    }, code);
    assert.deepEqual(await page.locator("tbody tr").allTextContents(), ["A3chosen", "B6"]);
    assert.deepEqual(await page.evaluate(() => window.__accessibleData.views[0].items.map(item => item.selectedBy)), [["chosen"], []]);
    await page.getByRole("button", { name: "Keep B" }).focus(); await page.keyboard.press("Enter");
    assert.deepEqual(await page.locator("tbody tr").allTextContents(), ["B6"]);
    assert.equal(await page.locator("#vector svg").count(), 1);
    assert.equal(await page.locator("#chart").getAttribute("aria-describedby"), "alternative");
    assertNoBrowserErrors(errors, "accessible item table"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
